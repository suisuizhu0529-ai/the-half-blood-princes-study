/**
 * Shared History 数据模型（Phase 15.6-A）。
 *
 * 定位：跨会话的"共同经历"叙事记忆。
 *   - 记录 Snape 与学生之间发生过的高价值事件
 *   - 持久化到 RelationshipMemory（localStorage）
 *   - 支持"Snape 记得你曾经犯过什么错误"等叙事能力
 *
 * 与 RelationshipMilestone 的区别：
 *   - Milestone 记录"首次达成"（一次性，5 种固定类型）
 *   - SharedHistoryEvent 记录"发生了什么"（可重复，有叙事内容，支持去重计数）
 *
 * 设计原则：
 *   - 类型安全，无 any
 *   - 纯数据结构，不包含方法
 *   - 不依赖 React / LLM / localStorage
 *
 * Phase 15.6-A 范围：
 *   - 4 种事件类型（topic-discussed / archive-explored / knowledge-gap / achievement）
 *   - 去重支持（count + timestamp，同一 subject 的事件累计而非重复记录）
 *
 * 不实现（留待后续 Phase）：
 *   - LLM extraction（事件捕获使用确定性规则）
 *   - 自动事件分类
 *   - 事件过期 / 衰减逻辑
 */

/**
 * 共同经历事件类型。
 *
 * Phase 15.6-A 首版 4 种类型，覆盖核心叙事场景：
 *   - topic-discussed：讨论了某话题（去重累计，避免变成聊天日志）
 *   - archive-explored：查看了某档案（与 milestone 的 first-archive 互补，
 *                       milestone 记录首次，此处记录具体档案内容）
 *   - knowledge-gap：知识薄弱点（如温度控制失败，高叙事价值）
 *   - achievement：成就（如成功酿制某药剂，与 progress.achievements 互补，
 *                  此处带叙事上下文）
 */
export type SharedHistoryEventType =
  | "topic-discussed" // 讨论了某话题
  | "archive-explored" // 查看了某档案
  | "knowledge-gap" // 知识薄弱点（如温度控制失败）
  | "achievement"; // 成就（如成功酿制某药剂）

/**
 * 共同经历事件。
 *
 * 去重策略：
 *   - 同一 type + subject 的事件不重复添加，而是 count++ 并更新 timestamp
 *   - 避免大量重复的 "讨论了 Draught of Living Death" 记录
 *   - count 表示该事件累计发生次数，timestamp 表示最后一次发生时间
 *
 * 主体过滤：
 *   - 事件 subject 必须与学生自身相关（I failed / I brewed）
 *   - 不记录第三人称事件（Harry failed / Snape did）
 *   - 由 capture 层负责过滤，类型层不强制
 */
export interface SharedHistoryEvent {
  /** 事件类型 */
  type: SharedHistoryEventType;
  /** 事件主题（如 "Draught of Living Death" / "temperature control"） */
  subject: string;
  /** 可选上下文（如失败原因、讨论细节） */
  detail?: string;
  /** 该事件累计发生次数（去重计数，初始为 1） */
  count: number;
  /** 最后一次发生时间（ms） */
  timestamp: number;
  /** 关联的 archive/memory id（若适用，archive-explored 事件使用） */
  sourceId?: string;
}
