"""WebSocket support for real-time debate updates with true streaming."""

from fastapi import WebSocket, WebSocketDisconnect
import asyncio

from app.config import get_settings
from app.services import DebateService
from app.schemas import DebateStatus, ArgumentRound


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, debate_id: str):
        await websocket.accept()
        if debate_id not in self.active_connections:
            self.active_connections[debate_id] = []
        self.active_connections[debate_id].append(websocket)

    def disconnect(self, websocket: WebSocket, debate_id: str):
        if debate_id in self.active_connections:
            if websocket in self.active_connections[debate_id]:
                self.active_connections[debate_id].remove(websocket)
            if not self.active_connections[debate_id]:
                del self.active_connections[debate_id]

    async def broadcast(self, debate_id: str, message: dict):
        if debate_id in self.active_connections:
            for connection in self.active_connections[debate_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


async def safe_send_json(websocket: WebSocket, payload: dict):
    """Send a websocket payload and normalize closed-connection errors."""
    try:
        await websocket.send_json(payload)
    except RuntimeError as exc:
        if 'close message has been sent' in str(exc):
            raise WebSocketDisconnect() from exc
        raise


def get_llm_timeout_seconds() -> float:
    """Return a sane timeout budget for a single model step."""
    return max(get_settings().llm_timeout_seconds, 0.01)


async def run_with_timeout(awaitable, error_message: str):
    """Fail fast instead of leaving the websocket stream hanging forever."""
    try:
        return await asyncio.wait_for(
            awaitable,
            timeout=get_llm_timeout_seconds(),
        )
    except TimeoutError as exc:
        raise TimeoutError(error_message) from exc


async def stream_debate(
    websocket: WebSocket,
    debate_id: str,
    debate_service: DebateService,
):
    """Stream debate rounds in real-time via WebSocket with true streaming."""
    state = debate_service.get_debate(debate_id)
    if not state:
        await safe_send_json(websocket, {"type": "error", "message": "Debate not found"})
        return

    # Check if already completed
    existing_result = debate_service.get_result(debate_id)
    if state.status == DebateStatus.COMPLETED and existing_result:
        # Send existing result
        await safe_send_json(websocket, {
            "type": "cached_result",
            "winner": existing_result.winner.value,
            "judgment": existing_result.judgment,
            "recommendation": existing_result.recommendation,
        })
        return

    state.status = DebateStatus.IN_PROGRESS

    # Send initial status
    await safe_send_json(websocket, {
        "type": "status",
        "debate_id": debate_id,
        "status": "in_progress",
        "total_rounds": state.total_rounds,
    })

    # Get user context from memory
    user_context = ""
    if debate_service.memory_service.enabled:
        try:
            user_context = debate_service.memory_service.get_user_context(
                user_id="default",
                query=state.topic,
            )
        except Exception:
            pass

    moderator_intro = ""

    async def send_moderator_intro():
        nonlocal moderator_intro

        try:
            moderator_intro = await run_with_timeout(
                asyncio.to_thread(
                    debate_service.moderator_agent.analyze_topic,
                    state.topic,
                    state.context,
                ),
                "主持人导语生成超时，请重试。",
            )
        except Exception:
            moderator_intro = f"辩论开始：{state.topic}"

        try:
            await safe_send_json(websocket, {
                "type": "moderator",
                "content": moderator_intro,
            })
        except (Exception, WebSocketDisconnect):
            pass

    moderator_task = asyncio.create_task(send_moderator_intro())

    positive_last_point = None
    negative_last_point = None

    try:
        # Resume from last round if interrupted
        start_round = state.current_round + 1 if state.arguments else 1
        if state.arguments:
            positive_last_point = state.arguments[-1].positive
            negative_last_point = state.arguments[-1].negative

        for round_num in range(start_round, state.total_rounds + 1):
            state.current_round = round_num

            await safe_send_json(websocket, {
                "type": "round_start",
                "round": round_num,
            })

            # Build enhanced context
            enhanced_context = state.context or ""
            if user_context:
                enhanced_context = f"{enhanced_context}\n\n历史背景：{user_context}"

            # Positive agent argues with streaming
            await safe_send_json(websocket, {
                "type": "thinking",
                "agent": "positive",
                "message": "正方思考中...",
            })

            async def positive_callback(chunk: str):
                await safe_send_json(websocket, {
                    "type": "stream",
                    "agent": "positive",
                    "chunk": chunk,
                })

            positive_arg = await run_with_timeout(
                debate_service.positive_agent.argue_async(
                    topic=state.topic,
                    context=enhanced_context,
                    opponent_last_point=negative_last_point,
                    my_previous_points=state.positive_points,
                    stream_callback=positive_callback,
                ),
                "正方输出超时，请重试。",
            )
            positive_last_point = positive_arg

            await safe_send_json(websocket, {
                "type": "argument_complete",
                "round": round_num,
                "agent": "positive",
                "content": positive_arg,
            })

            # Negative agent argues with streaming
            await safe_send_json(websocket, {
                "type": "thinking",
                "agent": "negative",
                "message": "反方思考中...",
            })

            async def negative_callback(chunk: str):
                await safe_send_json(websocket, {
                    "type": "stream",
                    "agent": "negative",
                    "chunk": chunk,
                })

            negative_arg = await run_with_timeout(
                debate_service.negative_agent.argue_async(
                    topic=state.topic,
                    context=enhanced_context,
                    opponent_last_point=positive_last_point,
                    my_previous_points=state.negative_points,
                    stream_callback=negative_callback,
                ),
                "反方输出超时，请重试。",
            )
            negative_last_point = negative_arg

            await safe_send_json(websocket, {
                "type": "argument_complete",
                "round": round_num,
                "agent": "negative",
                "content": negative_arg,
            })

            # Store round
            round_data = ArgumentRound(
                round=round_num,
                positive=positive_arg,
                negative=negative_arg,
            )
            state.arguments.append(round_data)
            state.positive_points.append(positive_arg)
            state.negative_points.append(negative_arg)

            # Save state after each round
            debate_service._save_debate(state)

        if not moderator_task.done():
            await moderator_task

        # Get judgment
        await safe_send_json(websocket, {
            "type": "thinking",
            "agent": "judgment",
            "message": "裁判评估中...",
        })

        judgment = await run_with_timeout(
            asyncio.to_thread(
                debate_service.judgment_agent.judge,
                topic=state.topic,
                context=state.context,
                arguments=[arg.model_dump() for arg in state.arguments],
            ),
            "裁判评估超时，请重试。",
        )

        judgment_result = debate_service.judgment_agent.parse_judgment(judgment)

        state.status = DebateStatus.COMPLETED
        debate_service._save_debate(state)

        # Send final result
        await safe_send_json(websocket, {
            "type": "judgment",
            "winner": judgment_result.winner,
            "positive_score": judgment_result.positive_scores.total,
            "negative_score": judgment_result.negative_scores.total,
            "content": judgment,
            "recommendation": judgment_result.recommendation,
        })

        # Store result
        from app.schemas import DebateResult, DebateWinner
        result = DebateResult(
            debate_id=debate_id,
            topic=state.topic,
            winner=DebateWinner(judgment_result.winner),
            judgment=judgment,
            recommendation=judgment_result.recommendation,
            arguments=state.arguments,
            summary=moderator_intro,
        )
        debate_service._save_result(result)

        # Store in memory
        if debate_service.memory_service.enabled:
            try:
                debate_service.memory_service.store_debate(
                    user_id="default",
                    topic=state.topic,
                    result=result.model_dump(),
                )
            except Exception:
                pass

        await safe_send_json(websocket, {
            "type": "completed",
            "debate_id": debate_id,
        })

    except WebSocketDisconnect:
        # Save state on disconnect
        moderator_task.cancel()
        debate_service._save_debate(state)
    except Exception as e:
        moderator_task.cancel()
        try:
            await safe_send_json(websocket, {
                "type": "error",
                "message": str(e),
            })
        except WebSocketDisconnect:
            pass
        debate_service._save_debate(state)
