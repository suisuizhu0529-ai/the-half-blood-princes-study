/**
 * Prompt 数据模型（Phase 8.6）。
 *
 * 定位：AI Prompt 生成层的输出结构。
 *   - 将 Persona / SnapeContext / ConversationState 组合为
 *     可直接发送给 AI API 的 prompt 文本
 *   - 与 SnapeContext（数据组合）区分：本层负责"文本化"
 *
 * 设计原则：
 *   - 纯字符串输出，供 AI API 直接使用
 *   - 字段 camelCase，与现有类型一致
 *   - 类型安全，无 any
 *
 * Phase 8.6 仅建立 Prompt 生成：
 *   - 不接 AI API
 *   - 不修改 Conversation UI
 *   - 不修改 Library / Memory / Persona / Context Builder / Conversation State
 */

import type { RelationshipContext } from "@/types/relationshipContext";
import type { InteractionGuidance } from "@/types/interactionGuidance";
import type { SharedHistoryContext } from "@/types/sharedHistoryContext";

/**
 * Prompt 输出结构。
 *
 * 三段式 prompt（Phase 8.6）：
 *   - systemPrompt        角色基础约束（从 PersonaProfile 生成）
 *   - contextPrompt       当前场景上下文（从 SnapeContext 生成）
 *   - relationshipSummary 会话状态摘要（从 ConversationState 生成）
 *
 * Phase 15.4 新增可选字段：
 *   - memorySummary       Memory 增强摘要（SessionMemory + RelationshipMemory）
 *                         由 memoryAugmentor 生成，未传入 Memory 时为 undefined
 *                         向后兼容：现有调用方不感知此字段
 */
export interface PromptContext {
  /** 系统提示词 —— 角色基础约束（人格 + 语言风格 + 情绪规则） */
  systemPrompt: string;

  /** 场景上下文提示词 —— 当前档案 / 记忆 / 情感 */
  contextPrompt: string;

  /** 会话状态摘要 —— 关系阶段 + 已查看档案 + 已激活记忆 */
  relationshipSummary: string;

  /**
   * Memory 增强摘要（可选，Phase 15.4）。
   *
   * 包含 SessionMemory 的会话内上下文 + RelationshipMemory 的关系记忆摘要。
   * 由 memoryAugmentor.augmentContext() 生成。
   *
   * - 未传入 Memory 时为 undefined（向后兼容，现有流程不感知）
   * - MessageBuilder 会将其追加到 system 消息内容末尾
   */
  memorySummary?: string;

  /**
   * 结构化关系上下文（可选，Phase 15.5-D-2）。
   *
   * RelationshipMemory 的只读视图模型，由 readRelationshipContext() 生成。
   * 与 memorySummary（自然语言摘要）并列，提供精确条件判断字段。
   *
   * - 由 ConversationEngine 直接读取并透传（不经 memoryAugmentor）
   * - MessageBuilder 会将其渲染为 <relationship_context> system block
   * - 未传入时为 undefined（向后兼容，现有流程不感知）
   * - 不包含 patience / eventsCount / isReturningUser 等内部字段
   */
  relationshipContext?: RelationshipContext;

  /**
   * 交互行为指引（可选，Phase 15.5-F）。
   *
   * 由 resolveBehaviorGuidance() 从 RelationshipContext 生成。
   * 将关系数值翻译为行为指引文本，作为运行时动态指令注入 prompt。
   *
   * - trust → toneDirective（控制防备程度，不是温暖程度）
   * - curiosity → teachingDirective（控制主动展开程度，不是知识难度）
   * - milestone → relationshipNotes（累积交互备注）
   *
   * 与 Persona 静态约束互补：Persona 定义"Snape 是谁"，
   * InteractionGuidance 定义"在当前关系下如何调整表现"。
   *
   * - 未传入时为 undefined（向后兼容，现有流程不感知）
   * - MessageBuilder 会将其渲染为 <interaction_guidance> system block
   */
  interactionGuidance?: InteractionGuidance;

  /**
   * 共同经历上下文（可选，Phase 15.6-A Step 6）。
   *
   * 由 readSharedHistory() 从 RelationshipMemory.sharedHistory 生成。
   * 描述"Snape 与学生之间发生过什么"，支持叙事性记忆回忆。
   *
   * trust 控制 recall 深度（不隐藏 memory）：
   *   - "fact"（trust 0-19）：只引用事实（type + subject）
   *   - "experience"（trust 20-59）：引用学习经历（+ detail + count）
   *   - "personal"（trust 60+）：引用个人评价（+ narrative framing）
   *
   * 与 RelationshipContext 的区别：
   *   - RelationshipContext 描述"当前关系状态"（trust / milestones）
   *   - SharedHistoryContext 描述"过去发生过什么"（事件列表）
   *
   * 与 InteractionGuidance 的区别：
   *   - InteractionGuidance 是行为指引（应该怎么做）
   *   - SharedHistoryContext 是事实记忆（记得什么）
   *
   * - 未传入时为 undefined（向后兼容，现有流程不感知）
   * - MessageBuilder 会将其渲染为 <shared_history> system block
   * - 插入位置：在 <relationship_context> 之后、<interaction_guidance> 之前
   *   （符合"过去 → 当前关系 → 行为策略"的逻辑链）
   */
  sharedHistoryContext?: SharedHistoryContext;
}
