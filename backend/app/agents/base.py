from abc import ABC, abstractmethod
import asyncio
from typing import Optional

from fastapi import WebSocketDisconnect
from openai import OpenAI, AsyncOpenAI


class BaseDebateAgent(ABC):
    """Base class for all debate agents."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        backup_model: Optional[str],
        role_name: str,
        system_prompt: str,
        request_timeout_seconds: Optional[float] = None,
    ):
        self.sync_client = OpenAI(api_key=api_key, base_url=base_url)
        self.async_client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.backup_model = (
            backup_model.strip()
            if backup_model and backup_model.strip() and backup_model.strip() != model
            else None
        )
        self.role_name = role_name
        self.system_prompt = system_prompt
        self.request_timeout_seconds = request_timeout_seconds
        self._conversation_history: list[dict] = []

    def _build_messages(
        self,
        user_message: str,
        conversation_history: Optional[list[dict]] = None,
    ) -> list[dict]:
        messages = [{"role": "system", "content": self.system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})
        return messages

    def _model_sequence(self) -> list[str]:
        models = [self.model]
        if self.backup_model:
            models.append(self.backup_model)
        return models

    def _attempt_timeout_seconds(
        self,
        attempt_index: int,
        total_attempts: int,
    ) -> Optional[float]:
        if not self.request_timeout_seconds:
            return None

        if total_attempts <= 1:
            return self.request_timeout_seconds

        primary_budget = max(
            min(self.request_timeout_seconds * 0.5, self.request_timeout_seconds - 5.0),
            5.0,
        )
        if attempt_index == 0:
            return primary_budget

        return max(self.request_timeout_seconds - primary_budget, 5.0)

    def _should_retry_with_backup(
        self,
        attempt_index: int,
        total_attempts: int,
        has_partial_response: bool,
    ) -> bool:
        return (
            not has_partial_response
            and total_attempts > 1
            and attempt_index == 0
        )

    @staticmethod
    def _format_generation_error(exc: Exception) -> str:
        return f"[生成错误: {str(exc)[:100]}]"

    def generate_response(
        self,
        user_message: str,
        conversation_history: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generate a response using the LLM (non-streaming)."""
        messages = self._build_messages(user_message, conversation_history)
        models = self._model_sequence()
        last_error: Optional[Exception] = None

        for attempt_index, model_name in enumerate(models):
            try:
                response = self.sync_client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=self._attempt_timeout_seconds(attempt_index, len(models)),
                )
                return response.choices[0].message.content or ""
            except Exception as exc:
                last_error = exc
                if self._should_retry_with_backup(
                    attempt_index,
                    len(models),
                    has_partial_response=False,
                ):
                    print(
                        f"{self.role_name} 主模型 {model_name} 失败，切换到备用模型 {models[1]}: {exc}"
                    )
                    continue
                raise

        if last_error:
            raise last_error
        raise RuntimeError("No model attempts were executed")

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
        messages = self._build_messages(user_message, conversation_history)
        models = self._model_sequence()

        for attempt_index, model_name in enumerate(models):
            emitted_content = False
            try:
                stream = self.sync_client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=self._attempt_timeout_seconds(attempt_index, len(models)),
                    stream=True,
                )

                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        emitted_content = True
                        yield chunk.choices[0].delta.content
                return
            except Exception as exc:
                if self._should_retry_with_backup(
                    attempt_index,
                    len(models),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {model_name} 流式失败，切换到备用模型 {models[1]}: {exc}"
                    )
                    continue
                yield f"[Error: {exc}]"
                return

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
        messages = self._build_messages(user_message, conversation_history)
        models = self._model_sequence()

        for attempt_index, model_name in enumerate(models):
            full_response = ""
            emitted_content = False
            attempt_timeout = self._attempt_timeout_seconds(
                attempt_index,
                len(models),
            )

            try:
                if attempt_timeout is None:
                    stream = await self.async_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        stream=True,
                    )

                    async for chunk in stream:
                        if chunk.choices and chunk.choices[0].delta.content:
                            emitted_content = True
                            content = chunk.choices[0].delta.content
                            full_response += content
                            if stream_callback:
                                await stream_callback(content)
                else:
                    async with asyncio.timeout(attempt_timeout):
                        stream = await self.async_client.chat.completions.create(
                            model=model_name,
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            timeout=attempt_timeout,
                            stream=True,
                        )

                        async for chunk in stream:
                            if chunk.choices and chunk.choices[0].delta.content:
                                emitted_content = True
                                content = chunk.choices[0].delta.content
                                full_response += content
                                if stream_callback:
                                    await stream_callback(content)

                return full_response

            except WebSocketDisconnect:
                raise
            except RuntimeError as exc:
                if 'close message has been sent' in str(exc):
                    raise WebSocketDisconnect() from exc
                if self._should_retry_with_backup(
                    attempt_index,
                    len(models),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {model_name} 流式失败，切换到备用模型 {models[1]}: {exc}"
                    )
                    continue

                error_msg = self._format_generation_error(exc)
                if not full_response and stream_callback:
                    await stream_callback(error_msg)
                return full_response or error_msg
            except asyncio.TimeoutError as exc:
                timeout_error = TimeoutError(f"model {model_name} timed out")
                if self._should_retry_with_backup(
                    attempt_index,
                    len(models),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {model_name} 超时，切换到备用模型 {models[1]}: {timeout_error}"
                    )
                    continue

                error_msg = self._format_generation_error(timeout_error)
                if not full_response and stream_callback:
                    await stream_callback(error_msg)
                return full_response or error_msg
            except Exception as exc:
                if self._should_retry_with_backup(
                    attempt_index,
                    len(models),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {model_name} 失败，切换到备用模型 {models[1]}: {exc}"
                    )
                    continue

                error_msg = self._format_generation_error(exc)
                if not full_response and stream_callback:
                    await stream_callback(error_msg)
                return full_response or error_msg

        raise RuntimeError("No model attempts were executed")

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
