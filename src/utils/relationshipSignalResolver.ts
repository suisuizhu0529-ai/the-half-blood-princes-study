/**
 * Relationship Signal Resolver（Phase 15.5-B2-A）。
 *
 * 定位：基于确定性规则从 ConversationState 变化 + 用户消息关键词
 *      识别关系成长信号（RelationshipSignal）。
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 确定性规则（不调用 LLM）
 *   - 类型安全，无 any
 *   - 不读写 localStorage
 *   - 不依赖 React
 *
 * Phase 15.5-B2-A 信号规则：
 *   1. archive-viewed     newState.viewedArchives.length > previousState.viewedArchives.length
 *   2. memory-activated   newState.activatedMemories.length > previousState.activatedMemories.length
 *   3. user-question      用户消息含 "?" 或疑问词（what/why/how/为什么/怎么）
 *   4. polite-interaction 用户消息含感谢词（thank/thanks/谢谢/感谢）
 *
 * lesson-progress 信号类型已定义但本阶段不产生（未来扩展）。
 */

import type { ConversationState } from "@/types/conversation";
import type { SessionMemory } from "@/types/sessionMemory";
import type {
  RelationshipSignal,
  RelationshipSignalType,
} from "@/types/relationshipSignal";
import type { ConversationRequest } from "@/services/conversation/types";

/**
 * 用户提问关键词（英文 + 中文）。
 *
 * 命中任意一个即产生 user-question 信号。
 * 英文大小写不敏感（调用方已 toLowerCase）。
 */
const QUESTION_KEYWORDS: readonly string[] = [
  // 英文疑问词
  "what",
  "why",
  "how",
  "when",
  "where",
  "who",
  "which",
  // 中文疑问词
  "为什么",
  "怎么",
  "如何",
  "什么是",
  "是什么",
  "哪里",
  "哪个",
];

/**
 * 用户感谢关键词（英文 + 中文）。
 *
 * 命中任意一个即产生 polite-interaction 信号。
 * 英文大小写不敏感（调用方已 toLowerCase）。
 */
const POLITE_KEYWORDS: readonly string[] = [
  // 英文
  "thank",
  "thanks",
  "thank you",
  "grateful",
  // 中文
  "谢谢",
  "感谢",
  "多谢",
];

/**
 * 检测用户消息是否包含提问信号。
 *
 * 规则：
 *   1. 包含 "?" 或 "？"（全角问号）
 *   2. 包含任意 QUESTION_KEYWORDS
 *
 * @param userMessage 用户消息（原始大小写）
 * @returns true 表示检测到提问
 */
function containsQuestion(userMessage: string): boolean {
  // 问号检测（半角 + 全角）
  if (userMessage.includes("?") || userMessage.includes("？")) {
    return true;
  }
  // 关键词检测（转小写后 includes，简单可靠）
  const lower = userMessage.toLowerCase();
  return QUESTION_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 检测用户消息是否包含礼貌互动信号。
 *
 * 规则：包含任意 POLITE_KEYWORDS。
 *
 * @param userMessage 用户消息（原始大小写）
 * @returns true 表示检测到礼貌互动
 */
function containsPolite(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  return POLITE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 根据本轮对话输入解析关系信号。
 *
 * 一次调用可能产生多个信号（例如同时查看了 archive 并提出了问题）。
 * 每个信号携带独立时间戳（统一使用调用时刻的 Date.now()）。
 *
 * 解析规则（确定性，无 LLM）：
 *   - archive-viewed：viewedArchives 数量增加
 *   - memory-activated：activatedMemories 数量增加
 *   - user-question：用户消息含问号或疑问词
 *   - polite-interaction：用户消息含感谢词
 *   - lesson-progress：本阶段不产生（未来扩展）
 *
 * @param request 本轮对话请求（包含用户消息）
 * @param previousState 更新前的 ConversationState
 * @param newState 更新后的 ConversationState
 * @param _sessionMemory 当前 SessionMemory（本阶段未使用，预留扩展）
 * @returns RelationshipSignal[]（可能为空数组）
 */
export function resolveRelationshipSignals(
  request: ConversationRequest,
  previousState: ConversationState,
  newState: ConversationState,
  _sessionMemory: SessionMemory,
): RelationshipSignal[] {
  // sessionMemory 参数预留用于未来扩展（如基于 topic 的信号），
  // 本阶段未使用，通过 void 引用避免 lint 错误
  void _sessionMemory;

  const signals: RelationshipSignal[] = [];
  const now = Date.now();

  // 1. archive-viewed：viewedArchives 数量增加
  if (newState.viewedArchives.length > previousState.viewedArchives.length) {
    signals.push({
      type: "archive-viewed" as RelationshipSignalType,
      timestamp: now,
    });
  }

  // 2. memory-activated：activatedMemories 数量增加
  if (
    newState.activatedMemories.length > previousState.activatedMemories.length
  ) {
    signals.push({
      type: "memory-activated" as RelationshipSignalType,
      timestamp: now,
    });
  }

  // 3. user-question：用户消息含问号或疑问词
  if (containsQuestion(request.userMessage)) {
    signals.push({
      type: "user-question" as RelationshipSignalType,
      timestamp: now,
    });
  }

  // 4. polite-interaction：用户消息含感谢词
  if (containsPolite(request.userMessage)) {
    signals.push({
      type: "polite-interaction" as RelationshipSignalType,
      timestamp: now,
    });
  }

  // lesson-progress 本阶段不产生（未来扩展）

  return signals;
}
