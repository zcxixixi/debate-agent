"""Debate orchestration service with memory and persistence."""

import uuid
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional
from app.config import get_settings
from app.schemas import (
    DebateState,
    DebateStatus,
    DebateWinner,
    ArgumentRound,
    DebateResult,
)
from app.agents import (
    PositiveAgent,
    NegativeAgent,
    JudgmentAgent,
    ModeratorAgent,
)
from app.services.memory_service import MemoryService

# Database path
DEFAULT_DB_PATH = Path(__file__).parent.parent.parent / "data" / "debates.db"


def init_database(db_path: Path):
    """Initialize SQLite database for persistence."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS debates (
            debate_id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            context TEXT,
            total_rounds INTEGER,
            current_round INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            arguments TEXT,  -- JSON
            round_summaries TEXT,  -- JSON
            positive_points TEXT,  -- JSON
            negative_points TEXT,  -- JSON
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS debate_results (
            debate_id TEXT PRIMARY KEY,
            winner TEXT,
            judgment TEXT,
            recommendation TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (debate_id) REFERENCES debates(debate_id)
        )
    """)

    conn.commit()
    conn.close()


class DebateService:
    """Service for managing debate flow with memory and persistence."""

    def __init__(self):
        settings = get_settings()
        self.db_path = (
            Path(settings.database_path).expanduser()
            if settings.database_path
            else DEFAULT_DB_PATH
        )

        # Initialize database
        init_database(self.db_path)

        # Initialize agents
        self.positive_agent = PositiveAgent(
            api_key=settings.glm_api_key,
            base_url=settings.glm_base_url,
            model=settings.glm_model,
        )
        self.negative_agent = NegativeAgent(
            api_key=settings.glm_api_key,
            base_url=settings.glm_base_url,
            model=settings.glm_model,
        )
        self.judgment_agent = JudgmentAgent(
            api_key=settings.glm_api_key,
            base_url=settings.glm_base_url,
            model=settings.glm_model,
        )
        self.moderator_agent = ModeratorAgent(
            api_key=settings.glm_api_key,
            base_url=settings.glm_base_url,
            model=settings.glm_model,
        )

        # Initialize memory service
        self.memory_service = MemoryService(api_key=settings.mem0_api_key)

        # In-memory cache for active debates
        self._debate_cache: dict[str, DebateState] = {}

    def create_debate(
        self,
        topic: str,
        context: Optional[str] = None,
        rounds: int = 3,
    ) -> DebateState:
        """Create a new debate and persist to database."""
        debate_id = str(uuid.uuid4())
        state = DebateState(
            debate_id=debate_id,
            topic=topic,
            context=context,
            total_rounds=rounds,
            status=DebateStatus.PENDING,
        )

        # Persist to database
        self._save_debate(state)

        # Cache in memory
        self._debate_cache[debate_id] = state

        return state

    def _save_debate(self, state: DebateState):
        """Save debate state to database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO debates
            (debate_id, topic, context, total_rounds, current_round, status, arguments, positive_points, negative_points, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            state.debate_id,
            state.topic,
            state.context,
            state.total_rounds,
            state.current_round,
            state.status.value,
            json.dumps([arg.model_dump() for arg in state.arguments]),
            json.dumps(state.positive_points),
            json.dumps(state.negative_points),
            datetime.now().isoformat(),
        ))

        conn.commit()
        conn.close()

    def _load_debate(self, debate_id: str) -> Optional[DebateState]:
        """Load debate state from database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM debates WHERE debate_id = ?",
            (debate_id,)
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        return DebateState(
            debate_id=row[0],
            topic=row[1],
            context=row[2],
            total_rounds=row[3],
            current_round=row[4],
            status=DebateStatus(row[5]),
            arguments=[ArgumentRound(**a) for a in json.loads(row[6] or "[]")],
            positive_points=json.loads(row[8] or "[]"),
            negative_points=json.loads(row[9] or "[]"),
        )

    def get_debate(self, debate_id: str) -> Optional[DebateState]:
        """Get a debate by ID (check cache first, then database)."""
        if debate_id in self._debate_cache:
            return self._debate_cache[debate_id]

        state = self._load_debate(debate_id)
        if state:
            self._debate_cache[debate_id] = state
        return state

    def _save_result(self, result: DebateResult):
        """Save debate result to database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO debate_results
            (debate_id, winner, judgment, recommendation)
            VALUES (?, ?, ?, ?)
        """, (
            result.debate_id,
            result.winner.value,
            result.judgment,
            result.recommendation,
        ))

        conn.commit()
        conn.close()

    def get_result(self, debate_id: str) -> Optional[DebateResult]:
        """Load a previously saved debate result."""
        state = self.get_debate(debate_id)
        if not state:
            return None

        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT winner, judgment, recommendation
            FROM debate_results
            WHERE debate_id = ?
            """,
            (debate_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        return DebateResult(
            debate_id=debate_id,
            topic=state.topic,
            winner=DebateWinner(row[0]),
            judgment=row[1],
            recommendation=row[2],
            arguments=state.arguments,
            summary=None,
        )

    def run_debate(self, debate_id: str) -> DebateResult:
        """Run the full debate and return the result."""
        state = self.get_debate(debate_id)
        if not state:
            raise ValueError(f"Debate {debate_id} not found")

        existing_result = self.get_result(debate_id)
        if state.status == DebateStatus.COMPLETED and existing_result:
            return existing_result

        state.status = DebateStatus.IN_PROGRESS

        # Get user context from memory if available
        user_context = ""
        if self.memory_service.enabled:
            user_context = self.memory_service.get_user_context(
                user_id="default",
                query=state.topic,
            )

        # Moderator introduces the topic
        moderator_intro = self.moderator_agent.analyze_topic(
            state.topic, state.context
        )

        # Resume from the last completed round instead of replaying everything.
        positive_last_point = state.arguments[-1].positive if state.arguments else None
        negative_last_point = state.arguments[-1].negative if state.arguments else None
        start_round = state.current_round + 1 if state.arguments else 1

        for round_num in range(start_round, state.total_rounds + 1):
            state.current_round = round_num

            # Build context with memory
            enhanced_context = state.context or ""
            if user_context:
                enhanced_context = f"{enhanced_context}\n\n历史背景：{user_context}"

            # Positive agent argues with full context
            positive_arg = self.positive_agent.argue(
                topic=state.topic,
                context=enhanced_context,
                opponent_last_point=negative_last_point,
            )
            positive_last_point = positive_arg

            # Negative agent argues with full context
            negative_arg = self.negative_agent.argue(
                topic=state.topic,
                context=enhanced_context,
                opponent_last_point=positive_last_point,
            )
            negative_last_point = negative_arg

            # Store the round
            round_data = ArgumentRound(
                round=round_num,
                positive=positive_arg,
                negative=negative_arg,
            )
            state.arguments.append(round_data)

            # Track points
            state.positive_points.append(positive_arg)
            state.negative_points.append(negative_arg)

            # Save state after each round
            self._save_debate(state)

        # Get judgment
        judgment = self.judgment_agent.judge(
            topic=state.topic,
            context=state.context,
            arguments=[arg.model_dump() for arg in state.arguments],
        )

        # Parse judgment to determine winner
        judgment_result = self.judgment_agent.parse_judgment(judgment)
        winner = DebateWinner(judgment_result.winner)

        state.status = DebateStatus.COMPLETED
        self._save_debate(state)

        # Build result
        result = DebateResult(
            debate_id=debate_id,
            topic=state.topic,
            winner=winner,
            judgment=judgment,
            recommendation=(
                judgment_result.recommendation
                or self._extract_recommendation(judgment)
            ),
            arguments=state.arguments,
            summary=moderator_intro,
        )

        # Save result to database
        self._save_result(result)

        # Store in memory for future reference
        if self.memory_service.enabled:
            self.memory_service.store_debate(
                user_id="default",
                topic=state.topic,
                result=result.model_dump(),
                metadata={
                    "winner": winner.value,
                    "rounds": state.total_rounds,
                },
            )

        return result

    def _extract_recommendation(self, judgment: str) -> str:
        """Extract the recommendation from the judgment text."""
        markers = ["【综合建议】", "建议", "推荐", "结论", "最终建议"]
        for marker in markers:
            if marker in judgment:
                parts = judgment.split(marker)
                if len(parts) > 1:
                    return marker + parts[1][:500]
        return judgment[:500]

    def run_single_round(
        self, debate_id: str
    ) -> Optional[ArgumentRound]:
        """Run a single round of the debate."""
        state = self.get_debate(debate_id)
        if not state:
            raise ValueError(f"Debate {debate_id} not found")

        if state.status == DebateStatus.COMPLETED:
            return None

        if state.status == DebateStatus.PENDING:
            state.status = DebateStatus.IN_PROGRESS

        round_num = state.current_round + 1
        if round_num > state.total_rounds:
            return None

        state.current_round = round_num

        # Get last arguments
        positive_last = None
        negative_last = None
        if state.arguments:
            last_round = state.arguments[-1]
            positive_last = last_round.positive
            negative_last = last_round.negative

        # Get user context from memory
        user_context = ""
        if self.memory_service.enabled:
            user_context = self.memory_service.get_user_context(
                user_id="default",
                query=state.topic,
            )

        enhanced_context = state.context or ""
        if user_context:
            enhanced_context = f"{enhanced_context}\n\n历史背景：{user_context}"

        # Run the round
        positive_arg = self.positive_agent.argue(
            topic=state.topic,
            context=enhanced_context,
            opponent_last_point=negative_last,
        )

        negative_arg = self.negative_agent.argue(
            topic=state.topic,
            context=enhanced_context,
            opponent_last_point=positive_arg,
        )

        round_data = ArgumentRound(
            round=round_num,
            positive=positive_arg,
            negative=negative_arg,
        )
        state.arguments.append(round_data)
        state.positive_points.append(positive_arg)
        state.negative_points.append(negative_arg)

        # Save state
        self._save_debate(state)

        if round_num >= state.total_rounds:
            state.status = DebateStatus.COMPLETED
            self._save_debate(state)

        return round_data

    def get_all_debates(self) -> list[dict]:
        """Get all debates from database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            SELECT debate_id, topic, status, created_at
            FROM debates
            ORDER BY created_at DESC
        """)

        debates = [
            {
                "debate_id": row[0],
                "topic": row[1],
                "status": row[2],
                "created_at": row[3],
            }
            for row in cursor.fetchall()
        ]
        conn.close()

        return debates

    def delete_debate(self, debate_id: str) -> bool:
        """Delete a debate from database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("DELETE FROM debate_results WHERE debate_id = ?", (debate_id,))
        cursor.execute("DELETE FROM debates WHERE debate_id = ?", (debate_id,))

        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()

        if debate_id in self._debate_cache:
            del self._debate_cache[debate_id]

        return deleted
