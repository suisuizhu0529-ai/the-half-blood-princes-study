/**
 * Study Atmosphere 数据模型（Phase 16.1-A）。
 *
 * 定位：RelationshipMemory → 视觉状态的映射层。
 *   - 描述书房氛围如何响应学生的成长
 *   - 纯数据结构，不包含方法
 *   - 不依赖 React
 *
 * 设计原则：
 *   - 所有数值字段归一化到 0-1（除 candleCount / magicParticleCount 为整数）
 *   - 即使 Memory 为空（新用户），也保留基础氛围值（不完全黑屏）
 *   - 不修改 RelationshipMemory
 *
 * Phase 16.1-A 范围：
 *   - 仅定义数据结构
 *   - 映射逻辑在 useStudyAtmosphere hook 中
 *
 * 三层映射：
 *   - trust → 雾气 / 月光 / Snape 影子（防备程度）
 *   - curiosity → 壁炉 / 魔法粒子（好奇强度）
 *   - milestones → 蜡烛数量 / 书架高光（成长节点）
 *   - sharedHistory → 记忆光晕（共同经历）
 */

/**
 * 书房氛围状态。
 *
 * 所有数值字段已归一化，直接用于 CSS opacity / scale 等。
 */
export interface StudyAtmosphere {
  /* ---- trust 映射 ---- */
  /** 窗外雾气浓度（0-1，trust 越低雾越浓，保留 0.15 基础值避免全黑） */
  fogDensity: number;
  /** 月光亮度（0-1，trust 越高月越亮，保留 0.15 基础值） */
  moonBrightness: number;
  /** Snape 影子不透明度（0-0.8，trust 越高影子越实） */
  snapeShadowOpacity: number;

  /* ---- curiosity 映射 ---- */
  /** 壁炉火焰强度（0-1，curiosity 越高火越旺，保留 0.3 基础值） */
  fireplaceIntensity: number;
  /** 魔法粒子数量（0-25，curiosity 越高粒子越多） */
  magicParticleCount: number;

  /* ---- milestones 映射 ---- */
  /** 蜡烛数量（1-5，随 milestones 解锁） */
  candleCount: number;
  /** 书架金色高光强度（0-1，memoryActivatedCount 越高越亮） */
  bookshelfGlow: number;

  /* ---- sharedHistory 映射 ---- */
  /** 记忆光晕强度（0-1，sharedHistory.length 越长越亮） */
  memoryAura: number;
}

/**
 * 默认氛围状态（新用户 / Memory 不可用时）。
 *
 * 保留基础氛围值，确保书房不会全黑：
 *   - 雾气 0.6（浓雾，但可见）
 *   - 月光 0.15（微弱）
 *   - 火焰 0.3（基础燃烧）
 *   - 蜡烛 1 根（最低）
 */
export const DEFAULT_ATMOSPHERE: StudyAtmosphere = {
  fogDensity: 0.6,
  moonBrightness: 0.15,
  snapeShadowOpacity: 0.05,
  fireplaceIntensity: 0.3,
  magicParticleCount: 0,
  candleCount: 1,
  bookshelfGlow: 0,
  memoryAura: 0,
};
