/**
 * Library 数据模型（Phase 7A → 7B.5）。
 *
 * 字段使用 camelCase，与 NotebookEntry 一致。
 * 设计目标：本地静态数据 + 未来可扩展为 API。
 *
 * 定位：Professor Archive —— Severus Snape 的私人资料库。
 *   不是词汇解释页面，而是配合 Dark Academia 学习沉浸感的
 *   叙事性档案集合。
 *
 * 解锁策略：
 *   - Phase 7A 仅定义字段，不实现解锁算法
 *   - Phase 7B 接入 archiveUnlock.ts 计算层
 *   - unlocked=false 的 entry 在 UI 上显示为 Locked
 *   - requiredProgress 是解锁系统使用的阈值（收藏数等）
 *
 * Phase 7B.5 升级（本次）：
 *   - image: string → ImageMeta（结构化图片元信息）
 *   - audio: string → AudioMeta（结构化音频元信息）
 *   - 新增 conversation?: ConversationMeta（AI 对话入口预留）
 *   - 字段全部为 optional，向后兼容已有 15 条数据
 *
 * 字段说明：
 *   - image / audio / conversation Phase 7B.5 仅预埋结构，不实现加载/播放
 *   - relatedWords 关联 NotebookEntry.word，做交叉引用
 *   - content 是长文本正文（支持多段），未来用 markdown / 富文本渲染
 */

export type LibraryCategory =
  | "professor-profile"
  | "potion-research"
  | "hogwarts-documents"
  | "literary-archive"
  | "hidden-manuscripts";

/**
 * 图片元信息（Phase 7B.5）。
 *
 * Phase 7B.5 仅预埋结构，不接入真实图片。
 * 未来 Archive Chamber 渲染时使用：
 *   - src：图片 URL（CDN / 本地 assets）
 *   - alt：无障碍文案
 *   - caption：图片下方诗意短句
 *   - portrait：是否为人物肖像（影响布局）
 */
export interface ImageMeta {
  /** 图片 URL。Phase 7B.5 留空字符串占位 */
  src: string;
  /** 无障碍描述 */
  alt: string;
  /** 图片下方诗意短句（可选） */
  caption?: string;
  /** 是否为人物肖像（影响布局与裁剪） */
  portrait?: boolean;
}

/**
 * 教授语音讲解元信息（Phase 7B.5）。
 *
 * Phase 7B.5 仅预埋结构与文本，不接入播放。
 * 未来两种播放路径：
 *   1. 若 audioUrl 存在 → 直接播放预录音频
 *   2. 若 audioUrl 为空 → 用 voiceText 走 Azure TTS（PROFESSOR_PROFILE）
 *
 * voiceText 是教授第一人称口吻的讲解词，与 entry.content
 * 风格一致但更口语化。
 */
export interface AudioMeta {
  /** 预录音频 URL。Phase 7B.5 留空，未来接入 CDN */
  audioUrl?: string;
  /** 教授讲解文本（第一人称口吻，供 Azure TTS 朗读） */
  voiceText: string;
  /** 预估时长（秒），未来用于 UI 显示 */
  estimatedDurationSec?: number;
}

/**
 * 分阶段解锁阈值（Phase 7B.6）。
 *
 * 用于在 entry 解锁后，进一步分阶段揭示其内部特性：
 *   - image        图片显示阈值
 *   - content      正文阅读阈值
 *   - audio        教授语音讲解阈值
 *   - conversation AI 对话入口阈值（永远最高）
 *
 * 阈值单位与 LearningProgress.collectedWords 一致（收藏单词数）。
 * 省略某个字段 = 该特性随 entry 解锁即开放。
 *
 * 设计规则：
 *   - 基础档案（Professor Profile）阈值较低
 *   - 神秘档案（Hidden Manuscripts）阈值最高
 *   - conversation 永远 > audio > content > image（在同一 entry 内）
 *
 * Phase 7B.6 仅预埋数据，不接入解锁算法。
 * 未来 archiveUnlock.ts 扩展 getFeatureUnlockStatus() 使用。
 */
export interface UnlockFeatures {
  /** 图片显示所需进度 */
  image?: number;
  /** 正文阅读所需进度 */
  content?: number;
  /** 教授语音讲解所需进度 */
  audio?: number;
  /** AI 对话入口所需进度（永远最高） */
  conversation?: number;
}

/**
 * AI 对话入口元信息（Phase 7B.5 → 7B.6）。
 *
 * Phase 7B.5 仅预埋结构，不接入对话能力。
 * 未来 Professor Conversation Chamber 使用：
 *   - persona：教授人格设定（系统 prompt 用）
 *   - openingLine：进入对话室时教授的开场白
 *   - suggestedTopics：建议话题（UI 显示为快捷入口）
 *   - memoryContext：当前档案的背景信息（Phase 7B.6 新增）
 *
 * hidden-manuscripts 神秘档案通常不开放对话。
 */
export interface ConversationMeta {
  /** 教授人格设定（系统 prompt 片段） */
  persona: string;
  /** 进入对话室时的开场白 */
  openingLine: string;
  /** 建议话题列表（UI 快捷入口） */
  suggestedTopics: string[];
  /**
   * 当前档案的背景信息（Phase 7B.6 新增，必填）。
   *
   * 用于 AI 对话时提供档案上下文：
   *   - 不以第一人称写（与 voiceText 区分）
   *   - 客观描述该档案的内容、来源、状态
   *   - 拼入对话系统 prompt 作为 situational context
   *
   * 例："The student has unlocked the archive labeled
   *      'The Half-Blood Prince'. This archive contains..."
   */
  memoryContext: string;
}

export interface LibraryEntry {
  /** 唯一标识。建议格式：`{category}/{slug}` */
  id: string;

  /** 所属档案分类 */
  category: LibraryCategory;

  /** 英文标题 */
  title: string;

  /** 副标题（中文或英文补充说明） */
  subtitle?: string;

  /** 短描述（列表卡片用，1-2 句） */
  description: string;

  /**
   * 图片元信息（Phase 7B.5）。
   * 替代 Phase 7A 的简单 string URL。
   * 向后兼容：旧数据无此字段时 UI 不渲染图片。
   */
  image?: ImageMeta;

  /**
   * 教授语音讲解元信息（Phase 7B.5）。
   * 替代 Phase 7A 的简单 string URL。
   * 向后兼容：旧数据无此字段时 UI 不显示 Listen 按钮。
   */
  audio?: AudioMeta;

  /**
   * AI 对话入口元信息（Phase 7B.5 预留）。
   * 神秘档案通常不开放对话。
   */
  conversation?: ConversationMeta;

  /** 关联的 NotebookEntry.word 列表（小写），交叉引用 */
  relatedWords?: string[];

  /** 是否已解锁。Phase 7A/7B 全部为 false */
  unlocked: boolean;

  /**
   * Phase 7D-5：静态锁定标记。
   *
   * 与 progress-based 的 unlock 逻辑独立：
   *   - undefined / false = 正常（走现有 unlock 流程）
   *   - true              = 强制锁定（图片降亮 + 灰度，禁用 Viewer）
   *
   * 用于"Restricted Archive"——需要更多回忆才能揭示的神秘档案。
   */
  locked?: boolean;

  /**
   * 解锁所需进度阈值（未来用，如收藏数达到 N）。
   * 神秘档案可省略（保持未知）。
   */
  requiredProgress?: number;

  /**
   * 分阶段解锁阈值（Phase 7B.6 新增）。
   *
   * entry 解锁后，进一步按进度揭示内部特性：
   *   - 图片
   *   - 正文
   *   - 教授语音
   *   - AI 对话
   *
   * 省略 = 随 entry 解锁即开放。
   * Phase 7B.6 仅预埋数据，不接入算法。
   */
  unlockFeatures?: UnlockFeatures;

  /** 长文本正文（多段），未来用 markdown / 富文本渲染 */
  content?: string;
}

/**
 * 书本主题色（皮革 + 金线 + 光晕）。
 * Phase 20.1 Round 1.5：每本记忆书拥有独立色彩身份。
 */
export interface BookColorTheme {
  /** 皮革主色（深色） */
  leather: string;
  /** 皮革高光（封面渐变上半部分） */
  leatherHighlight: string;
  /** 金线/书名颜色 */
  gold: string;
  /** 焦点光晕颜色（低饱和度发光） */
  glow: string;
  /** 书页边缘泛黄色 */
  pageEdge: string;
}

/**
 * 档案分类元信息（供 UI 渲染分类标题用）。
 */
export interface LibraryCategoryMeta {
  id: LibraryCategory;
  title: string;
  titleZh: string;
  description: string;
  /** Phase 20.1 Round 1.5：书本主题色，未指定时回退到默认深棕 */
  colorTheme?: BookColorTheme;
}

export const LIBRARY_CATEGORIES: LibraryCategoryMeta[] = [
  {
    id: "professor-profile",
    title: "Professor Profile",
    titleZh: "教 授 档 案",
    description: "The Potions Master's own record — sealed in his hand.",
    // 黑色蛇纹皮（Snape 本人的书）
    colorTheme: {
      leather: "#0d0a08",
      leatherHighlight: "#1a1410",
      gold: "#8b7355",
      glow: "rgba(139,115,85,0.5)",
      pageEdge: "#d4c4a8",
    },
  },
  {
    id: "potion-research",
    title: "Potion Research",
    titleZh: "魔 药 研 究",
    description: "Notes on infusions, antidotes, and the chemistry of silence.",
    // 深绿色皮革（魔药学）
    colorTheme: {
      leather: "#14352a",
      leatherHighlight: "#1f4a3a",
      gold: "#c9a227",
      glow: "rgba(124,255,178,0.4)",
      pageEdge: "#e8d8b8",
    },
  },
  {
    id: "hogwarts-documents",
    title: "Hogwarts Documents",
    titleZh: "霍 格 沃 茨 文 件",
    description: "Correspondence from the Headmaster's office, redacted.",
    // 暗红色羊皮（官方文件）
    colorTheme: {
      leather: "#3a1a1a",
      leatherHighlight: "#4f2424",
      gold: "#c9a227",
      glow: "rgba(220,80,60,0.4)",
      pageEdge: "#e8d8b8",
    },
  },
  {
    id: "literary-archive",
    title: "Literary Archive",
    titleZh: "文 学 档 案",
    description: "Lines collected from the margins of forgotten books.",
    // 蓝灰色皮革（文学）
    colorTheme: {
      leather: "#1a2433",
      leatherHighlight: "#243548",
      gold: "#c9a227",
      glow: "rgba(100,140,200,0.4)",
      pageEdge: "#e8d8b8",
    },
  },
  {
    id: "hidden-manuscripts",
    title: "Hidden Manuscripts",
    titleZh: "隐 秘 手 稿",
    description: "Inkings that the Professor never wished to share.",
    // 紫黑色封印书（禁书）
    colorTheme: {
      leather: "#1a0d2e",
      leatherHighlight: "#2a1644",
      gold: "#9a7cc7",
      glow: "rgba(154,124,199,0.5)",
      pageEdge: "#d4c4a8",
    },
  },
];
