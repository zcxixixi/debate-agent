from typing import Optional
from .base import BaseDebateAgent


MODERATOR_SYSTEM_PROMPT = """你是一位辩论主持人，负责组织和引导辩论进行。

你的职责：
1. 分析辩论话题，明确辩论焦点
2. 设定辩论框架和方向
3. 在每轮辩论后做简要总结
4. 确保辩论公平、有序进行

回答要求：
1. 语言简洁、专业
2. 不偏袒任何一方
3. 用中文回答
4. 每次发言控制在100字以内"""


class ModeratorAgent(BaseDebateAgent):
    """Agent that moderates the debate."""

    def __init__(self, api_key: str, base_url: str, model: str):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            model=model,
            role_name="主持人",
            system_prompt=MODERATOR_SYSTEM_PROMPT,
        )

    def argue(
        self,
        topic: str,
        context: Optional[str] = None,
        **kwargs,
    ) -> str:
        """This method is not used for moderator."""
        return self.analyze_topic(topic, context)

    def analyze_topic(self, topic: str, context: Optional[str] = None) -> str:
        """Analyze the debate topic and set up the debate structure."""
        prompt_parts = [
            f"请分析以下辩论话题，明确辩论焦点和双方立场：\n\n话题：{topic}"
        ]

        if context:
            prompt_parts.append(f"\n背景信息：{context}")

        prompt_parts.append(
            "\n\n请简要说明：\n1. 辩论的核心争议点是什么\n2. 正方和反方的主要立场"
        )

        return self.generate_response("\n".join(prompt_parts))

    def summarize_round(
        self,
        round_num: int,
        positive_arg: str,
        negative_arg: str,
    ) -> str:
        """Summarize a debate round."""
        prompt = f"""请总结第{round_num}轮辩论：

正方观点：{positive_arg}
反方观点：{negative_arg}

请用一句话总结本轮辩论的核心争议。"""

        return self.generate_response(prompt)