from abc import ABC, abstractmethod
import asyncio
from dataclasses import dataclass
from typing import Optional, TYPE_CHECKING

import httpx
from fastapi import WebSocketDisconnect
from openai import OpenAI, AsyncOpenAI

if TYPE_CHECKING:
    from app.research.search_service import SearchService
    from app.research.rag_service import RAGService


@dataclass(frozen=True)
class ModelAttempt:
    provider: str
    api_key: str
    base_url: str
    model: str


class BaseDebateAgent(ABC):
    """Base class for all debate agents."""

    def __init__(
        self,
        provider: str,
        api_key: str,
        base_url: str,
        model: str,
        backup_model: Optional[str],
        role_name: str,
        system_prompt: str,
        request_timeout_seconds: Optional[float] = None,
        backup_provider: Optional[str] = None,
        backup_api_key: Optional[str] = None,
        backup_base_url: Optional[str] = None,
    ):
        self.provider = self._normalize_provider(provider)
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
        self._sync_openai_clients: dict[tuple[str, str], OpenAI] = {}
        self._async_openai_clients: dict[tuple[str, str], AsyncOpenAI] = {}
        self._attempts = [
            ModelAttempt(
                provider=self.provider,
                api_key=api_key,
                base_url=base_url,
                model=model,
            )
        ]
        if self.backup_model:
            self._attempts.append(
                ModelAttempt(
                    provider=self._normalize_provider(backup_provider or self.provider),
                    api_key=backup_api_key or api_key,
                    base_url=backup_base_url or base_url,
                    model=self.backup_model,
                )
            )

        # Research services
        self.search_service: Optional["SearchService"] = None
        self.rag_service: Optional["RAGService"] = None

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

    @staticmethod
    def _normalize_provider(provider: Optional[str]) -> str:
        if not provider:
            return "openai"
        normalized = provider.strip().lower()
        if normalized not in {"openai", "anthropic", "minimax"}:
            raise ValueError(f"Unsupported LLM provider: {provider}")
        return normalized

    @staticmethod
    def _anthropic_messages_url(base_url: str) -> str:
        normalized = base_url.rstrip("/")
        if normalized.endswith("/messages"):
            return normalized
        if normalized.endswith("/v1"):
            return f"{normalized}/messages"
        return f"{normalized}/v1/messages"

    @staticmethod
    def _extract_text_content(payload: dict) -> str:
        return "".join(
            block.get("text", "")
            for block in payload.get("content", [])
            if block.get("type") == "text"
        )

    @staticmethod
    def _chunk_text(content: str, chunk_size: int = 24) -> list[str]:
        return [
            content[index:index + chunk_size]
            for index in range(0, len(content), chunk_size)
        ] or [""]

    def _get_sync_openai_client(self, attempt: ModelAttempt) -> OpenAI:
        client_key = (attempt.api_key, attempt.base_url)
        if client_key not in self._sync_openai_clients:
            self._sync_openai_clients[client_key] = OpenAI(
                api_key=attempt.api_key,
                base_url=attempt.base_url,
                max_retries=0,
            )
        return self._sync_openai_clients[client_key]

    def _get_async_openai_client(self, attempt: ModelAttempt) -> AsyncOpenAI:
        client_key = (attempt.api_key, attempt.base_url)
        if client_key not in self._async_openai_clients:
            self._async_openai_clients[client_key] = AsyncOpenAI(
                api_key=attempt.api_key,
                base_url=attempt.base_url,
                max_retries=0,
            )
        return self._async_openai_clients[client_key]

    def _build_anthropic_payload(
        self,
        messages: list[dict],
        attempt: ModelAttempt,
        temperature: float,
        max_tokens: int,
    ) -> dict:
        system_parts: list[str] = []
        conversation_messages: list[dict] = []

        for message in messages:
            role = message.get("role")
            content = message.get("content", "")
            if role == "system":
                system_parts.append(str(content))
                continue
            if role not in {"user", "assistant"}:
                continue
            conversation_messages.append({"role": role, "content": str(content)})

        payload = {
            "model": attempt.model,
            "max_tokens": max_tokens,
            "messages": conversation_messages,
            "temperature": temperature,
        }
        if system_parts:
            payload["system"] = "\n\n".join(system_parts)
        return payload

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
            min(self.request_timeout_seconds * 0.75, self.request_timeout_seconds - 8.0),
            8.0,
        )
        if attempt_index == 0:
            return primary_budget

        return max(self.request_timeout_seconds - primary_budget, 8.0)

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
        last_error: Optional[Exception] = None

        for attempt_index, attempt in enumerate(self._attempts):
            try:
                timeout_seconds = self._attempt_timeout_seconds(
                    attempt_index,
                    len(self._attempts),
                )
                if attempt.provider in {"anthropic", "minimax"}:
                    response = httpx.post(
                        self._anthropic_messages_url(attempt.base_url),
                        headers={
                            "content-type": "application/json",
                            "anthropic-version": "2023-06-01",
                            "x-api-key": attempt.api_key,
                        },
                        json=self._build_anthropic_payload(
                            messages,
                            attempt,
                            temperature,
                            max_tokens,
                        ),
                        timeout=timeout_seconds,
                    )
                    response.raise_for_status()
                    return self._extract_text_content(response.json())

                response = self._get_sync_openai_client(attempt).chat.completions.create(
                    model=attempt.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=timeout_seconds,
                )
                return response.choices[0].message.content or ""
            except Exception as exc:
                last_error = exc
                if self._should_retry_with_backup(
                    attempt_index,
                    len(self._attempts),
                    has_partial_response=False,
                ):
                    print(
                        f"{self.role_name} 主模型 {attempt.model} 失败，切换到备用模型 {self._attempts[1].model}: {exc}"
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

        for attempt_index, attempt in enumerate(self._attempts):
            emitted_content = False
            try:
                timeout_seconds = self._attempt_timeout_seconds(
                    attempt_index,
                    len(self._attempts),
                )
                if attempt.provider in {"anthropic", "minimax"}:
                    response = httpx.post(
                        self._anthropic_messages_url(attempt.base_url),
                        headers={
                            "content-type": "application/json",
                            "anthropic-version": "2023-06-01",
                            "x-api-key": attempt.api_key,
                        },
                        json=self._build_anthropic_payload(
                            messages,
                            attempt,
                            temperature,
                            max_tokens,
                        ),
                        timeout=timeout_seconds,
                    )
                    response.raise_for_status()
                    content = self._extract_text_content(response.json())
                    emitted_content = bool(content)
                    for chunk in self._chunk_text(content):
                        yield chunk
                    return

                stream = self._get_sync_openai_client(attempt).chat.completions.create(
                    model=attempt.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=timeout_seconds,
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
                    len(self._attempts),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {attempt.model} 流式失败，切换到备用模型 {self._attempts[1].model}: {exc}"
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

        for attempt_index, attempt in enumerate(self._attempts):
            full_response = ""
            emitted_content = False
            attempt_timeout = self._attempt_timeout_seconds(
                attempt_index,
                len(self._attempts),
            )

            try:
                if attempt.provider in {"anthropic", "minimax"}:
                    async with httpx.AsyncClient(timeout=attempt_timeout) as client:
                        response = await client.post(
                            self._anthropic_messages_url(attempt.base_url),
                            headers={
                                "content-type": "application/json",
                                "anthropic-version": "2023-06-01",
                                "x-api-key": attempt.api_key,
                            },
                            json=self._build_anthropic_payload(
                                messages,
                                attempt,
                                temperature,
                                max_tokens,
                            ),
                        )
                        response.raise_for_status()
                        full_response = self._extract_text_content(response.json())
                        emitted_content = bool(full_response)
                        if stream_callback and full_response:
                            for chunk in self._chunk_text(full_response):
                                await stream_callback(chunk)
                        return full_response

                if attempt_timeout is None:
                    stream = await self._get_async_openai_client(attempt).chat.completions.create(
                        model=attempt.model,
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
                        stream = await self._get_async_openai_client(attempt).chat.completions.create(
                            model=attempt.model,
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
                    len(self._attempts),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {attempt.model} 流式失败，切换到备用模型 {self._attempts[1].model}: {exc}"
                    )
                    continue

                error_msg = self._format_generation_error(exc)
                if not full_response and stream_callback:
                    await stream_callback(error_msg)
                return full_response or error_msg
            except asyncio.TimeoutError as exc:
                timeout_error = TimeoutError(f"model {attempt.model} timed out")
                if self._should_retry_with_backup(
                    attempt_index,
                    len(self._attempts),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {attempt.model} 超时，切换到备用模型 {self._attempts[1].model}: {timeout_error}"
                    )
                    continue

                error_msg = self._format_generation_error(timeout_error)
                if not full_response and stream_callback:
                    await stream_callback(error_msg)
                return full_response or error_msg
            except Exception as exc:
                if self._should_retry_with_backup(
                    attempt_index,
                    len(self._attempts),
                    has_partial_response=emitted_content,
                ):
                    print(
                        f"{self.role_name} 主模型 {attempt.model} 失败，切换到备用模型 {self._attempts[1].model}: {exc}"
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

    def set_search_service(self, service: "SearchService"):
        """Set search service for real-time evidence."""
        self.search_service = service

    def set_rag_service(self, service: "RAGService"):
        """Set RAG service for knowledge context."""
        self.rag_service = service

    async def get_research_context(self, topic: str) -> str:
        """Get combined research context from all services."""
        contexts = []

        if self.rag_service and self.rag_service.is_available():
            context = await self.rag_service.get_context(topic)
            if context:
                contexts.append(f"[知识库]: {context}")

        if self.search_service and self.search_service.is_available():
            context = await self.search_service.search_evidence(topic)
            if context:
                contexts.append(f"[实时搜索]: {context}")

        return "\n\n".join(contexts)
