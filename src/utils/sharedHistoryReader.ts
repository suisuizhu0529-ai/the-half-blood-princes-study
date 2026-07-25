/**
 * Shared History Reader（Phase 15.6-A Step 5）。
 *
 * 定位：RelationshipMemory.sharedHistory → SharedHistoryContext 的只读适配器。
 *   - 纯函数，无副作用、无状态
 *   - 不修改 RelationshipMemory 原结构
 *   - 不读写 store / localStorage
 *   - 不调用 LLM
 *   - 不重新判断主体（主体过滤由 capture 层负责）
 *
 * 与 relationshipMemoryReader 的关系：
 *   - relationshipMemoryReader：memory → RelationshipContext（关系状态视图）
 *   - sharedHistoryReader：memory → SharedHistoryContext（共同经历视图）
 *   - 两者并列，互不重叠，由 ConversationEngine 分别调用
 *
 * trust 控制 recall 深度（不隐藏 memory）：
 *   Snape 的特点不是"不记得"，而是"不承认"。
 *   memory 永远可读，但 trust 控制 Snape 愿意透露多少细节。
 *
 *   - "fact"（trust 0-19）：只引用事实（type + subject）
 *   - "experience"（trust 20-59）：引用学习经历（+ detail + count）
 *   - "personal"（trust 60+）：引用个人评价（+ narrative framing）
 *
 * Phase 15.6-A Step 5 范围：
 *   - readSharedHistory()：纯函数转换
 *
 * 不实现（留待后续 Step）：
 *   - Prompt 注入（Step 6）
 *   - ConversationEngine 集成（Step 7）
 *   - trust 深度边界调优（Step 8）
 */

import type { RelationshipMemory } from "@/types/relationshipMemory";
import type { SharedHistoryEvent } from "@/types/sharedHistory";
import type {
  SharedHistoryContext,
  SharedHistoryRecallDepth,
  SharedHistoryRecallEvent,
} from "@/types/sharedHistoryContext";

/**
 * Trust 阈值常量。
 *
 * 与 relationshipBehaviorResolver 的 trust 分级对齐：
 *   - < 20：stranger / guarded 起点之前（低信任）
 *   - 20-59：guarded / warming（中信任）
 *   - 60+：trusted（高信任）
 *
 * 注意：此处使用 60 作为 "personal" 阈值，
 *       比 relationshipBehaviorResolver 的 "trusted"（80）略低。
 *       原因：recall 深度比行为指引更早"解锁"，
 *       Snape 在 trust=60 时已愿意回忆共同经历，
 *       但要 trust=80 才完全开放行为指引。
 */
const TRUST_THRESHOLD_EXPERIENCE = 20;
const TRUST_THRESHOLD_PERSONAL = 60;

/**
 * 事件类型优先级（数值越小优先级越高）。
 *
 * 排序意图：
 *   高叙事价值的事件优先展示，让 Prompt 中靠前的事件更易被 LLM 引用。
 *   - achievement（1）：成功经历最具叙事价值，代表学生成长
 *   - knowledge-gap（2）：失败经历次之，代表学生薄弱点
 *   - archive-explored（3）：档案查看，中性事实
 *   - topic-discussed（4）：话题讨论，最常见，优先级最低
 */
const EVENT_TYPE_PRIORITY: Readonly<Record<string, number>> = {
  achievement: 1,
  "knowledge-gap": 2,
  "archive-explored": 3,
  "topic-discussed": 4,
};

/**
 * 根据 trust 值解析 recall 深度。
 *
 * 规则：
 *   - trust < 20  → "fact"（只引用事实）
 *   - trust < 60  → "experience"（引用学习经历）
 *   - trust >= 60 → "personal"（引用个人评价）
 *
 * 注意：trust 边界值（20 / 60）归入较高深度档位。
 *   - trust=20 → "experience"（刚解锁学习经历）
 *   - trust=60 → "personal"（刚解锁个人评价）
 *
 * @param trust 信任度（0-100）
 * @returns recall 深度
 */
function resolveRecallDepth(trust: number): SharedHistoryRecallDepth {
  if (trust < TRUST_THRESHOLD_EXPERIENCE) return "fact";
  if (trust < TRUST_THRESHOLD_PERSONAL) return "experience";
  return "personal";
}

/**
 * 将 subject 转换为 Title Case（首字母大写）。
 *
 * 用于 framing 中的自然语言表达。
 * 例如："draught of living death" → "Draught of Living Death"
 *
 * @param subject 原始 subject（小写）
 * @returns Title Case 后的 subject
 */
function toTitleCase(subject: string): string {
  return subject.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * 为单个事件生成 narrative framing（仅 depth="personal" 使用）。
 *
 * 按事件类型生成 Snape 视角的自然语言叙事句：
 *   - knowledge-gap：描述学生反复遇到的困难
 *   - achievement：描述学生达成的成就
 *   - archive-explored：描述学生查看过的档案
 *   - topic-discussed：描述反复讨论的话题
 *
 * 设计意图：
 *   framing 是 Snape 内心视角的描述，不是对学生的直接对话。
 *   用于 Prompt 注入时让 LLM 理解"Snape 如何看待这段经历"。
 *
 * @param event 原始 SharedHistoryEvent
 * @returns Snape 视角的叙事句
 */
function generateFraming(event: SharedHistoryEvent): string {
  const title = toTitleCase(event.subject);

  switch (event.type) {
    case "knowledge-gap": {
      const detailClause = event.detail
        ? `, particularly ${event.detail}`
        : "";
      const countClause =
        event.count > 1 ? ` (repeated ${event.count} times)` : "";
      return `The student has struggled with ${event.subject}${detailClause}${countClause}.`;
    }

    case "achievement": {
      const countClause =
        event.count > 1 ? ` (accomplished ${event.count} times)` : "";
      return `The student has achieved ${title}${countClause}.`;
    }

    case "archive-explored": {
      const countClause =
        event.count > 1 ? ` (viewed ${event.count} times)` : "";
      return `The student has explored ${title}${countClause}.`;
    }

    case "topic-discussed": {
      const countClause =
        event.count > 1 ? ` (discussed ${event.count} times)` : "";
      return `We have discussed ${event.subject}${countClause}.`;
    }

    default:
      return `The student has engaged with ${event.subject}.`;
  }
}

/**
 * 将单个 SharedHistoryEvent 转换为 recall event（按 depth 裁剪字段）。
 *
 * 字段可见性规则：
 *   - depth="fact"：仅 type + subject
 *   - depth="experience"：type + subject + count + detail
 *   - depth="personal"：全部字段（含 framing）
 *
 * @param event 原始 SharedHistoryEvent
 * @param depth recall 深度
 * @returns 裁剪后的 SharedHistoryRecallEvent
 */
function toRecallEvent(
  event: SharedHistoryEvent,
  depth: SharedHistoryRecallDepth,
): SharedHistoryRecallEvent {
  const base: SharedHistoryRecallEvent = {
    type: event.type,
    subject: event.subject,
  };

  if (depth === "fact") {
    return base;
  }

  // depth="experience" 及以上：附加 count + detail
  const experience: SharedHistoryRecallEvent = {
    ...base,
    count: event.count,
    detail: event.detail,
  };

  if (depth === "experience") {
    return experience;
  }

  // depth="personal"：附加 framing
  return {
    ...experience,
    framing: generateFraming(event),
  };
}

/**
 * 事件排序比较器。
 *
 * 排序规则（稳定排序）：
 *   1. 按 EVENT_TYPE_PRIORITY 升序（achievement 优先）
 *   2. 同类型内按 timestamp 降序（最新优先）
 *
 * 注意：使用 Array.prototype.sort 会改变原数组，
 *       调用方应先复制（本函数内部已 slice 复制）。
 *
 * @param a 事件 A
 * @param b 事件 B
 * @returns 比较结果
 */
function compareEvents(
  a: SharedHistoryEvent,
  b: SharedHistoryEvent,
): number {
  const priorityA = EVENT_TYPE_PRIORITY[a.type] ?? 99;
  const priorityB = EVENT_TYPE_PRIORITY[b.type] ?? 99;

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  // 同类型：timestamp 降序（新的在前）
  return b.timestamp - a.timestamp;
}

/**
 * 将 RelationshipMemory 转换为只读 SharedHistoryContext 视图。
 *
 * 转换流程（确定性，无 LLM）：
 *   1. 从 memory.relationship.trust 解析 recall 深度
 *   2. 读取 memory.sharedHistory（undefined / 空数组 → 返回空 events）
 *   3. 复制事件列表（不修改原数组）
 *   4. 按类型优先级 + timestamp desc 排序
 *   5. 按 depth 裁剪每个事件的字段
 *
 * 安全默认值：
 *   - sharedHistory 为 undefined / 空数组 → events: []
 *   - trust 越界（< 0 / > 100）→ 仍按阈值规则处理（< 20 → "fact"）
 *
 * 空状态示例：
 *   输入：{ relationship: { trust: 35 }, sharedHistory: undefined }
 *   输出：{ depth: "experience", events: [] }
 *
 * 不修改输入：纯函数，返回全新对象。
 *
 * @param memory 当前 RelationshipMemory（只读）
 * @returns SharedHistoryContext 视图模型
 */
export function readSharedHistory(
  memory: RelationshipMemory,
): SharedHistoryContext {
  const trust = memory.relationship.trust;
  const depth = resolveRecallDepth(trust);

  const rawEvents = memory.sharedHistory;
  if (!rawEvents || rawEvents.length === 0) {
    return {
      depth,
      events: [],
    };
  }

  // 复制后排序（不修改原数组）
  const sorted = [...rawEvents].sort(compareEvents);

  // 按 depth 裁剪字段
  const events = sorted.map((e) => toRecallEvent(e, depth));

  return {
    depth,
    events,
  };
}
