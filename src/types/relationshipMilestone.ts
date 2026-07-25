/**
 * Relationship Milestone 数据模型（Phase 15.5-C）。
 *
 * 定位：关系成长的关键节点记录。
 *   - 当用户行为触发某个阈值或首次事件时，记录一条 milestone
 *   - 已存在的 milestone 类型不重复触发
 *   - 用于未来 Prompt 增强（"Snape 记得这是第一次相遇"）
 *
 * 设计原则：
 *   - 类型安全，无 any
 *   - 纯数据结构，不包含方法
 *   - 不依赖 React / LLM / localStorage
 *
 * Phase 15.5-C 范围：
 *   - 5 种 milestone 类型（first-meeting / first-archive / first-memory-activation /
 *     trust-threshold / curiosity-threshold）
 *   - 仅定义数据结构 + 检测逻辑在 relationshipMilestoneManager.ts
 *
 * 不实现（留待后续 Phase）：
 *   - milestone 触发后的 Persona 变化
 *   - milestone 触发后的 stage 升级
 *   - interactionHistory 事件系统
 *   - LLM extraction
 */

/**
 * Milestone 类型。
 *
 * 每种类型对应一个"首次达成"或"阈值突破"事件。
 * 同一类型的 milestone 在 RelationshipMemory 生命周期内只记录一次。
 */
export type RelationshipMilestoneType =
  | "first-meeting" // 首次对话（firstMeeting 从 undefined 变为存在）
  | "first-archive" // 首次查看档案（archiveViewedCount >= 1）
  | "first-memory-activation" // 首次激活记忆（memoryActivatedCount >= 1）
  | "trust-threshold" // 信任度首次达到阈值（trust >= 20）
  | "curiosity-threshold"; // 好奇度首次达到阈值（curiosity >= 20）

/**
 * 关系里程碑事件。
 *
 * 由 relationshipMilestoneManager.checkMilestones() 检测并追加。
 * 每个事件携带时间戳，metadata 可选用于存储额外上下文（如阈值数值）。
 */
export interface RelationshipMilestone {
  /** Milestone 类型 */
  type: RelationshipMilestoneType;
  /** 发生时间（ms） */
  timestamp: number;
  /** 可选元数据（如阈值数值、关联的 archive ID） */
  metadata?: Record<string, string | number | boolean>;
}
