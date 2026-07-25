/**
 * Conversation Runtime 类型（Phase 9.2）。
 *
 * 定位：ConversationEngine 的输入 / 输出结构。
 *
 * 设计原则：
 *   - 复用已有类型，不复制 interface
 *   - 类型安全，无 any
 *   - 不修改 Library / Memory / Persona / Prompt Builder / UI
 */

import type { CharacterResponse } from "@/types/response";
import type { ConversationState } from "@/types/conversation";
import type { PromptContext } from "@/types/prompt";
import type { RelationshipContext } from "@/types/relationshipContext";

/**
 * 对话请求。
 *
 * 用户输入消息 + 可选的场景触发（archive 或 memory）。
 *   - archiveId 触发 archive 场景上下文
 *   - memoryId  触发 memory 场景上下文
 *   - 两者都省略 → 基础 persona 上下文
 */
export interface ConversationRequest {
  /** 用户输入消息 */
  userMessage: string;
  /** 触发 archive 场景（可选） */
  archiveId?: string;
  /** 触发 memory 场景（可选） */
  memoryId?: string;
}

/**
 * 对话结果。
 *
 * 包含完整链路产物，供 UI 渲染与调试。
 */
export interface ConversationResult {
  /** 角色响应 */
  response: CharacterResponse;
  /** 更新后的对话状态（不可变，调用方应替换旧 state） */
  state: ConversationState;
  /** 本次生成的完整 prompt（调试 / 透明性用） */
  prompt: PromptContext;
}

/**
 * ConversationEngine 构造选项。
 */
export interface ConversationEngineOptions {
  /**
   * LLM Client（可选）。
   *
   * - 提供 → 调用 LLMClient.chat(messages) 获取真实响应（Phase 10）
   * - 不提供 → 回退到本地 responseSimulator（Offline Mode）
   * - LLM 调用失败 → 静默回退到 responseSimulator（不中断对话）
   *
   * 用法：
   *   const configProvider = new EnvRuntimeConfigProvider();
   *   const config = configProvider.loadLLMConfig();
   *   const engine = new ConversationEngine({
   *     llmClient: config ? createLLMClient(config) : undefined,
   *   });
   */
  llmClient?: import("@/services/llm/types").LLMClient;

  /** 初始状态（可选，用于续接会话） */
  initialState?: ConversationState;

  /**
   * RelationshipContext 覆盖（可选，Phase 15.5-G 测试注入）。
   *
   * - 提供 → converse() 跳过 readRelationshipContext()，直接使用此值
   * - 不提供 → 走 production 路径（readRelationshipMemory → readRelationshipContext）
   *
   * 设计要点：
   *   - 直接覆盖 RelationshipContext，不经过 RelationshipMemoryReader
   *   - 不修改 RelationshipMemory schema / Reader / Resolver
   *   - 仅用于 PersonaTest Debug Panel 的真实 LLM 行为测试
   *   - production flow 不受影响（不传入此字段即走原路径）
   *
   * 用法：
   *   const engine = new ConversationEngine({
   *     relationshipContextOverride: testContext,
   *     skipPersistence: true,
   *   });
   */
  relationshipContextOverride?: RelationshipContext;

  /**
   * 跳过持久化（可选，Phase 15.5-G 测试隔离）。
   *
   * - true → converse() 不调用 saveRelationshipMemory()，不污染 localStorage
   * - false / 未提供 → 走 production 路径（正常持久化）
   *
   * 仅用于测试模式，production 不应使用。
   */
  skipPersistence?: boolean;
}
