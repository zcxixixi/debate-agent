"""Compatibility exports for legacy imports.

The implementation now lives in the domain-specific ``app.debate`` and
``app.research`` packages so agents can work in parallel with less overlap.
"""

from app.debate import DebateService
from app.research import MemoryService

__all__ = ["DebateService", "MemoryService"]
