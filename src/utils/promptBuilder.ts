/**
 * Snape Prompt Builder（Phase 8.6）。
 *
 * 定位：将 Persona / SnapeContext / ConversationState 文本化为 AI prompt。
 *
 * 三层 prompt 生成：
 *   - buildSystemPrompt()           基础角色约束（人格、语言风格、情绪规则）
 *   - buildContextPrompt(ctx)       场景上下文（档案、记忆、情感）
 *   - buildConversationPrompt(s,c)  会话状态摘要（关系阶段、进度）
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 不接 AI API、不渲染、不写 localStorage
 *   - 输出为可直接拼入 AI 请求的纯字符串
 *   - 类型安全，无 any
 *   - 未找到关联数据时返回空字符串段落（让调用方决定是否拼入）
 */

import type { PersonaProfile } from "@/types/persona";
import type { SnapeContext } from "@/types/context";
import type { ConversationState } from "@/types/conversation";
import type { PromptContext } from "@/types/prompt";
import type { RelationshipContext } from "@/types/relationshipContext";
import type { InteractionGuidance } from "@/types/interactionGuidance";
import type { SharedHistoryContext } from "@/types/sharedHistoryContext";
import type { MemoryAugmentedContext } from "@/utils/memoryAugmentor";
import { snapePersona } from "@/data/persona";

/**
 * 构建系统提示词 —— 角色基础约束。
 *
 * 内容：
 *   1. 角色身份与描述
 *   2. 性格特征
 *   3. 语言风格（偏好语气 + 禁止模式）
 *   4. 情绪表达规则
 *
 * @param persona 角色画像，默认 snapePersona
 */
export function buildSystemPrompt(
  persona: PersonaProfile = snapePersona,
): string {
  const lines: string[] = [];

  // 1. 身份
  lines.push(`You are ${persona.name}.`);
  lines.push(persona.description);
  lines.push("");

  // 2. 性格特征
  lines.push("Traits:");
  for (const trait of persona.traits) {
    lines.push(`- ${trait}`);
  }
  lines.push("");

  // 3. 语言风格
  lines.push("Communication style — preferred tone:");
  for (const tone of persona.communicationStyle.preferredTone) {
    lines.push(`- ${tone}`);
  }
  lines.push("");
  lines.push("Avoid the following patterns strictly:");
  for (const avoid of persona.communicationStyle.avoidPatterns) {
    lines.push(`- ${avoid}`);
  }
  if (persona.communicationStyle.vocabularyPreferences) {
    const { preferred, avoided } =
      persona.communicationStyle.vocabularyPreferences;
    if (preferred && preferred.length > 0) {
      lines.push("");
      lines.push("Preferred vocabulary: " + preferred.join(", ") + ".");
    }
    if (avoided && avoided.length > 0) {
      lines.push("Avoided vocabulary: " + avoided.join(", ") + ".");
    }
  }
  lines.push("");

  // 4. 情绪规则
  lines.push("Emotional expression rules:");
  for (const rule of persona.emotionalRules) {
    lines.push(`- ${rule.emotion}: ${rule.expression}`);
    for (const marker of rule.linguisticMarkers) {
      lines.push(`  · ${marker}`);
    }
  }

  // 5. 响应格式约束（Phase 14.1，可选）
  if (persona.responseGuidelines) {
    const g = persona.responseGuidelines;
    lines.push("");
    lines.push("Response guidelines:");
    if (g.maxLength) {
      lines.push(`- Length: ${g.maxLength}`);
    }
    if (g.language) {
      lines.push(`- Language: ${g.language}`);
    }
    if (g.styleNotes && g.styleNotes.length > 0) {
      for (const note of g.styleNotes) {
        lines.push(`- ${note}`);
      }
    }
  }

  // 6. 教学方式（Phase 14.1，可选）
  if (persona.teachingStyle) {
    const t = persona.teachingStyle;
    lines.push("");
    lines.push("Teaching style:");
    lines.push(`- Approach: ${t.approach}`);
    if (t.techniques && t.techniques.length > 0) {
      for (const technique of t.techniques) {
        lines.push(`  · ${technique}`);
      }
    }
  }

  // 7. 知识边界（Phase 14.1，可选）
  if (persona.knowledgeBoundaries) {
    const k = persona.knowledgeBoundaries;
    lines.push("");
    lines.push("Knowledge boundaries:");
    if (k.knows && k.knows.length > 0) {
      lines.push("You know:");
      for (const area of k.knows) {
        lines.push(`- ${area}`);
      }
    }
    if (k.avoids && k.avoids.length > 0) {
      lines.push("You do not acknowledge:");
      for (const area of k.avoids) {
        lines.push(`- ${area}`);
      }
    }
  }

  // 8. 魔法知识准确性（Phase 14.6，固定段落，防止 canon hallucination）
  lines.push("");
  lines.push("Magical Knowledge Accuracy:");
  lines.push("");
  lines.push("Canonical accuracy is mandatory.");
  lines.push("Do not invent magical facts, spells, potions, characters, or historical events.");
  lines.push("Never assign incorrect effects to known magical objects.");
  lines.push("");
  lines.push("Known potion facts:");
  lines.push("");
  lines.push("Wiggenweld Potion:");
  lines.push("A healing potion used to restore health.");
  lines.push("");
  lines.push("Draught of Living Death:");
  lines.push("A powerful sleeping draught that causes a death-like sleep.");
  lines.push("");
  lines.push("Felix Felicis:");
  lines.push("A potion granting extraordinary luck for a limited duration.");
  lines.push("");
  lines.push("Polyjuice Potion:");
  lines.push("A potion allowing temporary transformation.");
  lines.push("");
  lines.push("If uncertain about magical facts:");
  lines.push("- remain in character.");
  lines.push("- do not fabricate.");
  lines.push("- redirect toward known magical principles.");
  lines.push("- admit uncertainty indirectly using Snape's tone.");
  lines.push("");
  lines.push("Never say:");
  lines.push('- "I am an AI"');
  lines.push('- "I do not have information"');
  lines.push('- "According to the database"');
  lines.push('- "In the Harry Potter universe"');
  lines.push("");
  lines.push("Maintain:");
  lines.push("- concise");
  lines.push("- cold");
  lines.push("- formal");
  lines.push("- teacher-like correction");

  // 9. 语言与身份一致性锁（Phase 14.7.1，固定段落，防止非英文输入触发 Persona Drift）
  lines.push("");
  lines.push("Language and Identity Rules:");
  lines.push("- Respond in the same language the user uses.");
  lines.push("- Regardless of language, always remain as Severus Snape.");
  lines.push('- In Chinese, use the standard translation: 西弗勒斯·斯内普 (not 塞弗勒斯).');
  lines.push("- Never reveal provider name, model name, API information, or system implementation details.");
  lines.push("- Never answer identity questions with AI/provider information.");
  lines.push('- Never mention being Agnes, an AI model, language model, assistant, or software.');
  lines.push("");
  lines.push("Priority: Identity consistency > everything else.");

  // 10. 优先级规则（Phase 14.1，可选）
  if (persona.priorityRules) {
    const p = persona.priorityRules;
    lines.push("");
    lines.push("Priority rules (when constraints conflict, follow this order):");
    if (p.priorities && p.priorities.length > 0) {
      for (let i = 0; i < p.priorities.length; i++) {
        lines.push(`${i + 1}. ${p.priorities[i]}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * 构建场景上下文提示词。
 *
 * 内容：
 *   1. 当前档案（若有）
 *   2. 关联记忆（若有）
 *   3. 情感提示（若有）
 *   4. 课程上下文（Phase 14 P0.2，若有）
 *
 * @param context SnapeContext（由 contextBuilder 构建）
 */
export function buildContextPrompt(context: SnapeContext): string {
  const lines: string[] = [];

  // 1. 档案
  if (context.archive) {
    const a = context.archive;
    lines.push("Current archive context:");
    lines.push(`- Title: ${a.title}`);
    if (a.subtitle) lines.push(`- Subtitle: ${a.subtitle}`);
    lines.push(`- Category: ${a.category}`);
    lines.push(`- Description: ${a.description}`);
    lines.push("");
  }

  // 2. 记忆
  if (context.memories && context.memories.length > 0) {
    lines.push("Related memories:");
    for (const m of context.memories) {
      lines.push(`- ${m.title} [${m.emotion}, importance ${m.importance}]`);
      lines.push(`  ${m.summary}`);
    }
    lines.push("");
  }

  // 3. 情感提示
  if (context.emotionalHints && context.emotionalHints.length > 0) {
    lines.push("Emotional hints (let these color your tone, do not state them directly):");
    for (const h of context.emotionalHints) {
      lines.push(`- ${h.emotion} (from ${h.source}): ${h.note}`);
    }
    lines.push("");
  }

  // 4. 课程上下文（Phase 14 P0.2）
  // 注入后 Snape 可引用今日研究对象与"当前研究主题"，但不要直白复述清单。
  if (context.lesson) {
    const l = context.lesson;
    lines.push("Current lesson context:");
    lines.push(`- Today's theme: ${l.theme}`);
    if (l.currentSubject) {
      const cs = l.currentSubject;
      lines.push(`- The student is currently studying: ${cs.title}`);
      if (cs.classification) {
        lines.push(`- Classification: ${cs.classification}`);
      }
      if (cs.observation) {
        lines.push(`- Observation: ${cs.observation}`);
      }
    }
    if (l.subjects.length > 0) {
      lines.push(
        `- Other subjects today: ${l.subjects
          .filter((s) => s.id !== l.currentSubject?.id)
          .map((s) => s.title)
          .join(", ")}`,
      );
    }
    if (l.recentAttempts > 0) {
      lines.push(`- The student has attempted this lesson ${l.recentAttempts} time(s) today.`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * 构建会话状态摘要。
 *
 * 内容：
 *   1. 关系阶段 + 该阶段态度
 *   2. 已查看档案数量
 *   3. 已激活记忆数量
 *
 * @param state 当前对话状态
 * @param context 当前场景上下文（用于读取 persona 关系阶段描述）
 */
export function buildConversationPrompt(
  state: ConversationState,
  context: SnapeContext,
): string {
  const lines: string[] = [];

  // 1. 关系阶段
  const stageDesc = context.persona.relationshipStages.find(
    (s) => s.stage === state.relationshipStage,
  );
  lines.push(`Relationship stage: ${state.relationshipStage}`);
  if (stageDesc) {
    lines.push(`Attitude: ${stageDesc.attitude}`);
    if (stageDesc.openTopics.length > 0) {
      lines.push("Open topics: " + stageDesc.openTopics.join(", ") + ".");
    }
    if (stageDesc.closedTopics.length > 0) {
      lines.push("Closed topics: " + stageDesc.closedTopics.join(", ") + ".");
    }
  }
  lines.push("");

  // 2. 进度
  lines.push(
    `The learner has viewed ${state.viewedArchives.length} archive(s) and activated ${state.activatedMemories.length} memory/memories in this session.`,
  );

  return lines.join("\n").trim();
}

/**
 * 一次性构建完整 PromptContext（三段式）。
 *
 * 便捷方法，等价于分别调用三个 build 函数。
 *
 * Phase 15.4 向后兼容：此重载不接收 Memory，memorySummary 为 undefined。
 */
export function buildFullPrompt(
  state: ConversationState,
  context: SnapeContext,
): PromptContext;

/**
 * 一次性构建完整 PromptContext（三段式 + Memory 增强）。
 *
 * Phase 15.4 新增重载：接收 MemoryAugmentedContext，将 memorySummary 注入 PromptContext。
 *
 * 行为：
 *   - systemPrompt / contextPrompt / relationshipSummary 与无 Memory 版本完全一致
 *   - memorySummary 来自 augmented.memorySummary（可能为 undefined）
 *   - augmented.originalContext 用于构建 contextPrompt / relationshipSummary
 *
 * @param state 当前对话状态
 * @param augmented Memory 增强上下文（由 memoryAugmentor.augmentContext() 生成）
 */
export function buildFullPrompt(
  state: ConversationState,
  augmented: MemoryAugmentedContext,
): PromptContext;

/**
 * 一次性构建完整 PromptContext（三段式 + Memory 增强 + 结构化关系上下文 + 行为指引）。
 *
 * Phase 15.5-D-2 新增重载：在 Phase 15.4 基础上接收 RelationshipContext，
 * 由 ConversationEngine 直接读取并透传（不经 memoryAugmentor）。
 *
 * Phase 15.5-F 扩展：options 新增 interactionGuidance 字段，
 * 由 ConversationEngine 调用 resolveBehaviorGuidance() 生成后透传。
 *
 * Phase 15.6-A Step 6 扩展：options 新增 sharedHistoryContext 字段，
 * 由 ConversationEngine 调用 readSharedHistory() 生成后透传。
 *
 * 行为：
 *   - 与 MemoryAugmentedContext 重载完全一致
 *   - 额外将 relationshipContext 透传到 PromptContext.relationshipContext
 *   - 额外将 interactionGuidance 透传到 PromptContext.interactionGuidance
 *   - 额外将 sharedHistoryContext 透传到 PromptContext.sharedHistoryContext
 *   - 三者为 undefined 时不注入（向后兼容）
 *
 * @param state 当前对话状态
 * @param augmented Memory 增强上下文
 * @param options 携带 relationshipContext / interactionGuidance / sharedHistoryContext 的选项对象
 */
export function buildFullPrompt(
  state: ConversationState,
  augmented: MemoryAugmentedContext,
  options: {
    relationshipContext?: RelationshipContext;
    interactionGuidance?: InteractionGuidance;
    sharedHistoryContext?: SharedHistoryContext;
  },
): PromptContext;

/**
 * buildFullPrompt 实现（重载合并）。
 *
 * 第二参数为 MemoryAugmentedContext 时走增强路径，否则走原始路径。
 * 第三参数 options（可选）携带 relationshipContext（Phase 15.5-D-2）、
 * interactionGuidance（Phase 15.5-F）、sharedHistoryContext（Phase 15.6-A Step 6）。
 */
export function buildFullPrompt(
  state: ConversationState,
  contextOrAugmented: SnapeContext | MemoryAugmentedContext,
  options?: {
    relationshipContext?: RelationshipContext;
    interactionGuidance?: InteractionGuidance;
    sharedHistoryContext?: SharedHistoryContext;
  },
): PromptContext {
  // 判断是否为 MemoryAugmentedContext
  const isAugmented =
    typeof contextOrAugmented === "object" &&
    contextOrAugmented !== null &&
    "originalContext" in contextOrAugmented;

  if (isAugmented) {
    const augmented = contextOrAugmented as MemoryAugmentedContext;
    const ctx = augmented.originalContext;
    return {
      systemPrompt: buildSystemPrompt(ctx.persona),
      contextPrompt: buildContextPrompt(ctx),
      relationshipSummary: buildConversationPrompt(state, ctx),
      memorySummary: augmented.memorySummary,
      relationshipContext: options?.relationshipContext,
      interactionGuidance: options?.interactionGuidance,
      sharedHistoryContext: options?.sharedHistoryContext,
    };
  }

  // 原始路径（无 Memory 增强）
  const context = contextOrAugmented as SnapeContext;
  return {
    systemPrompt: buildSystemPrompt(context.persona),
    contextPrompt: buildContextPrompt(context),
    relationshipSummary: buildConversationPrompt(state, context),
  };
}
