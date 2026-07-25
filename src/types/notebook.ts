/**
 * Notebook 数据模型（Phase 4A → 4B）。
 *
 * 字段使用 camelCase，与 PRD 一致。
 * 设计目标：本地存储版本，未来可替换为 API。
 *
 * Phase 4B 预留字段（暂未启用算法/UI，仅占位）：
 *   - reviewCount：复习次数
 *   - lastReviewedAt：最近复习时间 ISO
 *   - favorite：是否标记为生词重点
 *
 * 旧数据读取时由 notebookStorage 自动补默认值，用户已收藏内容不会被清空。
 */

export interface NotebookEntry {
  /** 唯一标识。生成规则：`lesson-{lessonNumber}` 或 word + createdAt hash */
  id: string;
  /** 单词 */
  word: string;
  /** 音标（可选） */
  phonetic?: string;
  /** 词性（可选） */
  partOfSpeech?: string;
  /** 中文释义 */
  meaningZh: string;
  /** 英文例句 */
  exampleEn: string;
  /** 中文翻译 */
  exampleZh: string;
  /** 来自哪一课 */
  lessonNumber: number;
  /** 收藏时间 ISO 字符串 */
  createdAt: string;
  /** Phase 4B 预留：复习次数。默认 0 */
  reviewCount?: number;
  /** Phase 4B 预留：最近复习时间 ISO 字符串。默认 undefined */
  lastReviewedAt?: string;
  /** Phase 4B 预留：是否标记为重点生词。默认 false */
  favorite?: boolean;
}

