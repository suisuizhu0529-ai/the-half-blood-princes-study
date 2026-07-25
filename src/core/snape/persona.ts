/**
 * SnapePersona（Phase 17.1-C Step 2）。
 *
 * 定位：Snape 的人格约束定义（domain 层，非 React feature）。
 *   - 影响 Lumos Ritual / Memory / Chat / Story 等多个 feature
 *   - 纯数据 + 类型，无 React 依赖
 *   - 不含具体文案（文案在 reactions.ts）
 *
 * 设计意图：
 *   不是模拟聊天机器人，而是定义约束。
 *   Snape 的所有反应必须符合此人格定义。
 *
 * Step 2 范围：
 *   - 完整人格维度（tone / principles / dislikes / speechStyle）
 *   - 作为后续所有 Snape 反应的约束源
 *
 * 不做：
 *   - 不写具体台词（在 reactions.ts）
 *   - 不接入 LLM
 *   - 不依赖 React
 */

/**
 * Snape 语气特征（多维，非互斥）。
 *
 * Snape 的语气不是单一值，而是多个特征同时存在：
 *   - precise：精确（始终）
 *   - sardonic：讽刺挖苦（常见）
 *   - reserved：克制内敛（始终）
 *   - occasionally-approving：偶尔认可（罕见正面）
 *
 * 设计为非互斥数组，让反应系统可以组合语气。
 */
export type SnapeToneAttribute =
  | "precise"
  | "sardonic"
  | "reserved"
  | "occasionally-approving";

/**
 * 说话风格量化。
 *
 * 用于约束 Snape 反应文案的生成与选取：
 *   - sentenceLength：句长倾向（Snape 始终用短句）
 *   - sarcasmLevel：讽刺程度 0-1（默认 0.7，高）
 *   - warmthLevel：温暖程度 0-1（默认 0.15，极低）
 */
export interface SnapeSpeechStyle {
  /** 句长倾向（Snape 始终 "short"） */
  sentenceLength: "short";
  /** 讽刺程度 0-1 */
  sarcasmLevel: number;
  /** 温暖程度 0-1 */
  warmthLevel: number;
}

/**
 * Snape 人格定义。
 *
 * 这是一个约束集，不是一个角色描述。
 * 所有 Snape 反应（reactions.ts）必须符合此定义。
 */
export interface SnapePersona {
  /** 语气特征（多维组合） */
  tone: SnapeToneAttribute[];
  /** 原则（Snape 看重的品质，反应文案应体现这些价值） */
  principles: string[];
  /** 厌恶（Snape 反感的倾向，反应文案应避免这些） */
  dislikes: string[];
  /** 说话风格量化约束 */
  speechStyle: SnapeSpeechStyle;
}

/**
 * Snape 人格常量。
 *
 * 冻结值（Step 2）：
 *   - tone: precise + sardonic + reserved + occasionally-approving
 *   - principles: precision / discipline / patience / intellectual curiosity / mastery through repetition
 *   - dislikes: over-enthusiasm / cute encouragement / generic motivation
 *   - speechStyle: 短句 + 高讽刺(0.7) + 低温暖(0.15)
 *
 * 这些值约束所有 Snape 反应：
 *   - 正面反应不能过度热情（warmthLevel 0.15 限制）
 *   - 负面反应不能粗鲁（precise 约束）
 *   - 鼓励必须含蓄（occasionally-approving，而非 "great job!"）
 */
export const SNAPE_PERSONA: SnapePersona = {
  tone: ["precise", "sardonic", "reserved", "occasionally-approving"],
  principles: [
    "precision",
    "discipline",
    "patience",
    "intellectual curiosity",
    "mastery through repetition",
  ],
  dislikes: [
    "over-enthusiasm",
    "cute encouragement",
    "generic motivation",
  ],
  speechStyle: {
    sentenceLength: "short",
    sarcasmLevel: 0.7,
    warmthLevel: 0.15,
  },
};
