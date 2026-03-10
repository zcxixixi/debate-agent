"""Regression tests for the Mem0-backed memory service."""

from unittest import TestCase
from unittest.mock import patch

from app.services.memory_service import MemoryService


class MemoryServiceTests(TestCase):
    def test_uses_hosted_memory_client_for_api_key_configuration(self):
        with patch("app.services.memory_service.MemoryClient") as mock_client:
            service = MemoryService(
                api_key="test-key",
                host="https://api.mem0.example",
                org_id="org-1",
                project_id="project-1",
            )

        self.assertTrue(service.enabled)
        self.assertIs(service.memory, mock_client.return_value)
        mock_client.assert_called_once_with(
            api_key="test-key",
            host="https://api.mem0.example",
            org_id="org-1",
            project_id="project-1",
        )

    def test_disables_service_when_client_init_fails(self):
        with patch(
            "app.services.memory_service.MemoryClient",
            side_effect=RuntimeError("boom"),
        ):
            service = MemoryService(api_key="test-key")

        self.assertFalse(service.enabled)
        self.assertIsNone(service.memory)

    def test_store_debate_reads_nested_result_identifier(self):
        with patch("app.services.memory_service.MemoryClient") as mock_client:
            mock_client.return_value.add.return_value = {
                "results": [{"id": "memory-123"}]
            }
            service = MemoryService(api_key="test-key")

        memory_id = service.store_debate(
            user_id="user-1",
            topic="Should we adopt renewable energy?",
            result={"winner": "positive", "recommendation": "Yes"},
        )

        self.assertEqual(memory_id, "memory-123")
        mock_client.return_value.add.assert_called_once_with(
            mock_client.return_value.add.call_args.args[0],
            user_id="user-1",
            metadata={},
            async_mode=False,
        )

    def test_store_debate_falls_back_to_event_identifier(self):
        with patch("app.services.memory_service.MemoryClient") as mock_client:
            mock_client.return_value.add.return_value = {
                "results": [],
                "event_id": "event-123",
            }
            service = MemoryService(api_key="test-key")

        memory_id = service.store_debate(
            user_id="user-1",
            topic="Should we adopt renewable energy?",
            result={"winner": "positive", "recommendation": "Yes"},
        )

        self.assertEqual(memory_id, "event-123")

    def test_get_user_context_limits_and_concatenates_results(self):
        with patch("app.services.memory_service.MemoryClient") as mock_client:
            mock_client.return_value.search.return_value = {
                "results": [
                    {"memory": "first memory"},
                    {"memory": "second memory"},
                    {"memory": ""},
                ]
            }
            service = MemoryService(api_key="test-key")

        context = service.get_user_context("user-1", "renewable energy")

        self.assertEqual(context, "first memory\n\nsecond memory")
        mock_client.return_value.search.assert_called_once_with(
            "renewable energy",
            user_id="user-1",
            filters={"user_id": "user-1"},
            limit=5,
        )

    def test_get_all_user_debates_uses_hosted_filters(self):
        with patch("app.services.memory_service.MemoryClient") as mock_client:
            mock_client.return_value.get_all.return_value = {
                "results": [{"memory": "stored debate"}]
            }
            service = MemoryService(api_key="test-key")

        debates = service.get_all_user_debates("user-1")

        self.assertEqual(debates, [{"memory": "stored debate"}])
        mock_client.return_value.get_all.assert_called_once_with(
            user_id="user-1",
            filters={"user_id": "user-1"},
        )
