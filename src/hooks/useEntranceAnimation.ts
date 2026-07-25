/**
 * useEntranceAnimation（Phase 16.2-B）。
 *
 * 定位：首次进入 StudyRoom 时的电影感入场动画序列。
 *
 * 动画时间轴：
 *   0.0s - 0.5s：黑暗淡入（容器 opacity 0 → 1）
 *   0.5s - 1.5s：窗外月光 fade in
 *   1.0s - 2.0s：壁炉光晕 fade in
 *   1.5s - 2.5s：桌面物件 appear
 *   2.5s - 3.5s：标题 reveal
 *
 * 持久化：
 *   - sessionStorage key：prince-entrance-{YYYY-MM-DD}
 *   - 同一天内只播放一次（重复进入直接跳过动画）
 *   - 跨天自动重新播放
 *
 * 使用：
 *   const { stage, shouldAnimate } = useEntranceAnimation();
 *   stage: "darkness" | "moonlight" | "fireplace" | "desk" | "title" | "done"
 *
 * Phase 16.2-B 范围：
 *   - 只输出阶段标识，不直接控制具体组件
 *   - 各组件通过 stage 自行决定何时显示
 *   - prefers-reduced-motion 时直接进入 "done"
 */

import { useEffect, useState } from "react";

export type EntranceStage =
  | "darkness"
  | "moonlight"
  | "fireplace"
  | "desk"
  | "title"
  | "done";

/** 动画时间轴（ms） */
const TIMELINE: ReadonlyArray<readonly [EntranceStage, number]> = [
  ["darkness", 0],
  ["moonlight", 500],
  ["fireplace", 1000],
  ["desk", 1500],
  ["title", 2500],
  ["done", 3500],
] as const;

/** sessionStorage key 前缀 */
const STORAGE_PREFIX = "prince-entrance";

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${STORAGE_PREFIX}-${y}-${m}-${d}`;
}

function hasPlayedToday(): boolean {
  try {
    return sessionStorage.getItem(getTodayKey()) === "1";
  } catch {
    return false;
  }
}

function markPlayedToday(): void {
  try {
    sessionStorage.setItem(getTodayKey(), "1");
  } catch {
    // sessionStorage 不可用时静默忽略
  }
}

/**
 * 入场动画 hook。
 *
 * 行为：
 *   - mount 时检查 sessionStorage
 *   - 已播放过 → shouldAnimate=false，stage 直接为 "done"
 *   - 未播放 → 按时间轴推进 stage，完成后写入 sessionStorage
 *   - prefers-reduced-motion → 跳过动画，直接 "done"
 *
 * @returns { stage, shouldAnimate }
 */
export function useEntranceAnimation(): {
  stage: EntranceStage;
  shouldAnimate: boolean;
} {
  const [stage, setStage] = useState<EntranceStage>("darkness");
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(true);

  useEffect(() => {
    // 检查 prefers-reduced-motion
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced || hasPlayedToday()) {
      setStage("done");
      setShouldAnimate(false);
      return;
    }

    // 按时间轴推进
    const timers: number[] = [];
    for (const [s, delay] of TIMELINE) {
      const t = window.setTimeout(() => {
        setStage(s);
        if (s === "done") {
          markPlayedToday();
        }
      }, delay);
      timers.push(t);
    }

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return { stage, shouldAnimate };
}

/** 各阶段的 opacity 帮助函数（供组件直接使用） */
export function stageOpacity(
  stage: EntranceStage,
  target: Exclude<EntranceStage, "darkness" | "done">,
  shouldAnimate: boolean,
): number {
  if (!shouldAnimate || stage === "done") return 1;
  const order: EntranceStage[] = [
    "darkness",
    "moonlight",
    "fireplace",
    "desk",
    "title",
    "done",
  ];
  const currentIdx = order.indexOf(stage);
  const targetIdx = order.indexOf(target);
  return currentIdx >= targetIdx ? 1 : 0;
}
