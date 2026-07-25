/**
 * Relationship Signal 数据模型（Phase 15.5-B2-A）。
 *
 * 定位：基于确定性规则识别的关系成长信号。
 *   - 由 relationshipSignalResolver 从 ConversationState 变化 + 用户消息关键词生成
 *   - 用于驱动 RelationshipMemory 的 trust / patience / curiosity 数值变化
 *   - 纯确定性规则，不涉及 LLM 判断
 *
 * 设计原则：
 *   - 类型安全，无 any
 *   - 纯数据结构，不包含方法
 *   - 不依赖 React / LLM / localStorage
 *
 * Phase 15.5-B2-A 范围：
 *   - 5 种信号类型（archive-viewed / memory-activated / lesson-progress / user-question / polite-interaction）
 *   - 仅定义数据结构，解析逻辑在 relationshipSignalResolver.ts
 *
 * 不实现（留待后续 Phase）：
 *   - relationship stage 自动升级
 *   - interactionHistory 事件系统
 *   - mistake system
 *   - LLM memory extraction
 *   - 用户画像推断 / learning style 推断
 */

/**
 * 关系信号类型。
 *
 * 每种类型对应一类确定性可识别的用户行为。
 */
export type RelationshipSignalType =
  | "archive-viewed" // 用户查看了新的 Library 档案
  | "memory-activated" // 用户激活了新的 Snape 记忆
  | "lesson-progress" // 用户完成了一节课程（未来扩展，本阶段不产生）
  | "user-question" // 用户提出了问题（含问号或疑问词）
  | "polite-interaction"; // 用户表达了感谢 / 礼貌互动

/**
 * 关系成长信号。
 *
 * 由 relationshipSignalResolver.resolveRelationshipSignals() 生成。
 * 每个信号携带时间戳，便于未来扩展为事件流。
 */
export interface RelationshipSignal {
  /** 信号类型 */
  type: RelationshipSignalType;
  /** 产生时间（ms） */
  timestamp: number;
}
