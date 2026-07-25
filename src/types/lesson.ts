/**
 * Phase 2 课程数据类型。
 *
 * 与 src/data/words.json / quotes.json 字段保持一致（camelCase）。
 */

export interface Word {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaningZh: string;
  exampleEn: string;
  exampleZh: string;
}

export interface QuoteVocabulary {
  word: string;
  meaning: string;
}

export interface Quote {
  id: string;
  quoteEn: string;
  quoteZh: string;
  vocabulary: QuoteVocabulary[];
}

export interface DailyLesson {
  word: Word;
  quote: Quote;
}
