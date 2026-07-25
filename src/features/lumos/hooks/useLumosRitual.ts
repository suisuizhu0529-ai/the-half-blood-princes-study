/**
 * useLumosRitual（Phase 17.1-C Step 1 骨架）。
 *
 * 定位：Lumos 仪式状态机 hook。
 *   - 管理当前阶段（LumosPhase）
 *   - 管理当前研究索引
 *   - 管理进度持久化（localStorage）
 *   - 协调 Snape 反应触发
 *
 * 职责边界：
 *   - 本 hook 只管状态，不渲染 UI（由 LumosEntrance 编排）
 *   - 不直接调用 useSpeech（由 SnapeWhisper 组件负责）
 *   - 不修改 RelationshipMemory / StudyAtmosphere
 *
 * Step 1 范围：仅类型 + 状态骨架，不实现阶段流转逻辑。
 *   - Step 3 将实现 idle → awakening 流转
 *   - Step 5 将实现 research 翻页
 *   - Step 6 将实现 verification
 */

import { useCallback, useState } from "react";
import type { LumosPhase, RitualProgress } from "../types";
import { DEFAULT_RITUAL_PROGRESS } from "../types";

/** localStorage key（独立于 RelationshipMemory） */
const RITUAL_STORAGE_KEY = "prince-lumos-ritual";

/**
 * 从 localStorage 读取进度。
 */
function loadProgress(): RitualProgress {
  try {
    const raw = localStorage.getItem(RITUAL_STORAGE_KEY);
    if (!raw) return DEFAULT_RITUAL_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<RitualProgress>;
    return { ...DEFAULT_RITUAL_PROGRESS, ...parsed };
  } catch {
    return DEFAULT_RITUAL_PROGRESS;
  }
}

/**
 * 保存进度到 localStorage。
 */
function saveProgress(progress: RitualProgress): void {
  try {
    localStorage.setItem(RITUAL_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 静默失败（localStorage 不可用时仅不持久化）
  }
}

/**
 * useLumosRitual hook 返回值类型（供 LumosEntrance 接收）。
 */
export type UseLumosRitualReturn = ReturnType<typeof useLumosRitual>;

/**
 * useLumosRitual hook（Step 1 骨架）。
 *
 * Step 1：仅返回当前阶段 + 进度，不提供流转方法。
 * Step 3+ 将补充：
 *   - activateLumos()：idle → awakening
 *   - advancePhase()：awakening → research → verification → closure
 *   - nextSubject()：研究下一个对象
 *   - recordVerification(subjectId, correct)：记录验证结果
 */
export function useLumosRitual() {
  const [phase, setPhase] = useState<LumosPhase>("idle");
  const [progress, setProgress] = useState<RitualProgress>(loadProgress);
  const [currentResearchIndex, setCurrentResearchIndex] = useState(0);
  const [bookOpen, setBookOpen] = useState(false);

  /** idle → awakening（点击符文触发） */
  const activateLumos = useCallback(() => {
    console.log("[Lumos] activateLumos: idle → awakening");
    setPhase("awakening");
  }, []);

  /** awakening → research（苏醒序列完成） */
  const completeAwakening = useCallback(() => {
    console.log("[Lumos] completeAwakening: awakening → research");
    setPhase("research");
  }, []);

  /** research 阶段：点击书本 → 打开 */
  const openBook = useCallback(() => {
    setBookOpen(true);
  }, []);

  /** 关闭仪式（回到 closed 状态，不显示 DarkStudy，直接回到首页单词页） */
  const closeRitual = useCallback(() => {
    setBookOpen(false);
    setPhase("closed");
  }, []);

  /** 重新进入仪式（从 closed 回到 idle，显示黑暗符文） */
  const resetToIdle = useCallback(() => {
    setPhase("idle");
  }, []);

  return {
    phase,
    progress,
    currentResearchIndex,
    bookOpen,
    activateLumos,
    completeAwakening,
    openBook,
    closeRitual,
    resetToIdle,
    // TODO Step 5: nextSubject
    // TODO Step 6: recordVerification
    setPhase,
    setProgress,
    setCurrentResearchIndex,
    saveProgress,
  };
}
