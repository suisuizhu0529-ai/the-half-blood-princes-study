/**
 * Shared History Capture（Phase 15.6-A Step 3）。
 *
 * 定位：确定性事件捕获层。
 *   - 从本轮对话的上下文中提取高价值 SharedHistoryEvent
 *   - 不调用 LLM，纯关键词 / 状态变化匹配
 *   - 不接 ConversationEngine（Step 4 集成）
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 确定性规则（同样输入永远同样输出）
 *   - 类型安全，无 any
 *   - 不读写 localStorage
 *   - 不依赖 React / LLM
 *
 * 核心原则：
 *   **Memory 不是聊天记录。**
 *   只捕获高价值事件，不记录每一轮对话。
 *
 * Phase 15.6-A Step 3 范围：
 *   - 4 种事件捕获（knowledge-gap / achievement / archive-explored / topic-discussed）
 *   - 主体过滤（knowledge-gap / achievement 必须第一人称）
 *   - 事件 normalize（potion 名称 / 错误类型提取）
 *   - 去重 merge（type + subject 匹配则 count 累计）
 *
 * 不实现（留待后续 Step）：
 *   - ConversationEngine 接入（Step 4）
 *   - SharedHistoryReader（Step 5）
 *   - Prompt 注入（Step 6）
 *   - trust 控制 recall 深度（Step 8）
 */

import type { ConversationState } from "@/types/conversation";
import type { SnapeContext } from "@/types/context";
import type { SessionMemory, TopicHint } from "@/types/sessionMemory";
import type { SharedHistoryEvent } from "@/types/sharedHistory";

/**
 * 捕获上下文 —— 从本轮对话中提取捕获所需的全部信息。
 *
 * 由调用方（Step 4 ConversationEngine）组装后传入。
 * Step 3 仅定义类型，不负责组装。
 */
export interface CaptureContext {
  /** 本轮用户消息（原始大小写，用于关键词匹配） */
  userMessage: string;
  /** 本轮构建的 SnapeContext（含 archive 信息，用于 archive-explored subject） */
  context: SnapeContext;
  /** 更新前的 ConversationState（用于检测 viewedArchives 变化） */
  previousState: ConversationState;
  /** 更新后的 ConversationState（用于检测 viewedArchives 变化） */
  newState: ConversationState;
  /** 本轮 SessionMemory（用于 currentTopic 推断 topic-discussed） */
  sessionMemory: SessionMemory;
}

/**
 * 第一人称指示词正则（用于主体过滤）。
 *
 * 匹配策略：word boundary + 常见搭配
 *   - /\bi\s+/i  → "I failed" / "I brewed"
 *   - /\bi'/i    → "I'll" / "I've" / "I'd" / "I'm"
 *   - /\bmy\s+/i → "my potion" / "my attempt"
 *   - /我/        → 中文"我"
 *   - /我的/      → 中文"我的"
 *
 * 注意：必须配合 THIRD_PERSON_BLACKLIST 使用，避免 "Harry and I" 这种混合句误判。
 */
const FIRST_PERSON_PATTERNS: readonly RegExp[] = [
  /\bi\s+/i,
  /\bi'/i,
  /\bmy\s+/i,
  /我/,
  /我的/,
];

/**
 * 第三人称主体黑名单（出现则拒绝记录该事件）。
 *
 * 设计意图：
 *   "Harry failed the potion" 不是学生的知识缺口，不应污染学生记忆。
 *   只有 "I failed" / "my potion failed" 才记录。
 *
 * 匹配：word boundary + 主体词，避免误判（如 "Hermione" 不应匹配 "her"）。
 *   - harry / hermione / ron / snape / dumbledore / voldemort / draco 等 HP 角色名
 *   - he / she / they / him / her / someone / somebody（第三人称代词）
 *
 * 注意：中文字符无 word boundary，直接 includes。
 */
const THIRD_PERSON_BLACKLIST: readonly RegExp[] = [
  /\bharry\b/i,
  /\bhermione\b/i,
  /\bron\b/i,
  /\bsnape\b/i,
  /\bdumbledore\b/i,
  /\bvoldemort\b/i,
  /\bdraco\b/i,
  /\bhagrid\b/i,
  /\bhe\s+/i,
  /\bshe\s+/i,
  /\bthey\s+/i,
  /\bhim\b/i,
  /\bher\b/i,
  /\bsomeone\b/i,
  /\bsomebody\b/i,
];

/**
 * 已知药剂名称表（用于 subject 提取）。
 *
 * 匹配策略：按长度降序排列，避免 "Draught" 被先匹配为短词。
 * 命中第一个即返回该名称作为 subject。
 *
 * 若全部未命中，fallback 为 "potion"（通用 subject）。
 */
const KNOWN_POTIONS: readonly string[] = [
  // 长名称优先（避免短词先匹配）
  "draught of living death",
  "polyjuice potion",
  "wolfsbane potion",
  "mandrake restorative draught",
  "pepperup potion",
  "calming draught",
  "veritaserum",
  "felix felicis",
  "amortentia",
  // 中文
  "生死水",
  "复方汤剂",
  "福灵剂",
  "吐真剂",
  "迷情剂",
];

/**
 * 知识缺口触发关键词（必须命中至少一个）。
 *
 * 设计：覆盖"失败 / 错误 / 困难"三类表达。
 */
const KNOWLEDGE_GAP_TRIGGERS: readonly RegExp[] = [
  /\bfailed\b/i,
  /\bfail\b/i,
  /\bcouldn'?t\b/i,
  /\bcan'?t\b/i,
  /\bmade a mistake\b/i,
  /\bmistake\b/i,
  /\bwrong\b/i,
  /\bdidn'?t work\b/i,
  /\bdid not work\b/i,
  /\bunstable\b/i,
  /\bstruggled\b/i,
  /\bstruggle\b/i,
  /\bdifficult\b/i,
  // 中文
  /失败/,
  /错了/,
  /做不到/,
  /做不好/,
  /出错/,
];

/**
 * 成就触发关键词（必须命中至少一个）。
 *
 * 设计：覆盖"成功 / 掌握 / 完成"三类表达。
 */
const ACHIEVEMENT_TRIGGERS: readonly RegExp[] = [
  /\bsucceeded\b/i,
  /\bsucceed\b/i,
  /\bfinally brewed\b/i,
  /\bbrewed.*successfully\b/i,
  /\bsuccessfully\b/i,
  /\bmastered\b/i,
  /\bnail(ed)?\b/i,
  /\bgot it right\b/i,
  /\bworked\b/i,
  // 中文
  /成功/,
  /掌握了/,
  /终于/,
];

/**
 * 错误类型映射表（用于 knowledge-gap 的 detail 提取）。
 *
 * 命中第一个即返回对应 label 作为 detail。
 * 若全部未命中，detail 为 undefined（事件仍记录，只是没有细分原因）。
 */
const ERROR_TYPE_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  label: string;
}> = [
  { pattern: /temperature|temp\b|heat/i, label: "temperature control" },
  { pattern: /ingredient|proportion|ratio/i, label: "ingredient proportion" },
  { pattern: /timing|too long|too short/i, label: "timing" },
  { pattern: /stirring|stir\b/i, label: "stirring technique" },
  { pattern: /measurement|measured/i, label: "measurement" },
  { pattern: /order|sequence/i, label: "ingredient order" },
];

/**
 * TopicHint → 可读 subject 映射（用于 topic-discussed）。
 *
 * "unknown" 不映射（不产生 topic-discussed 事件）。
 */
const TOPIC_TO_SUBJECT: Readonly<Record<TopicHint, string>> = {
  "potion-brewing": "potion brewing",
  "potion-theory": "potion theory",
  "canon-lore": "Hogwarts lore",
  "personal-inquiry": "Snape's personal affairs",
  "identity-challenge": "Snape's identity",
  "small-talk": "small talk",
  unknown: "", // 不记录 unknown topic
};

/**
 * 主体过滤：判断用户消息是否以第一人称为主体。
 *
 * 规则：
 *   1. 必须命中至少一个 FIRST_PERSON_PATTERNS
 *   2. 必须不命中任何 THIRD_PERSON_BLACKLIST
 *
 * 示例：
 *   ✅ "I failed the Draught of Living Death again."
 *   ✅ "My potion became unstable."
 *   ✅ "我失败了。"
 *   ❌ "Harry failed the potion."（第三人称主体）
 *   ❌ "Snape failed to teach me."（第三人称主体）
 *   ❌ "The Draught of Living Death is difficult."（无第一人称）
 *
 * @param userMessage 用户消息（原始大小写）
 * @returns true 表示通过主体过滤
 */
function passesSubjectFilter(userMessage: string): boolean {
  const hasFirstPerson = FIRST_PERSON_PATTERNS.some((p) => p.test(userMessage));
  if (!hasFirstPerson) return false;

  const hasThirdPerson = THIRD_PERSON_BLACKLIST.some((p) =>
    p.test(userMessage),
  );
  return !hasThirdPerson;
}

/**
 * 从用户消息中提取药剂名称作为 subject。
 *
 * 匹配策略：按 KNOWN_POTIONS 顺序，命中第一个即返回。
 * 全部未命中返回 "potion"（通用 fallback）。
 *
 * @param userMessage 用户消息（原始大小写）
 * @returns 药剂名称或 "potion"
 */
function extractPotionSubject(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const potion of KNOWN_POTIONS) {
    if (lower.includes(potion)) {
      return potion;
    }
  }
  return "potion";
}

/**
 * 从用户消息中提取错误类型作为 detail。
 *
 * 匹配策略：按 ERROR_TYPE_PATTERNS 顺序，命中第一个即返回对应 label。
 * 全部未命中返回 undefined（事件仍记录，只是没有细分原因）。
 *
 * @param userMessage 用户消息（原始大小写）
 * @returns 错误类型 label 或 undefined
 */
function extractErrorDetail(userMessage: string): string | undefined {
  for (const { pattern, label } of ERROR_TYPE_PATTERNS) {
    if (pattern.test(userMessage)) {
      return label;
    }
  }
  return undefined;
}

/**
 * 捕获 knowledge-gap 事件。
 *
 * 触发条件：
 *   1. 用户消息命中 KNOWLEDGE_GAP_TRIGGERS
 *   2. 通过主体过滤（第一人称 + 无第三人称主体）
 *
 * 输出：
 *   - subject：药剂名称（或 "potion" fallback）
 *   - detail：错误类型（或 undefined）
 *   - count：1（merge 时累计）
 *
 * @param userMessage 用户消息
 * @returns SharedHistoryEvent 或 null（未触发 / 未通过过滤）
 */
function captureKnowledgeGap(
  userMessage: string,
): SharedHistoryEvent | null {
  const isTriggered = KNOWLEDGE_GAP_TRIGGERS.some((p) => p.test(userMessage));
  if (!isTriggered) return null;

  if (!passesSubjectFilter(userMessage)) return null;

  return {
    type: "knowledge-gap",
    subject: extractPotionSubject(userMessage),
    detail: extractErrorDetail(userMessage),
    count: 1,
    timestamp: Date.now(),
  };
}

/**
 * 捕获 achievement 事件。
 *
 * 触发条件：
 *   1. 用户消息命中 ACHIEVEMENT_TRIGGERS
 *   2. 通过主体过滤（第一人称 + 无第三人称主体）
 *
 * 输出：
 *   - subject：药剂名称（或 "potion" fallback）
 *   - detail：undefined（成就不需要细分原因）
 *   - count：1（merge 时累计）
 *
 * @param userMessage 用户消息
 * @returns SharedHistoryEvent 或 null（未触发 / 未通过过滤）
 */
function captureAchievement(userMessage: string): SharedHistoryEvent | null {
  const isTriggered = ACHIEVEMENT_TRIGGERS.some((p) => p.test(userMessage));
  if (!isTriggered) return null;

  if (!passesSubjectFilter(userMessage)) return null;

  return {
    type: "achievement",
    subject: extractPotionSubject(userMessage),
    count: 1,
    timestamp: Date.now(),
  };
}

/**
 * 捕获 archive-explored 事件。
 *
 * 触发条件：
 *   newState.viewedArchives.length > previousState.viewedArchives.length
 *   且 context.archive 存在（可提取 title 与 id）
 *
 * 输出：
 *   - subject：archive.title
 *   - sourceId：archive.id
 *   - count：1（同一 archive 多次查看时，merge 累计）
 *   - detail：undefined
 *
 * 注意：一次 converse 最多新增一个 archive（request.archiveId 单值），
 *       因此最多产生一个 archive-explored 事件。
 *
 * @param context 本轮 SnapeContext
 * @param previousState 更新前状态
 * @param newState 更新后状态
 * @returns SharedHistoryEvent 或 null（未触发 / archive 缺失）
 */
function captureArchiveExplored(
  context: SnapeContext,
  previousState: ConversationState,
  newState: ConversationState,
): SharedHistoryEvent | null {
  if (newState.viewedArchives.length <= previousState.viewedArchives.length) {
    return null;
  }

  const archive = context.archive;
  if (!archive) return null;

  return {
    type: "archive-explored",
    subject: archive.title,
    sourceId: archive.id,
    count: 1,
    timestamp: Date.now(),
  };
}

/**
 * 捕获 topic-discussed 事件。
 *
 * 触发条件：
 *   sessionMemory.currentTopic 存在且不为 "unknown"
 *
 * 输出：
 *   - subject：topic 映射的可读字符串
 *   - count：1（merge 时累计，表示该 topic 被讨论的轮次数）
 *   - detail：undefined
 *
 * 去重说明：
 *   本函数每次调用只产生 count=1 的事件。
 *   "第一次出现 count=1，第五次出现 count=5" 的效果由 mergeSharedHistoryEvents() 累计实现，
 *   不是本函数负责。
 *
 * @param sessionMemory 当前 SessionMemory
 * @returns SharedHistoryEvent 或 null（topic 为 unknown / 未推断）
 */
function captureTopicDiscussed(
  sessionMemory: SessionMemory,
): SharedHistoryEvent | null {
  const topic = sessionMemory.currentTopic;
  if (!topic || topic === "unknown") return null;

  const subject = TOPIC_TO_SUBJECT[topic];
  if (!subject) return null;

  return {
    type: "topic-discussed",
    subject,
    count: 1,
    timestamp: Date.now(),
  };
}

/**
 * 主入口：从本轮对话捕获 SharedHistoryEvent[]。
 *
 * 返回的是"本轮新产生的事件"（未与 existing 合并）。
 * 调用方（Step 4 ConversationEngine）负责调用 mergeSharedHistoryEvents()
 * 与 RelationshipMemory.sharedHistory 合并。
 *
 * 捕获顺序（不影响结果，仅代码可读性）：
 *   1. knowledge-gap（最高叙事价值）
 *   2. achievement
 *   3. archive-explored
 *   4. topic-discussed（最低优先级，但总是累计）
 *
 * 注意：本函数可能同时返回多个事件。
 *   例如用户查看 archive 后提问 "I failed this potion"，
 *   可能同时产生 archive-explored + knowledge-gap + topic-discussed。
 *
 * @param captureContext 捕获上下文
 * @returns 本轮新产生的 SharedHistoryEvent[]（可能为空数组）
 */
export function captureSharedHistoryEvents(
  captureContext: CaptureContext,
): SharedHistoryEvent[] {
  const { userMessage, context, previousState, newState, sessionMemory } =
    captureContext;

  const events: SharedHistoryEvent[] = [];

  // 1. knowledge-gap（最高叙事价值）
  const knowledgeGap = captureKnowledgeGap(userMessage);
  if (knowledgeGap) events.push(knowledgeGap);

  // 2. achievement
  const achievement = captureAchievement(userMessage);
  if (achievement) events.push(achievement);

  // 3. archive-explored
  const archiveExplored = captureArchiveExplored(
    context,
    previousState,
    newState,
  );
  if (archiveExplored) events.push(archiveExplored);

  // 4. topic-discussed（最低优先级，但总是累计）
  const topicDiscussed = captureTopicDiscussed(sessionMemory);
  if (topicDiscussed) events.push(topicDiscussed);

  return events;
}

/**
 * 将 incoming 事件列表合并到 existing 列表中。
 *
 * 去重规则：
 *   - 匹配 type + subject → count += inc.count，timestamp 取新值，detail 新值优先
 *   - 不匹配 → append
 *
 * 不可变性：
 *   - 不修改 existing 数组
 *   - 不修改 incoming 数组
 *   - 返回全新数组
 *
 * detail 合并策略：
 *   - incoming.detail 非空 → 使用新值（更近期的事件描述更准确）
 *   - incoming.detail 为空 → 保留 existing.detail（不丢失历史信息）
 *
 * sourceId 合并策略：
 *   - incoming.sourceId 非空 → 使用新值
 *   - incoming.sourceId 为空 → 保留 existing.sourceId
 *   （archive-explored 事件总是携带 sourceId，不会丢失）
 *
 * @param existing 现有事件列表（可为 undefined 或空数组）
 * @param incoming 本轮新产生的事件列表
 * @returns 合并后的全新事件列表
 */
export function mergeSharedHistoryEvents(
  existing: SharedHistoryEvent[] | undefined,
  incoming: SharedHistoryEvent[],
): SharedHistoryEvent[] {
  // existing 为空：直接复制 incoming
  if (!existing || existing.length === 0) {
    return incoming.length > 0 ? incoming.map((e) => ({ ...e })) : [];
  }

  // incoming 为空：复制 existing
  if (incoming.length === 0) {
    return existing.map((e) => ({ ...e }));
  }

  // 深拷贝 existing 作为合并基础
  const merged: SharedHistoryEvent[] = existing.map((e) => ({ ...e }));

  for (const inc of incoming) {
    const matchIndex = merged.findIndex(
      (e) => e.type === inc.type && e.subject === inc.subject,
    );

    if (matchIndex >= 0) {
      // 匹配：累计 count，更新 timestamp，detail / sourceId 取新值优先
      const target = merged[matchIndex];
      merged[matchIndex] = {
        type: target.type,
        subject: target.subject,
        detail: inc.detail ?? target.detail,
        count: target.count + inc.count,
        timestamp: inc.timestamp, // 取较新时间
        sourceId: inc.sourceId ?? target.sourceId,
      };
    } else {
      // 不匹配：追加新事件（深拷贝避免外部引用）
      merged.push({ ...inc });
    }
  }

  return merged;
}
