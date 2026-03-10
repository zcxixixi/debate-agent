from abc import ABC, abstractmethod
from typing import Optional
from openai import OpenAI


class BaseDebateAgent(ABC):
    """Base class for all debate agents."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        role_name: str,
        system_prompt: str,
    ):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.role_name = role_name
        self.system_prompt = system_prompt
        self._conversation_history: list[dict] = []

    def generate_response(
        self,
        user_message: str,
        conversation_history: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generate a response using the LLM."""
        messages = [{"role": "system", "content": self.system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        return response.choices[0].message.content

    def add_to_history(self, role: str, content: str):
        """Add a message to conversation history."""
        self._conversation_history.append({"role": role, "content": content})

    def clear_history(self):
        """Clear conversation history."""
        self._conversation_history = []

    def get_history_summary(self, max_rounds: int = 3) -> str:
        """Get a summary of recent conversation history."""
        if not self._conversation_history:
            return ""

        recent = self._conversation_history[-(max_rounds * 2):]
        summary_parts = []
        for msg in recent:
            role = "我" if msg["role"] == "assistant" else "对方"
            summary_parts.append(f"{role}: {msg['content'][:100]}...")

        return "\n".join(summary_parts)

    @abstractmethod
    def argue(self, topic: str, context: Optional[str] = None, **kwargs) -> str:
        """Generate an argument for the debate."""
        pass