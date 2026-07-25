/**
 * Relationship Memory 数据模型（Phase 15.3）。
 *
 * 定位：跨会话的"Snape 如何认识这个学生"长期记忆。
 *   - 描述 Snape 对当前用户的认知与态度
 *   - 持久化到 localStorage（跨页面刷新保留）
 *   - 与 SessionMemory（会话内短期）互补
 *
 * 设计原则：
 *   - 类型安全，无 any
 *   - 纯数据结构，不包含方法
 *   - 不依赖 React
 *   - 复用现有 RelationshipStage（保持与 Persona / ConversationState 一致）
 *
 * Phase 15.3 范围（基础设施）：
 *   - 仅建立数据结构 + localStorage 持久化 + 纯函数管理器
 *   - 不接入 ConversationEngine
 *   - 不修改 PromptBuilder
 *   - 不实现事件提取 / mistake system / event system
 *   - 不实现自动关系升级
 *
 * 后续阶段（不在本阶段范围）：
 *   - Phase 15.4：memoryAugmentor + PromptBuilder 扩展
 *   - Phase 15.5：Engine 集成 + 事件提取 + 态度数值演进
 *   - 未来：interactionHistory / commonMistakes / achievements 解锁逻辑
 */

import type { RelationshipStage } from "@/types/persona";
import type { RelationshipMilestone } from "@/types/relationshipMilestone";
import type { SharedHistoryEvent } from "@/types/sharedHistory";

/**
 * 当前 RelationshipMemory schema 版本。
 *
 * 用于未来 schema 变更时的迁移判断。
 * - version 1：Phase 15.3 初始版本
 */
export const RELATIONSHIP_MEMORY_VERSION = 1;

/**
 * 学习风格推断类型。
 *
 * 从用户互动中推断的学习偏好，用于 Snape 调整教学方式。
 */
export type LearningStyle =
  | "visual" // 视觉型（偏好图示/描述）
  | "analytical" // 分析型（偏好原理/理论）
  | "hands-on" // 实践型（偏好操作/步骤）
  | "unknown"; // 未知（初始状态）

/**
 * 偏好语言类型。
 */
export type PreferredLanguage =
  | "en" // 英文
  | "zh" // 中文
  | "mixed"; // 混合

/**
 * RelationshipMemory 元数据。
 *
 * 用于版本管理与持久化追踪。
 */
export interface RelationshipMemoryMetadata {
  /** Schema 版本（当前为 1） */
  version: number;
  /** 匿名用户 ID（localStorage 生成的 UUID，不收集 PII） */
  userId: string;
  /** 首次创建时间（ms） */
  createdAt: number;
  /** 最近更新时间（ms） */
  updatedAt: number;
}

/**
 * 关系态度数值。
 *
 * 每个维度 0-100，影响 Snape 对用户的态度表现。
 * 初始值：trust=0, patience=50, curiosity=0
 */
export interface RelationshipAttitude {
  /** 关系阶段（与 ConversationState.relationshipStage 对齐） */
  stage: RelationshipStage;
  /** 信任度（0-100，影响 Snape 是否愿意分享私人内容） */
  trust: number;
  /** 耐心度（0-100，影响 Snape 的容忍度） */
  patience: number;
  /** 好奇度（0-100，Snape 对这个学生的兴趣） */
  curiosity: number;
}

/**
 * 用户画像。
 *
 * Snape 对当前用户的认知。
 * 所有字段可选，初始为空。
 */
export interface UserProfile {
  /** 用户自报姓名（如 "John"），可选 */
  name?: string;
  /** 已知偏好（从对话中提取，如 "prefers theoretical discussions"） */
  knownPreferences: string[];
  /** 学习风格推断 */
  learningStyle?: LearningStyle;
  /** 偏好语言 */
  preferredLanguage?: PreferredLanguage;
}

/**
 * 学习进度。
 *
 * 用户在魔药学习上的进展。
 */
export interface LearningProgress {
  /** 魔药知识等级（1-5，基于互动深度） */
  potionLevel: number;
  /** 已完成的课程/话题 */
  completedTopics: string[];
  /** 成就（解锁的里程碑） */
  achievements: string[];
}

/**
 * 关系里程碑。
 *
 * 记录关键关系事件的计数与时间戳。
 * Phase 15.3 仅记录数据，不自动更新（留待 Phase 15.5）。
 *
 * Phase 15.5-C 新增可选字段：
 *   - events：关系里程碑事件列表（首次达成的关键节点）
 *             向后兼容：未传入时为 undefined，现有代码不感知
 */
export interface RelationshipMilestones {
  /** 首次相遇时间（ms，可选，首次 converse 时写入） */
  firstMeeting?: number;
  /** 已查看档案总数（累计，跨会话） */
  archiveViewedCount: number;
  /** 已激活记忆总数（累计，跨会话） */
  memoryActivatedCount: number;
  /**
   * 关系里程碑事件列表（可选，Phase 15.5-C）。
   *
   * 记录首次达成的关键节点（first-meeting / first-archive 等）。
   * 同一类型的 milestone 只记录一次（由 relationshipMilestoneManager 去重）。
   * 未初始化时为 undefined，向后兼容现有数据。
   */
  events?: RelationshipMilestone[];
}

/**
 * RelationshipMemory 完整结构。
 *
 * 持久化到 localStorage（key: prince-memory-v1）。
 *
 * 容量预估：
 *   - metadata：~100 bytes
 *   - relationship：~80 bytes
 *   - userProfile：~200 bytes（knownPreferences 限长后）
 *   - progress：~300 bytes（completedTopics / achievements 限长后）
 *   - milestones：~60 bytes
 *   - sharedHistory：~1-2KB（Phase 15.6-A，受 capture 层去重与上限控制）
 *   - 总计：< 3KB，远低于 localStorage 配额
 */
export interface RelationshipMemory {
  /** 元数据（版本 / userId / 时间戳） */
  metadata: RelationshipMemoryMetadata;
  /** 关系态度（stage / trust / patience / curiosity） */
  relationship: RelationshipAttitude;
  /** 用户画像 */
  userProfile: UserProfile;
  /** 学习进度 */
  progress: LearningProgress;
  /** 关系里程碑 */
  milestones: RelationshipMilestones;
  /**
   * 共同经历事件列表（可选，Phase 15.6-A）。
   *
   * 记录 Snape 与学生之间发生过的高价值事件：
   *   - topic-discussed：讨论了某话题（去重累计）
   *   - archive-explored：查看了某档案
   *   - knowledge-gap：知识薄弱点（高叙事价值）
   *   - achievement：成就
   *
   * 与 milestones.events 的区别：
   *   - milestones 记录"首次达成"（一次性）
   *   - sharedHistory 记录"发生了什么"（可重复，count 累计）
   *
   * 向后兼容：未初始化时为 undefined，现有数据加载不受影响。
   * Phase 15.6-A Step 2 仅扩展 schema，不接入 capture / read 逻辑。
   */
  sharedHistory?: SharedHistoryEvent[];
}
