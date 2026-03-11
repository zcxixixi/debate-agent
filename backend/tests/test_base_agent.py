"""Regression tests for model fallback behavior in BaseDebateAgent."""

import asyncio
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.agents.base import BaseDebateAgent


class DummyAgent(BaseDebateAgent):
    def argue(self, topic: str, context=None, **kwargs) -> str:
        return topic


def make_chunk(content: str):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                delta=SimpleNamespace(content=content),
            )
        ]
    )


class FakeAsyncStream:
    def __init__(self, chunks: list[str]):
        self._chunks = chunks

    def __aiter__(self):
        self._iterator = iter(self._chunks)
        return self

    async def __anext__(self):
        try:
            return make_chunk(next(self._iterator))
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class BaseAgentFallbackTests(TestCase):
    @patch("app.agents.base.AsyncOpenAI")
    @patch("app.agents.base.OpenAI")
    def test_generate_response_falls_back_to_backup_model(
        self,
        mock_openai,
        mock_async_openai,
    ):
        sync_client = MagicMock()
        sync_client.chat.completions.create.side_effect = [
            RuntimeError("primary failed"),
            SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(content="备用模型成功"),
                    )
                ]
            ),
        ]
        mock_openai.return_value = sync_client
        mock_async_openai.return_value = MagicMock()

        agent = DummyAgent(
            provider="openai",
            api_key="test-key",
            base_url="http://example.com/v1",
            model="glm-5",
            backup_model="glm-4.7",
            role_name="测试",
            system_prompt="system",
            request_timeout_seconds=40.0,
        )

        result = agent.generate_response("hello")

        self.assertEqual(result, "备用模型成功")
        self.assertEqual(
            sync_client.chat.completions.create.call_args_list[0].kwargs["model"],
            "glm-5",
        )
        self.assertEqual(
            sync_client.chat.completions.create.call_args_list[1].kwargs["model"],
            "glm-4.7",
        )

    @patch("app.agents.base.httpx.post")
    @patch("app.agents.base.AsyncOpenAI")
    @patch("app.agents.base.OpenAI")
    def test_generate_response_falls_back_from_anthropic_to_openai_backup(
        self,
        mock_openai,
        mock_async_openai,
        mock_http_post,
    ):
        mock_http_post.side_effect = httpx.ReadTimeout("primary timed out")
        sync_client = MagicMock()
        sync_client.chat.completions.create.return_value = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content="GLM 兜底成功"),
                )
            ]
        )
        mock_openai.return_value = sync_client
        mock_async_openai.return_value = MagicMock()

        agent = DummyAgent(
            provider="anthropic",
            api_key="primary-key",
            base_url="https://api.minimaxi.com/anthropic",
            model="MiniMax-M2.5",
            backup_model="glm-4.5-air",
            role_name="测试",
            system_prompt="system",
            request_timeout_seconds=40.0,
            backup_provider="openai",
            backup_api_key="backup-key",
            backup_base_url="http://example.com/v1",
        )

        result = agent.generate_response("hello")

        self.assertEqual(result, "GLM 兜底成功")
        self.assertEqual(
            sync_client.chat.completions.create.call_args.kwargs["model"],
            "glm-4.5-air",
        )


class BaseAgentAsyncFallbackTests(IsolatedAsyncioTestCase):
    @patch("app.agents.base.AsyncOpenAI")
    @patch("app.agents.base.OpenAI")
    async def test_generate_response_async_falls_back_to_backup_model(
        self,
        mock_openai,
        mock_async_openai,
    ):
        async_client = MagicMock()
        async_client.chat.completions.create = AsyncMock(
            side_effect=[
                asyncio.TimeoutError(),
                FakeAsyncStream(["备", "用", "成", "功"]),
            ]
        )
        mock_async_openai.return_value = async_client
        mock_openai.return_value = MagicMock()

        agent = DummyAgent(
            provider="openai",
            api_key="test-key",
            base_url="http://example.com/v1",
            model="glm-5",
            backup_model="glm-4.7",
            role_name="测试",
            system_prompt="system",
            request_timeout_seconds=40.0,
        )

        streamed_chunks: list[str] = []

        async def on_chunk(chunk: str):
            streamed_chunks.append(chunk)

        result = await agent.generate_response_async(
            "hello",
            stream_callback=on_chunk,
        )

        self.assertEqual(result, "备用成功")
        self.assertEqual("".join(streamed_chunks), "备用成功")
        self.assertEqual(
            async_client.chat.completions.create.call_args_list[0].kwargs["model"],
            "glm-5",
        )
        self.assertEqual(
            async_client.chat.completions.create.call_args_list[1].kwargs["model"],
            "glm-4.7",
        )

    @patch("app.agents.base.httpx.AsyncClient")
    async def test_generate_response_async_supports_anthropic_provider(
        self,
        mock_async_client_cls,
    ):
        response = MagicMock()
        response.json.return_value = {
            "content": [
                {"type": "text", "text": "官方MiniMax返回成功"}
            ]
        }
        response.raise_for_status.return_value = None

        async_client = MagicMock()
        async_client.post = AsyncMock(return_value=response)
        context_manager = MagicMock()
        context_manager.__aenter__ = AsyncMock(return_value=async_client)
        context_manager.__aexit__ = AsyncMock(return_value=None)
        mock_async_client_cls.return_value = context_manager

        agent = DummyAgent(
            provider="anthropic",
            api_key="primary-key",
            base_url="https://api.minimaxi.com/anthropic",
            model="MiniMax-M2.5",
            backup_model=None,
            role_name="测试",
            system_prompt="system",
            request_timeout_seconds=40.0,
        )

        streamed_chunks: list[str] = []

        async def on_chunk(chunk: str):
            streamed_chunks.append(chunk)

        result = await agent.generate_response_async(
            "hello",
            stream_callback=on_chunk,
        )

        self.assertEqual(result, "官方MiniMax返回成功")
        self.assertEqual("".join(streamed_chunks), "官方MiniMax返回成功")


class AnthropicCompatibleUrlTests(TestCase):
    def test_anthropic_messages_url_accepts_v1_base(self):
        self.assertEqual(
            DummyAgent._anthropic_messages_url("https://api.minimax.chat/v1"),
            "https://api.minimax.chat/v1/messages",
        )

    def test_anthropic_messages_url_accepts_messages_base(self):
        self.assertEqual(
            DummyAgent._anthropic_messages_url(
                "https://api.minimax.chat/v1/messages"
            ),
            "https://api.minimax.chat/v1/messages",
        )

    @patch("app.agents.base.httpx.post")
    @patch("app.agents.base.AsyncOpenAI")
    @patch("app.agents.base.OpenAI")
    def test_generate_response_supports_minimax_provider_via_messages_api(
        self,
        mock_openai,
        mock_async_openai,
        mock_http_post,
    ):
        response = MagicMock()
        response.json.return_value = {
            "content": [{"type": "text", "text": "MiniMax 同步返回成功"}]
        }
        response.raise_for_status.return_value = None
        mock_http_post.return_value = response
        mock_openai.return_value = MagicMock()
        mock_async_openai.return_value = MagicMock()

        agent = DummyAgent(
            provider="minimax",
            api_key="primary-key",
            base_url="https://api.minimax.chat/v1",
            model="MiniMax-M2.5",
            backup_model=None,
            role_name="测试",
            system_prompt="system",
        )

        result = agent.generate_response("hello")

        self.assertEqual(result, "MiniMax 同步返回成功")
        self.assertEqual(
            mock_http_post.call_args.args[0],
            "https://api.minimax.chat/v1/messages",
        )
