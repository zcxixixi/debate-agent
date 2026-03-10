from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class DebateStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class DebateWinner(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    DRAW = "draw"


class ArgumentRound(BaseModel):
    """A single round of debate arguments."""
    round: int
    positive: str = Field(description="正方论点（支持）")
    negative: str = Field(description="反方论点（反对）")


class DebateStartRequest(BaseModel):
    """Request to start a new debate."""

    topic: str = Field(min_length=1, max_length=500, description="辩论话题")
    context: Optional[str] = Field(default=None, description="用户提供的背景信息")
    rounds: int = Field(default=3, ge=1, le=5, description="辩论轮数")

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, value: str) -> str:
        topic = value.strip()
        if not topic:
            raise ValueError("topic cannot be empty")
        return topic

    @field_validator("context")
    @classmethod
    def normalize_context(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        context = value.strip()
        return context or None


class DebateStartResponse(BaseModel):
    """Response after starting a debate."""
    debate_id: str
    status: DebateStatus
    current_round: int
    arguments: list[ArgumentRound] = Field(default_factory=list)


class DebateResult(BaseModel):
    """Final debate result with judgment."""
    debate_id: str
    topic: str
    winner: DebateWinner
    judgment: str = Field(description="综合判断分析")
    recommendation: str = Field(description="最终建议")
    arguments: list[ArgumentRound]
    summary: Optional[str] = None


class DebateState(BaseModel):
    """Internal state of an ongoing debate."""
    debate_id: str
    topic: str
    context: Optional[str] = None
    total_rounds: int = 3
    current_round: int = 0
    status: DebateStatus = DebateStatus.PENDING
    arguments: list[ArgumentRound] = Field(default_factory=list)
    positive_points: list[str] = Field(default_factory=list)
    negative_points: list[str] = Field(default_factory=list)
