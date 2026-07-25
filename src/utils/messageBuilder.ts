/**
 * Message Builder（Phase 10）。
 *
 * 定位：把 PromptBuilder 输出的三段式 PromptContext + 对话历史
 *      转换为 LLMClient 可直接消费的 LLMMessage[]。
 *
 * 背景：
 *   - PromptBuilder 输出 PromptContext（systemPrompt + contextPrompt + relationshipSummary）
 *     这是三段纯字符串，不是 messages 数组
 *   - LLMClient.chat(messages) 需要标准的 messages 数组：
 *       [{role:"system", content:...}, {role:"user",...}, {role:"assistant",...}, ...]
 *   - MessageBuilder 负责这个映射，独立于 Provider 实现
 *
 * 设计原则：
 *   - 纯函数，无副作用
 *   - 不依赖任何 Provider 实现
 *   - 不修改 PromptBuilder / ContextBuilder / ConversationState
 *   - 类型安全，无 any
 *
 * Phase 10 范围：
 *   - 仅负责 messages 数组的"组装"，不负责持久化历史
 *   - 历史存储由 ConversationEngine 内部维护（不写入 ConversationState）
 *   - 未来 Phase 15 长期记忆可扩展此模块
 *
 * 输出示例：
 *   [
 *     { role: "system",    content: systemPrompt + contextPrompt + relationshipSummary },
 *     { role: "user",      content: "历史用户消息 1" },
 *     { role: "assistant", content: "历史助手响应 1" },
 *     { role: "user",      content: "历史用户消息 2" },
 *     { role: "assistant", content: "历史助手响应 2" },
 *     { role: "user",      content: "当前用户输入" }
 *   ]
 */

import type { LLMMessage } from "@/services/llm/types";
import type { PromptContext } from "@/types/prompt";
import type { RelationshipContext } from "@/types/relationshipContext";
import type { InteractionGuidance } from "@/types/interactionGuidance";
import type { SharedHistoryContext } from "@/types/sharedHistoryContext";
import type { SharedHistoryRecallEvent } from "@/types/sharedHistoryContext";

/**
 * 一轮对话（user 输入 + assistant 响应）。
 *
 * 用于历史回放，构建多轮 messages。
 * system 消息每轮重新构建，不存储在历史中。
 */
export interface ConversationTurn {
  /** 用户输入 */
  user: string;
  /** 助手响应 */
  assistant: string;
}

/**
 * 把 RelationshipContext 渲染为 <relationship_context> system block。
 *
 * 输出格式（Phase 15.5-D-2）：
 *
 *   <relationship_context>
 *   User: Harry
 *
 *   Relationship:
 *   Trust level: 35
 *   Curiosity level: 20
 *
 *   Milestones:
 *   - First meeting: yes
 *   - Archive explored: yes
 *   - Memory activated: no
 *   </relationship_context>
 *
 * 规则：
 *   - 只展示 userName / trust / curiosity / milestone flags
 *   - 不展示 patience / eventsCount / isReturningUser（内部字段，不暴露给 LLM）
 *   - 无 userName 时显示 "(not provided)"（不输出 "unknown"）
 *   - 无任何 milestone 时显示 "no milestones yet"
 *   - 不暴露内部 schema 名称 / debug 信息
 *
 * @param ctx RelationshipContext 视图模型
 * @returns 渲染后的 system block 字符串
 */
function buildRelationshipContextBlock(ctx: RelationshipContext): string {
  const lines: string[] = ["<relationship_context>"];

  // User name（未提供时显示 "(not provided)"，不输出 "unknown"）
  lines.push(`User: ${ctx.userName ?? "(not provided)"}`);
  lines.push("");

  // Relationship level（只展示 trust / curiosity，不展示 patience）
  lines.push("Relationship:");
  lines.push(`Trust level: ${ctx.relationshipLevel.trust}`);
  lines.push(`Curiosity level: ${ctx.relationshipLevel.curiosity}`);
  lines.push("");

  // Milestones（布尔标记 + 无 milestone 时的降级文案）
  lines.push("Milestones:");
  const m = ctx.milestones;
  if (
    !m.hasFirstMeeting &&
    !m.hasViewedArchive &&
    !m.hasActivatedMemory
  ) {
    lines.push("no milestones yet");
  } else {
    lines.push(`- First meeting: ${m.hasFirstMeeting ? "yes" : "no"}`);
    lines.push(`- Archive explored: ${m.hasViewedArchive ? "yes" : "no"}`);
    lines.push(`- Memory activated: ${m.hasActivatedMemory ? "yes" : "no"}`);
  }

  lines.push("</relationship_context>");
  return lines.join("\n");
}

/**
 * 把 InteractionGuidance 渲染为 <interaction_guidance> system block（Phase 15.5-F）。
 *
 * 输出格式：
 *
 *   <interaction_guidance>
 *   Tone:
 *   The student has shown glimpses of worth. Remain formal, but allow slight patience in explanation.
 *
 *   Teaching approach:
 *   Provide brief additional context when it improves understanding.
 *
 *   Relationship notes:
 *   - The student has explored your archives. You may reference materials they have viewed.
 *   - The student has activated personal memories. You may allude to them indirectly.
 *   </interaction_guidance>
 *
 * 规则：
 *   - 段落名称使用自然语言（Tone / Teaching approach / Relationship notes）
 *   - 不暴露内部分级（tier 是 resolver 实现细节）
 *   - relationshipNotes 为空时省略 Relationship notes 段落
 *   - 不暴露内部 schema 名称 / debug 信息
 *
 * @param guidance InteractionGuidance 行为指引
 * @returns 渲染后的 system block 字符串
 */
function buildInteractionGuidanceBlock(guidance: InteractionGuidance): string {
  const lines: string[] = ["<interaction_guidance>"];

  // Tone（基于 trust 的防备程度指引）
  lines.push("Tone:");
  lines.push(guidance.toneDirective);
  lines.push("");

  // Teaching approach（基于 curiosity 的主动展开程度指引）
  lines.push("Teaching approach:");
  lines.push(guidance.teachingDirective);

  // Relationship notes（基于 milestone 的交互备注，空数组时省略）
  if (guidance.relationshipNotes.length > 0) {
    lines.push("");
    lines.push("Relationship notes:");
    for (const note of guidance.relationshipNotes) {
      lines.push(`- ${note}`);
    }
  }

  lines.push("</interaction_guidance>");
  return lines.join("\n");
}

/**
 * 把单个 SharedHistoryRecallEvent 渲染为 block 内的一行（或多行）。
 *
 * 渲染规则按 depth 不同：
 *
 * fact 深度（仅 type + subject）：
 *   - knowledge-gap: draught of living death
 *
 * experience 深度（+ count + detail）：
 *   - knowledge-gap: draught of living death
 *     count: 3
 *     detail: temperature control
 *
 * personal 深度（使用 framing 替代字段列表）：
 *   - The student has struggled with draught of living death, particularly temperature control (repeated 3 times).
 *
 * @param event 单条 recall event
 * @param depth recall 深度（决定渲染格式）
 * @returns 渲染后的行（不含前导分隔符）
 */
function renderRecallEvent(
  event: SharedHistoryRecallEvent,
  depth: SharedHistoryContext["depth"],
): string[] {
  // personal 深度：使用 framing 自然语言句
  if (depth === "personal") {
    // framing 理论上一定存在（Reader 在 personal 深度下总会生成），
    // 但此处做防御性 fallback，避免 undefined 时输出空行。
    return [`- ${event.framing ?? `${event.type}: ${event.subject}`}`];
  }

  // fact / experience 深度：字段列表形式
  const lines: string[] = [`- ${event.type}: ${event.subject}`];

  // experience 深度：附加 count + detail（fact 深度不附加）
  if (depth === "experience") {
    if (event.count !== undefined) {
      lines.push(`  count: ${event.count}`);
    }
    if (event.detail) {
      lines.push(`  detail: ${event.detail}`);
    }
  }

  return lines;
}

/**
 * 把 SharedHistoryContext 渲染为 <shared_history> system block（Phase 15.6-A Step 6）。
 *
 * 输出格式（按 depth 不同）：
 *
 * fact 深度：
 *   <shared_history depth="fact">
 *   - knowledge-gap: draught of living death
 *   - achievement: felix felicis
 *   </shared_history>
 *
 * experience 深度：
 *   <shared_history depth="experience">
 *   - knowledge-gap: draught of living death
 *     count: 3
 *     detail: temperature control
 *   </shared_history>
 *
 * personal 深度：
 *   <shared_history depth="personal">
 *   - The student has struggled with draught of living death, particularly temperature control (repeated 3 times).
 *   </shared_history>
 *
 * 规则：
 *   - depth 通过 block 属性标注，让 LLM 明确当前 recall 深度
 *   - personal 深度使用 framing 自然语言句，更易被 LLM 直接引用
 *   - fact / experience 深度使用结构化字段列表
 *   - events 为空时不产生 block（返回空字符串）
 *
 * @param ctx SharedHistoryContext 视图模型
 * @returns 渲染后的 system block 字符串（空字符串表示无内容）
 */
function buildSharedHistoryBlock(ctx: SharedHistoryContext): string {
  if (ctx.events.length === 0) {
    return "";
  }

  const lines: string[] = [`<shared_history depth="${ctx.depth}">`];

  for (const event of ctx.events) {
    lines.push(...renderRecallEvent(event, ctx.depth));
  }

  lines.push("</shared_history>");
  return lines.join("\n");
}

/**
 * 把 PromptContext 三段字符串合并为 system 消息内容。
 *
 * 合并策略：用分隔符 "\n\n---\n\n" 连接非空段落，保持可读性。
 * 与原 OpenAICompatibleClient / AnthropicClient 内部合并逻辑保持一致。
 *
 * Phase 15.4：若 prompt.memorySummary 存在，追加到末尾（向后兼容，
 * 未传入 memorySummary 时行为与原版完全一致）。
 *
 * Phase 15.5-D-2：若 prompt.relationshipContext 存在，渲染为
 * <relationship_context> block 并追加到末尾（向后兼容，
 * 未传入 relationshipContext 时行为与 Phase 15.4 完全一致）。
 *
 * Phase 15.5-F：若 prompt.interactionGuidance 存在，渲染为
 * <interaction_guidance> block 并追加到末尾（向后兼容，
 * 未传入 interactionGuidance 时行为与 Phase 15.5-D-2 完全一致）。
 *
 * Phase 15.6-A Step 6：若 prompt.sharedHistoryContext 存在，渲染为
 * <shared_history> block，插入位置在 <relationship_context> 之后、
 * <interaction_guidance> 之前（符合"过去 → 当前关系 → 行为策略"逻辑链）。
 * 未传入 sharedHistoryContext 时行为与 Phase 15.5-F 完全一致。
 */
function buildSystemContent(prompt: PromptContext): string {
  const sections: string[] = [
    prompt.systemPrompt,
    prompt.contextPrompt,
    prompt.relationshipSummary,
    prompt.memorySummary,
  ];

  // Phase 15.5-D-2：relationshipContext → <relationship_context> block
  if (prompt.relationshipContext) {
    sections.push(buildRelationshipContextBlock(prompt.relationshipContext));
  }

  // Phase 15.6-A Step 6：sharedHistoryContext → <shared_history> block
  // 插入位置：relationship_context 之后、interaction_guidance 之前
  // 逻辑链：过去（shared_history）→ 当前关系（relationship_context 已在上面）→ 行为策略（interaction_guidance）
  // 注意：relationship_context 描述"当前关系状态"，shared_history 描述"过去经历"，
  //       两者顺序为"当前关系 → 过去经历"，保持与已有顺序一致。
  if (prompt.sharedHistoryContext) {
    const block = buildSharedHistoryBlock(prompt.sharedHistoryContext);
    if (block) {
      sections.push(block);
    }
  }

  // Phase 15.5-F：interactionGuidance → <interaction_guidance> block
  if (prompt.interactionGuidance) {
    sections.push(buildInteractionGuidanceBlock(prompt.interactionGuidance));
  }

  return sections
    .filter((s) => s && s.trim().length > 0)
    .join("\n\n---\n\n");
}

/**
 * 构建 LLM Messages 数组。
 *
 * 流程：
 *   1. 把 PromptContext 三段合并为 system 消息
 *   2. 按时间顺序展开历史轮次（user / assistant 交替）
 *   3. 追加当前用户消息
 *
 * @param prompt      PromptBuilder 输出的三段式 prompt
 * @param userMessage 当前用户输入
 * @param history     之前的对话轮次（可选，默认空数组）
 * @returns LLMClient.chat() 可消费的 messages 数组
 */
export function buildMessages(
  prompt: PromptContext,
  userMessage: string,
  history: ConversationTurn[] = [],
): LLMMessage[] {
  const messages: LLMMessage[] = [
    { role: "system", content: buildSystemContent(prompt) },
  ];

  for (const turn of history) {
    messages.push({ role: "user", content: turn.user });
    messages.push({ role: "assistant", content: turn.assistant });
  }

  messages.push({ role: "user", content: userMessage });

  return messages;
}
