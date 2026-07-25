/**
 * Response 数据模型（Phase 8.7）。
 *
 * 定位：角色响应的统一输出结构。
 *   - simulateResponse 返回此结构
 *   - 未来真实 AI API 返回也应映射为此结构
 *
 * 设计原则：
 *   - 纯数据结构，不接 AI、不渲染
 *   - 字段 camelCase，与现有类型一致
 *   - 类型安全，无 any
 *
 * Phase 8.7 仅建立模拟响应：
 *   - 不接 AI API
 *   - 不修改 Conversation UI
 *   - 不修改 Library / Memory / Persona / Context Builder / Prompt Builder
 */

/**
 * 响应来源角色。
 *
 * 当前仅 snape，预留扩展其他角色。
 */
export type ResponseRole = "snape" | "system";

/**
 * 响应使用的上下文摘要。
 *
 * 用于调试与验证：
 *   - persona 是否影响语气
 *   - memory 是否被引用
 *   - archive 是否正确关联
 */
export interface ContextUsed {
  /** 响应中引用的 archive id 列表 */
  archives: string[];
  /** 响应中引用的 memory id 列表 */
  memories: string[];
}

/**
 * 角色响应。
 *
 * 由 responseSimulator.simulateResponse 生成。
 * 未来 AI API 返回也应映射为此结构。
 */
export interface CharacterResponse {
  /** 响应角色 */
  role: ResponseRole;
  /** 响应正文 */
  content: string;
  /** 该响应使用了哪些上下文（调试 / 验证用） */
  contextUsed: ContextUsed;
}
