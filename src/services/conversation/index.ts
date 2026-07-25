/**
 * Conversation Service 聚合导出（Phase 9.2）。
 *
 * 提供单一入口访问对话运行时。
 *
 * 用法：
 *   import { ConversationEngine } from "@/services/conversation";
 *   const engine = new ConversationEngine();
 *   const result = await engine.converse({ userMessage: "..." });
 */

export { ConversationEngine } from "./conversationEngine";
export type {
  ConversationRequest,
  ConversationResult,
  ConversationEngineOptions,
} from "./types";
