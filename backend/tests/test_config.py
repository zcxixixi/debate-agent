"""Regression tests for backend configuration defaults."""

from unittest import TestCase

from app.config import Settings


class SettingsTests(TestCase):
    def test_allowed_origins_strips_whitespace(self):
        settings = Settings.model_construct(
            cors_origins=(
                " http://localhost:3000 , "
                "https://debate-agent.vercel.app ,"
            )
        )

        self.assertEqual(
            settings.allowed_origins,
            [
                "http://localhost:3000",
                "https://debate-agent.vercel.app",
            ],
        )

    def test_allowed_origins_falls_back_to_localhost(self):
        settings = Settings.model_construct(cors_origins="")

        self.assertEqual(settings.allowed_origins, ["http://localhost:3000"])
