"""Regression tests for model fallback behavior in BaseDebateAgent."""

import asyncio
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock, patch

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
