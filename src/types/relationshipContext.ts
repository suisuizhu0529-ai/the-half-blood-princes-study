/**
 * Relationship Context 数据模型（Phase 15.5-D-1）。
 *
 * 定位：RelationshipMemory 的只读视图模型。
 *   - 由 relationshipMemoryReader 纯函数从 RelationshipMemory 转换而来
 *   - 面向 Prompt 注入与 UI 展示的简洁结构
 *   - 不包含原始 schema 的 metadata / progress 等内部字段
 *   - 不写入、不修改 RelationshipMemory
 *
 * 设计原则：
 *   - 类型安全，无 any
 *   - 纯数据结构，不包含方法
 *   - 不依赖 React / LLM / localStorage
 *   - 所有字段均为已确定值（无 undefined 数值，便于消费方直接使用）
 *
 * Phase 15.5-D-1 范围：
 *   - 仅定义数据结构 + reader 纯函数
 *   - 不接入 PromptBuilder（留待 Phase 15.5-D-2）
 *   - 不修改 RelationshipMemory schema
 *
 * 不实现（留待后续 Phase）：
 *   - conversationCount 推断（isReturningUser 暂用 firstMeeting 近似）
 *   - Prompt 注入逻辑
 *   - LLM extraction
 */

/**
 * 关系态度数值（只读视图）。
 *
 * trust / patience / curiosity 均为 0-100，
 * 由 RelationshipMemory.relationship 直接映射。
 */
export interface RelationshipLevel {
  /** 信任度（0-100） */
  trust: number;
  /** 耐心度（0-100） */
  patience: number;
  /** 好奇度（0-100） */
  curiosity: number;
}

/**
 * 里程碑达成标记（只读视图）。
 *
 * 将 RelationshipMemory.milestones 中的计数/时间戳
 * 转换为布尔标记 + 事件总数，便于消费方条件化判断。
 */
export interface RelationshipMilestoneFlags {
  /** 是否已首次相遇（firstMeeting 存在） */
  hasFirstMeeting: boolean;
  /** 是否已查看过至少 1 个档案 */
  hasViewedArchive: boolean;
  /** 是否已激活过至少 1 个记忆 */
  hasActivatedMemory: boolean;
  /** 已记录的里程碑事件总数 */
  eventsCount: number;
}

/**
 * 摘要标记（只读视图）。
 *
 * 组合判断标志，供 Prompt 条件化使用。
 */
export interface RelationshipSummaryFlags {
  /**
   * 是否为回头用户。
   *
   * TODO(Phase 15.5+): 当前实现使用 firstMeeting !== undefined 近似判断，
   * 即"首次对话已发生即视为回头用户"。
   * 未来应由 conversationCount 或 session history 判断，
   * 本阶段不修改 RelationshipMemory schema，不新增推断逻辑。
   */
  isReturningUser: boolean;
  /** Snape 是否已知用户姓名 */
  knowsUserName: boolean;
}

/**
 * RelationshipMemory 的只读视图模型。
 *
 * 由 readRelationshipContext() 转换而来。
 * 所有字段均为已确定值，消费方无需处理 undefined 数值。
 *
 * 用途：
 *   - Phase 15.5-D-2：Prompt 注入（条件化构造 Snape 对用户的态度描述）
 *   - UI debug 展示
 *   - 未来 milestone 通知系统
 */
export interface RelationshipContext {
  /** 用户姓名（若 Snape 已知，否则 undefined） */
  userName?: string;
  /** 关系态度数值（trust / patience / curiosity） */
  relationshipLevel: RelationshipLevel;
  /** 里程碑达成标记 */
  milestones: RelationshipMilestoneFlags;
  /** 摘要标记 */
  summaryFlags: RelationshipSummaryFlags;
}
