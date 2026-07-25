/**
 * useStudyAtmosphere（Phase 16.1-A）。
 *
 * 定位：RelationshipMemory → StudyAtmosphere 的 React hook 适配层。
 *   - 从 localStorage 读取 RelationshipMemory
 *   - 纯函数映射为 StudyAtmosphere
 *   - 提供 refresh 方法，供对话后手动刷新
 *
 * 设计原则：
 *   - 不修改 RelationshipMemory / store / ConversationEngine
 *   - 不依赖 React Context（保持简单，后续 Phase 可升级）
 *   - mount 时读取一次 + 提供 refresh
 *   - 监听 window focus / visibility change 自动刷新（用户切回标签页时更新）
 *
 * Phase 16.1-A 范围：
 *   - 读取 + 映射 + refresh
 *   - 不实现实时更新（对话后需手动 refresh 或刷新页面）
 *
 * 映射规则（确定性，无 LLM）：
 *
 *   trust (0-100) →
 *     fogDensity:        0.6 → 0.15（trust 越高雾越淡）
 *     moonBrightness:    0.15 → 0.85（trust 越高月越亮）
 *     snapeShadowOpacity:0.05 → 0.8（trust 越高影子越实）
 *
 *   curiosity (0-100) →
 *     fireplaceIntensity:0.3 → 0.9（curiosity 越高火越旺）
 *     magicParticleCount:0 → 25（curiosity 越高粒子越多）
 *
 *   milestones →
 *     candleCount:       1 + archiveViewedCount(≤2) + memoryActivatedCount(≤1) + (trust≥20?1:0)，上限 5
 *     bookshelfGlow:     memoryActivatedCount / 3，上限 1
 *
 *   sharedHistory.length →
 *     memoryAura:        length / 8，上限 1
 */

import { useCallback, useEffect, useState } from "react";
import type { RelationshipMemory } from "@/types/relationshipMemory";
import type { StudyAtmosphere } from "@/types/studyAtmosphere";
import { DEFAULT_ATMOSPHERE } from "@/types/studyAtmosphere";
import { loadRelationshipMemory } from "@/store/relationshipMemory";

/**
 * 将 RelationshipMemory 映射为 StudyAtmosphere。
 *
 * 纯函数，无副作用。Memory 为 null 时返回 DEFAULT_ATMOSPHERE。
 *
 * @param memory RelationshipMemory 快照（可为 null）
 * @returns StudyAtmosphere 视觉状态
 */
function mapMemoryToAtmosphere(memory: RelationshipMemory | null): StudyAtmosphere {
  if (!memory) return DEFAULT_ATMOSPHERE;

  const { trust, curiosity } = memory.relationship;
  const { archiveViewedCount, memoryActivatedCount } = memory.milestones;
  const sharedHistoryLength = memory.sharedHistory?.length ?? 0;

  // ---- trust 映射 ----
  // 雾气：trust 0 → 0.6，trust 100 → 0.15
  const fogDensity = clamp(0.6 - (trust / 100) * 0.45, 0.15, 0.6);
  // 月光：trust 0 → 0.15，trust 100 → 0.85
  const moonBrightness = clamp(0.15 + (trust / 100) * 0.7, 0.15, 0.85);
  // Snape 影子：trust 0-20 → 0.05，20-60 → 0.05-0.4，60+ → 0.4-0.8
  const snapeShadowOpacity =
    trust < 20
      ? 0.05
      : trust < 60
        ? 0.05 + ((trust - 20) / 40) * 0.35
        : 0.4 + ((trust - 60) / 40) * 0.4;

  // ---- curiosity 映射 ----
  // 火焰：curiosity 0 → 0.3，curiosity 100 → 0.9
  const fireplaceIntensity = clamp(0.3 + (curiosity / 100) * 0.6, 0.3, 0.9);
  // 魔法粒子：curiosity 0 → 0，curiosity 100 → 25
  const magicParticleCount = Math.floor(curiosity / 4);

  // ---- milestones 映射 ----
  // 蜡烛：1（基础）+ archive(≤2) + memory(≤1) + trust≥20(+1)，上限 5
  const candleCount = Math.min(
    5,
    1 +
      Math.min(2, archiveViewedCount) +
      Math.min(1, memoryActivatedCount) +
      (trust >= 20 ? 1 : 0),
  );
  // 书架高光：memoryActivatedCount / 3，上限 1
  const bookshelfGlow = Math.min(1, memoryActivatedCount / 3);

  // ---- sharedHistory 映射 ----
  const memoryAura = Math.min(1, sharedHistoryLength / 8);

  return {
    fogDensity,
    moonBrightness,
    snapeShadowOpacity,
    fireplaceIntensity,
    magicParticleCount,
    candleCount,
    bookshelfGlow,
    memoryAura,
  };
}

/** 数值夹取 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 读取 RelationshipMemory 并映射为 StudyAtmosphere。
 *
 * 行为：
 *   - mount 时读取一次 localStorage
 *   - window focus / visibility change 时自动刷新
 *   - 返回 atmosphere + refresh 方法
 *
 * @returns { atmosphere: StudyAtmosphere, refresh: () => void }
 */
export function useStudyAtmosphere(): {
  atmosphere: StudyAtmosphere;
  refresh: () => void;
} {
  const [atmosphere, setAtmosphere] = useState<StudyAtmosphere>(() =>
    mapMemoryToAtmosphere(loadRelationshipMemory()),
  );

  const refresh = useCallback(() => {
    setAtmosphere(mapMemoryToAtmosphere(loadRelationshipMemory()));
  }, []);

  // window focus / visibility change 时自动刷新
  // 原因：用户在 StudyRoom 对话后 memory 会更新，切回标签页时重新读取
  useEffect(() => {
    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  return { atmosphere, refresh };
}
