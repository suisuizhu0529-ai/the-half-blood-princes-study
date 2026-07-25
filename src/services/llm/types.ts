/**
 * LLM 服务抽象层类型（Phase 9.1）。
 *
 * 定位：统一 LLM 调用接口，屏蔽不同 Provider（OpenAI / Claude / DeepSeek）差异。
 *
 * 设计原则：
 *   - 不保存 API Key（Key 由调用方在运行时传入，不持久化）
 *   - 不新增依赖（Provider 仅接口占位，未来接入真实 SDK 时填充实现）
 *   - 可切换 Provider（通过 createLLMClient(config) 工厂切换，config.provider 决定实现）
 *   - 类型安全，无 any
 *
 * Phase 9.1 仅建立抽象层：
 *   - 不接具体 API
 *   - 不修改 Conversation UI
 *   - Provider 为占位实现（抛 NOT_IMPLEMENTED）
 */

/**
 * 支持的 LLM Provider（平台标识，非协议标识）。
 *
 * Phase 9.5 调整：
 *   - provider 表示"平台"而非"协议"
 *   - 所有 OpenAI 兼容平台（openai / openrouter / deepseek / agnes 等）
 *     底层共用 OpenAICompatibleClient，仅 provider 标识不同
 *   - anthropic 走原生 Anthropic 格式
 *
 * Phase 9.6.5 调整：
 *   - Provider 与 Protocol 彻底解耦
 *   - Provider 只表示平台，不再决定协议
 *   - 协议由 LLMProtocol 表示，决定走哪个 Client 实现
 *
 * 平台标识的用途：
 *   - 日志区分（一眼看出是 OpenRouter 还是 DeepSeek）
 *   - Analytics 数据聚合
 *   - 配置文件可读性
 *   - UI 下拉框直接显示平台名
 *
 * 新增平台时，只需在此联合类型追加一个字面量，
 * 并在 RuntimeConfigProvider 实现中维护 Provider → Protocol 映射。
 */
export type LLMProvider =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "deepseek"
  | "agnes";

/**
 * 支持的 LLM Protocol（协议标识）。
 *
 * Phase 9.6.5 新增：Provider 与 Protocol 解耦。
 *
 * 协议决定走哪个 Client 实现：
 *   - openai-compatible → OpenAICompatibleClient
 *     统一适配 OpenRouter / Agnes / OpenAI / DeepSeek / SiliconFlow / Groq 等
 *   - anthropic         → AnthropicClient
 *     Anthropic 原生格式（POST /messages, x-api-key + anthropic-version）
 *
 * 与 Provider 的关系：
 *   - Provider 表示"平台"（openrouter / openai / agnes / deepseek / anthropic）
 *   - Protocol 表示"协议"（仅两种）
 *   - 一个 Protocol 可对应多个 Provider（如 openai-compatible 对应 4 个平台）
 *   - Provider 不决定 Protocol；由 RuntimeConfigProvider 负责返回二者
 */
export type LLMProtocol = "openai-compatible" | "anthropic";

/**
 * 消息角色。
 *
 * 与 OpenAI / Anthropic 通用消息格式对齐。
 */
export type LLMMessageRole = "system" | "user" | "assistant";

/**
 * 单条消息。
 */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

/**
 * LLM 请求参数。
 *
 * 由 PromptBuilder 生成的三段式 prompt + 用户消息组成。
 */
export interface LLMRequest {
  /** 系统提示词（角色约束） */
  systemPrompt: string;
  /** 场景上下文提示词 */
  contextPrompt: string;
  /** 用户输入消息 */
  userMessage: string;
  /** 模型名称（可选，各 Provider 有默认值） */
  model?: string;
  /** 温度（可选，默认各 Provider 自定） */
  temperature?: number;
  /** 最大 token 数（可选） */
  maxTokens?: number;
}

/**
 * LLM 调用配置。
 *
 * 所有字段均由运行时提供，不硬编码任何默认值。
 * provider / protocol / apiKey / baseURL / model 必填，其余可选。
 *
 * Phase 9.5 调整：
 *   - provider 字段内嵌进 config，createLLMClient 只接收单个 config 参数
 *   - 切换平台只需替换一个配置对象，无需改动业务代码
 *
 * Phase 9.6.5 调整：
 *   - 新增 protocol 字段，与 provider 解耦
 *   - createLLMClient 改为按 protocol 路由（不再按 provider）
 *   - retry 扁平化为 retryMaxAttempts / retryDelay，保持配置可序列化
 *   - headers 类型保持 Record<string, string>，不绑定任何来源
 */
export interface LLMConfig {
  /** Provider 平台标识（仅用于日志 / Analytics / UI 展示） */
  provider: LLMProvider;
  /** Protocol 协议标识（决定走哪个 Client 实现） */
  protocol: LLMProtocol;
  /** API Key（运行时传入，不保存） */
  apiKey: string;
  /** API 端点（必填，运行时配置） */
  baseURL: string;
  /** 模型名称（必填，运行时配置，不硬编码） */
  model: string;
  /** 温度（可选） */
  temperature?: number;
  /** 最大 token 数（可选） */
  maxTokens?: number;
  /** 请求超时（毫秒，可选） */
  timeout?: number;
  /** 自定义请求头（可选，全部透传，不过滤不覆盖） */
  headers?: Record<string, string>;
  /** 重试最大次数（可选，仅针对 429/5xx） */
  retryMaxAttempts?: number;
  /** 重试间隔（毫秒，可选） */
  retryDelay?: number;
}

/**
 * LLM Client 统一接口。
 *
 * 所有 Provider 实现此接口。
 * 调用方通过此接口与 LLM 交互，不感知具体 Provider。
 *
 * Phase 9.6.5 / Phase 10 调整：
 *   - 移除 generate(systemPrompt, contextPrompt, userMessage) 三参数接口
 *   - 新增 chat(messages) 单参数接口，支持多轮对话历史
 *   - 新增可选 chatStream(messages) 流式接口（预留，当前 Provider 不支持）
 *
 * 调用方职责：
 *   1. 用 MessageBuilder 把 PromptContext + 历史构建为 LLMMessage[]
 *   2. 调用 client.chat(messages) 获取响应文本
 *   3. 流式场景调用 client.chatStream?.(messages)，未实现时降级
 */
export interface LLMClient {
  /** Provider 标识（仅用于日志 / Analytics / UI 展示） */
  readonly provider: LLMProvider;

  /**
   * 单轮对话（非流式）。
   *
   * @param messages 完整对话历史
   *                （system + user/assistant 交替，最后一条为当前 user 输入）
   * @returns 生成的响应文本
   * @throws LLMError AUTH_FAILED / RATE_LIMIT / NETWORK_ERROR / INVALID_RESPONSE
   */
  chat(messages: LLMMessage[]): Promise<string>;

  /**
   * 流式对话（预留接口，Phase 12 实现）。
   *
   * 当前所有 Provider 不实现此方法，调用方应检查 `if (client.chatStream)`。
   * 未实现时，调用方可降级为 chat()，或抛 LLMError("NOT_IMPLEMENTED")。
   *
   * @param messages 完整对话历史
   * @returns 异步迭代器，逐 chunk 产出响应文本
   * @throws LLMError NOT_IMPLEMENTED（若 Provider 显式抛出）
   */
  chatStream?(messages: LLMMessage[]): AsyncIterable<string>;
}
