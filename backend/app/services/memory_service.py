"""Memory service using Mem0 for storing debate history."""

from typing import Optional
from datetime import datetime

try:
    from mem0 import Memory
    MEM0_AVAILABLE = True
except ImportError:
    MEM0_AVAILABLE = False


class MemoryService:
    """Service for managing debate memory using Mem0."""

    def __init__(self, api_key: Optional[str] = None):
        self.enabled = MEM0_AVAILABLE and bool(api_key)
        if self.enabled:
            try:
                self.memory = Memory(api_key=api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize Mem0: {e}")
                self.enabled = False
        else:
            self.memory = None

    def store_debate(
        self,
        user_id: str,
        topic: str,
        result: dict,
        metadata: Optional[dict] = None,
    ) -> Optional[str]:
        """Store a debate result in memory."""
        if not self.enabled:
            return None

        try:
            # Store key points from the debate
            winner = result.get("winner", "unknown")
            recommendation = result.get("recommendation", "")

            memory_text = f"""
辩论记录 [{datetime.now().strftime("%Y-%m-%d %H:%M")}]
话题: {topic}
结果: {winner}
核心建议: {recommendation[:200]}
"""

            result_data = self.memory.add(
                memory_text,
                user_id=user_id,
                metadata=metadata or {},
            )
            return result_data.get("id") if result_data else None
        except Exception as e:
            print(f"Warning: Failed to store memory: {e}")
            return None

    def store_round_memory(
        self,
        user_id: str,
        topic: str,
        round_num: int,
        positive_arg: str,
        negative_arg: str,
        summary: str,
    ) -> Optional[str]:
        """Store individual round memory for context retrieval."""
        if not self.enabled:
            return None

        try:
            memory_text = f"""
话题 [{topic}] 第{round_num}轮:
正方要点: {positive_arg[:150]}
反方要点: {negative_arg[:150]}
总结: {summary}
"""
            result = self.memory.add(
                memory_text,
                user_id=user_id,
                metadata={
                    "topic": topic,
                    "round": round_num,
                    "type": "round_summary",
                },
            )
            return result.get("id") if result else None
        except Exception as e:
            print(f"Warning: Failed to store round memory: {e}")
            return None

    def get_user_context(self, user_id: str, query: str) -> str:
        """Retrieve relevant context from user's debate history."""
        if not self.enabled:
            return ""

        try:
            memories = self.memory.search(query, user_id=user_id)
            if memories and "results" in memories:
                context_parts = []
                for mem in memories["results"][:5]:  # Top 5 relevant memories
                    memory_text = mem.get("memory", "")
                    if memory_text:
                        context_parts.append(memory_text)
                return "\n\n".join(context_parts)
        except Exception as e:
            print(f"Warning: Failed to retrieve memory: {e}")

        return ""

    def get_topic_history(self, user_id: str, topic: str) -> list[dict]:
        """Get all memories related to a specific topic."""
        if not self.enabled:
            return []

        try:
            memories = self.memory.search(topic, user_id=user_id)
            return memories.get("results", [])
        except Exception as e:
            print(f"Warning: Failed to get topic history: {e}")
            return []

    def get_all_user_debates(self, user_id: str) -> list[dict]:
        """Get all debates for a user."""
        if not self.enabled:
            return []

        try:
            memories = self.memory.get_all(user_id=user_id)
            return memories.get("results", [])
        except Exception as e:
            print(f"Warning: Failed to get user memories: {e}")
            return []

    def clear_user_memory(self, user_id: str) -> bool:
        """Clear all memories for a user."""
        if not self.enabled:
            return False

        try:
            self.memory.delete_all(user_id=user_id)
            return True
        except Exception as e:
            print(f"Warning: Failed to clear memory: {e}")
            return False