/**
 * Conversation State 工具（Phase 8.5）。
 *
 * 定位：ConversationState 的不可变更新方法集合。
 *
 * 设计原则：
 *   - 纯函数，无副作用、无状态（不持有任何模块级变量）
 *   - 不可变更新：所有方法返回新 state，不修改原对象
 *   - 去重：viewedArchives / activatedMemories 重复标记时为 no-op
 *   - 类型安全，无 any
 *
 * Phase 8.5 仅建立状态更新方法：
 *   - 不接 AI
 *   - 不写 localStorage（持久化由调用方决定）
 *   - 不修改 Conversation UI
 */

import type { ConversationState } from "@/types/conversation";
import type { RelationshipStage } from "@/types/persona";
import type { SnapeContext } from "@/types/context";

/**
 * 生成会话唯一标识。
 *
 * 格式：`session-{timestamp}-{random4}`
 * 不依赖 uuid 库，保持零新增依赖。
 */
function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `session-${ts}-${rand}`;
}

/**
 * 创建初始对话状态。
 *
 * 用于一次新会话的开始：
 *   - 新 sessionId
 *   - 空已查看档案 / 已激活记忆
 *   - 关系阶段默认 stranger
 *   - 无 lastContext
 *
 * @param sessionId 可选，传入则用指定 id（测试 / 续接场景）
 */
export function createInitialState(
  sessionId?: string,
): ConversationState {
  return {
    sessionId: sessionId ?? generateSessionId(),
    viewedArchives: [],
    activatedMemories: [],
    relationshipStage: "stranger",
  };
}

/**
 * 标记某 archive 为已查看。
 *
 * 行为：
 *   - 若已存在，返回原 state（no-op，避免无意义新对象）
 *   - 若不存在，返回新 state（追加到末尾）
 *
 * @param state 当前对话状态
 * @param archiveId Library entry id
 */
export function markArchiveViewed(
  state: ConversationState,
  archiveId: string,
): ConversationState {
  if (state.viewedArchives.includes(archiveId)) {
    return state;
  }
  return {
    ...state,
    viewedArchives: [...state.viewedArchives, archiveId],
  };
}

/**
 * 激活某条记忆。
 *
 * 行为：
 *   - 若已激活，返回原 state（no-op）
 *   - 若未激活，返回新 state（追加到末尾）
 *
 * @param state 当前对话状态
 * @param memoryId Memory entry id
 */
export function activateMemory(
  state: ConversationState,
  memoryId: string,
): ConversationState {
  if (state.activatedMemories.includes(memoryId)) {
    return state;
  }
  return {
    ...state,
    activatedMemories: [...state.activatedMemories, memoryId],
  };
}

/**
 * 更新关系阶段。
 *
 * 行为：
 *   - 若新阶段与当前相同，返回原 state（no-op）
 *   - 否则返回新 state
 *
 * 关系阶段不可逆降级：
 *   confidant → trusted-researcher → student → stranger
 *   调用方应自行判断是否允许降级，本方法仅做无脑覆盖。
 *
 * @param state 当前对话状态
 * @param stage 新的关系阶段
 */
export function updateRelationshipStage(
  state: ConversationState,
  stage: RelationshipStage,
): ConversationState {
  if (state.relationshipStage === stage) {
    return state;
  }
  return {
    ...state,
    relationshipStage: stage,
  };
}

/**
 * 更新最近一次构建的 SnapeContext。
 *
 * 用于 AI 对话续接时携带上一轮场景。
 *
 * @param state 当前对话状态
 * @param context 新的 SnapeContext（传 undefined 清空）
 */
export function updateLastContext(
  state: ConversationState,
  context: SnapeContext | undefined,
): ConversationState {
  return {
    ...state,
    lastContext: context,
  };
}
