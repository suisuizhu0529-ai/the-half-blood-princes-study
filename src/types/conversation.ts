/**
 * Conversation State 数据模型（Phase 8.5）。
 *
 * 定位：Snape 对话系统的状态基础层。
 *   - 跟踪一次会话的进度（已查看档案、已激活记忆、关系阶段）
 *   - 供未来 AI 对话系统作为会话级上下文
 *   - 与 SnapeContext（Phase 8.4）配合：State 记录"发生了什么"，Context 记录"当前场景是什么"
 *
 * 设计原则：
 *   - 纯数据结构，不接 AI、不渲染、不写 localStorage（持久化由调用方决定）
 *   - 字段 camelCase，与现有类型一致
 *   - 类型安全，无 any
 *   - 不可变更新：所有更新方法返回新 state，不修改原对象
 *
 * Phase 8.5 仅建立状态结构与更新方法：
 *   - 不接 AI
 *   - 不修改 Conversation UI
 *   - 不修改 Library / Memory / Persona / Context Builder
 */

import type { RelationshipStage } from "@/types/persona";
import type { SnapeContext } from "@/types/context";

/**
 * 对话状态。
 *
 * 一次会话的完整状态快照。
 * 由 conversationState.ts 的方法不可变更新。
 */
export interface ConversationState {
  /** 会话唯一标识 */
  sessionId: string;

  /** 已查看的 archive id 列表（去重） */
  viewedArchives: string[];

  /** 已激活的 memory id 列表（去重） */
  activatedMemories: string[];

  /** 当前关系阶段（影响 Snape 语气开放程度） */
  relationshipStage: RelationshipStage;

  /** 最近一次构建的 SnapeContext（供 AI prompt 续接） */
  lastContext?: SnapeContext;
}
