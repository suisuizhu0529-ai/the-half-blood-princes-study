/**
 * Archive 解锁状态计算层（Phase 7B）。
 *
 * 职责：
 *   - 根据学习进度（LearningProgress）判断单条 archive entry 是否解锁
 *   - 提供批量过滤工具
 *   - 不修改数据层，纯函数
 *
 * 解锁优先级：
 *   1. entry.unlocked === true → 数据层强制解锁（未来管理员手动开放）
 *   2. requiredProgress 缺失（神秘档案）→ 永远锁定
 *   3. progress.collectedWords >= requiredProgress → 标准阈值判定
 *
 * 未来扩展（接口已预留，Phase 7B 未启用）：
 *   - reviewedWords：复习过的单词数
 *   - totalReviewCount：总复习次数
 *   - masteryScore：掌握等级评分
 *   - streak：连续学习天数
 *   解锁算法升级时只改本文件，组件不变。
 */

import type { LibraryEntry } from "@/types/library";

/**
 * 学习进度（Phase 7B 仅启用 collectedWords）。
 *
 * 字段命名遵循 camelCase，与 NotebookEntry 一致。
 */
export interface LearningProgress {
  /** 已收藏的单词总数（Phase 7B 唯一启用字段） */
  collectedWords: number;
  /** 已复习过的不同单词数（未来解锁条件，Phase 7B 未启用） */
  reviewedWords?: number;
  /** 总复习次数（未来解锁条件，Phase 7B 未启用） */
  totalReviewCount?: number;
  /** 掌握等级综合评分（未来解锁条件，Phase 7B 未启用） */
  masteryScore?: number;
  /** 连续学习天数（未来解锁条件，Phase 7B 未启用） */
  streak?: number;
}

/**
 * 解锁状态分类。
 *
 * - unlocked      已解锁
 * - locked        可解锁但当前进度不足（有 requiredProgress）
 * - sealed        永远锁定（神秘档案，无 requiredProgress）
 */
export type UnlockStatus = "unlocked" | "locked" | "sealed";

/**
 * 判断单条 entry 的解锁状态。
 *
 * 返回值：
 *   - "unlocked" 数据层强制解锁 OR 进度达标
 *   - "sealed"   神秘档案（requiredProgress 缺失）
 *   - "locked"   有 requiredProgress 但进度不足
 */
export function getUnlockStatus(
  entry: LibraryEntry,
  progress: LearningProgress,
): UnlockStatus {
  // 1. 数据层强制解锁
  if (entry.unlocked) return "unlocked";

  // 2. 神秘档案：无 requiredProgress → 永远锁
  if (entry.requiredProgress === undefined) return "sealed";

  // 3. 标准阈值判定
  return progress.collectedWords >= entry.requiredProgress
    ? "unlocked"
    : "locked";
}

/**
 * 简化布尔版：是否已解锁。
 *
 * 供只需 true/false 的场景使用（如按钮 disabled）。
 */
export function checkUnlock(
  entry: LibraryEntry,
  progress: LearningProgress,
): boolean {
  return getUnlockStatus(entry, progress) === "unlocked";
}

/**
 * 批量过滤分类下的 entries。
 *
 * 返回已解锁 / 未解锁两组 + 已解锁数量。
 * 已解锁组按数据声明顺序保留；未解锁组同理。
 */
export function filterUnlocked(
  entries: LibraryEntry[],
  progress: LearningProgress,
): {
  unlocked: LibraryEntry[];
  locked: LibraryEntry[];
  unlockedCount: number;
} {
  const unlocked: LibraryEntry[] = [];
  const locked: LibraryEntry[] = [];
  for (const e of entries) {
    if (checkUnlock(e, progress)) {
      unlocked.push(e);
    } else {
      locked.push(e);
    }
  }
  return { unlocked, locked, unlockedCount: unlocked.length };
}

/**
 * 单条 entry 内部特性解锁状态（Phase 7B.6 → 7C 启用）。
 *
 * 用于 Archive Chamber 内部分阶段揭示：
 *   - entry 解锁后，进一步按 collectedWords 判定 image/content/audio/conversation
 *   - 省略 unlockFeatures 字段 → 全部特性随 entry 解锁即开放
 *   - 省略 unlockFeatures 内某个特性字段 → 该特性随 entry 解锁即开放
 *
 * 返回对象包含 4 个 boolean 字段，调用方按需读取。
 *
 * 注意：本函数不判断 entry 本身是否解锁，调用方应先用 checkUnlock 判定。
 */
export function getFeatureUnlockStatus(
  entry: LibraryEntry,
  progress: LearningProgress,
): {
  image: boolean;
  content: boolean;
  audio: boolean;
  conversation: boolean;
} {
  const features = entry.unlockFeatures;
  // 未声明 unlockFeatures → 全部特性随 entry 解锁即开放
  if (!features) {
    return {
      image: true,
      content: true,
      audio: true,
      conversation: true,
    };
  }
  const words = progress.collectedWords;
  return {
    image: features.image === undefined ? true : words >= features.image,
    content: features.content === undefined ? true : words >= features.content,
    audio: features.audio === undefined ? true : words >= features.audio,
    conversation:
      features.conversation === undefined
        ? true
        : words >= features.conversation,
  };
}
