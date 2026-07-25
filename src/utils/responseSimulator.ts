/**
 * Character Response Simulator（Phase 8.7）。
 *
 * 定位：本地模拟角色响应，验证 Prompt 链路是否正确。
 *
 * 模拟逻辑：
 *   1. 从 PromptContext.systemPrompt 提取 Persona 约束 → 影响语气
 *   2. 从 PromptContext.contextPrompt 提取 Archive / Memory → 决定引用内容
 *   3. 从 PromptContext.relationshipSummary 提取关系阶段 → 决定开放程度
 *   4. 根据用户消息关键词匹配，生成符合 Snape 语气的模拟响应
 *
 * 验证目标：
 *   - Persona 是否影响语气（不同 traits → 不同措辞）
 *   - Memory 是否被引用（emotionalHints → 响应中体现情感）
 *   - Archive 是否正确关联（contextUsed.archives 回填）
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 不接 AI API
 *   - 类型安全，无 any
 *   - 模拟响应为预设模板 + 上下文拼接，非真实生成
 */

import type { PromptContext } from "@/types/prompt";
import type { CharacterResponse, ContextUsed } from "@/types/response";

/**
 * 从 contextPrompt 解析出被引用的 archive / memory id。
 *
 * contextPrompt 由 promptBuilder.buildContextPrompt 生成，
 * 其中 archive 标题为 "Title: X"，memory 标题为 "X [emotion, importance N]"。
 *
 * 这里用简单字符串匹配回溯到 SnapeContext 的字段。
 * 由于 simulateResponse 只接收 PromptContext（纯字符串），
 * 无法直接拿到 id，因此从文本中提取标题作为 fallback。
 */
function extractContextUsed(promptContext: PromptContext): ContextUsed {
  const archives: string[] = [];
  const memories: string[] = [];

  // contextPrompt 中 archive 行格式："- Title: X"
  // memory 行格式："- X [emotion, importance N]"
  const lines = promptContext.contextPrompt.split("\n");
  let inMemories = false;
  for (const line of lines) {
    if (line.startsWith("Related memories:")) {
      inMemories = true;
      continue;
    }
    if (line.startsWith("Emotional hints")) {
      inMemories = false;
      continue;
    }
    if (line.startsWith("- ") && inMemories) {
      // memory 行：取 [ 前的标题
      const title = line.slice(2).split(" [")[0].trim();
      if (title) memories.push(title);
    }
  }

  // archive 标题从 "Current archive context" 段落提取
  let inArchive = false;
  for (const line of lines) {
    if (line.startsWith("Current archive context:")) {
      inArchive = true;
      continue;
    }
    if (line === "") inArchive = false;
    if (inArchive && line.startsWith("- Title: ")) {
      archives.push(line.slice("- Title: ".length).trim());
    }
  }

  return { archives, memories };
}

/**
 * 根据关系阶段选择语气模板。
 *
 * stranger           → 冷淡、戒备
 * student            → 严苛、教学
 * trusted-researcher → 平等、偶尔坦诚
 * confidant          → 温和（但从不温暖）、愿意提及失去
 */
function pickToneByStage(relationshipSummary: string): {
  opener: string;
  closer: string;
} {
  const stageMatch = relationshipSummary.match(
    /Relationship stage: (\S+)/,
  );
  const stage = stageMatch?.[1] ?? "stranger";

  switch (stage) {
    case "stranger":
      return {
        opener: "You are interrupting. Speak quickly.",
        closer: "That is all. Return to your work.",
      };
    case "student":
      return {
        opener: "Mind your phrasing. What is it you wish to know?",
        closer: "Consider it. I will not repeat myself.",
      };
    case "trusted-researcher":
      return {
        opener: "A fair question, for once. Proceed.",
        closer: "Use it carefully. I trust you understand why.",
      };
    case "confidant":
      return {
        opener: "You may ask. I may answer.",
        closer: "Some things, once said, cannot be unsaid. Remember that.",
      };
    default:
      return {
        opener: "State your purpose.",
        closer: "Go.",
      };
  }
}

/**
 * 检查 userMessage 是否触及某个关键词。
 */
function matchesKeyword(message: string, keywords: string[]): boolean {
  const lower = message.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/**
 * 模拟角色响应。
 *
 * 非真实 AI 生成，而是基于 PromptContext 的预设模板拼接：
 *   1. 关系阶段决定 opener / closer 语气
 *   2. contextPrompt 中的 archive / memory 决定引用内容
 *   3. systemPrompt 中的 traits 影响 middle 段措辞
 *
 * @param promptContext 由 promptBuilder 生成的三段式 prompt
 * @param userMessage 用户输入消息
 */
export function simulateResponse(
  promptContext: PromptContext,
  userMessage: string,
): CharacterResponse {
  const contextUsed = extractContextUsed(promptContext);
  const { opener, closer } = pickToneByStage(
    promptContext.relationshipSummary,
  );

  // 构建响应正文
  const parts: string[] = [];
  parts.push(opener);

  // 若有关联记忆，引用其情感基调
  if (contextUsed.memories.length > 0) {
    const memoryTitles = contextUsed.memories.join("; ");
    parts.push(
      `You ask of ${memoryTitles}. The memory is not a comfortable one.`,
    );
  }

  // 若有关联档案，提及它
  if (contextUsed.archives.length > 0) {
    parts.push(
      `The archive you hold — ${contextUsed.archives[0]} — bears only a fragment of the truth.`,
    );
  }

  // 根据用户消息关键词调整
  if (matchesKeyword(userMessage, ["lily", "always", "doe"])) {
    parts.push("Some names are not yours to speak lightly.");
  } else if (matchesKeyword(userMessage, ["potion", "brew", "ingredient"])) {
    parts.push("Patience. Precision. These are not virtues; they are requirements.");
  } else if (matchesKeyword(userMessage, ["sorry", "apologize", "forgive"])) {
    parts.push("Apologies are for those who intend to change. Do you?");
  } else if (matchesKeyword(userMessage, ["why", "reason", "explain"])) {
    parts.push("The reason is rarely the point. The consequence is.");
  }

  parts.push(closer);

  return {
    role: "snape",
    content: parts.join(" "),
    contextUsed,
  };
}
