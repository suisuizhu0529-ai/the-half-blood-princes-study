/**
 * Session Memory 数据模型（Phase 15.2）。
 *
 * 定位：当前浏览器会话期间的短期上下文记忆。
 *   - 保存当前页面会话期间的对话轮次、话题、用户意图
 *   - 生命周期：浏览器会话（页面刷新即丢失，不持久化）
 *   - 作为 ConversationEngine.history 的观察层与增强层
 *
 * 设计原则：
 *   - 类型安全，无 any
 *   - 纯数据结构，不包含方法
 *   - 不依赖 ConversationTurn（避免循环依赖，但字段对齐）
 *
 * 与 ConversationEngine.history 的关系：
 *   - history 是 Engine 内部的原始 ConversationTurn[]（用于 buildMessages）
 *   - SessionMemory 是上层观察层，追加结构化元数据（topic / intent / timestamp）
 *   - 两者并存，SessionMemory 不替换 history
 *
 * Phase 15.2 仅建立数据结构与 Manager：
 *   - 不持久化（不写 localStorage）
 *   - 不调用 LLM
 *   - 不修改 ConversationState 结构
 *   - 不进入 RelationshipMemory（Phase 15.3）
 */

/**
 * 话题标签（从最近几轮对话推断的粗粒度话题）。
 *
 * 用于 prompt 增强与 debug 展示，不追求精确分类。
 */
export type TopicHint =
  | "potion-brewing" // 酿制操作类
  | "potion-theory" // 魔药理论类
  | "canon-lore" // HP 世界观/Canon 知识类
  | "personal-inquiry" // 询问 Snape 私人事务
  | "identity-challenge" // 质疑 Snape 身份
  | "small-talk" // 寒暄/闲聊
  | "unknown"; // 无法分类

/**
 * 用户意图类型。
 *
 * 从用户消息中提取的意图标签，用于 Snape 调整回应策略。
 */
export type UserIntentType =
  | "learn" // 求学/求知
  | "explore" // 探索/好奇
  | "challenge" // 挑衅/质疑
  | "social" // 社交/寒暄
  | "test"; // 测试/试探（如 PersonaTest）

/**
 * 用户意图记录。
 */
export interface UserIntent {
  /** 意图类型 */
  type: UserIntentType;
  /** 置信度（0-1，基于简单关键词匹配） */
  confidence: number;
  /** 触发该意图的用户消息片段（用于 debug） */
  trigger: string;
}

/**
 * 会话内单轮对话记录。
 *
 * 与 ConversationTurn 的区别：
 *   - 追加 timestamp / index / relationshipStage 元数据
 *   - 用于 SessionMemory.recentTurns，不直接传入 buildMessages
 *   - buildMessages 仍使用 ConversationEngine.history（ConversationTurn[]）
 */
export interface SessionTurn {
  /** 轮次序号（从 0 开始） */
  index: number;
  /** 用户输入 */
  user: string;
  /** 助手响应 */
  assistant: string;
  /** 该轮时间戳（ms） */
  timestamp: number;
  /** 该轮触发时的关系阶段 */
  relationshipStage: RelationshipStageLite;
}

/**
 * 关系阶段简化类型（避免 SessionMemory 类型层依赖 persona 模块）。
 *
 * 与 RelationshipStage 保持一致，但独立声明以隔离依赖。
 */
export type RelationshipStageLite =
  | "stranger"
  | "student"
  | "trusted-researcher"
  | "confidant";

/**
 * 会话内记忆。
 *
 * 生命周期：浏览器会话（页面刷新即丢失）。
 * 容量限制：
 *   - recentTurns：最多 20 条（FIFO，足够覆盖一轮典型对话）
 *   - recentIntents：最多 5 条（FIFO）
 *
 * @see SessionMemoryManager 负责创建与更新
 */
export interface SessionMemory {
  /** 会话 ID（与 ConversationState.sessionId 一致） */
  sessionId: string;
  /** 会话开始时间（ms） */
  startedAt: number;
  /** 最近对话轮次（FIFO，最多 20 条） */
  recentTurns: SessionTurn[];
  /** 当前话题（从最近几轮推断，可选） */
  currentTopic?: TopicHint;
  /** 最近用户意图（FIFO，最多 5 条） */
  recentIntents: UserIntent[];
}
