/**
 * Relationship Behavior Resolver（Phase 15.5-F）。
 *
 * 定位：RelationshipContext → InteractionGuidance 的纯函数转换器。
 *   - 将"关系数值"翻译为"行为指引文本"
 *   - 确定性映射，无 LLM 参与
 *   - 不修改 RelationshipMemory / RelationshipContext
 *
 * 与现有模块的关系：
 *   - 不修改 Persona（snape.ts）
 *   - 不修改 RelationshipMemory schema
 *   - 不修改 Write Path / Signal Resolver / Milestone Manager
 *   - 位于 Read Adapter 与 PromptBuilder 之间
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 不调用 LLM
 *   - 不读写 localStorage
 *   - 类型安全，无 any
 *   - 内部分级（tier）不暴露到输出类型
 *
 * Phase 15.5-F 范围：
 *   - resolveBehaviorGuidance(): RelationshipContext → InteractionGuidance
 *
 * 行为映射设计（遵循 Snape Persona 特征）：
 *   - trust 控制"防备程度"（不是"温暖程度"）：
 *       trust ↑ = 减少防备 + 增加解释意愿 + 增加隐性认可
 *       trust ↑ ≠ 变友善
 *   - curiosity 控制"主动展开程度"（不是"知识难度"）：
 *       curiosity ↑ = 更主动补充相关上下文
 *       curiosity ↑ ≠ 回答更深奥的理论
 *   - milestone 控制"交互备注"（累积许可列表，使用"may"而非"must"）
 */

import type { RelationshipContext } from "@/types/relationshipContext";
import type { InteractionGuidance } from "@/types/interactionGuidance";

/**
 * trust 分级阈值。
 *
 * 与 milestone 系统对齐：
 *   - trust-threshold milestone 在 trust >= 20 时触发（Phase 15.5-C）
 *   - "guarded" 分级起点为 20，与 milestone 同步
 */
const TRUST_THRESHOLD_LOW = 20;
const TRUST_THRESHOLD_GUARDED = 50;
const TRUST_THRESHOLD_WARMING = 80;

/**
 * curiosity 分级阈值。
 *
 * 与 milestone 系统对齐：
 *   - curiosity-threshold milestone 在 curiosity >= 20 时触发（Phase 15.5-C）
 *   - "emerging" 分级起点为 20，与 milestone 同步
 */
const CURIOSITY_THRESHOLD_LOW = 20;
const CURIOSITY_THRESHOLD_EMERGING = 50;
const CURIOSITY_THRESHOLD_ENGAGED = 80;

/**
 * trust 内部分级（resolver 实现细节，不暴露到 InteractionGuidance）。
 */
type TrustTier = "low" | "guarded" | "warming" | "trusted";

/**
 * curiosity 内部分级（resolver 实现细节，不暴露到 InteractionGuidance）。
 */
type CuriosityTier = "low" | "emerging" | "engaged" | "riveted";

/**
 * trust → toneDirective 映射表。
 *
 * 设计要点：
 *   - trust 控制"防备程度"，不控制"温暖程度"
 *   - Snape 即使 trust 很高也不会"变温暖"，只会"减少防备"
 *   - 避免使用"openness / warmth / friendly"等词，防止 LLM 演成"突然温柔"
 */
const TONE_DIRECTIVES: Record<TrustTier, string> = {
  low: "The student has not earned your trust. Be curt, distant, and economical with words. Offer nothing beyond what is directly asked.",
  guarded: "The student has shown glimpses of worth. Remain formal, but allow slight patience in explanation.",
  warming: "The student has shown some reliability. You may provide more context and allow subtle acknowledgment of the student's progress.",
  trusted: "The student has earned credibility. Reveal deeper reasoning when relevant, while maintaining your usual restraint.",
};

/**
 * curiosity → teachingDirective 映射表。
 *
 * 设计要点：
 *   - curiosity 控制"主动展开程度"，不控制"知识难度"
 *   - 学生问简单问题，即使 curiosity=90，也应直接回答，只是可能补充相关背景
 *   - 避免让 LLM 误以为高 curiosity = 回答更深奥的理论
 */
const TEACHING_DIRECTIVES: Record<CuriosityTier, string> = {
  low: "Answer only the exact question asked. Keep responses brief and restrained. Do not introduce examples, demonstrations, historical references, or additional explanations unless the student specifically requests them.",
  emerging: "Provide brief additional context when it improves understanding.",
  engaged: "Offer deeper explanations and relevant connections.",
  riveted: "Explore underlying principles and invite theoretical discussion.",
};

/**
 * 根据 trust 数值推断内部分级。
 *
 * @param trust 信任度（0-100）
 * @returns TrustTier（内部使用，不暴露到输出）
 */
function resolveTrustTier(trust: number): TrustTier {
  if (trust >= TRUST_THRESHOLD_WARMING) return "trusted";
  if (trust >= TRUST_THRESHOLD_GUARDED) return "warming";
  if (trust >= TRUST_THRESHOLD_LOW) return "guarded";
  return "low";
}

/**
 * 根据 curiosity 数值推断内部分级。
 *
 * @param curiosity 好奇度（0-100）
 * @returns CuriosityTier（内部使用，不暴露到输出）
 */
function resolveCuriosityTier(curiosity: number): CuriosityTier {
  if (curiosity >= CURIOSITY_THRESHOLD_ENGAGED) return "riveted";
  if (curiosity >= CURIOSITY_THRESHOLD_EMERGING) return "engaged";
  if (curiosity >= CURIOSITY_THRESHOLD_LOW) return "emerging";
  return "low";
}

/**
 * 根据 milestone 标记生成交互备注列表。
 *
 * 设计要点：
 *   - 备注是累积的（已探索档案 + 已激活记忆 → 两条备注都添加）
 *   - 首次相遇与未探索档案是互斥条件
 *   - 使用"may"而非"must"，给 LLM 自主判断空间
 *   - 文本贴近 Snape 的导师口吻，避免 AI 味
 *
 * @param ctx RelationshipContext
 * @returns 交互备注列表（可能为空数组）
 */
function resolveRelationshipNotes(ctx: RelationshipContext): string[] {
  const notes: string[] = [];
  const m = ctx.milestones;

  // 首次相遇 / 未探索档案（互斥条件）
  if (!m.hasFirstMeeting) {
    notes.push("This is a first encounter. Be especially reserved.");
  } else if (!m.hasViewedArchive) {
    notes.push("The student has not yet explored your archives. Do not reference specific materials.");
  }

  // 已探索档案（累积许可）
  if (m.hasViewedArchive) {
    notes.push("The student has explored your archives. You may reference materials they have viewed.");
  }

  // 已激活记忆（累积许可）
  if (m.hasActivatedMemory) {
    notes.push("The student has activated personal memories. You may allude to them indirectly.");
  }

  return notes;
}

/**
 * 将 RelationshipContext 转换为 InteractionGuidance。
 *
 * 转换规则（确定性，无 LLM）：
 *   1. trust → toneDirective（控制防备程度）
 *   2. curiosity → teachingDirective（控制主动展开程度）
 *   3. milestone flags → relationshipNotes（累积交互备注）
 *
 * 内部分级（tier）不暴露到输出：
 *   - tier 是 resolver 实现细节
 *   - 未来调整阈值时不会产生 prompt 兼容问题
 *   - 如需 debug 信息，可单独提供 resolveBehaviorDebugInfo()
 *
 * 纯函数：不修改输入，返回全新对象。
 *
 * @param ctx RelationshipContext 视图模型（只读）
 * @returns InteractionGuidance 行为指引
 */
export function resolveBehaviorGuidance(
  ctx: RelationshipContext,
): InteractionGuidance {
  const trustTier = resolveTrustTier(ctx.relationshipLevel.trust);
  const curiosityTier = resolveCuriosityTier(ctx.relationshipLevel.curiosity);
  const relationshipNotes = resolveRelationshipNotes(ctx);

  return {
    toneDirective: TONE_DIRECTIVES[trustTier],
    teachingDirective: TEACHING_DIRECTIVES[curiosityTier],
    relationshipNotes,
  };
}
