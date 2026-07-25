/**
 * Relationship Milestone Manager（Phase 15.5-C）。
 *
 * 定位：RelationshipMemory.milestones.events 的纯函数管理器。
 *   - 检测首次达成的关键节点（first-meeting / first-archive 等）
 *   - 已存在的 milestone 类型不重复添加
 *   - 不可变更新：返回新对象，不修改原对象
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态
 *   - 不调用 LLM、不读写 localStorage、不依赖 React
 *   - 类型安全，无 any
 *   - 不修改 Persona / ConversationState / Signal Resolver
 *
 * Phase 15.5-C 范围：
 *   - checkMilestones()：基于 RelationshipMemory 当前状态检测并追加 milestone
 *
 * 不实现（留待后续 Phase）：
 *   - milestone 触发后的 Persona 变化
 *   - milestone 触发后的 stage 升级
 *   - milestone 触发后的 UI 通知
 *   - LLM extraction
 */

import type { RelationshipMemory } from "@/types/relationshipMemory";
import type {
  RelationshipMilestone,
  RelationshipMilestoneType,
} from "@/types/relationshipMilestone";

/**
 * 信任度阈值（首次达到即记录 trust-threshold milestone）。
 */
const TRUST_THRESHOLD = 20;

/**
 * 好奇度阈值（首次达到即记录 curiosity-threshold milestone）。
 */
const CURIOSITY_THRESHOLD = 20;

/**
 * 检查指定类型的 milestone 是否已存在。
 *
 * @param events 现有 milestone 列表（可能 undefined）
 * @param type 待检测的 milestone 类型
 * @returns true 表示已存在（不应重复添加）
 */
function hasMilestone(
  events: RelationshipMilestone[] | undefined,
  type: RelationshipMilestoneType,
): boolean {
  if (!events || events.length === 0) return false;
  return events.some((e) => e.type === type);
}

/**
 * 检测并追加首次达成的 milestone。
 *
 * 检测规则（基于 RelationshipMemory 当前状态，确定性，无 LLM）：
 *   1. first-meeting           milestones.firstMeeting 从 undefined 变为存在
 *   2. first-archive            milestones.archiveViewedCount >= 1
 *   3. first-memory-activation  milestones.memoryActivatedCount >= 1
 *   4. trust-threshold          relationship.trust >= 20
 *   5. curiosity-threshold      relationship.curiosity >= 20
 *
 * 去重规则：已存在的同类型 milestone 不重复添加。
 *
 * 不可变更新：
 *   - 无新增 milestone 时返回原对象（避免无意义的对象创建）
 *   - 有新增时返回新对象，events 数组为 [...existing, ...new]
 *
 * 时间戳策略：
 *   - first-meeting 使用 firstMeeting 自身的时间戳（更准确反映首次相遇时刻）
 *   - 其余使用调用时刻 Date.now()（近似首次达成时刻）
 *
 * @param memory 当前 RelationshipMemory（已包含本轮 updateRelationshipMemory 的结果）
 * @returns 新 RelationshipMemory（milestones.events 可能被追加）或原对象
 */
export function checkMilestones(
  memory: RelationshipMemory,
): RelationshipMemory {
  const existingEvents = memory.milestones.events;
  const now = Date.now();
  const newEvents: RelationshipMilestone[] = [];

  // 1. first-meeting：firstMeeting 从 undefined 变为存在
  //    使用 firstMeeting 自身时间戳，准确记录首次相遇时刻
  if (
    !hasMilestone(existingEvents, "first-meeting") &&
    memory.milestones.firstMeeting !== undefined
  ) {
    newEvents.push({
      type: "first-meeting",
      timestamp: memory.milestones.firstMeeting,
    });
  }

  // 2. first-archive：archiveViewedCount >= 1
  if (
    !hasMilestone(existingEvents, "first-archive") &&
    memory.milestones.archiveViewedCount >= 1
  ) {
    newEvents.push({
      type: "first-archive",
      timestamp: now,
      metadata: { count: memory.milestones.archiveViewedCount },
    });
  }

  // 3. first-memory-activation：memoryActivatedCount >= 1
  if (
    !hasMilestone(existingEvents, "first-memory-activation") &&
    memory.milestones.memoryActivatedCount >= 1
  ) {
    newEvents.push({
      type: "first-memory-activation",
      timestamp: now,
      metadata: { count: memory.milestones.memoryActivatedCount },
    });
  }

  // 4. trust-threshold：trust >= 20
  if (
    !hasMilestone(existingEvents, "trust-threshold") &&
    memory.relationship.trust >= TRUST_THRESHOLD
  ) {
    newEvents.push({
      type: "trust-threshold",
      timestamp: now,
      metadata: {
        value: memory.relationship.trust,
        threshold: TRUST_THRESHOLD,
      },
    });
  }

  // 5. curiosity-threshold：curiosity >= 20
  if (
    !hasMilestone(existingEvents, "curiosity-threshold") &&
    memory.relationship.curiosity >= CURIOSITY_THRESHOLD
  ) {
    newEvents.push({
      type: "curiosity-threshold",
      timestamp: now,
      metadata: {
        value: memory.relationship.curiosity,
        threshold: CURIOSITY_THRESHOLD,
      },
    });
  }

  // 无新增 → 返回原对象（引用不变，调用方可安全比较）
  if (newEvents.length === 0) {
    return memory;
  }

  // 有新增 → 不可变更新：合并 events 数组
  return {
    ...memory,
    milestones: {
      ...memory.milestones,
      events: [...(existingEvents ?? []), ...newEvents],
    },
  };
}
