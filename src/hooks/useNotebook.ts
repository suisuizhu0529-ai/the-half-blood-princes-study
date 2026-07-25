/**
 * useNotebook hook（Phase 4A）。
 *
 * 订阅 notebookStorage 的变化，自动刷新本地视图。
 *
 * 使用方式：
 *   const { entries, count, isSaved, add, remove, clear } = useNotebook();
 *
 * 跨组件同步：
 *   - StudyRoom 调用 add() → storage dispatch 事件 → Notebook 页面自动刷新
 *   - Notebook 页面调用 remove() → StudyRoom 的 saved 状态自动更新
 */

import { useCallback, useEffect, useState } from "react";
import type { NotebookEntry } from "@/types/notebook";
import {
  addEntry,
  clearEntries,
  getEntries,
  isSaved as isSavedFn,
  removeEntry,
  subscribeNotebook,
  updateEntry,
} from "@/utils/notebookStorage";

export interface UseNotebookReturn {
  /** 所有收藏条目（按时间倒序） */
  entries: NotebookEntry[];
  /** 收藏数量 */
  count: number;
  /** 检查某 word 是否已收藏 */
  isSaved: (word: string) => boolean;
  /** 添加收藏。成功返回 true，已存在返回 false */
  add: (entry: NotebookEntry) => boolean;
  /** 按 id 移除 */
  remove: (id: string) => boolean;
  /** Phase 5：按 id 浅合并更新部分字段。返回更新后的 entry 或 null */
  update: (id: string, patch: Partial<NotebookEntry>) => NotebookEntry | null;
  /** 清空所有 */
  clear: () => void;
}

export function useNotebook(): UseNotebookReturn {
  const [entries, setEntries] = useState<NotebookEntry[]>(() => getEntries());

  useEffect(() => {
    // 订阅 storage 变化，刷新本地视图
    const dispose = subscribeNotebook(() => {
      setEntries(getEntries());
    });
    // mount 时也同步一次（跨标签页可能已变化）
    setEntries(getEntries());
    return dispose;
  }, []);

  const add = useCallback((entry: NotebookEntry): boolean => {
    return addEntry(entry);
  }, []);

  const remove = useCallback((id: string): boolean => {
    return removeEntry(id);
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<NotebookEntry>): NotebookEntry | null => {
      return updateEntry(id, patch);
    },
    [],
  );

  const clear = useCallback((): void => {
    clearEntries();
  }, []);

  const isSaved = useCallback((word: string): boolean => {
    return isSavedFn(word);
  }, []);

  return {
    entries,
    count: entries.length,
    isSaved,
    add,
    remove,
    update,
    clear,
  };
}
