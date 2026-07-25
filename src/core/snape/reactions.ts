/**
 * SnapeReactions（Phase 17.1-C Step 2）。
 *
 * 定位：Snape 的事件驱动反应系统。
 *   - Event → Reaction Category → Lines
 *   - 纯数据 + 类型，无 React 依赖
 *   - 不做随机台词库（避免提前写死所有对白）
 *
 * 设计意图：
 *   Snape 是"始终存在于房间里的观察者"。
 *   通过事件触发低语（文字浮现），而非主动聊天。
 *
 * Step 2 范围：
 *   - 定义 8 个 SnapeMoment 事件点
 *   - 每个事件点 1-2 条候选文案（最小集）
 *   - pickSnapeReaction 选取函数
 *
 * 不做：
 *   - 不写几十句台词（节奏未定，避免过早写死）
 *   - 不接入 useSpeech（由 SnapeWhisper 组件负责）
 *   - 不绑定 Lumos（Step 3 才接入）
 */

/**
 * Snape 反应语气分类。
 *
 * 与 persona.tone 不同：这是单条反应的语气标签。
 *   - observation：观察陈述（中性，最常见）
 *   - approval：认可（罕见正面，受 warmthLevel 0.15 约束）
 *   - criticism：批评（常见，受 sarcasmLevel 0.7 约束）
 */
export type SnapeReactionTone =
  | "observation"
  | "approval"
  | "criticism";

/**
 * Lumos Ritual 中 Snape 反应的事件点。
 *
 * 每个事件点对应一个 Snape 低语时机：
 *   - ritual_enter：用户激活 Lumos，书房苏醒
 *   - book_open：魔法书打开
 *   - page_turn：翻到新研究页
 *   - research_saved：用户记录一个研究对象
 *   - verification_start：进入验证阶段
 *   - success：验证正确
 *   - failure：验证失败
 *   - ritual_complete：仪式完成
 *
 * 注意：这些事件点不绑定具体实现，Step 3+ 由 Ritual 调用方触发。
 */
export type SnapeMoment =
  | "ritual_enter"
  | "book_open"
  | "page_turn"
  | "research_saved"
  | "verification_start"
  | "success"
  | "failure"
  | "ritual_complete";

/**
 * 单条反应规则。
 */
export interface SnapeReaction {
  /** 触发事件 */
  moment: SnapeMoment;
  /** 反应语气 */
  tone: SnapeReactionTone;
  /** 候选文案（随机选一） */
  lines: string[];
}

/**
 * Snape 反应规则表（Step 2 最小集）。
 *
 * 每个事件点 1-2 条文案，满足"Snape ambient 存在"的最小需求。
 * 后续 Step 可根据 Ritual 真实节奏增补。
 *
 * 文案约束（来自 persona.ts）：
 *   - 短句（sentenceLength: "short"）
 *   - 高讽刺（sarcasmLevel: 0.7）→ criticism 类用讽刺而非粗鲁
 *   - 低温暖（warmthLevel: 0.15）→ approval 类含蓄，不热情
 */
export const SNAPE_REACTIONS: SnapeReaction[] = [
  {
    moment: "ritual_enter",
    tone: "observation",
    lines: [
      "The pages await.",
      "Another late arrival.",
      "You chose to return.",
    ],
  },
  {
    moment: "book_open",
    tone: "observation",
    lines: [
      "Today's research.",
      "Observe carefully.",
    ],
  },
  {
    moment: "page_turn",
    tone: "observation",
    lines: [
      "Read. Do not merely look.",
    ],
  },
  {
    moment: "research_saved",
    tone: "approval",
    lines: [
      "Noted.",
    ],
  },
  {
    moment: "verification_start",
    tone: "observation",
    lines: [
      "Now prove your memory.",
    ],
  },
  {
    moment: "success",
    tone: "approval",
    lines: [
      "Acceptable.",
    ],
  },
  {
    moment: "failure",
    tone: "criticism",
    lines: [
      "Interesting. Your memory seems selective.",
    ],
  },
  {
    moment: "ritual_complete",
    tone: "observation",
    lines: [
      "Tomorrow awaits.",
    ],
  },
];

/**
 * 根据事件选取一条反应文案。
 *
 * 选取规则：
 *   1. 按 moment 筛选规则
 *   2. 从 lines 中随机选一条
 *   3. 无匹配规则 → 返回 undefined（调用方应处理）
 *
 * @param moment 触发事件
 * @returns 选取的文案，或 undefined（无匹配规则）
 */
export function pickSnapeReaction(
  moment: SnapeMoment,
): string | undefined {
  const rule = SNAPE_REACTIONS.find((r) => r.moment === moment);
  if (!rule || rule.lines.length === 0) return undefined;

  if (rule.lines.length === 1) return rule.lines[0];

  const idx = Math.floor(Math.random() * rule.lines.length);
  return rule.lines[idx];
}
