/**
 * Shared History Context 数据模型（Phase 15.6-A Step 5）。
 *
 * 定位：RelationshipMemory.sharedHistory 的只读视图模型。
 *   - 由 sharedHistoryReader 纯函数从 RelationshipMemory 转换而来
 *   - 面向 Prompt 注入与 UI 展示的简洁结构
 *   - 不包含原始 schema 的 timestamp / sourceId 等内部字段
 *   - 不写入、不修改 RelationshipMemory
 *
 * 与 RelationshipContext 的区别：
 *   - RelationshipContext 描述"Snape 如何认识这个学生"（stage / trust / milestones）
 *   - SharedHistoryContext 描述"我们之间发生过什么"（事件列表 + recall 深度）
 *   - 两者并列，互不重叠，由不同 Reader 生成
 *
 * 与 InteractionGuidance 的区别：
 *   - InteractionGuidance 是行为指引（tone / teaching approach / relationship notes）
 *   - SharedHistoryContext 是事实记忆（发生了什么）
 *   - SharedHistoryContext 不会描述"应该怎么做"，只描述"记得什么"
 *
 * trust 控制 recall 深度（不隐藏 memory）：
 *   - "fact"（trust 0-19）：只引用事实（type + subject）
 *   - "experience"（trust 20-59）：引用学习经历（+ detail + count）
 *   - "personal"（trust 60+）：引用个人评价（+ narrative framing）
 *
 * 设计原则：
 *   - 类型安全，无 any
 *   - 纯数据结构，不包含方法
 *   - 不依赖 React / LLM / localStorage
 *   - 所有字段均为已确定值（events 至少为空数组，depth 永远存在）
 */

import type { SharedHistoryEventType } from "@/types/sharedHistory";

/**
 * Recall 深度（由 trust 决定）。
 *
 * 设计意图：
 *   Snape 的特点不是"不记得"，而是"不承认"。
 *   因此 memory 永远可读，但 trust 控制 Snape 愿意透露多少细节。
 *
 *   - "fact"：冷淡的事实陈述
 *     示例："The student has struggled with draught of living death."
 *   - "experience"：带细节的学习经历
 *     示例："The student has struggled with draught of living death,
 *            particularly temperature control (3 times)."
 *   - "personal"：带叙事 framing 的个人评价
 *     示例：附带 framing 字段，描述 Snape 对这段经历的态度
 */
export type SharedHistoryRecallDepth = "fact" | "experience" | "personal";

/**
 * 单条 SharedHistory 事件的只读视图。
 *
 * 字段可见性由 SharedHistoryContext.depth 决定：
 *   - depth="fact"：仅 type + subject（其他字段 undefined）
 *   - depth="experience"：type + subject + count + detail（framing undefined）
 *   - depth="personal"：全部字段（含 framing）
 *
 * 注意：
 *   - count / detail 在 "fact" 深度下为 undefined（不是 0 / 空字符串）
 *   - framing 仅在 "personal" 深度下存在
 *   - 消费方（PromptBuilder）应按 depth 条件化读取
 */
export interface SharedHistoryRecallEvent {
  /** 事件类型 */
  type: SharedHistoryEventType;
  /** 事件主题（如 "draught of living death" / "potion brewing"） */
  subject: string;
  /** 累计发生次数（depth="experience" 及以上才返回） */
  count?: number;
  /** 可选细节（depth="experience" 及以上才返回） */
  detail?: string;
  /**
   * Snape 视角的叙事 framing（仅 depth="personal" 返回）。
   *
   * 示例：
   *   "The student has repeatedly struggled with temperature control
   *    while attempting Draught of Living Death."
   *
   * 用于 Prompt 注入时直接作为自然语言引用。
   */
  framing?: string;
}

/**
 * SharedHistory 的只读视图模型。
 *
 * 由 readSharedHistory() 转换而来。
 *
 * 空状态：
 *   - sharedHistory 为 undefined / 空数组时，返回 { depth: "fact", events: [] }
 *   - depth 仍由 trust 决定（即使无事件，depth 仍反映关系程度）
 *
 * @see sharedHistoryReader.ts
 */
export interface SharedHistoryContext {
  /** Recall 深度（由 trust 决定） */
  depth: SharedHistoryRecallDepth;
  /** 事件列表（按类型优先级 + timestamp desc 排序） */
  events: SharedHistoryRecallEvent[];
}
