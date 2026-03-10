from typing import Optional
from pydantic import BaseModel
from .base import BaseDebateAgent


JUDGMENT_SYSTEM_PROMPT = """你是一位极其严格的辩论裁判，负责在辩论结束后做出公正的判断。

## 你的评判标准
你不是一个和稀泥的调解员，你是一场高强度的逻辑战争的裁决者。

## 评分维度（每项1-10分）

### 1. 破击力 (Destruction)
- 是否精准击中对方论点的核心漏洞？
- 反驳是否让对方陷入困境？
- "钢铁侠重构"后是否依然有效？

### 2. 立论深度 (Depth)
- 论点是否比上一轮更深入？
- 是否触及底层哲学层面的冲突？
- 是否避免了表面现象的纠缠？

### 3. 论据强度 (Evidence)
- 数据/案例是否具体可信？
- 逻辑推演是否严密？
- 是否存在明显的事实错误？

### 4. 攻击性 (Aggression)
- 语言是否犀利有力？
- 是否避免了讨好和妥协？
- 是否保持了辩论的张力？

## 输出格式（必须严格遵守）
```
【正方评分】
- 破击力：X/10
- 立论深度：X/10
- 论据强度：X/10
- 攻击性：X/10
- 小计：XX/40

【反方评分】
- 破击力：X/10
- 立论深度：X/10
- 论据强度：X/10
- 攻击性：X/10
- 小计：XX/40

【裁决结果】
正方总分：XX | 反方总分：XX
胜方：[正方/反方/平局]
差距分析：{解释为什么分数差距是这个结果}

【最终建议】
{基于用户实际情况，给出具体的决策建议}
```

## 重要规则
1. 必须对所有轮次进行回顾，不要只看最后一轮
2. 分数必须有明确的差距，避免大量平分
3. 建议要结合用户背景，不能泛泛而谈"""


class AgentScores(BaseModel):
    """Scores for a single agent."""
    destruction: int = 0  # 破击力
    depth: int = 0  # 立论深度
    evidence: int = 0  # 论据强度
    aggression: int = 0  # 攻击性

    @property
    def total(self) -> int:
        return self.destruction + self.depth + self.evidence + self.aggression


class JudgmentResult(BaseModel):
    """Structured judgment result."""
    positive_scores: AgentScores
    negative_scores: AgentScores
    winner: str
    recommendation: str
    raw_judgment: str


class JudgmentAgent(BaseDebateAgent):
    """Agent that judges the debate and provides final recommendation."""

    def __init__(self, api_key: str, base_url: str, model: str):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            model=model,
            role_name="裁判",
            system_prompt=JUDGMENT_SYSTEM_PROMPT,
        )

    def argue(
        self,
        topic: str,
        context: Optional[str] = None,
        arguments: Optional[list[dict]] = None,
        **kwargs,
    ) -> str:
        return self.judge(topic, context, arguments)

    def judge(
        self,
        topic: str,
        context: Optional[str] = None,
        arguments: Optional[list[dict]] = None,
        round_summaries: Optional[list[str]] = None,
    ) -> str:
        """Generate a judgment based on all arguments."""
        prompt_parts = [f"辩论话题：{topic}"]

        if context:
            prompt_parts.append(f"\n用户背景：{context}")

        if round_summaries:
            prompt_parts.append("\n\n【各轮总结】")
            for i, summary in enumerate(round_summaries, 1):
                prompt_parts.append(f"\n第{i}轮：{summary}")

        if arguments:
            prompt_parts.append("\n\n【完整辩论记录】")
            for arg in arguments:
                prompt_parts.append(f"\n═══ 第{arg['round']}轮 ═══")
                prompt_parts.append(f"\n[正方] {arg['positive']}")
                prompt_parts.append(f"\n[反方] {arg['negative']}")

        prompt_parts.append(
            "\n\n请严格按照评分格式输出，对所有轮次进行综合评估后给出裁决。"
        )

        return self.generate_response(
            "\n".join(prompt_parts), temperature=0.3
        )

    def parse_judgment(self, judgment_text: str) -> JudgmentResult:
        """Parse the judgment text into structured result."""
        import re

        positive_scores = AgentScores()
        negative_scores = AgentScores()

        # Parse positive scores
        pos_destruction = re.findall(r"破击力：(\d+)/10", judgment_text)
        pos_depth = re.findall(r"立论深度：(\d+)/10", judgment_text)
        pos_evidence = re.findall(r"论据强度：(\d+)/10", judgment_text)
        pos_aggression = re.findall(r"攻击性：(\d+)/10", judgment_text)

        if len(pos_destruction) >= 2:
            positive_scores.destruction = int(pos_destruction[0])
            positive_scores.depth = int(pos_depth[0])
            positive_scores.evidence = int(pos_evidence[0])
            positive_scores.aggression = int(pos_aggression[0])

            negative_scores.destruction = int(pos_destruction[1])
            negative_scores.depth = int(pos_depth[1])
            negative_scores.evidence = int(pos_evidence[1])
            negative_scores.aggression = int(pos_aggression[1])

        # Determine winner from scores
        score_diff = positive_scores.total - negative_scores.total
        if score_diff >= 3:
            winner = "positive"
        elif score_diff <= -3:
            winner = "negative"
        else:
            winner = "draw"

        # Extract recommendation
        recommendation = ""
        rec_match = re.search(
            r"【最终建议】(.*?)(?=【|$)",
            judgment_text,
            re.DOTALL
        )
        if rec_match:
            recommendation = rec_match.group(1).strip()

        return JudgmentResult(
            positive_scores=positive_scores,
            negative_scores=negative_scores,
            winner=winner,
            recommendation=recommendation,
            raw_judgment=judgment_text,
        )

    def determine_winner(self, judgment_text: str) -> str:
        """Determine the winner from judgment text."""
        result = self.parse_judgment(judgment_text)
        return result.winner