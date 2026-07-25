/**
 * Anthropic Provider 实现（Phase 9.3 → 9.5 重构）。
 *
 * 使用原生 fetch 调用 Anthropic API：
 *   POST {baseURL}/messages
 *
 * 设计原则：
 *   - 不新增依赖（原生 fetch）
 *   - 零硬编码 model / baseURL / apiKey —— 全部来自 LLMConfig
 *   - API Key 只允许运行时传入，不 localStorage / 不硬编码 / 不写文件
 *   - 错误统一为 LLMError，按状态码分类
 *   - 类型安全，无 any
 *
 * Anthropic 消息格式（与 OpenAI 不同）：
 *   - system 字段单独传（合并所有 system 消息内容）
 *   - messages 为 user/assistant 交替（由 MessageBuilder 构建）
 *   - 响应 content 为数组：[{type:"text", text:"..."}]
 *   - 需要 anthropic-version 头
 *   - 需要 max_tokens（必填字段）
 *
 * Phase 10 调整：
 *   - 移除 generate(systemPrompt, contextPrompt, userMessage) 三参数接口
 *   - 新增 chat(messages) 单参数接口，支持多轮对话历史
 *   - system 内容从 messages 中过滤 system 角色后合并
 *
 * 模型名称、baseURL、apiKey 全部来自 config，Provider 不决定模型。
 */

import type {
  LLMClient,
  LLMConfig,
  LLMMessage,
  LLMProvider,
} from "../types";
import { LLMError } from "../errors";

/** Anthropic API 版本头 */
const ANTHROPIC_VERSION = "2023-06-01";
/** max_tokens 默认值（Anthropic API 必填字段） */
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Anthropic API 请求体。
 *
 * 注意：Anthropic 格式中 system 是独立字段（不在 messages 数组里）。
 */
interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  temperature?: number;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Anthropic API 响应体（仅提取需要的字段）。
 */
interface AnthropicResponseBody {
  content?: Array<{ type: string; text?: string }>;
  error?: {
    type: string;
    message: string;
  };
}

export class AnthropicClient implements LLMClient {
  readonly provider: LLMProvider;

  private readonly config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.provider = config.provider;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    // Phase 10：消费 MessageBuilder 输出的 messages 数组
    // Anthropic 格式特殊：system 单独传，messages 为 user/assistant 交替
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // 合并所有 system 消息内容（MessageBuilder 通常只产 1 条 system）
    const systemBlock = systemMessages
      .map((m) => m.content)
      .filter((s) => s.trim().length > 0)
      .join("\n\n---\n\n");

    const body: AnthropicRequestBody = {
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: systemBlock,
      messages: conversationMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    };

    if (this.config.temperature !== undefined) {
      body.temperature = this.config.temperature;
    }

    let response: Response;
    try {
      response = await fetch(`${this.config.baseURL}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new LLMError(
        "NETWORK_ERROR",
        `Network request failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { provider: this.provider },
      );
    }

    // 状态码分类
    if (response.status === 401 || response.status === 403) {
      throw new LLMError(
        "AUTH_FAILED",
        `Authentication failed (HTTP ${response.status}). Check API Key validity.`,
        { statusCode: response.status, provider: this.provider },
      );
    }
    if (response.status === 429) {
      throw new LLMError(
        "RATE_LIMIT",
        "Rate limit exceeded. Please retry after a moment.",
        { statusCode: response.status, provider: this.provider },
      );
    }
    if (response.status >= 500) {
      throw new LLMError(
        "NETWORK_ERROR",
        `Server error (HTTP ${response.status}).`,
        { statusCode: response.status, provider: this.provider },
      );
    }
    if (!response.ok) {
      throw new LLMError(
        "INVALID_RESPONSE",
        `Unexpected HTTP status ${response.status}.`,
        { statusCode: response.status, provider: this.provider },
      );
    }

    // 解析响应
    let parsed: AnthropicResponseBody;
    try {
      parsed = (await response.json()) as AnthropicResponseBody;
    } catch (err) {
      throw new LLMError(
        "INVALID_RESPONSE",
        `Failed to parse response JSON: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { provider: this.provider },
      );
    }

    if (parsed.error) {
      throw new LLMError(
        "INVALID_RESPONSE",
        `API error: ${parsed.error.message} (type: ${parsed.error.type})`,
        { provider: this.provider },
      );
    }

    const textBlocks = parsed.content?.filter((c) => c.type === "text") ?? [];
    const text = textBlocks.map((c) => c.text ?? "").join("");

    if (text.length === 0) {
      throw new LLMError(
        "INVALID_RESPONSE",
        "Response contained no text content.",
        { provider: this.provider },
      );
    }

    return text;
  }
}
