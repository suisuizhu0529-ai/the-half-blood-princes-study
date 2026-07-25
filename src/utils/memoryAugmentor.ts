/**
 * Memory Augmentor（Phase 15.4）。
 *
 * 定位：将 SnapeContext + SessionMemory + RelationshipMemory 组合为
 *      MemoryAugmentedContext，供 PromptBuilder 生成增强版 PromptContext。
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 不读写 localStorage（RelationshipMemory 由调用方传入）
 *   - 不调用 LLM
 *   - 不依赖 React
 *   - 类型安全，无 any
 *
 * 与现有模块的关系：
 *   - 不修改 SnapeContext（LoreMemory 保留，原样传递）
 *   - 不修改 SessionMemory / RelationshipMemory（只读取，不写入）
 *   - 不修改 ContextBuilder / PromptBuilder / MessageBuilder
 *   - 仅作为 PromptBuilder 与 Memory 层之间的"组合层"
 *
 * Phase 15.4 范围：
 *   - 仅建立组合层 + 文本生成
 *   - 不接入 ConversationEngine（留待 Phase 15.5）
 *   - 不实现事件提取 / 数值演进
 */

import type { SnapeContext } from "@/types/context";
import type { SessionMemory } from "@/types/sessionMemory";
import type { RelationshipMemory } from "@/types/relationshipMemory";
import { getRecentContext } from "@/utils/sessionMemoryManager";
import { getRelationshipSummary } from "@/utils/relationshipMemoryManager";

/**
 * Memory 增强后的上下文。
 *
 * 在 SnapeContext 基础上叠加：
 *   - SessionMemory（会话内短期记忆）
 *   - RelationshipMemory（跨会话长期关系记忆）
 *   - memorySummary（组合后的简短文本，供 PromptBuilder 追加）
 *
 * 所有新增字段均为 optional，保持向后兼容：
 *   - 不传入 Memory 时，MemoryAugmentedContext 退化为原始 SnapeContext
 *   - PromptBuilder 检测到 memorySummary 为空时，不追加 Memory 段落
 */
export interface MemoryAugmentedContext {
  /** 原始 SnapeContext（LoreMemory / archive / emotionalHints 保留） */
  originalContext: SnapeContext;
  /** 会话内记忆（可选，未传入则不增强） */
  sessionMemory?: SessionMemory;
  /** 跨会话关系记忆（可选，未传入则不增强） */
  relationshipMemory?: RelationshipMemory;
  /** 组合后的简短文本（可选，供 PromptBuilder 直接拼入 relationshipSummary） */
  memorySummary?: string;
}

/**
 * 构建 Memory 增强上下文。
 *
 * 流程：
 *   1. 接收原始 SnapeContext + 可选 SessionMemory + 可选 RelationshipMemory
 *   2. 调用 getRecentContext() 生成会话内上下文摘要
 *   3. 调用 getRelationshipSummary() 生成关系记忆摘要
 *   4. 合并为 memorySummary 文本（用分隔符隔开）
 *   5. 返回 MemoryAugmentedContext
 *
 * 行为：
 *   - sessionMemory 为 undefined 或无 turns → 不生成 session 部分
 *   - relationshipMemory 为 undefined → 不生成 relationship 部分
 *   - 两者都缺失 → memorySummary 为 undefined（PromptBuilder 不追加）
 *
 * @param context 原始 SnapeContext（由 ContextBuilder 构建，不修改）
 * @param sessionMemory 可选，会话内记忆
 * @param relationshipMemory 可选，跨会话关系记忆
 * @returns MemoryAugmentedContext（包含 memorySummary 或 undefined）
 */
export function augmentContext(
  context: SnapeContext,
  sessionMemory?: SessionMemory,
  relationshipMemory?: RelationshipMemory,
): MemoryAugmentedContext {
  const sections: string[] = [];

  // 1. 关系记忆摘要（跨会话长期）
  if (relationshipMemory) {
    const summary = getRelationshipSummary(relationshipMemory);
    if (summary.trim().length > 0) {
      sections.push(summary);
    }
  }

  // 2. 会话内记忆摘要（短期）
  if (sessionMemory) {
    const sessionCtx = getRecentContext(sessionMemory);
    if (sessionCtx.trim().length > 0) {
      sections.push(sessionCtx);
    }
  }

  // 合并（用空行分隔，保持可读性）
  const memorySummary =
    sections.length > 0 ? sections.join("\n\n") : undefined;

  return {
    originalContext: context,
    sessionMemory,
    relationshipMemory,
    memorySummary,
  };
}
