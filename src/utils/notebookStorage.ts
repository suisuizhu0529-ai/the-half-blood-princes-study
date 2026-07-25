/**
 * Notebook localStorage 存储工具（Phase 4A → 4B）。
 *
 * 所有方法纯函数封装，未来可替换为 API 实现：
 *   - 替换时只需保持函数签名（addEntry/removeEntry/getEntries/isSaved/clearEntries）
 *   - 调用方（useNotebook / 页面组件）无需改动
 *
 * 存储结构：
 *   key: "prince-notebook"
 *   value: JSON.stringify(NotebookEntry[])
 *
 * 同一 word 不重复收藏：addEntry 会先检查 isSaved。
 *
 * 跨组件同步：通过 dispatchEvent("prince-notebook:changed") 通知订阅者。
 *
 * Phase 4B 向后兼容：
 *   - 旧数据缺少 reviewCount/lastReviewedAt/favorite 字段
 *   - 读取时通过 normalizeEntry 自动补默认值
 *   - 用户已收藏内容不会被清空
 */

import type { NotebookEntry } from "@/types/notebook";

const STORAGE_KEY = "prince-notebook";
const CHANGE_EVENT = "prince-notebook:changed";

/**
 * 将单条 entry 归一化为带默认字段的完整结构。
 *
 * 用于兼容 Phase 4A 旧数据：
 *   - reviewCount 缺省 → 0
 *   - lastReviewedAt 缺省 → undefined（保持不写）
 *   - favorite 缺省 → false
 *
 * 注意：此函数只补默认值，不删除任何已有字段。
 */
function normalizeEntry(raw: Partial<NotebookEntry>): NotebookEntry {
  return {
    id: raw.id ?? "",
    word: raw.word ?? "",
    phonetic: raw.phonetic,
    partOfSpeech: raw.partOfSpeech,
    meaningZh: raw.meaningZh ?? "",
    exampleEn: raw.exampleEn ?? "",
    exampleZh: raw.exampleZh ?? "",
    lessonNumber: raw.lessonNumber ?? 0,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    // Phase 4B 预留字段：缺省补默认
    reviewCount: raw.reviewCount ?? 0,
    lastReviewedAt: raw.lastReviewedAt,
    favorite: raw.favorite ?? false,
  };
}

/**
 * 安全读取 localStorage。
 *
 * SSR / 隐私模式 / quota 超限时返回空数组。
 *
 * Phase 4B：读取后逐条 normalizeEntry，兼容旧数据。
 */
function readRaw(): NotebookEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Partial<NotebookEntry>[]).map(normalizeEntry);
  } catch {
    return [];
  }
}

/**
 * 安全写入 localStorage。
 */
function writeRaw(entries: NotebookEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // 通知订阅者（同窗口跨组件）
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // quota 超限或隐私模式：静默失败
  }
}

/**
 * 通知订阅者数据已变化（供 hook 监听）。
 *
 * 内部使用 CustomEvent，外部无需关心。
 */
export function subscribeNotebook(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  // 跨标签页同步
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * 获取所有收藏条目（按收藏时间倒序，最新在前）。
 */
export function getEntries(): NotebookEntry[] {
  const entries = readRaw();
  return [...entries].sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * 检查某个 word 是否已收藏。
 */
export function isSaved(word: string): boolean {
  if (!word) return false;
  const entries = readRaw();
  const target = word.toLowerCase().trim();
  return entries.some((e) => e.word.toLowerCase().trim() === target);
}

/**
 * 添加收藏。
 *
 * - 若 word 已收藏，返回 false（不重复添加）
 * - 否则写入并通知，返回 true
 */
export function addEntry(entry: NotebookEntry): boolean {
  if (isSaved(entry.word)) return false;
  const entries = readRaw();
  entries.push(entry);
  writeRaw(entries);
  return true;
}

/**
 * 移除收藏。
 *
 * - 若 id 不存在，返回 false
 * - 否则删除并通知，返回 true
 */
export function removeEntry(id: string): boolean {
  const entries = readRaw();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  entries.splice(idx, 1);
  writeRaw(entries);
  return true;
}

/**
 * 按 word 移除收藏（用于 Study Room 中"取消收藏"场景）。
 */
export function removeByWord(word: string): boolean {
  if (!word) return false;
  const entries = readRaw();
  const target = word.toLowerCase().trim();
  const idx = entries.findIndex(
    (e) => e.word.toLowerCase().trim() === target,
  );
  if (idx === -1) return false;
  entries.splice(idx, 1);
  writeRaw(entries);
  return true;
}

/**
 * 更新单条 entry 的部分字段（Phase 5）。
 *
 * - 按 id 找到目标 entry
 * - 浅合并 patch 字段（不覆盖未传字段）
 * - 写回并通知订阅者
 *
 * 主要用途：复习时更新 reviewCount / lastReviewedAt / favorite。
 * 不改变收藏数据结构，只更新预留字段。
 *
 * 返回更新后的 entry；若 id 不存在返回 null。
 */
export function updateEntry(
  id: string,
  patch: Partial<NotebookEntry>,
): NotebookEntry | null {
  const entries = readRaw();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated: NotebookEntry = { ...entries[idx], ...patch };
  entries[idx] = updated;
  writeRaw(entries);
  return updated;
}

/**
 * 清空所有收藏。
 */
export function clearEntries(): void {
  writeRaw([]);
}
