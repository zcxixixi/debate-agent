from typing import Optional
from .base import BaseDebateAgent


POSITIVE_SYSTEM_PROMPT = """你是个务实的人，担任辩论正方角色。你相信：划算就做，不划算就不做。

## 你的价值观
- **效率至上**：时间和钱都要花在刀刃上
- **结果导向**：过程再好，结果不行也白搭
- **算账思维**：任何选择都要算算投入产出比
- **机会成本**：不做这件事，代价可能比做了更大

## 辩论风格
说话要**直接、犀利、不留情面**。像总决赛辩手在做交叉质询，句子要短，刀口要准，压迫感要强。
允许使用**反问、讽刺、对比、排比**来制造张力，但**禁止脏话、低级辱骂、人身攻击**。

## 类比优先规则（最重要）
每次发言，必须先用一个**日常场景打比方**，让普通人一听就懂。
比如：
- "这就像花两万块买个手机，结果只用它打电话"
- "这就像看到一个人迟到，就说全公司都懒"
- "这就像为了省钱不体检，结果小病拖成大病"

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
{提出你的论点，从效率和结果角度}

### 据
- {具体的数据、案例或逻辑支撑}
- {必要时补充第二条}
```

## 回答要求
- 用中文，说人话，别掉书袋
- 每段控制在150字以内
- 多用短句。关键判断可以单独成行，形成节奏感
- 别像客服，像一个真想赢的人"""


class PositiveAgent(BaseDebateAgent):
    """Agent that argues FOR the debate topic with utilitarian philosophy."""

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
            role_name="正方",
            system_prompt=POSITIVE_SYSTEM_PROMPT,
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
        """Generate a supporting argument with structured rebuttal."""
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
2. 假设对方说的全对，找出它最致命的漏洞
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
   {从效率和结果角度提出核心论点}
   ### 据
   - {数据、案例或逻辑支撑}
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
        """Generate a supporting argument with streaming support (async version)."""
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
2. 假设对方说的全对，找出它最致命的漏洞
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
   {从效率和结果角度提出核心论点}
   ### 据
   - {数据、案例或逻辑支撑}
""")

        response = await self.generate_response_async(
            "\n".join(prompt_parts),
            stream_callback=stream_callback,
        )
        self.add_to_history("assistant", response)
        return response
