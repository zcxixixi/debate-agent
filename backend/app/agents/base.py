from abc import ABC, abstractmethod
from typing import Optional, AsyncGenerator
from openai import OpenAI, AsyncOpenAI


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
        self.sync_client = OpenAI(api_key=api_key, base_url=base_url)
        self.async_client = AsyncOpenAI(api_key=api_key, base_url=base_url)
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
        """Generate a response using the LLM (non-streaming)."""
        messages = [{"role": "system", "content": self.system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})

        response = self.sync_client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        return response.choices[0].message.content or ""

    def generate_response_stream(
        self,
        user_message: str,
        conversation_history: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ):
        """Generate a streaming response using the LLM.

        Yields chunks of text as they are generated.
        """
        messages = [{"role": "system", "content": self.system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})

        try:
            stream = self.sync_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,  # Enable streaming
            )

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            # Fallback to non-streaming on error
            yield f"[Error: {e}]"

    async def generate_response_async(
        self,
        user_message: str,
        conversation_history: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        stream_callback: Optional[callable] = None,
    ) -> str:
        """Generate a response asynchronously with optional streaming callback.

        Args:
            user_message: The user's message
            conversation_history: Optional conversation history
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            stream_callback: Optional async callback for each chunk

        Returns:
            The complete response text
        """
        messages = [{"role": "system", "content": self.system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})

        full_response = ""

        try:
            stream = await self.async_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content

                    # Call streaming callback if provided
                    if stream_callback:
                        await stream_callback(content)

        except Exception as e:
            error_msg = f"[生成错误: {str(e)[:100]}]"
            full_response = error_msg
            if stream_callback:
                await stream_callback(error_msg)

        return full_response

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