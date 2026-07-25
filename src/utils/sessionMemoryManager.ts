/**
 * Session Memory Manager（Phase 15.2）。
 *
 * 定位：SessionMemory 的创建、更新、查询纯函数集合。
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态（不持有模块级变量）
 *   - 不可变更新：所有方法返回新 SessionMemory，不修改原对象
 *   - 不持久化（不读写 localStorage）
 *   - 不调用 LLM
 *   - 类型安全，无 any
 *
 * 与 ConversationEngine 的关系：
 *   - Engine 构造时调用 createSessionMemory() 初始化
 *   - 每轮 converse() 后调用 updateSessionMemory() 追加本轮
 *   - Prompt 增强时调用 getRecentContext() 生成简短摘要
 *
 * 不修改：
 *   - ConversationEngine.history（仍由 Engine 内部维护）
 *   - ConversationState 结构
 *   - PromptBuilder / ContextBuilder / MessageBuilder
 */

import type {
  SessionMemory,
  SessionTurn,
  TopicHint,
  UserIntent,
  UserIntentType,
  RelationshipStageLite,
} from "@/types/sessionMemory";

/** recentTurns 最大保留条数（FIFO） */
const MAX_RECENT_TURNS = 20;

/** recentIntents 最大保留条数（FIFO） */
const MAX_RECENT_INTENTS = 5;

/**
 * 话题识别关键词表。
 *
 * 简单关键词匹配，不追求精确分类。
 * 顺序敏感：越具体的类型越靠前。
 */
const TOPIC_KEYWORDS: ReadonlyArray<readonly [TopicHint, readonly string[]]> = [
  ["identity-challenge", ["who are you", "你是谁", "real identity", "forget that you are", "fictional character"]],
  ["personal-inquiry", ["lily", "childhood", "regret", "feelings", "your past", "你的过去", "你的感情"]],
  ["potion-brewing", ["brew", "prepare", "make a potion", "酿制", "调配", "ingredients", "步骤"]],
  ["potion-theory", ["what is", "properties", "effect", "theory", "原理", "性质", "什么是"]],
  ["canon-lore", ["hogwarts", "dumbledore", "voldemort", "spell", "charm", "魔法世界", "霍格沃茨"]],
  ["small-talk", ["hello", "hi", "how are you", "thank", "你好", "谢谢", "今天"]],
];

/**
 * 意图识别关键词表。
 */
const INTENT_KEYWORDS: ReadonlyArray<readonly [UserIntentType, readonly string[]]> = [
  ["challenge", ["forget", "fictional", "stop pretending", "real identity", "ai", "人工智能", "假冒"]],
  ["test", ["test", "测试", "check", "验证"]],
  ["learn", ["teach", "learn", "how do i", "how to", "请教", "学习", "怎么"]],
  ["explore", ["what is", "tell me about", "explain", "介绍", "什么是", "告诉我"]],
  ["social", ["hello", "hi", "thank", "你好", "谢谢", "再见"]],
];

/**
 * 生成会话唯一标识。
 *
 * 与 conversationState.generateSessionId() 格式一致：
 *   `session-{timestamp-base36}-{random4}`
 */
function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `session-${ts}-${rand}`;
}

/**
 * 从用户消息推断话题。
 *
 * 匹配策略：按 TOPIC_KEYWORDS 顺序，命中第一个即返回。
 * 全部未命中返回 "unknown"。
 *
 * @param userMessage 用户消息
 * @returns 推断的话题标签
 */
function inferTopic(userMessage: string): TopicHint {
  const lower = userMessage.toLowerCase();
  for (const [topic, keywords] of TOPIC_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return topic;
    }
  }
  return "unknown";
}

/**
 * 从用户消息提取意图。
 *
 * 匹配策略：按 INTENT_KEYWORDS 顺序，命中第一个即返回。
 * 置信度：命中 1 个关键词 = 0.6，每多命中一个 +0.1，上限 1.0。
 * 全部未命中返回 { type: "explore", confidence: 0.3, trigger: "" }（默认意图）。
 *
 * @param userMessage 用户消息
 * @returns 用户意图记录
 */
function extractIntent(userMessage: string): UserIntent {
  const lower = userMessage.toLowerCase();
  for (const [type, keywords] of INTENT_KEYWORDS) {
    const hits = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (hits.length > 0) {
      const confidence = Math.min(0.6 + (hits.length - 1) * 0.1, 1.0);
      return {
        type,
        confidence,
        trigger: hits[0] ?? "",
      };
    }
  }
  return {
    type: "explore",
    confidence: 0.3,
    trigger: "",
  };
}

/**
 * 创建初始 SessionMemory。
 *
 * 用于一次新会话的开始：
 *   - 新 sessionId（不依赖 ConversationState，独立生成）
 *   - 空 recentTurns / recentIntents
 *   - currentTopic 未定义
 *
 * @param sessionId 可选，传入则用指定 id（与 ConversationState 对齐时使用）
 */
export function createSessionMemory(sessionId?: string): SessionMemory {
  return {
    sessionId: sessionId ?? generateSessionId(),
    startedAt: Date.now(),
    recentTurns: [],
    recentIntents: [],
  };
}

/**
 * 更新 SessionMemory（追加一轮对话）。
 *
 * 行为：
 *   - 追加新 SessionTurn 到 recentTurns（FIFO，超过 MAX_RECENT_TURNS 丢弃最早的）
 *   - 追加新 UserIntent 到 recentIntents（FIFO，超过 MAX_RECENT_INTENTS 丢弃最早的）
 *   - 更新 currentTopic（基于本轮用户消息推断，覆盖上一轮）
 *
 * @param memory 当前 SessionMemory
 * @param userMessage 本轮用户输入
 * @param assistantResponse 本轮助手响应
 * @param relationshipStage 本轮触发时的关系阶段
 * @returns 新 SessionMemory（不可变更新）
 */
export function updateSessionMemory(
  memory: SessionMemory,
  userMessage: string,
  assistantResponse: string,
  relationshipStage: RelationshipStageLite,
): SessionMemory {
  const newIndex =
    memory.recentTurns.length > 0
      ? memory.recentTurns[memory.recentTurns.length - 1].index + 1
      : 0;

  const newTurn: SessionTurn = {
    index: newIndex,
    user: userMessage,
    assistant: assistantResponse,
    timestamp: Date.now(),
    relationshipStage,
  };

  const newIntent = extractIntent(userMessage);
  const newTopic = inferTopic(userMessage);

  // FIFO 裁剪：保留最近 N 条
  const trimmedTurns = [...memory.recentTurns, newTurn].slice(-MAX_RECENT_TURNS);
  const trimmedIntents = [...memory.recentIntents, newIntent].slice(
    -MAX_RECENT_INTENTS,
  );

  return {
    ...memory,
    recentTurns: trimmedTurns,
    recentIntents: trimmedIntents,
    currentTopic: newTopic,
  };
}

/**
 * 生成供 prompt 使用的简短上下文摘要。
 *
 * 输出格式（纯字符串，供 PromptBuilder 追加到 systemPrompt 或 relationshipSummary）：
 *
 * ```
 * Session context:
 * - Current topic: identity-challenge
 * - Recent intents: test (0.8), learn (0.6)
 * - Turns in this session: 3
 * ```
 *
 * 若会话尚无对话轮次，返回空字符串（调用方决定是否拼入）。
 *
 * @param memory 当前 SessionMemory
 * @returns 简短上下文摘要（空字符串表示无可用上下文）
 */
export function getRecentContext(memory: SessionMemory): string {
  if (memory.recentTurns.length === 0) {
    return "";
  }

  const lines: string[] = ["Session context:"];

  if (memory.currentTopic) {
    lines.push(`- Current topic: ${memory.currentTopic}`);
  }

  if (memory.recentIntents.length > 0) {
    const intentSummary = memory.recentIntents
      .slice(-3) // 仅展示最近 3 个意图
      .map((intent) => `${intent.type} (${intent.confidence.toFixed(1)})`)
      .join(", ");
    lines.push(`- Recent intents: ${intentSummary}`);
  }

  lines.push(`- Turns in this session: ${memory.recentTurns.length}`);

  return lines.join("\n");
}

/**
 * 获取最近 N 轮对话（只读视图）。
 *
 * 用于 debug 展示（如 PersonaTest 页面的 Conversation History 面板）。
 * 不修改原数组。
 *
 * @param memory 当前 SessionMemory
 * @param count 期望获取的轮次数（默认 5，超出实际轮次时返回全部）
 */
export function getRecentTurns(
  memory: SessionMemory,
  count = 5,
): readonly SessionTurn[] {
  return memory.recentTurns.slice(-count);
}

/**
 * 获取会话已进行的轮次总数。
 *
 * 注意：返回的是 recentTurns 中保留的轮次数（受 MAX_RECENT_TURNS 限制），
 * 不是会话从开始到现在的累计轮次。若需要累计轮次，应使用
 * recentTurns[recentTurns.length - 1].index + 1（当 recentTurns 非空时）。
 *
 * @param memory 当前 SessionMemory
 * @returns 已保留的轮次数
 */
export function getTurnCount(memory: SessionMemory): number {
  return memory.recentTurns.length;
}
