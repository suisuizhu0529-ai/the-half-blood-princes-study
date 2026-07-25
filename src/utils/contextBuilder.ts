/**
 * Snape Context Builder（Phase 8.4）。
 *
 * 定位：纯函数组合层，将 Persona / Library Archive / Memory / Lesson 组合为
 * SnapeContext，供未来 AI 对话系统作为 Prompt 上下文使用。
 *
 * 四种构建场景：
 *   - buildBaseContext()        基础人格（可选 lesson 注入）
 *   - buildArchiveContext(id)   档案场景：persona + archive + 关联 memories
 *   - buildMemoryContext(id)    记忆场景：persona + memory
 *   - buildLessonContext()      课程场景：今日研究对象
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 不接 AI、不渲染、不写 localStorage
 *   - 不修改 Persona / Library / Memory / Lesson 数据
 *   - 类型安全，无 any
 *   - 未找到关联数据时返回 undefined（让调用方决定降级策略）
 */

import type { SnapeContext, EmotionalHint, LessonContext } from "@/types/context";
import type { MemoryEntry } from "@/types/memory";
import { snapePersona } from "@/data/persona";
import { getEntryById } from "@/data/library";
import { MEMORY_ENTRIES } from "@/data/memory";
import { getDailyResearch } from "@/data/dailyResearch";
import {
  getMemoriesByArchiveId,
  getMemoryById,
} from "@/utils/memoryResolver";

/**
 * 从记忆列表抽取情感提示。
 *
 * 每条记忆的 emotion 转为一条 EmotionalHint。
 * 仅作 prompt hint，不做深度情感分析。
 */
function extractEmotionalHints(
  memories: MemoryEntry[],
): EmotionalHint[] {
  return memories.map((m) => ({
    emotion: m.emotion,
    source: m.id,
    note: `${m.title}: ${m.summary.split(".")[0].trim()}.`,
  }));
}

/**
 * 构建 LessonContext（Phase 14 P0.2）。
 *
 * 行为：
 *   - 调用 getDailyResearch() 拿今日主题与 5 个研究对象
 *   - currentSubject 默认指向第 1 个；调用方可覆盖
 *   - recentAttempts 默认 0（暂无会话内统计基础设施）
 *
 * 错误处理：getDailyResearch 在 Step 2 未实现时会抛错，这里包 try/catch
 *          降级为 undefined，不让 lesson 注入阻塞 AI 对话主链路。
 *
 * @param override 可选覆盖（currentSubject / recentAttempts）
 * @returns LessonContext（getDailyResearch 抛错时返回 undefined）
 */
export function buildLessonContext(
  override?: {
    currentSubject?: LessonContext["currentSubject"];
    recentAttempts?: number;
  },
): LessonContext | undefined {
  try {
    const daily = getDailyResearch();
    return {
      theme: daily.theme.name,
      subjects: daily.subjects,
      currentSubject: override?.currentSubject ?? daily.subjects[0],
      recentAttempts: override?.recentAttempts ?? 0,
    };
  } catch {
    // getDailyResearch 未实现 / 数据缺失时降级，不阻塞主链路
    return undefined;
  }
}

/**
 * 构建基础 Snape Context —— 仅人格画像，无场景绑定。
 *
 * 用于：
 *   - AI 对话初始化（无具体档案 / 记忆触发）
 *   - 通用角色约束（system prompt 基础段）
 *
 * Phase 14 P0.2：可选传入 lesson 让 Snape 知道学生当前在学什么。
 */
export function buildBaseContext(options?: { lesson?: LessonContext }): SnapeContext {
  return {
    persona: snapePersona,
    lesson: options?.lesson,
  };
}

/**
 * 构建 Archive 场景 Context。
 *
 * 组合：
 *   - persona       角色人格
 *   - archive       当前档案
 *   - memories      通过 memoryResolver 反查的关联记忆
 *   - emotionalHints 从关联记忆抽取的情感提示
 *   - lesson        可选课程上下文
 *
 * @param archiveId Library entry id
 * @param options.lesson 可选 LessonContext 注入
 * @returns 若 archiveId 不存在，返回 undefined
 */
export function buildArchiveContext(
  archiveId: string,
  options?: { lesson?: LessonContext },
): SnapeContext | undefined {
  const archive = getEntryById(archiveId);
  if (!archive) return undefined;

  const memories = getMemoriesByArchiveId(archiveId);
  const emotionalHints = extractEmotionalHints(memories);

  return {
    persona: snapePersona,
    archive,
    memories: memories.length > 0 ? memories : undefined,
    emotionalHints: emotionalHints.length > 0 ? emotionalHints : undefined,
    lesson: options?.lesson,
  };
}

/**
 * 构建 Memory 场景 Context。
 *
 * 组合：
 *   - persona       角色人格
 *   - memories      单条记忆（包裹为数组，与 SnapeContext 类型一致）
 *   - emotionalHints 从该记忆抽取的情感提示
 *   - lesson        可选课程上下文
 *
 * @param memoryId Memory entry id
 * @param options.lesson 可选 LessonContext 注入
 * @returns 若 memoryId 不存在，返回 undefined
 */
export function buildMemoryContext(
  memoryId: string,
  options?: { lesson?: LessonContext },
): SnapeContext | undefined {
  const memory = getMemoryById(memoryId);
  if (!memory) return undefined;

  const emotionalHints = extractEmotionalHints([memory]);

  return {
    persona: snapePersona,
    memories: [memory],
    emotionalHints,
    lesson: options?.lesson,
  };
}

/**
 * 仅供调试 / 测试用：预览全部可构建的 archive context 概览。
 */
export function previewAllArchiveContexts(): {
  archiveId: string;
  memoryCount: number;
}[] {
  return MEMORY_ENTRIES.flatMap((m) => m.relatedArchives ?? []).map((id) => ({
    archiveId: id,
    memoryCount: getMemoriesByArchiveId(id).length,
  }));
}
