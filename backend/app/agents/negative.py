from typing import Optional
from .base import BaseDebateAgent


NEGATIVE_SYSTEM_PROMPT = """你是个有原则的人，担任辩论反方角色。你相信：有些事不能只看眼前利益。

## 你的价值观
- **有些底线不能碰**：不是所有事都能用钱来衡量
- **过程很重要**：走捷径可能到达终点，但路走歪了迟早要还
- **别只看眼前**：今天的捷径，可能是明天的坑
- **每个人都有自己的价值**：不能为了"大局"随便牺牲个人

## 辩论风格
说话要**直接、犀利、不留情面**。像总决赛辩手在做交叉质询，句子要短，刀口要准，压迫感要强。
允许使用**反问、讽刺、对比、排比**来制造张力，但**禁止脏话、低级辱骂、人身攻击**。

## 类比优先规则（最重要）
每次发言，必须先用一个**日常场景打比方**，让普通人一听就懂。
比如：
- "这就像为了省房租住进危房，省了钱但命悬一线"
- "这就像考试作弊拿到高分，但真正的东西一点没学会"
- "这就像借钱炒股，涨了是你运气，跌了你翻不了身"

## 硬性规则
1. **禁止讨好**：别说"你说的有道理"、"我理解你的观点"
2. **禁止复读**：别重复自己说过的论点，每轮都要有新角度
3. **禁止废话**：直接说重点，别铺垫太多
4. **先拆再立**：如果有对方上一轮发言，先狠狠干碎，再提出自己的新框架
5. **必须有爆点句**：每轮至少给出一句可以单独摘出来的狠话，但要服务论证，不准空喊口号

## 发言结构
先在心中想清楚：假设对方说的全对，那我还能怎么反驳？

然后按这个格式输出：
```markdown
### 比喻
{用日常场景打比方，让人一听就懂，比如"这就像..."}

### 破
{一句话击碎对方的核心论点}

### 立
{提出你的论点，从底线和长远角度}

### 据
- {具体的道德原则、长期风险或隐性伤害}
- {必要时补充第二条}
```

## 回答要求
- 用中文，说人话，别掉书袋
- 每段控制在150字以内
- 多用短句。关键判断可以单独成行，形成节奏感
- 别像客服，像一个真想赢的人"""


class NegativeAgent(BaseDebateAgent):
    """Agent that argues AGAINST the debate topic with deontologist philosophy."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        backup_model: Optional[str] = None,
        request_timeout_seconds: Optional[float] = None,
    ):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            model=model,
            backup_model=backup_model,
            role_name="反方",
            system_prompt=NEGATIVE_SYSTEM_PROMPT,
            request_timeout_seconds=request_timeout_seconds,
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

1. 先想一个日常场景来打比方，让人一听就懂
2. 假设对方说的全对，找出它最致命的漏洞（通常是忽视长期风险或伤到别人）
3. 用 Markdown 输出你的反驳和新论点，格式：
   ### 比喻
   {用"这就像..."开头，打一个日常比方}
   ### 破
   ...
   ### 立
   ...
   ### 据
   - ...
""")
        else:
            prompt_parts.append("""
\n这是第一轮发言，请提出你的开篇立论。

请用 Markdown 输出，格式：
   ### 比喻
   {用"这就像..."开头，打一个日常比方}
   ### 立
   {从底线和长远角度提出核心论点}
   ### 据
   - {道德原则、长期风险或隐性伤害支撑}
""")

        response = self.generate_response("\n".join(prompt_parts))
        self.add_to_history("assistant", response)
        return response

    async def argue_async(
        self,
        topic: str,
        context: Optional[str] = None,
        previous_arguments: Optional[list[dict]] = None,
        opponent_last_point: Optional[str] = None,
        my_previous_points: Optional[list[str]] = None,
        stream_callback: Optional[callable] = None,
    ) -> str:
        """Generate an opposing argument with streaming support (async version)."""
        prompt_parts = [f"辩论话题：{topic}"]

        if context:
            prompt_parts.append(f"\n背景信息：{context}")

        if my_previous_points and len(my_previous_points) > 0:
            prompt_parts.append("\n【我之前的论点（禁止重复）】")
            for i, point in enumerate(my_previous_points, 1):
                prompt_parts.append(f"{i}. {point[:100]}...")
            prompt_parts.append("\n⚠️ 你必须提出全新的论点，禁止换汤不换药！")

        if opponent_last_point:
            prompt_parts.append(f"\n【对方上一轮发言】\n{opponent_last_point}")
            prompt_parts.append("""
\n现在请按照以下流程思考并输出：

1. 先想一个日常场景来打比方，让人一听就懂
2. 假设对方说的全对，找出它最致命的漏洞（通常是忽视长期风险或伤到别人）
3. 用 Markdown 输出你的反驳和新论点，格式：
   ### 比喻
   {用"这就像..."开头，打一个日常比方}
   ### 破
   ...
   ### 立
   ...
   ### 据
   - ...
""")
        else:
            prompt_parts.append("""
\n这是第一轮发言，请提出你的开篇立论。

请用 Markdown 输出，格式：
   ### 比喻
   {用"这就像..."开头，打一个日常比方}
   ### 立
   {从底线和长远角度提出核心论点}
   ### 据
   - {道德原则、长期风险或隐性伤害支撑}
""")

        response = await self.generate_response_async(
            "\n".join(prompt_parts),
            stream_callback=stream_callback,
        )
        self.add_to_history("assistant", response)
        return response
