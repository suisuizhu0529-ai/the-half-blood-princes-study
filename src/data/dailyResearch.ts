/**
 * DailyResearch（Phase 17.1-C Step 1 骨架）。
 *
 * 定位：今日 5 个研究对象的确定性生成。
 *   - 基于日期种子（同一天不变）
 *   - 复用现有 @/utils/dailyLesson 的 dailyIndex 算法
 *   - 从 words.json 取 5 个连续词
 *   - 匹配研究主题（5 个主题轮换）
 *
 * 数据流：
 *   words.json → getDailyResearch(date) → DailyResearch
 *                                         ├── theme: ResearchTheme
 *                                         └── subjects: ResearchSubject[5]
 *
 * Step 1 范围：仅类型定义 + 函数骨架，不实现转换。
 *   - Step 2 将接入 toResearchSubject 完成完整生成
 */

import type { ResearchSubject, ResearchTheme } from "./researchSubjects";

/**
 * 今日研究数据。
 */
export interface DailyResearch {
  /** 日期（YYYY-MM-DD） */
  date: string;
  /** 今日研究主题 */
  theme: ResearchTheme;
  /** 5 个研究对象 */
  subjects: ResearchSubject[];
}

/**
 * 生成今日研究数据（Step 2 实现）。
 *
 * 算法：
 *   1. 基于日期种子取 startIndex（复用 dailyIndex）
 *   2. 从 WORDS 取 5 个连续词（循环）
 *   3. 基于日期种子取主题（RESEARCH_THEMES 轮换）
 *   4. 每个 Word 通过 toResearchSubject 转换为 ResearchSubject
 *
 * Step 1：抛出异常（未实现）。
 * Step 2 将填充完整逻辑。
 *
 * @param _date 日期（默认今天）
 * @returns DailyResearch（5 个研究对象）
 */
export function getDailyResearch(_date: Date = new Date()): DailyResearch {
  // TODO Step 2: 实现日期种子 + 5 词选取 + 主题匹配 + 转换
  //   const startIndex = dailyIndex(WORDS.length, date);
  //   const words = Array.from({length: 5}, (_, i) => WORDS[(startIndex + i) % WORDS.length]);
  //   const theme = RESEARCH_THEMES[dailyIndex(RESEARCH_THEMES.length, date)];
  //   const subjects = words.map(w => toResearchSubject(w, theme));
  //   return { date: formatDate(date), theme, subjects };
  void _date;
  throw new Error("getDailyResearch not implemented (Step 2)");
}
