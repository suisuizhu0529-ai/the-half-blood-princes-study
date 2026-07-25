import wordsData from "@/data/words.json";
import quotesData from "@/data/quotes.json";
import type { Word, Quote, DailyLesson } from "@/types/lesson";

/**
 * 每日课程数据。
 *
 * 静态导入本地 JSON，无后端调用。
 */
const WORDS: Word[] = wordsData as Word[];
const QUOTES: Quote[] = quotesData as Quote[];

/**
 * 根据日期生成确定性 index。
 *
 * 算法：日期整数对总数取模。
 *  - 同一天（任意时刻）刷新页面 → index 不变
 *  - 不使用 Math.random()
 *  - 不依赖后端
 *
 * 年份纳入种子，使同一月日跨年仍能取到不同内容。
 */
function dailyIndex(total: number, date: Date = new Date()): number {
  const seed =
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate();
  return seed % total;
}

/**
 * 取某日的单词。
 */
export function getWordOfDate(date: Date = new Date()): Word {
  return WORDS[dailyIndex(WORDS.length, date)];
}

/**
 * 取某日的句子。
 *
 * 单词与句子使用不同的种子偏移，避免每日同步索引。
 */
export function getQuoteOfDate(date: Date = new Date()): Quote {
  const seed =
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate() +
    7;
  return QUOTES[seed % QUOTES.length];
}

/**
 * 今日课程在词库中的 1-based 编号。
 *
 * 用于显示 "Lesson No. 17" 之类的仪式感标识。
 */
export function getLessonNumber(date: Date = new Date()): number {
  return dailyIndex(WORDS.length, date) + 1;
}

/**
 * 一次取回今日单词 + 句子 + 课程编号。
 */
export function getDailyLesson(date: Date = new Date()): DailyLesson {
  return {
    word: getWordOfDate(date),
    quote: getQuoteOfDate(date),
  };
}
