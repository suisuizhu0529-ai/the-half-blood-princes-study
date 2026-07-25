/**
 * Archive 阅读状态模型（Phase 7B.7）。
 *
 * 用于追踪用户在 Archive Chamber 内对每条 entry 的阅读行为，
 * 与 LibraryEntry（静态档案数据）解耦：
 *   - LibraryEntry 是"档案本身"（不变）
 *   - ArchiveProgress 是"用户与档案的交互记录"（可变，localStorage 持久化）
 *
 * 设计目标：
 *   - 默认状态全部 false（用户首次进入前无任何记录）
 *   - 字段粒度匹配 UnlockFeatures（image/content/audio/conversation）
 *   - discovered 表示"曾在列表中见过 / 进入过 Chamber"，与各特性查看状态独立
 *
 * 时间戳：
 *   - firstUnlockedAt：首次解锁（或首次访问）的时间
 *   - lastVisitedAt：最近一次进入 Chamber 的时间
 *
 * 与 notebookStorage 关系：
 *   - 完全独立的 localStorage key（"prince-archive-progress"）
 *   - 不读取 / 不写入 prince-notebook
 *   - 数据格式：Record<entryId, ArchiveProgress>
 */

export interface ArchiveProgress {
  /** 关联的 LibraryEntry.id */
  entryId: string;

  /** 是否曾被发现（出现在可见列表 / 进入过 Chamber） */
  discovered: boolean;

  /** 是否查看过图片 */
  imageViewed: boolean;

  /** 是否阅读过正文 */
  contentRead: boolean;

  /** 是否播放过教授语音讲解 */
  audioPlayed: boolean;

  /** 是否启动过 AI 对话（神秘档案永远 false） */
  conversationStarted: boolean;

  /** 首次解锁 / 首次访问时间 ISO 字符串 */
  firstUnlockedAt?: string;

  /** 最近一次进入 Chamber 的时间 ISO 字符串 */
  lastVisitedAt?: string;
}
