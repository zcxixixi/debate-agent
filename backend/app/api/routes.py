"""API routes for debate endpoints."""

from fastapi import APIRouter, HTTPException
from app.schemas import (
    DebateStartRequest,
    DebateStartResponse,
    DebateResult,
    DebateState,
    ArgumentRound,
)
from app.services import DebateService

router = APIRouter(prefix="/debate", tags=["debate"])

# Global debate service instance
debate_service = DebateService()


@router.post("/start", response_model=DebateStartResponse)
async def start_debate(request: DebateStartRequest):
    """Start a new debate."""
    state = debate_service.create_debate(
        topic=request.topic,
        context=request.context,
        rounds=request.rounds,
    )
    return DebateStartResponse(
        debate_id=state.debate_id,
        status=state.status,
        current_round=state.current_round,
        arguments=state.arguments,
    )


@router.get("/{debate_id}", response_model=DebateState)
async def get_debate(debate_id: str):
    """Get the current state of a debate."""
    state = debate_service.get_debate(debate_id)
    if not state:
        raise HTTPException(status_code=404, detail="Debate not found")
    return state


@router.post("/{debate_id}/round", response_model=ArgumentRound)
async def run_round(debate_id: str):
    """Run a single round of the debate."""
    try:
        round_data = debate_service.run_single_round(debate_id)
        if not round_data:
            raise HTTPException(
                status_code=400, detail="Debate already completed"
            )
        return round_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{debate_id}/run", response_model=DebateResult)
async def run_full_debate(debate_id: str):
    """Run the complete debate and get the final result."""
    try:
        result = debate_service.run_debate(debate_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{debate_id}/result", response_model=DebateResult)
async def get_result(debate_id: str):
    """Get the final result of a completed debate."""
    state = debate_service.get_debate(debate_id)
    if not state:
        raise HTTPException(status_code=404, detail="Debate not found")

    if state.status.value != "completed":
        raise HTTPException(
            status_code=400, detail="Debate not yet completed"
        )

    result = debate_service.get_result(debate_id)
    if not result:
        raise HTTPException(status_code=404, detail="Debate result not found")
    return result


@router.get("/")
async def list_debates():
    """List all debates."""
    return debate_service.get_all_debates()


@router.delete("/{debate_id}")
async def delete_debate(debate_id: str):
    """Delete a debate."""
    deleted = debate_service.delete_debate(debate_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Debate not found")
    return {"message": "Debate deleted successfully"}
