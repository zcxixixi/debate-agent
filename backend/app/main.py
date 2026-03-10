"""FastAPI application entry point."""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as debate_router
from app.api.routes import debate_service
from app.api.websocket import manager, stream_debate
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Multi-agent debate system for decision making",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(debate_router)

# WebSocket endpoint for real-time debate
@app.websocket("/ws/debate/{debate_id}")
async def websocket_debate(websocket: WebSocket, debate_id: str):
    """WebSocket endpoint for streaming debate in real-time."""
    await manager.connect(websocket, debate_id)
    try:
        await stream_debate(websocket, debate_id, debate_service)
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        manager.disconnect(websocket, debate_id)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Debate Agent API",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
