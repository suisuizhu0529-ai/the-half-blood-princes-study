/**
 * Lumos Ritual 类型定义（Phase 17.1-C Step 1 骨架）。
 *
 * 定位：Lumos 仪式的核心类型。
 *   - LumosPhase：仪式阶段
 *   - RitualProgress：进度记录（独立 localStorage，不碰 Memory）
 *
 * 不做：
 *   - 不包含 ResearchSubject 类型（在 src/data/researchSubjects.ts）
 *   - 不包含 Snape 反应类型（在 src/core/snape/reactions.ts）
 */

/**
 * Lumos 仪式阶段。
 *
 * 阶段流转：
 *   idle → awakening → research → verification → closure
 *   任意阶段 → closed（用户点击关闭，回到首页单词页）
 *
 *   - idle：黑暗书房，等待用户激活符文
 *   - awakening：环境苏醒（4-5s 缓慢状态变化）
 *   - research：研究今日 5 个对象（翻页学习）
 *   - verification：Spell Verification（拼写/听力/选择）
 *   - closure：收尾，书合上，环境回归
 *   - closed：已关闭，不显示任何仪式 UI，回到首页单词页
 */
export type LumosPhase =
  | "idle"
  | "awakening"
  | "research"
  | "verification"
  | "closure"
  | "closed";

/**
 * Ritual 进度记录。
 *
 * 存储：localStorage key = "prince-lumos-ritual"
 * 独立于 RelationshipMemory，不污染 Memory schema。
 *
 * 设计原则：
 *   - 记录"已研究"而非"已答对"（研究是无压力学习）
 *   - forgottenSubjects 进入 Forgotten Cauldron（书页角落小图标）
 */
export interface RitualProgress {
  /** 最后仪式日期（YYYY-MM-DD），同一天不重复触发 */
  lastRitualDate: string;
  /** 完成仪式总数 */
  completedRituals: number;
  /** 已研究的对象 id 列表 */
  researchedSubjects: string[];
  /** 已验证通过的对象 id 列表 */
  verifiedSubjects: string[];
  /** 遗忘之锅（验证失败的对象 id） */
  forgottenSubjects: string[];
}

/**
 * 默认进度（首次使用）。
 */
export const DEFAULT_RITUAL_PROGRESS: RitualProgress = {
  lastRitualDate: "",
  completedRituals: 0,
  researchedSubjects: [],
  verifiedSubjects: [],
  forgottenSubjects: [],
};
