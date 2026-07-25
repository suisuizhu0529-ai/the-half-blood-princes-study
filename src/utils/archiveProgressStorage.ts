/**
 * Archive Progress localStorage 存储工具（Phase 7B.7）。
 *
 * 与 notebookStorage 完全独立：
 *   - 存储 key：`prince-archive-progress`（不复用 prince-notebook）
 *   - 数据结构：Record<entryId, ArchiveProgress>
 *   - 事件名：`prince-archive-progress:changed`
 *
 * 设计要点：
 *   - 默认状态全部 false：未访问过的 entryId 不写入存储，
 *     getArchiveProgress 返回现场构造的默认对象
 *   - updateArchiveProgress 使用浅合并 patch（与 notebookStorage.updateEntry 一致）
 *   - 首次写入时自动补 firstUnlockedAt（若 patch 未提供）
 *   - 每次 update 自动刷新 lastVisitedAt（若 patch 未提供）
 *
 * 跨组件同步：
 *   - 同窗口：dispatchEvent(CustomEvent)
 *   - 跨标签页：window.addEventListener("storage")
 *
 * 未来可替换为 API 实现，保持函数签名不变即可。
 */

import type { ArchiveProgress } from "@/types/archiveProgress";

const STORAGE_KEY = "prince-archive-progress";
const CHANGE_EVENT = "prince-archive-progress:changed";

/**
 * 构造默认 ArchiveProgress（全部 false）。
 *
 * 未访问过的 entryId 视为"全新"，不写入存储，
 * 调用方读取时由本函数即时构造默认值。
 */
function createDefaultProgress(entryId: string): ArchiveProgress {
  return {
    entryId,
    discovered: false,
    imageViewed: false,
    contentRead: false,
    audioPlayed: false,
    conversationStarted: false,
  };
}

/**
 * 将单条 progress 归一化为带默认字段的完整结构。
 *
 * 兼容未来字段扩展：旧数据缺少字段时补默认值。
 * 不删除任何已有字段。
 */
function normalizeProgress(raw: Partial<ArchiveProgress>): ArchiveProgress {
  const entryId = raw.entryId ?? "";
  return {
    entryId,
    discovered: raw.discovered ?? false,
    imageViewed: raw.imageViewed ?? false,
    contentRead: raw.contentRead ?? false,
    audioPlayed: raw.audioPlayed ?? false,
    conversationStarted: raw.conversationStarted ?? false,
    firstUnlockedAt: raw.firstUnlockedAt,
    lastVisitedAt: raw.lastVisitedAt,
  };
}

/**
 * 安全读取 localStorage 全部 ArchiveProgress 记录。
 *
 * SSR / 隐私模式 / quota 超限时返回空对象。
 * 读取后逐条 normalizeProgress，兼容旧数据。
 */
function readRaw(): Record<string, ArchiveProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, ArchiveProgress> = {};
    for (const [id, value] of Object.entries(
      parsed as Record<string, Partial<ArchiveProgress>>,
    )) {
      const normalized = normalizeProgress(value);
      // 防御：若解析出的 entryId 与 key 不一致，以 key 为准
      if (!normalized.entryId) normalized.entryId = id;
      result[id] = normalized;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * 安全写入全部记录到 localStorage。
 */
function writeRaw(map: Record<string, ArchiveProgress>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    // 通知订阅者（同窗口跨组件）
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // quota 超限或隐私模式：静默失败
  }
}

/**
 * 订阅 ArchiveProgress 变化。
 *
 * 用于组件在数据更新时刷新本地视图。
 * 返回取消订阅函数。
 */
export function subscribeArchiveProgress(cb: () => void): () => void {
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
 * 获取单条 entry 的阅读状态。
 *
 * 若 entryId 未曾记录，返回现场构造的默认对象（全部 false），
 * 不写入存储。
 */
export function getArchiveProgress(entryId: string): ArchiveProgress {
  if (!entryId) return createDefaultProgress("");
  const map = readRaw();
  return map[entryId] ?? createDefaultProgress(entryId);
}

/**
 * 更新单条 entry 的阅读状态（浅合并 patch）。
 *
 * 行为：
 *   - 若 entryId 未曾记录，先以默认值初始化（首次访问）
 *   - 首次写入时自动补 firstUnlockedAt（若 patch 未提供）
 *   - 每次更新自动刷新 lastVisitedAt（若 patch 未提供）
 *   - 不覆盖 patch 中未传的字段
 *
 * 返回更新后的完整 ArchiveProgress 对象。
 */
export function updateArchiveProgress(
  entryId: string,
  patch: Partial<ArchiveProgress>,
): ArchiveProgress {
  if (!entryId) return createDefaultProgress("");
  const map = readRaw();
  const existing = map[entryId] ?? createDefaultProgress(entryId);
  const now = new Date().toISOString();

  // 首次访问：若 patch 未提供 firstUnlockedAt，自动补当前时间
  const firstUnlockedAt =
    patch.firstUnlockedAt ?? existing.firstUnlockedAt ?? now;

  // 每次更新刷新 lastVisitedAt（patch 优先）
  const lastVisitedAt = patch.lastVisitedAt ?? now;

  const updated: ArchiveProgress = {
    ...existing,
    ...patch,
    entryId, // 防御：确保 entryId 不被 patch 覆盖
    firstUnlockedAt,
    lastVisitedAt,
  };

  map[entryId] = updated;
  writeRaw(map);
  return updated;
}

/**
 * 获取所有已记录的 ArchiveProgress。
 *
 * 未访问过的 entryId 不会出现在结果中。
 * 调用方如需对未访问 entry 显示默认状态，应单独调用 getArchiveProgress。
 */
export function getAllArchiveProgress(): Record<string, ArchiveProgress> {
  return readRaw();
}
