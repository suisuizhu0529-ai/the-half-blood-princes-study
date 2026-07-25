/**
 * Relationship Memory Reader（Phase 15.5-D-1）。
 *
 * 定位：RelationshipMemory → RelationshipContext 的只读适配器。
 *   - 纯函数，无副作用、无状态
 *   - 不修改 RelationshipMemory 原结构
 *   - 不读写 store / localStorage
 *   - 不调用 LLM
 *   - 不推断用户信息（仅读取已有字段）
 *
 * 与现有模块的关系：
 *   - 不修改 RelationshipMemory schema
 *   - 不修改 store / ConversationEngine / PromptBuilder
 *   - 与 getRelationshipSummary()（文本摘要）并列，提供结构化视图
 *
 * Phase 15.5-D-1 范围：
 *   - readRelationshipContext()：纯函数转换
 *
 * 不实现（留待后续 Phase）：
 *   - Prompt 注入（Phase 15.5-D-2）
 *   - conversationCount 推断（isReturningUser 暂用 firstMeeting 近似）
 *   - LLM extraction
 */

import type { RelationshipMemory } from "@/types/relationshipMemory";
import type { RelationshipContext } from "@/types/relationshipContext";

/**
 * 将 RelationshipMemory 转换为只读 RelationshipContext 视图。
 *
 * 转换规则（确定性，无 LLM）：
 *   - userName               ← memory.userProfile.name
 *   - relationshipLevel      ← memory.relationship.{trust, patience, curiosity}
 *   - hasFirstMeeting        ← memory.milestones.firstMeeting !== undefined
 *   - hasViewedArchive       ← memory.milestones.archiveViewedCount >= 1
 *   - hasActivatedMemory     ← memory.milestones.memoryActivatedCount >= 1
 *   - eventsCount            ← memory.milestones.events?.length ?? 0
 *   - knowsUserName          ← memory.userProfile.name !== undefined
 *   - isReturningUser        ← memory.milestones.firstMeeting !== undefined
 *
 * 安全默认值：
 *   - 空 RelationshipMemory（刚 createDefaultRelationshipMemory() 创建）输出：
 *       userName: undefined
 *       relationshipLevel: { trust: 0, patience: 50, curiosity: 0 }
 *       milestones: { hasFirstMeeting: false, hasViewedArchive: false,
 *                     hasActivatedMemory: false, eventsCount: 0 }
 *       summaryFlags: { isReturningUser: false, knowsUserName: false }
 *
 * 不修改输入：纯函数，返回全新对象。
 *
 * @param memory 当前 RelationshipMemory（只读）
 * @returns RelationshipContext 视图模型
 */
export function readRelationshipContext(
  memory: RelationshipMemory,
): RelationshipContext {
  const userName = memory.userProfile.name;

  const hasFirstMeeting = memory.milestones.firstMeeting !== undefined;
  const hasViewedArchive = memory.milestones.archiveViewedCount >= 1;
  const hasActivatedMemory = memory.milestones.memoryActivatedCount >= 1;
  const eventsCount = memory.milestones.events?.length ?? 0;

  // TODO(Phase 15.5+): isReturningUser 当前使用 firstMeeting !== undefined 近似判断。
  // 未来应由 conversationCount 或 session history 判断，
  // 本阶段不修改 RelationshipMemory schema，不新增推断逻辑。
  const isReturningUser = hasFirstMeeting;
  const knowsUserName = userName !== undefined;

  return {
    userName,
    relationshipLevel: {
      trust: memory.relationship.trust,
      patience: memory.relationship.patience,
      curiosity: memory.relationship.curiosity,
    },
    milestones: {
      hasFirstMeeting,
      hasViewedArchive,
      hasActivatedMemory,
      eventsCount,
    },
    summaryFlags: {
      isReturningUser,
      knowsUserName,
    },
  };
}
