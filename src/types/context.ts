/**
 * Snape AI Context 数据模型（Phase 8.4）。
 *
 * 定位：将 Persona / Library Archive / Memory 组合为统一的 Context，
 * 供未来 AI 对话系统作为 Prompt 上下文使用。
 *
 * 设计原则：
 *   - 纯数据组合层，不接 AI、不渲染、不持状态
 *   - 字段 camelCase，与现有类型一致
 *   - 所有字段 optional，按场景组合（避免无意义空值）
 *   - 类型安全，无 any
 *
 * Phase 8.4 仅建立 Context 结构与 Builder：
 *   - 不实现 AI 调用
 *   - 不修改 Conversation UI
 *   - 不修改 Persona / Library / Memory 数据
 */

import type { LibraryEntry } from "@/types/library";
import type { MemoryEntry } from "@/types/memory";
import type { PersonaProfile } from "@/types/persona";
import type { ResearchSubject } from "@/data/researchSubjects";

/**
 * 情感提示。
 *
 * 从记忆与档案中抽取的情感线索，用于 AI 语气引导。
 * 非完整情绪描述，仅作 prompt 中的 hint。
 */
export interface EmotionalHint {
  /** 情感类型（来自 MemoryEntry.emotion 或推断） */
  emotion: string;
  /** 情感来源（记忆 id 或 archive id） */
  source: string;
  /** 简短说明（供 AI prompt 拼接） */
  note: string;
}

/**
 * 课程上下文（Phase 14 P0.2）。
 *
 * 描述学生"正在学什么 / 学过什么"，让 Snape 能在对话中引用
 * 当前 Lumos 研究对象、已尝试次数等。
 *
 * 数据来源：
 *   - theme / subjects    ← dailyResearch.getDailyResearch()
 *   - currentSubject      ← 会话内"当前研究对象"（ConversationEngine 传入）
 *   - recentAttempts      ← 会话内累计尝试次数
 *
 * 当前 subject 缺失时不阻塞：subjects 仍提供今日 5 个研究对象作为兜底。
 */
export interface LessonContext {
  /** 今日研究主题名（如 "Potion Ingredients"） */
  theme: string;
  /** 今日 5 个研究对象（按生成顺序） */
  subjects: ResearchSubject[];
  /** 当前正在学习的对象（undefined = 今日尚未选定） */
  currentSubject?: ResearchSubject;
  /** 今日累计尝试次数（含失败；UI 自行决定是否展示） */
  recentAttempts: number;
}

/**
 * Snape Context —— AI 对话的统一上下文。
 *
 * 由 contextBuilder 按场景组装：
 *   - buildBaseContext       → 仅 persona（无场景）
 *   - buildArchiveContext    → persona + archive + 关联 memories + emotionalHints
 *   - buildMemoryContext     → persona + memory + emotionalHints
 *
 * 调用方（未来 AI 层）按需读取字段拼接 system prompt。
 */
export interface SnapeContext {
  /** 角色人格画像（始终存在） */
  persona: PersonaProfile;

  /** 当前关联的档案（archive 场景下存在） */
  archive?: LibraryEntry;

  /** 当前关联的记忆列表（archive 场景下可能多条；memory 场景下单条） */
  memories?: MemoryEntry[];

  /** 情感提示列表（从 memories / archive 抽取） */
  emotionalHints?: EmotionalHint[];

  /**
   * 课程上下文（Phase 14 P0.2，可选）。
   *
   * 注入后 Snape 可在对话中引用学生正在学的研究对象。
   * 未注入时 PromptBuilder 不渲染 lesson 段落（向后兼容）。
   */
  lesson?: LessonContext;
}
