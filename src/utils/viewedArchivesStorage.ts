/**
 * Viewed Archives localStorage 存储工具（Phase 7D-6）。
 *
 * 与 archiveProgressStorage 独立：
 *   - 存储 key：`prince-viewed-archives`
 *   - 数据结构：string[]（entryId 数组，去重）
 *   - 事件名：`prince-viewed-archives:changed`
 *
 * 语义：用户打开过 ArchiveViewer 的 entry.id 列表。
 *   - 打开 Viewer → markArchiveViewed(entryId)
 *   - 重复打开不重复记录（去重）
 *   - 跨组件 / 跨标签页同步
 *
 * 未来可替换为 API 实现，保持函数签名不变即可。
 */

const STORAGE_KEY = "prince-viewed-archives";
const CHANGE_EVENT = "prince-viewed-archives:changed";

/**
 * 安全读取已查看档案 entryId 数组。
 *
 * SSR / 隐私模式 / quota 超限时返回空数组。
 */
function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

/**
 * 安全写入 entryId 数组到 localStorage，并通知订阅者。
 */
function writeRaw(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // quota 超限或隐私模式：静默失败
  }
}

/**
 * 订阅 viewedArchives 变化。
 *
 * 用于组件在数据更新时刷新本地视图。
 * 返回取消订阅函数。
 */
export function subscribeViewedArchives(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * 获取全部已查看档案 entryId 数组。
 */
export function getViewedArchives(): string[] {
  return readRaw();
}

/**
 * 判断某 entry 是否已查看。
 */
export function isArchiveViewed(entryId: string): boolean {
  return readRaw().includes(entryId);
}

/**
 * 标记某 entry 为已查看（打开 Viewer 时调用）。
 *
 * 行为：
 *   - 若已存在，不重复记录（去重）
 *   - 若不存在，追加并写入
 *
 * 返回写入后的完整 entryId 数组。
 */
export function markArchiveViewed(entryId: string): string[] {
  if (!entryId) return readRaw();
  const ids = readRaw();
  if (ids.includes(entryId)) return ids; // 已记录，不重复
  const next = [...ids, entryId];
  writeRaw(next);
  return next;
}
