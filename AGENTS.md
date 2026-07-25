# Phase 14 - Snape Persona Intelligence Audit

开始前不要修改代码。

目标：
提升真实 LLM 对话中的 Snape 人格一致性。

先审计以下文件：

1. src/data/persona/snape.ts

检查：
- 人格定义是否足够详细
- 是否包含：语言风格、情绪表达、对学生态度、教学方式、价值观、禁忌行为

2. src/services/conversation/promptBuilder.ts

检查：
最终发送给 LLM 的 prompt 结构，是否包含：Persona、Memory、Context、User message、System instruction

3. src/utils/memoryResolver.ts

检查：
- 如何选择记忆
- 是否根据当前对话相关性过滤
- 是否可能把无关 Memory 全塞给 LLM

4. src/utils/contextBuilder.ts

检查：
- Library、Archive、Lesson、Conversation state 如何进入 prompt

限制：
本阶段只 Audit。禁止修改 ConversationEngine、LLM Client、RuntimeConfig、UI。

完成后输出：

# Phase 14 Audit Report

## 1. 当前 Snape Persona 完整度评分（0-10）

## 2. 当前 Prompt Pipeline
画图：
Persona + Memory + Context + User Input → Prompt → LLM

## 3. 当前最大问题
按优先级：P0、P1、P2

## 4. 下一步最小修改方案
只列文件，不改代码。
