/**
 * ResearchSubject 类型定义（Phase 17.1-C Step 1 骨架）。
 *
 * 定位：Lumos Ritual 的研究对象。
 *
 * 设计原则（用户修改 3：延后泛化）：
 *   - 第一版（Phase 17.1-C）仅支持 type = "vocabulary"
 *   - 不提前制造 union type（potion/creature/spell/memory）
 *   - 避免"类型爆炸"（Creature 无 phonetic / Potion 无 exampleEn 等问题）
 *   - 未来 Phase 18+ 再扩展为多类型继承结构
 *
 * 当前结构：
 *   ResearchSubject 直接包含 vocabulary 所需字段（phonetic / exampleEn）
 *   这些字段在 type="vocabulary" 时必填，未来其他类型可设为可选
 */

import type { Word } from "@/types/lesson";

/**
 * 研究对象类型。
 *
 * Phase 17.1-C：仅 "vocabulary"。
 * Phase 18+ 将扩展：potion / creature / spell / memory。
 */
export type ResearchSubjectType = "vocabulary";

/**
 * 手绘插图类型（用于 ResearchIllustration 组件）。
 */
export type IllustrationType =
  | "candle"
  | "cauldron"
  | "phoenix"
  | "wand"
  | "crystal"
  | "mandrake"
  | "root"
  | "default";

/**
 * 研究主题（每日轮换）。
 */
export interface ResearchTheme {
  /** 主题名称（如 "Dark Academia Concepts"） */
  name: string;
  /** 默认插图类型 */
  illustration: IllustrationType;
}

/**
 * 研究对象。
 *
 * 当前为 vocabulary 专用结构。
 * 未来扩展时，可将 vocabulary 专属字段移入子类型。
 */
export interface ResearchSubject {
  /** 唯一 id（复用 Word.id） */
  id: string;
  /** 研究对象类型（Phase 17.1-C 仅 "vocabulary"） */
  type: ResearchSubjectType;
  /** 标题（如 "Solitude"） */
  title: string;
  /** 分类（如 "Dark Academia Concept"） */
  classification: string;
  /** 观察描述（英文，如 "A state of intentional isolation."） */
  observation: string;
  /** 魔法属性列表（如 ["Sleep", "Protection"]） */
  magicalProperties: string[];
  /** Snape 研究笔记（斜体引文） */
  snapeNote: string;
  /** 手绘插图类型 */
  illustration: IllustrationType;
  // === vocabulary 专属字段（type="vocabulary" 时必填） ===
  /** 音标 */
  phonetic?: string;
  /** 英文例句 */
  exampleEn?: string;
  /** 中文例句翻译 */
  exampleZh?: string;
}

/**
 * 5 个研究主题（每日轮换）。
 *
 * 基于日期种子选取，同一天不变。
 */
export const RESEARCH_THEMES: ResearchTheme[] = [
  { name: "Dark Academia Concepts", illustration: "candle" },
  { name: "Potion Ingredients", illustration: "cauldron" },
  { name: "Magical Creatures", illustration: "phoenix" },
  { name: "Arcane Verbs", illustration: "wand" },
  { name: "Mystic Adjectives", illustration: "crystal" },
];

/**
 * 将现有 Word 适配为 ResearchSubject（Step 2 实现）。
 *
 * Step 1：仅类型占位，不实现转换逻辑。
 * Step 2 将填充：
 *   - observation：从 meaningZh 生成英文观察描述
 *   - magicalProperties：从词义推导属性
 *   - snapeNote：从主题笔记库选取
 *   - illustration：根据词义匹配插图类型
 *
 * @param _word 现有 Word 数据
 * @param _theme 当前研究主题
 * @returns ResearchSubject（Step 2 实现）
 */
export function toResearchSubject(
  _word: Word,
  _theme: ResearchTheme,
): ResearchSubject {
  // TODO Step 2: 实现 Word → ResearchSubject 适配
  void _word;
  void _theme;
  throw new Error("toResearchSubject not implemented (Step 2)");
}
