/**
 * Memory 数据聚合导出（Phase 8.1）。
 *
 * 提供单一入口访问所有记忆：
 *   - 按 category 分组的子集导出
 *   - MEMORY_ENTRIES 全量数组
 *   - getMemoriesByCategory 工具函数
 *
 * 未来扩展：
 *   - 接入解锁算法后，可在此处过滤 revealed=true 的条目
 *   - 替换为 API 时，保持本模块导出签名不变
 */

import type { MemoryCategory, MemoryEntry } from "@/types/memory";
import { childhoodEntries } from "./childhood";
import { hogwartsYearsEntries } from "./hogwartsYears";
import { lilyMemoryEntries } from "./lilyMemory";
import { potionResearchEntries } from "./potionResearch";
import { deathlyHallowsEntries } from "./deathlyHallows";

export { childhoodEntries } from "./childhood";
export { hogwartsYearsEntries } from "./hogwartsYears";
export { lilyMemoryEntries } from "./lilyMemory";
export { potionResearchEntries } from "./potionResearch";
export { deathlyHallowsEntries } from "./deathlyHallows";

/**
 * 全量记忆列表（按 category 声明顺序排列）。
 *
 * Phase 8.1：共 5 个 entry，每个分类 1 条示例。
 */
export const MEMORY_ENTRIES: MemoryEntry[] = [
  ...childhoodEntries,
  ...hogwartsYearsEntries,
  ...lilyMemoryEntries,
  ...potionResearchEntries,
  ...deathlyHallowsEntries,
];

/**
 * 按分类筛选记忆。
 */
export function getMemoriesByCategory(
  category: MemoryCategory,
): MemoryEntry[] {
  return MEMORY_ENTRIES.filter((m) => m.category === category);
}

/**
 * 按 id 查找单条记忆。
 */
export function getMemoryById(id: string): MemoryEntry | undefined {
  return MEMORY_ENTRIES.find((m) => m.id === id);
}
