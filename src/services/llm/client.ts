/**
 * LLM Client 工厂（Phase 9.1 → 9.5 → 9.6.5 重构）。
 *
 * 定位：根据 config.protocol 创建对应的 LLMClient 实例。
 *
 * Phase 9.5 架构：
 *   - provider 字段内嵌进 LLMConfig
 *   - createLLMClient 只接收单个 config 参数
 *   - 切换平台只需替换一个配置对象，无需改动业务代码
 *
 * Phase 9.6.5 架构：
 *   - Provider 与 Protocol 彻底解耦
 *   - 工厂改为 switch(config.protocol) 路由（不再按 provider）
 *   - Provider 仅用于日志 / Analytics，不影响 Client 选择
 *
 * 协议 → Client 映射：
 *   - openai-compatible → OpenAICompatibleClient
 *   - anthropic         → AnthropicClient
 *
 * 所有 baseURL / apiKey / model 均由运行时 LLMConfig 提供。
 *
 * 用法：
 *   const configProvider: RuntimeConfigProvider = new EnvRuntimeConfigProvider();
 *   const config = configProvider.loadLLMConfig();
 *   if (config) {
 *     const client = createLLMClient(config);
 *     const engine = new ConversationEngine({ llmClient: client });
 *   }
 */

import type { LLMClient, LLMConfig } from "./types";
import { OpenAICompatibleClient } from "./providers/openaiCompatible";
import { AnthropicClient } from "./providers/anthropic";

export type {
  LLMClient,
  LLMConfig,
  LLMProvider,
  LLMProtocol,
  LLMRequest,
  LLMMessage,
} from "./types";
export { LLMError } from "./errors";
export type { LLMErrorType } from "./errors";

/**
 * 创建 LLM Client 实例。
 *
 * 根据 config.protocol 选择对应实现：
 *   - openai-compatible → OpenAICompatibleClient（OpenRouter / Agnes / OpenAI / DeepSeek 等）
 *   - anthropic         → AnthropicClient（Anthropic 原生格式）
 *
 * 注意：路由依据是 protocol，不是 provider。
 * Provider 仅作为元数据传递给 Client，用于日志与错误追溯。
 *
 * @param config 完整 LLM 配置（provider / protocol / apiKey / baseURL / model 必填）
 * @throws 若 protocol 不支持
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.protocol) {
    case "openai-compatible":
      return new OpenAICompatibleClient(config);
    case "anthropic":
      return new AnthropicClient(config);
    default: {
      const _exhaustive: never = config.protocol;
      throw new Error(
        `[LLM] Unsupported protocol: ${String(_exhaustive)}`,
      );
    }
  }
}
