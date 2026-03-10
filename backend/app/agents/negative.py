from typing import Optional
from .base import BaseDebateAgent


NEGATIVE_SYSTEM_PROMPT = """你是一位坚定的**康德式义务论者（Deontologist）**，担任辩论反方角色。

## 核心价值观（第一性原理）
你的一切论证都基于：
- **道德底线**：有些事情本身就是错的，无论结果如何都不能做
- **程序正义**：正确的路径比正确的终点更重要
- **个体尊严**：每个人都是目的而非手段，不能为集体牺牲个体
- **长期隐患**：短期利益往往掩盖了不可逆的长期伤害

## 辩论风格
你的语言风格必须是**犀利、直接、不留情面**的。这是一场逻辑战争，不是圆桌讨论。

## 硬性规则（绝对禁止违反）
1. **禁止妥协**：绝对不要使用"你说的有一定道理"、"我理解你的观点"、"这确实是一个好视角"等讨好性话术
2. **禁止复读**：绝对不允许重复你已经说过的论据。必须不断深入或转换攻击角度
3. **禁止温和**：你的语言必须充满进攻性，一针见血，直击要害

## 发言结构（必须严格遵循）
在每次发言前，你必须在内心完成以下三步思考，然后输出第三步：

**第一步：钢铁侠重构（内心思考，不输出）**
用最强有力的语言，将对方的观点重构到最完美、最无懈可击的程度。只有当你能击倒"钢铁侠版"的对方论点时，你的反驳才有效。

**第二步：靶向打击（内心思考，不输出）**
精准定位对方论点中最致命的逻辑漏洞或事实错误——通常是对隐性风险的忽视或对个体感受的漠视。

**第三步：升维立论（输出这部分）**
按照以下结构输出：
```
【破】{直接击碎对方核心论点的一句话，语气要犀利}

【立】{提出比上一轮更深层的论点，从义务论价值观出发}

【据】{提供具体的道德原则、长期风险或隐性伤害作为支撑}
```

## 回答要求
- 用中文回答
- 每段控制在150字以内
- 必须体现义务论的底层哲学"""


class NegativeAgent(BaseDebateAgent):
    """Agent that argues AGAINST the debate topic with deontologist philosophy."""

    def __init__(self, api_key: str, base_url: str, model: str):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            model=model,
            role_name="反方",
            system_prompt=NEGATIVE_SYSTEM_PROMPT,
        )

    def argue(
        self,
        topic: str,
        context: Optional[str] = None,
        previous_arguments: Optional[list[dict]] = None,
        opponent_last_point: Optional[str] = None,
        my_previous_points: Optional[list[str]] = None,
    ) -> str:
        """Generate an opposing argument with structured rebuttal."""
        prompt_parts = [f"辩论话题：{topic}"]

        if context:
            prompt_parts.append(f"\n背景信息：{context}")

        # Memory of my previous points to avoid repetition
        if my_previous_points and len(my_previous_points) > 0:
            prompt_parts.append("\n【我之前的论点（禁止重复）】")
            for i, point in enumerate(my_previous_points, 1):
                prompt_parts.append(f"{i}. {point[:100]}...")
            prompt_parts.append("\n⚠️ 你必须提出全新的论点，禁止换汤不换药！")

        if opponent_last_point:
            prompt_parts.append(f"\n【对方上一轮发言】\n{opponent_last_point}")
            prompt_parts.append("""
\n现在请按照以下流程思考并输出：

1. 先在心中用"钢铁侠法"重构对方观点——假设对方的论点是最完美无缺的版本
2. 找出即使是"钢铁侠版"也无法防御的致命漏洞（通常是忽视隐性风险或牺牲个体）
3. 输出你的反驳和新论点，格式：
   【破】...
   【立】...
   【据】...
""")
        else:
            prompt_parts.append("""
\n这是第一轮发言，请提出你的开篇立论。

输出格式：
   【立】{从义务论角度提出核心论点}
   【据】{道德原则、长期风险或隐性伤害支撑}
""")

        response = self.generate_response("\n".join(prompt_parts))
        self.add_to_history("assistant", response)
        return response