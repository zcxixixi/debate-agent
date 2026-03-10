"""Regression tests for websocket debate streaming behavior."""

import asyncio
import time
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient

import app.main
from app.api.routes import debate_service as routes_debate_service
from app.api.websocket import stream_debate
from app.schemas import DebateState


class FakeWebSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, message):
        self.messages.append(message)


class FakePositiveAgent:
    async def argue_async(self, **kwargs):
        callback = kwargs["stream_callback"]
        await callback("正方流式片段")
        return "正方完整观点"


class FakeNegativeAgent:
    async def argue_async(self, **kwargs):
        callback = kwargs["stream_callback"]
        await callback("反方流式片段")
        return "反方完整观点"


class FakeModeratorAgent:
    def analyze_topic(self, topic, context):
        time.sleep(0.05)
        return "主持人导语"


class FakeJudgmentAgent:
    def judge(self, **kwargs):
        return "裁判结论"

    def parse_judgment(self, judgment):
        return SimpleNamespace(
            winner="positive",
            recommendation="建议继续",
            positive_scores=SimpleNamespace(total=9),
            negative_scores=SimpleNamespace(total=7),
        )


class FakeMemoryService:
    enabled = False


class FakeDebateService:
    def __init__(self):
        self.state = DebateState(
            debate_id="debate-1",
            topic="远程办公好还是办公室办公好？",
            total_rounds=1,
        )
        self.positive_agent = FakePositiveAgent()
        self.negative_agent = FakeNegativeAgent()
        self.moderator_agent = FakeModeratorAgent()
        self.judgment_agent = FakeJudgmentAgent()
        self.memory_service = FakeMemoryService()
        self.saved_result = None

    def get_debate(self, debate_id):
        return self.state if debate_id == self.state.debate_id else None

    def get_result(self, debate_id):
        return None

    def _save_debate(self, state):
        self.state = state

    def _save_result(self, result):
        self.saved_result = result

    def _generate_round_summary(self, round_num, positive_arg, negative_arg):
        time.sleep(0.05)
        return f"第{round_num}轮总结"


class HangingPositiveAgent:
    async def argue_async(self, **kwargs):
        await asyncio.sleep(0.05)
        return "不会返回"


class WebsocketStreamTests(TestCase):
    def test_round_starts_before_moderator_intro_finishes(self):
        websocket = FakeWebSocket()
        debate_service = FakeDebateService()

        asyncio.run(stream_debate(websocket, "debate-1", debate_service))

        event_types = [message["type"] for message in websocket.messages]

        self.assertIn("round_start", event_types)
        self.assertIn("moderator", event_types)
        self.assertLess(
            event_types.index("round_start"),
            event_types.index("moderator"),
        )

    def test_websocket_route_reuses_http_debate_service_instance(self):
        async def fake_stream_debate(websocket, debate_id, debate_service):
            await websocket.send_json(
                {"shared_service": debate_service is routes_debate_service}
            )

        with patch("app.main.stream_debate", fake_stream_debate):
            client = TestClient(app.main.app)

            with client.websocket_connect("/ws/debate/debate-1") as websocket:
                message = websocket.receive_json()

        self.assertTrue(message["shared_service"])

    def test_stream_emits_error_when_agent_generation_times_out(self):
        websocket = FakeWebSocket()
        debate_service = FakeDebateService()
        debate_service.positive_agent = HangingPositiveAgent()

        with patch(
            "app.api.websocket.get_settings",
            return_value=SimpleNamespace(llm_timeout_seconds=0.01),
        ):
            asyncio.run(stream_debate(websocket, "debate-1", debate_service))

        self.assertEqual(websocket.messages[-1]["type"], "error")
        self.assertIn("正方输出超时", websocket.messages[-1]["message"])
