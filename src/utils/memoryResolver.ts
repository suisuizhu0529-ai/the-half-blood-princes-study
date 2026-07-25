/**
 * Memory Resolver —— Memory 与 Library Archive 关联查询层（Phase 8.3）。
 *
 * 定位：纯查询工具，不持有状态、不接 AI、不修改 UI。
 *
 * 核心能力：
 *   - 按 archive id 反查关联的记忆
 *   - 按 memory id 精确查找
 *   - 按 importance 取最重要的 N 条
 *
 * 索引策略：
 *   - 模块加载时一次性构建 archiveId → MemoryEntry[] 映射
 *   - 记忆数据为本地静态数组，无需动态重建
 *   - 未来若记忆改为 API 加载，需调整为惰性构建
 *
 * 类型安全：
 *   - 全程使用 MemoryEntry 类型，无 any
 *   - 空数组作为默认返回，避免 null / undefined 链路
 */

import type { MemoryEntry } from "@/types/memory";
import { MEMORY_ENTRIES } from "@/data/memory";

/**
 * archiveId → MemoryEntry[] 反向索引。
 *
 * 一条记忆可关联多个 archive，一个 archive 可被多条记忆引用（多对多）。
 * 构建于模块加载时，后续查询 O(1)。
 */
const ARCHIVE_TO_MEMORIES: ReadonlyMap<string, MemoryEntry[]> = (() => {
  const map = new Map<string, MemoryEntry[]>();
  for (const memory of MEMORY_ENTRIES) {
    const archives = memory.relatedArchives ?? [];
    for (const archiveId of archives) {
      const list = map.get(archiveId);
      if (list) {
        list.push(memory);
      } else {
        map.set(archiveId, [memory]);
      }
    }
  }
  return map;
})();

/**
 * 按 archive id 反查关联的记忆列表。
 *
 * 若该 archive 无关联记忆，返回空数组（不抛错）。
 *
 * @param archiveId Library entry id，如 "hidden-manuscripts/final-page"
 */
export function getMemoriesByArchiveId(archiveId: string): MemoryEntry[] {
  return ARCHIVE_TO_MEMORIES.get(archiveId) ?? [];
}

/**
 * 按 memory id 精确查找单条记忆。
 *
 * @param id Memory entry id，如 "lily-memory/always"
 */
export function getMemoryById(id: string): MemoryEntry | undefined {
  return MEMORY_ENTRIES.find((m) => m.id === id);
}

/**
 * 取最重要的 N 条记忆。
 *
 * 排序规则：
 *   1. importance 降序（5 → 1）
 *   2. 同 importance 下保持声明顺序（稳定排序）
 *
 * @param limit 返回条数，省略则返回全部（已排序）
 */
export function getImportantMemories(limit?: number): MemoryEntry[] {
  const sorted = [...MEMORY_ENTRIES].sort(
    (a, b) => b.importance - a.importance,
  );
  return limit !== undefined ? sorted.slice(0, Math.max(0, limit)) : sorted;
}

/**
 * 仅供调试 / 测试用：获取当前索引统计信息。
 */
export function getResolverStats(): {
  totalMemories: number;
  totalLinkedArchives: number;
  totalLinks: number;
} {
  let totalLinks = 0;
  for (const list of ARCHIVE_TO_MEMORIES.values()) {
    totalLinks += list.length;
  }
  return {
    totalMemories: MEMORY_ENTRIES.length,
    totalLinkedArchives: ARCHIVE_TO_MEMORIES.size,
    totalLinks,
  };
}

/**
 * 把字符串切成小写 token 数组（仅 a-z 0-9 字符）。
 *
 * 词袋算法的最小单元：
 *   - 转小写
 *   - 非字母数字字符视为分隔符
 *   - 过滤空 token
 *   - 多词关键词（如 "half-blood prince"）由调用方按相同规则拆分后逐个匹配
 *
 * @param text 原始文本
 * @returns token 集合（用于 O(1) 查找）
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0),
  );
}

/**
 * 按关键词词袋交集给记忆打分（Phase 14 P0.1）。
 *
 * 算法：
 *   1. 将 userMessage 转为小写 token Set
 *   2. 对每条 memory，统计其 keywords（拆分多词）与 userMessage tokens 的交集 token 总数 = score
 *   3. 排序：score desc → importance desc → 稳定
 *   4. 截断 topK（省略则返回全部，score=0 也在内）
 *
 * 零依赖、无 LLM 调用、纯函数。
 *
 * 用途：让 SnapeContext 在 archive 场景下只注入与当前对话主题相关的 memory，
 *      避免无关 Nostalgia 触发（如用户问"止痛药"却召回 Lily 记忆）。
 *
 * @param memories 待排序的记忆列表
 * @param userMessage 用户当前输入
 * @param topK 截断条数（省略则返回全部）
 * @returns 排序后的记忆（已截断）
 */
export function rankMemoriesByRelevance(
  memories: MemoryEntry[],
  userMessage: string,
  topK?: number,
): MemoryEntry[] {
  if (memories.length === 0) return [];
  if (!userMessage || userMessage.trim().length === 0) return memories;

  const userTokens = tokenize(userMessage);
  if (userTokens.size === 0) return memories;

  const scored = memories.map((m) => {
    const keywords = m.keywords ?? [];
    let score = 0;
    for (const kw of keywords) {
      const parts = kw
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((p) => p.length > 0);
      // 多词关键词：所有 part 都命中才计数（防止 "lily" 误触发 "lily-pad"）
      const allHit = parts.length > 0 && parts.every((p) => userTokens.has(p));
      if (allHit) {
        score += parts.length;
      }
    }
    return { memory: m, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.memory.importance - a.memory.importance;
  });

  const sorted = scored.map((s) => s.memory);
  return topK !== undefined ? sorted.slice(0, Math.max(0, topK)) : sorted;
}

/**
 * 按相关性过滤记忆（Phase 14 P0.1）。
 *
 * 与 rankMemoriesByRelevance 的区别：
 *   - rankMemoriesByRelevance：排序 + 可选截断，保留 score=0 的条目
 *   - filterMemoriesByRelevance：丢弃 score=0 的条目，仅返回真正命中的记忆
 *
 * 用途：archive 场景下"严格相关"模式——完全无关的记忆不进入 prompt。
 *
 * @param memories 待过滤的记忆列表
 * @param userMessage 用户当前输入
 * @returns 仅含 score > 0 的记忆（保持原相对顺序）
 */
export function filterMemoriesByRelevance(
  memories: MemoryEntry[],
  userMessage: string,
): MemoryEntry[] {
  if (memories.length === 0) return [];
  if (!userMessage || userMessage.trim().length === 0) return memories;

  const userTokens = tokenize(userMessage);
  if (userTokens.size === 0) return memories;

  return memories.filter((m) => {
    const keywords = m.keywords ?? [];
    return keywords.some((kw) => {
      const parts = kw
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((p) => p.length > 0);
      return parts.length > 0 && parts.every((p) => userTokens.has(p));
    });
  });
}
