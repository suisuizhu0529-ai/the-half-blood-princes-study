/**
 * Library 数据聚合导出（Phase 7A）。
 *
 * 提供单一入口访问所有档案：
 *   - 按 category 分组的子集导出
 *   - LIBRARY_ENTRIES 全量数组
 *   - getEntriesByCategory 工具函数
 *
 * 未来扩展：
 *   - 接入解锁算法后，可在此处过滤 unlocked=true 的条目
 *   - 替换为 API 时，保持本模块导出签名不变
 */

import type { LibraryCategory, LibraryEntry } from "@/types/library";
import { professorProfileEntries } from "./professorProfile";
import { potionResearchEntries } from "./potionResearch";
import { hogwartsDocumentsEntries } from "./hogwartsDocuments";
import { literaryArchiveEntries } from "./literaryArchive";
import { hiddenManuscriptsEntries } from "./hiddenManuscripts";

export { professorProfileEntries } from "./professorProfile";
export { potionResearchEntries } from "./potionResearch";
export { hogwartsDocumentsEntries } from "./hogwartsDocuments";
export { literaryArchiveEntries } from "./literaryArchive";
export { hiddenManuscriptsEntries } from "./hiddenManuscripts";

/**
 * 全量档案列表（按 category 声明顺序排列）。
 *
 * Phase 7A：共 15 个 entry，全部 unlocked=false。
 */
export const LIBRARY_ENTRIES: LibraryEntry[] = [
  ...professorProfileEntries,
  ...potionResearchEntries,
  ...hogwartsDocumentsEntries,
  ...literaryArchiveEntries,
  ...hiddenManuscriptsEntries,
];

/**
 * 按分类筛选档案。
 */
export function getEntriesByCategory(
  category: LibraryCategory,
): LibraryEntry[] {
  return LIBRARY_ENTRIES.filter((e) => e.category === category);
}

/**
 * 按 id 查找单条档案。
 */
export function getEntryById(id: string): LibraryEntry | undefined {
  return LIBRARY_ENTRIES.find((e) => e.id === id);
}
