/**
 * OpenAI Compatible Provider（Phase 9.4 → 9.5 重构）。
 *
 * 统一实现所有 OpenAI 兼容 API：
 *   OpenRouter / Agnes / OpenAI / DeepSeek / SiliconFlow / Groq / Together AI / NVIDIA NIM
 *   以及任何 OpenAI Compatible Gateway。
 *
 * 全部使用同一份代码，只需运行时配置不同的 baseURL + apiKey + model。
 *
 * 设计原则：
 *   - 不新增依赖（原生 fetch）
 *   - 零硬编码 model / baseURL / apiKey —— 全部来自 LLMConfig
 *   - 自定义 headers 全部透传，不过滤、不覆盖
 *   - 支持 timeout（默认 60000ms）
 *   - 支持 retry（仅针对 429 / 500 / 502 / 503 / 504）
 *   - 错误统一为 LLMError
 *   - 类型安全，无 any
 *
 * Phase 9.5 调整：
 *   - provider 标识从 config.provider 读取（不再通过构造参数传入）
 *   - 支持多平台标识（openai / openrouter / deepseek / agnes 等）
 *   - 平台标识仅用于日志与错误追溯，不影响请求格式
 *
 * Phase 9.6.5 调整：
 *   - retry 扁平化为 config.retryMaxAttempts / config.retryDelay
 *   - 配置可序列化，不再使用嵌套对象
 *   - 工厂改为按 protocol 路由，本类对应 "openai-compatible"
 *
 * Phase 10 调整：
 *   - 移除 generate(systemPrompt, contextPrompt, userMessage) 三参数接口
 *   - 新增 chat(messages) 单参数接口，支持多轮对话历史
 *   - messages 数组直接透传到 OpenAI API（system + user/assistant 交替）
 *
 * 请求格式（OpenAI 标准）：
 *   POST {baseURL}/chat/completions
 *   Headers: Authorization: Bearer {apiKey}, Content-Type: application/json, + config.headers
 *   Body: { model, temperature?, max_tokens?, messages: [{system},{user},{assistant},...] }
 *
 * 响应解析：choices[0].message.content
 */

import type { LLMClient, LLMConfig, LLMMessage, LLMProvider } from "../types";
import { LLMError } from "../errors";

/** 默认请求超时（毫秒），config.timeout 未提供时使用 */
const DEFAULT_TIMEOUT_MS = 60000;

/** 触发自动重试的 HTTP 状态码 */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** 默认重试次数（config.retryMaxAttempts 未提供时使用） */
const DEFAULT_RETRY_MAX_ATTEMPTS = 1;

/** 默认重试间隔（毫秒，config.retryDelay 未提供时使用） */
const DEFAULT_RETRY_DELAY = 1000;

/**
 * OpenAI 兼容请求体。
 */
interface ChatCompletionRequestBody {
  model: string;
  temperature?: number;
  max_tokens?: number;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

/**
 * OpenAI 兼容响应体（仅提取需要的字段）。
 */
interface ChatCompletionResponseBody {
  choices?: Array<{
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  error?: {
    type: string;
    message: string;
  };
}

/**
 * 带超时的 fetch 封装。
 *
 * 使用 AbortController 实现，超时后中止请求并抛 NETWORK_ERROR。
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new LLMError(
        "NETWORK_ERROR",
        `Request timed out after ${timeoutMs}ms.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 延迟工具。
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OpenAI Compatible Client。
 *
 * 适用于所有 OpenAI 格式兼容的 API 端点。
 * Provider 只负责发送 config.model，不决定模型名称。
 *
 * provider 标识从 config.provider 读取，用于日志与错误追溯。
 */
export class OpenAICompatibleClient implements LLMClient {
  readonly provider: LLMProvider;

  private readonly config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.provider = config.provider;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    // Phase 10：直接消费 MessageBuilder 输出的 messages 数组
    // 支持多轮对话历史（system + user/assistant 交替）
    const body: ChatCompletionRequestBody = {
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (this.config.temperature !== undefined) {
      body.temperature = this.config.temperature;
    }
    if (this.config.maxTokens !== undefined) {
      body.max_tokens = this.config.maxTokens;
    }

    // 构建请求头：标准头 + 自定义头（全透传，不过滤不覆盖）
    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${this.config.apiKey}`,
    };
    if (this.config.headers) {
      Object.assign(headers, this.config.headers);
    }

    const timeoutMs = this.config.timeout ?? DEFAULT_TIMEOUT_MS;
    const retryMaxAttempts =
      this.config.retryMaxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS;
    const retryDelay = this.config.retryDelay ?? DEFAULT_RETRY_DELAY;
    const url = `${this.config.baseURL}/chat/completions`;

    // 重试循环
    let lastError: LLMError | null = null;
    for (let attempt = 0; attempt <= retryMaxAttempts; attempt++) {
      if (attempt > 0) {
        await delay(retryDelay);
      }

      let response: Response;
      try {
        response = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          },
          timeoutMs,
        );
      } catch (err) {
        // fetch 抛错 = 网络层错误（含超时）
        const networkErr =
          err instanceof LLMError
            ? err
            : new LLMError(
                "NETWORK_ERROR",
                `Network request failed: ${
                  err instanceof Error ? err.message : String(err)
                }`,
                { provider: this.provider },
              );
        lastError = networkErr;
        continue; // 网络错误也重试
      }

      // 可重试状态码
      if (RETRYABLE_STATUS.has(response.status)) {
        lastError = new LLMError(
          response.status === 429 ? "RATE_LIMIT" : "NETWORK_ERROR",
          response.status === 429
            ? "Rate limit exceeded. Retrying..."
            : `Server error (HTTP ${response.status}). Retrying...`,
          { statusCode: response.status, provider: this.provider },
        );
        continue;
      }

      // 不可重试错误
      if (response.status === 401 || response.status === 403) {
        throw new LLMError(
          "AUTH_FAILED",
          `Authentication failed (HTTP ${response.status}). Check API Key validity.`,
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
      let parsed: ChatCompletionResponseBody;
      try {
        parsed = (await response.json()) as ChatCompletionResponseBody;
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

      const content = parsed.choices?.[0]?.message?.content;
      if (!content || content.length === 0) {
        throw new LLMError(
          "INVALID_RESPONSE",
          "Response contained no text content.",
          { provider: this.provider },
        );
      }

      return content;
    }

    // 重试耗尽
    throw (
      lastError ??
      new LLMError("NETWORK_ERROR", "Request failed after retries.", {
        provider: this.provider,
      })
    );
  }
}
