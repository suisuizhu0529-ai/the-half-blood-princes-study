/**
 * Memory 数据模型（Phase 8.1）。
 *
 * Snape Memory Engine 的核心数据结构。
 *
 * 定位：Severus Snape 的私人记忆系统。
 *   - 不是档案（Library Archive 是物，Memory 是人）
 *   - 是教授一生中关键场景的情感化叙事
 *   - 配合 Dark Academia 沉浸感，让学习者通过记忆窥见角色内心
 *
 * 设计原则：
 *   - 字段 camelCase，与 LibraryEntry / NotebookEntry 一致
 *   - 本地静态数据，未来可扩展为 API
 *   - 与 Library 通过 relatedArchives 交叉引用
 *   - importance 用于 UI 排序与揭示优先级
 *
 * Phase 8.1 仅建立数据层：
 *   - 不接 AI
 *   - 不实现记忆解锁
 *   - 不实现记忆回放
 */

/**
 * 记忆分类。
 *
 * 按 Snape 的人生阶段划分：
 *   - childhood          童年（Spinners End）
 *   - hogwarts-years     霍格沃茨求学时期
 *   - lily-memory        关于 Lily 的记忆
 *   - potion-research    魔药研究
 *   - deathly-hallows    死亡圣器时期（双面间谍最后岁月）
 */
export type MemoryCategory =
  | "childhood"
  | "hogwarts-years"
  | "lily-memory"
  | "potion-research"
  | "deathly-hallows";

/**
 * 情感基调。
 *
 * 用于 UI 渲染时的色调与氛围提示：
 *   - sorrowful     悲伤
 *   - bittersweet   苦乐参半
 *   - determined    坚定
 *   - haunted       萦绕心头的
 *   - tender        温柔
 *   - cold          冷漠
 */
export type MemoryEmotion =
  | "sorrowful"
  | "bittersweet"
  | "determined"
  | "haunted"
  | "tender"
  | "cold";

/**
 * 记忆重要程度（1-5）。
 *
 *   1 = 日常碎片
 *   2 = 偶尔回想
 *   3 = 关键片段
 *   4 = 命运转折
 *   5 = 一生之痛 / 一生之诺
 *
 * 用于 UI 排序与解锁优先级。
 */
export type MemoryImportance = 1 | 2 | 3 | 4 | 5;

export interface MemoryEntry {
  /** 唯一标识。格式：`{category}/{slug}` */
  id: string;

  /** 所属记忆分类（人生阶段） */
  category: MemoryCategory;

  /** 英文标题 */
  title: string;

  /** 中文副标题（可选） */
  subtitle?: string;

  /** 记忆摘要（1-3 句，列表卡片用） */
  summary: string;

  /** 关键词列表（用于检索与关联） */
  keywords: string[];

  /**
   * 关联的 Library 档案 id 列表。
   *
   * 交叉引用：记忆与档案相互印证。
   * 例：Lily 记忆可关联 "literary-archive/language-of-silence"。
   */
  relatedArchives?: string[];

  /** 情感基调（影响 UI 色调） */
  emotion: MemoryEmotion;

  /** 重要程度（1-5，影响排序与解锁优先级） */
  importance: MemoryImportance;
}

/**
 * 记忆分类元信息（供 UI 渲染分类标题用）。
 */
export interface MemoryCategoryMeta {
  id: MemoryCategory;
  title: string;
  titleZh: string;
  description: string;
}

export const MEMORY_CATEGORIES: MemoryCategoryMeta[] = [
  {
    id: "childhood",
    title: "Childhood",
    titleZh: "童 年",
    description: "Spinner's End — where the silence first took root.",
  },
  {
    id: "hogwarts-years",
    title: "Hogwarts Years",
    titleZh: "求 学 岁 月",
    description: "The corridors where he learned to vanish, and to bleed.",
  },
  {
    id: "lily-memory",
    title: "Lily Memory",
    titleZh: "莉 莉 的 记 忆",
    description: "A single green light, kept behind every locked door.",
  },
  {
    id: "potion-research",
    title: "Potion Research",
    titleZh: "魔 药 研 究",
    description: "The art of patience, precision, and unspoken things.",
  },
  {
    id: "deathly-hallows",
    title: "Deathly Hallows",
    titleZh: "死 亡 圣 器",
    description: "The final years — when every step was a borrowed hour.",
  },
];
