/**
 * useRitualSkip（Phase 19.2 Round 4 · 日常仪式快速进入）。
 *
 * 定位：
 *   独立的轻量 hook，判断用户是否已完成过 Lumos 仪式。
 *   首次访问：完整 Awakening + BookTransition（6.4s 仪式感）
 *   后续访问：提供"快速进入"入口，跳过仪式直接进入 lesson。
 *
 * 设计原则（Snape 冷峻风格）：
 *   - 不做"Skip"按钮（太游戏化）
 *   - 不强制跳过（保留仪式可选）
 *   - 后续访问时，idle 阶段同时显示：
 *       1. 原有"Enter the Study"完整仪式入口（暗淡）
 *       2. 新增"Return to Study"快速进入入口（明显）
 *   - 用户自主选择：想要仪式感 → 完整流程；只想学习 → 快速进入
 *
 * 架构边界：
 *   - 独立 localStorage key（prince-ritual-completed）
 *   - 不修改 useLumosRitual 状态机
 *   - 不修改 RitualProgress 数据结构
 *   - 不修改 AwakeningSequence / BookTransition
 *
 * 使用方式：
 *   const { hasCompletedBefore, markRitualCompleted } = useRitualSkip();
 *   if (hasCompletedBefore) showQuickEnter();
 *   markRitualCompleted(); // 在 closeRitual 时调用
 */

import { useCallback, useState } from "react";

/** localStorage key（独立于 prince-lumos-ritual） */
const RITUAL_SKIP_STORAGE_KEY = "prince-ritual-completed";

/**
 * 从 localStorage 读取是否已完成过仪式。
 */
function loadHasCompleted(): boolean {
  try {
    return localStorage.getItem(RITUAL_SKIP_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * 写入 localStorage。
 */
function saveHasCompleted(value: boolean): void {
  try {
    localStorage.setItem(RITUAL_SKIP_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // 静默失败（localStorage 不可用时仅不持久化）
  }
}

/**
 * useRitualSkip hook。
 *
 * 返回值：
 *   - hasCompletedBefore: 是否已完成过仪式（首次为 false，之后为 true）
 *   - markRitualCompleted: 标记本次仪式已完成（在 closeRitual 时调用）
 */
export function useRitualSkip() {
  const [hasCompletedBefore, setHasCompletedBefore] = useState<boolean>(
    loadHasCompleted,
  );

  /**
   * 标记仪式已完成。
   * 在 LumosEntrance.handleTransitionComplete 或快速进入时调用。
   */
  const markRitualCompleted = useCallback(() => {
    saveHasCompleted(true);
    setHasCompletedBefore(true);
  }, []);

  return {
    hasCompletedBefore,
    markRitualCompleted,
  };
}
