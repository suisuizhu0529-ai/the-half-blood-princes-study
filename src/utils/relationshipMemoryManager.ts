/**
 * Relationship Memory Manager（Phase 15.3 → 15.5-B1）。
 *
 * 定位：RelationshipMemory 的纯函数管理器。
 *
 * 设计原则：
 *   - 纯函数，无副作用（不直接读写 localStorage，由 store 层负责）
 *   - 不可变更新：所有方法返回新对象，不修改原对象
 *   - 不接入 ConversationEngine
 *   - 不修改 PromptBuilder
 *   - 类型安全，无 any
 *
 * Phase 15.3 范围（基础设施）：
 *   - initializeRelationshipMemory()：首次创建或返回已有
 *   - updateRelationshipTimestamp()：更新 updatedAt
 *   - getRelationshipSummary()：生成简短文本（供未来 PromptBuilder 使用）
 *
 * Phase 15.5-B1 新增（Write Path Foundation）：
 *   - updateRelationshipMemory()：基于 ConversationState 同步里程碑 +
 *     用户明确自报姓名提取（不实现 trust/event/AI extraction）
 *
 * 不实现（留待后续 Phase）：
 *   - 数值修改（trust / patience / curiosity 调整）
 *   - 自动关系升级
 *   - 事件提取
 *   - mistake system
 *   - event system
 *   - LLM memory extraction
 */

import type { RelationshipMemory } from "@/types/relationshipMemory";
import type { ConversationState } from "@/types/conversation";
import type { ConversationRequest } from "@/services/conversation/types";
import type { RelationshipSignal } from "@/types/relationshipSignal";
import {
  loadRelationshipMemory,
  saveRelationshipMemory,
  createDefaultRelationshipMemory,
} from "@/store/relationshipMemory";

/**
 * 初始化 RelationshipMemory。
 *
 * 流程：
 *   1. 从 localStorage 读取
 *   2. 存在 → 返回已有
 *   3. 不存在 → 创建默认 + 保存 + 返回
 *
 * 用于应用启动时（或首次访问时）确保 RelationshipMemory 存在。
 *
 * @returns RelationshipMemory（已有或新创建）
 */
export function initializeRelationshipMemory(): RelationshipMemory {
  const existing = loadRelationshipMemory();
  if (existing) {
    return existing;
  }

  const created = createDefaultRelationshipMemory();
  saveRelationshipMemory(created);
  return created;
}

/**
 * 更新 RelationshipMemory 的 updatedAt 时间戳。
 *
 * 不可变更新：返回新对象，不修改原对象。
 * 同时持久化到 localStorage。
 *
 * @param memory 当前 RelationshipMemory
 * @returns 新 RelationshipMemory（updatedAt 已更新）
 */
export function updateRelationshipTimestamp(
  memory: RelationshipMemory,
): RelationshipMemory {
  const updated: RelationshipMemory = {
    ...memory,
    metadata: {
      ...memory.metadata,
      updatedAt: Date.now(),
    },
  };
  saveRelationshipMemory(updated);
  return updated;
}

/**
 * 生成供 PromptBuilder 使用的简短文本摘要（memorySummary）。
 *
 * Phase 15.5-E 职责调整（去重）：
 *   memorySummary 聚焦"用户背景 + 学习进度 + 非关系状态信息"，
 *   与 relationshipContext（结构化关系状态）互补，避免重复。
 *
 * 输出格式（Phase 15.5-E 精简后）：
 *
 * ```
 * Relationship memory:
 * - Stage: student
 * - Learning style: analytical    (若存在)
 * - Preferred language: en         (若存在)
 * - Potion level: 2
 * - Completed topics: 3             (若 > 0)
 * - Achievements: 1                 (若 > 0)
 * ```
 *
 * 已移除字段（Phase 15.5-E）：
 *   - Trust / Curiosity           → 已由 relationshipContext 提供
 *   - Patience                    → D-2 已决定不暴露给 LLM，保持内部状态
 *   - User name                   → relationshipContext 保留，用于行为条件判断
 *   - Archives viewed / Memories activated → milestone boolean 已覆盖
 *
 * @param memory 当前 RelationshipMemory
 * @returns 简短文本摘要
 */
export function getRelationshipSummary(
  memory: RelationshipMemory,
): string {
  const lines: string[] = ["Relationship memory:"];

  // Stage（关系阶段标签，relationshipContext 未展示此字段）
  lines.push(`- Stage: ${memory.relationship.stage}`);

  // 用户背景（学习风格 / 偏好语言）
  if (memory.userProfile.learningStyle) {
    lines.push(`- Learning style: ${memory.userProfile.learningStyle}`);
  }

  if (memory.userProfile.preferredLanguage) {
    lines.push(`- Preferred language: ${memory.userProfile.preferredLanguage}`);
  }

  // 学习进度
  lines.push(`- Potion level: ${memory.progress.potionLevel}`);

  if (memory.progress.completedTopics.length > 0) {
    lines.push(
      `- Completed topics: ${memory.progress.completedTopics.length}`,
    );
  }

  if (memory.progress.achievements.length > 0) {
    lines.push(`- Achievements: ${memory.progress.achievements.length}`);
  }

  return lines.join("\n");
}

/**
 * 用户自报姓名正则表（明确格式，不猜测）。
 *
 * 支持的格式：
 *   英文：
 *     - "my name is John"
 *     - "I am John" / "I'm John"
 *     - "call me John"
 *   中文：
 *     - "我叫 John"
 *     - "我是 John"
 *
 * 捕获组 1 为姓名（英文字母 / 中文 / 数字，1-30 字符）。
 * 不匹配：
 *   - "I like potions"（无姓名关键词）
 *   - "What is your name?"（问句，非陈述）
 *   - "name"（无具体姓名）
 */
const NAME_PATTERNS: readonly RegExp[] = [
  // 英文：my name is X / I am X / I'm X / call me X
  /\bmy\s+name\s+is\s+([A-Za-z][A-Za-z\s'-]{0,29})\b/i,
  /\b(?:I\s+am|I'm)\s+([A-Za-z][A-Za-z\s'-]{0,29})\b/i,
  /\bcall\s+me\s+([A-Za-z][A-Za-z\s'-]{0,29})\b/i,
  // 中文：我叫 X / 我是 X（X 可为中文或英文）
  /我叫([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z\s'-]{0,29})/,
  /我是([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z\s'-]{0,29})/,
];

/**
 * 从用户消息中提取明确自报姓名。
 *
 * 匹配策略：按 NAME_PATTERNS 顺序，命中第一个即返回。
 * 姓名规范化：去首尾空格 + 取第一个 token（如 "John Smith" 取 "John"）。
 *
 * 不匹配的场景（返回 undefined）：
 *   - "I like potions"
 *   - "What is your name?"
 *   - "name"
 *   - "Hello, professor."
 *
 * @param userMessage 用户消息
 * @returns 提取的姓名（string）或 undefined（未明确自报）
 */
function extractUserName(userMessage: string): string | undefined {
  for (const pattern of NAME_PATTERNS) {
    const match = pattern.exec(userMessage);
    if (match && match[1]) {
      // 规范化：去首尾空格 + 取第一个 token（避免捕获过长描述）
      const raw = match[1].trim();
      const firstName = raw.split(/\s+/)[0];
      // 基本长度校验（1-30 字符）
      if (firstName.length >= 1 && firstName.length <= 30) {
        return firstName;
      }
    }
  }
  return undefined;
}

/**
 * 数值 clamp 工具：限制 value 在 [0, 100] 区间。
 *
 * 用于 trust / patience / curiosity 的安全更新。
 */
function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * 信号 → 数值增量映射表（Phase 15.5-B2-A 确定性规则）。
 *
 * 每种信号类型对应的 trust / patience / curiosity 增量。
 * 增量为 0 表示该信号不影响该数值。
 */
const SIGNAL_DELTAS: Record<
  RelationshipSignal["type"],
  { trust: number; patience: number; curiosity: number }
> = {
  "archive-viewed": { trust: 0, patience: 0, curiosity: 1 },
  "memory-activated": { trust: 2, patience: 0, curiosity: 1 },
  "lesson-progress": { trust: 0, patience: 0, curiosity: 0 }, // 本阶段不产生，预留
  "user-question": { trust: 0, patience: 0, curiosity: 1 },
  "polite-interaction": { trust: 1, patience: 1, curiosity: 0 },
};

/**
 * 基于 ConversationState 与用户消息更新 RelationshipMemory。
 *
 * Phase 15.5-B1 范围（Write Path Foundation）：
 *   1. metadata.updatedAt = Date.now()（每次 converse 后必更新）
 *   2. milestones.firstMeeting（首次 converse 时设置，已存在则不覆盖）
 *   3. milestones.archiveViewedCount（从 ConversationState.viewedArchives 同步）
 *   4. milestones.memoryActivatedCount（从 ConversationState.activatedMemories 同步）
 *   5. userProfile.name（仅当用户明确自报姓名时更新，不猜测）
 *
 * Phase 15.5-B2-A 新增（确定性关系信号）：
 *   6. 根据 signals 调整 trust / patience / curiosity 数值（0-100 clamp）
 *
 * 不可变更新：返回新对象，不修改原对象。
 * 不持久化：由调用方（ConversationEngine）负责 saveRelationshipMemory()。
 *
 * 严格禁止（本阶段不实现）：
 *   - relationship stage 自动升级
 *   - interactionHistory 事件
 *   - mistake system
 *   - LLM memory extraction
 *
 * @param memory 当前 RelationshipMemory
 * @param request 本轮对话请求（用于提取用户姓名）
 * @param state 更新后的 ConversationState（用于同步里程碑计数）
 * @param signals 本轮产生的关系信号（Phase 15.5-B2-A，默认空数组）
 * @returns 新 RelationshipMemory（不可变更新）
 */
export function updateRelationshipMemory(
  memory: RelationshipMemory,
  request: ConversationRequest,
  state: ConversationState,
  signals: RelationshipSignal[] = [],
): RelationshipMemory {
  const now = Date.now();

  // 1. 同步里程碑计数（从 ConversationState 读取，不重新判断）
  const archiveViewedCount = state.viewedArchives.length;
  const memoryActivatedCount = state.activatedMemories.length;

  // 2. 首次相遇时间（已存在则不覆盖）
  const firstMeeting = memory.milestones.firstMeeting ?? now;

  // 3. 用户明确自报姓名（仅当未设置时提取，避免覆盖已有姓名）
  //    若用户已设置姓名，本轮不覆盖（防止 "I am John" → "I am Potter" 误覆盖）
  //    未来 Phase 可实现姓名变更逻辑
  let userName = memory.userProfile.name;
  if (!userName) {
    const extracted = extractUserName(request.userMessage);
    if (extracted) {
      userName = extracted;
    }
  }

  // 4. 应用关系信号（Phase 15.5-B2-A）
  //    累加所有 signals 的 delta，统一 clamp 到 [0, 100]
  let trustDelta = 0;
  let patienceDelta = 0;
  let curiosityDelta = 0;
  for (const signal of signals) {
    const delta = SIGNAL_DELTAS[signal.type];
    trustDelta += delta.trust;
    patienceDelta += delta.patience;
    curiosityDelta += delta.curiosity;
  }

  const trust = clamp(memory.relationship.trust + trustDelta);
  const patience = clamp(memory.relationship.patience + patienceDelta);
  const curiosity = clamp(memory.relationship.curiosity + curiosityDelta);

  // 5. 构建新对象（不可变更新）
  return {
    ...memory,
    metadata: {
      ...memory.metadata,
      updatedAt: now,
    },
    relationship: {
      ...memory.relationship,
      trust,
      patience,
      curiosity,
    },
    milestones: {
      ...memory.milestones,
      firstMeeting,
      archiveViewedCount,
      memoryActivatedCount,
    },
    userProfile: {
      ...memory.userProfile,
      name: userName,
    },
  };
}
