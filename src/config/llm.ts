/**
 * LLM Runtime Config（Phase 9.6 → 9.6.5 重构）。
 *
 * 定位：运行时 LLM 配置加载层。
 *   - 通过 RuntimeConfigProvider 抽象解耦配置来源与 LLM Client
 *   - 默认实现 EnvRuntimeConfigProvider 从 Vite 环境变量读取
 *   - 未来可新增 LocalStorage / Settings / Remote 等实现，无需修改任何 LLM Client
 *   - 不硬编码任何 apiKey / baseURL / model
 *   - 不持久化、不 localStorage（apiKey 只在内存中）
 *   - 类型安全，无 any
 *
 * Phase 9.6.5 架构变化：
 *   - 移除独立的 loadLLMConfig() / createLLMClientFromEnv() 函数
 *   - 新增 RuntimeConfigProvider 接口（抽象层，不依赖 import.meta.env）
 *   - 新增 EnvRuntimeConfigProvider 类（默认实现，从 Vite env 读取）
 *   - 调用方只依赖 RuntimeConfigProvider 接口，可自由替换实现
 *   - Provider 与 Protocol 解耦：EnvRuntimeConfigProvider 内部维护映射表
 *
 * 职责链（保持单一）：
 *   RuntimeConfigProvider → LLMConfig → createLLMClient() → LLMClient
 *
 * 设计原则：
 *   - ConversationEngine 不再关心任何配置细节
 *   - 切换配置来源只需替换 RuntimeConfigProvider 实现
 *   - 配置缺失时优雅降级（回退到本地模拟器）
 *   - 所有字段均为运行时提供，构建产物中不内置任何密钥
 *
 * 环境变量约定（.env.local）：
 *   必填：
 *     VITE_LLM_PROVIDER     openai | anthropic | openrouter | deepseek | agnes
 *     VITE_LLM_API_KEY      平台 API Key
 *     VITE_LLM_BASE_URL     API 端点（如 https://openrouter.ai/api/v1）
 *     VITE_LLM_MODEL        模型名（由用户运行时配置，不硬编码）
 *   可选：
 *     VITE_LLM_TEMPERATURE            采样温度（0-2）
 *     VITE_LLM_MAX_TOKENS             最大 token 数
 *     VITE_LLM_TIMEOUT                请求超时（毫秒，默认 60000）
 *     VITE_LLM_HEADERS_JSON           自定义请求头（JSON 字符串，全透传）
 *     VITE_LLM_RETRY_MAX_ATTEMPTS     重试次数（仅 429/5xx）
 *     VITE_LLM_RETRY_DELAY            重试间隔（毫秒）
 *   注意：protocol 不需要环境变量，由 provider 自动推导
 *
 * 用法：
 *   const configProvider: RuntimeConfigProvider = new EnvRuntimeConfigProvider();
 *   const config = configProvider.loadLLMConfig();
 *   if (config) {
 *     const client = createLLMClient(config);
 *     const engine = new ConversationEngine({ llmClient: client });
 *   } else {
 *     // 配置缺失 → 使用默认模拟器
 *     const engine = new ConversationEngine();
 *   }
 */

import type {
  LLMClient,
  LLMConfig,
  LLMProvider,
  LLMProtocol,
} from "@/services/llm/types";
import { createLLMClient } from "@/services/llm/client";
import { loadLLMSettings } from "@/store/llmConfig";

/**
 * Runtime 配置提供者抽象。
 *
 * 解耦 LLM 配置来源与 LLM Client 实现。
 * 调用方只依赖此接口，不感知配置来自 env / localStorage / remote 等何处。
 *
 * 实现示例：
 *   - EnvRuntimeConfigProvider（默认，从 Vite env 读取）
 *   - LocalStorageRuntimeConfigProvider（未来）
 *   - SettingsRuntimeConfigProvider（未来，UI 配置）
 *   - RemoteRuntimeConfigProvider（未来，远程下发）
 *
 * 新增实现时，无需修改任何 LLM Client 或 createLLMClient 工厂。
 * 只需实现此接口，返回完整的 LLMConfig（含 provider + protocol）。
 */
export interface RuntimeConfigProvider {
  /**
   * 加载 LLM 配置。
   *
   * @returns 完整的 LLMConfig，或 null（配置缺失时，调用方回退到模拟器）
   */
  loadLLMConfig(): LLMConfig | null;
}

/**
 * Provider 平台 → Protocol 协议映射表。
 *
 * 此映射由 EnvRuntimeConfigProvider 内部维护，是"环境变量来源"的实现细节。
 * 未来其他 RuntimeConfigProvider 实现可以自行决定 provider / protocol 的对应关系，
 * 甚至可以让用户在 UI 上独立选择 protocol。
 *
 * 当前映射（Provider 不决定协议，但环境变量层知道二者关系）：
 *   openai / openrouter / deepseek / agnes → openai-compatible
 *   anthropic                              → anthropic
 */
const PROVIDER_PROTOCOL_MAP: ReadonlyMap<LLMProvider, LLMProtocol> = new Map([
  ["openai", "openai-compatible"],
  ["openrouter", "openai-compatible"],
  ["deepseek", "openai-compatible"],
  ["agnes", "openai-compatible"],
  ["anthropic", "anthropic"],
]);

/**
 * 合法的 Provider 平台标识集合。
 *
 * 与 LLMProvider 联合类型保持同步，用于运行时校验环境变量。
 */
const VALID_PROVIDERS: ReadonlySet<string> = new Set([
  "openai",
  "anthropic",
  "openrouter",
  "deepseek",
  "agnes",
]);

/**
 * 解析 Provider 平台标识。
 *
 * 大小写不敏感，非法值返回 null。
 */
function parseProvider(raw: string | undefined): LLMProvider | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  return VALID_PROVIDERS.has(lower) ? (lower as LLMProvider) : null;
}

/**
 * 根据 Provider 推导 Protocol。
 *
 * EnvRuntimeConfigProvider 内部使用，将平台标识映射为协议标识。
 * 未知 Provider 返回 null。
 */
function resolveProtocol(provider: LLMProvider): LLMProtocol | null {
  return PROVIDER_PROTOCOL_MAP.get(provider) ?? null;
}

/**
 * 解析整数环境变量。
 *
 * 非数字或空字符串返回 undefined。
 */
function parseIntValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 解析浮点数环境变量。
 *
 * 非数字或空字符串返回 undefined。
 */
function parseFloatValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 解析 headers JSON 字符串。
 *
 * 接受格式：'{"HTTP-Referer":"...","X-Title":"..."}'
 * 非对象 / 解析失败 / 空对象返回 undefined。
 * 仅保留 string -> string 的键值对。
 *
 * 注意：此函数是 EnvRuntimeConfigProvider 的内部实现细节，
 * LLMConfig.headers 字段类型永远只是 Record<string, string>，
 * 不绑定任何来源（env / localStorage / remote）。
 */
function parseHeadersJson(
  raw: string | undefined,
): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}

/**
 * EnvRuntimeConfigProvider：从 Vite 环境变量读取 LLM 配置。
 *
 * 这是 RuntimeConfigProvider 的默认实现。
 * 其他实现（LocalStorage / Settings / Remote）可在未来新增，无需修改任何 LLM Client。
 *
 * 职责：
 *   - 读取 VITE_LLM_* 系列环境变量
 *   - 校验必填字段，缺失时返回 null（调用方回退到模拟器）
 *   - 根据 Provider 自动推导 Protocol（通过 PROVIDER_PROTOCOL_MAP）
 *   - 解析可选字段（temperature / maxTokens / timeout / headers / retry*）
 *
 * 注意：本类是唯一依赖 import.meta.env 的地方。
 * 替换为其他 RuntimeConfigProvider 实现后，整个 LLM 层不再接触 env。
 */
export class EnvRuntimeConfigProvider implements RuntimeConfigProvider {
  loadLLMConfig(): LLMConfig | null {
    const env = import.meta.env;

    const provider = parseProvider(env.VITE_LLM_PROVIDER);
    const apiKey = env.VITE_LLM_API_KEY?.trim();
    const baseURL = env.VITE_LLM_BASE_URL?.trim();
    const model = env.VITE_LLM_MODEL?.trim();

    // 必填项任一缺失 → 返回 null（调用方回退到模拟器）
    if (!provider || !apiKey || !baseURL || !model) {
      return null;
    }

    // 根据 Provider 推导 Protocol
    const protocol = resolveProtocol(provider);
    if (!protocol) {
      return null;
    }

    const config: LLMConfig = {
      provider,
      protocol,
      apiKey,
      baseURL,
      model,
    };

    // 可选字段
    const temperature = parseFloatValue(env.VITE_LLM_TEMPERATURE);
    if (temperature !== undefined) {
      config.temperature = temperature;
    }

    const maxTokens = parseIntValue(env.VITE_LLM_MAX_TOKENS);
    if (maxTokens !== undefined) {
      config.maxTokens = maxTokens;
    }

    const timeout = parseIntValue(env.VITE_LLM_TIMEOUT);
    if (timeout !== undefined) {
      config.timeout = timeout;
    }

    const headers = parseHeadersJson(env.VITE_LLM_HEADERS_JSON);
    if (headers) {
      config.headers = headers;
    }

    // retry 扁平化字段（独立提供，无需配对）
    const retryMaxAttempts = parseIntValue(env.VITE_LLM_RETRY_MAX_ATTEMPTS);
    if (retryMaxAttempts !== undefined) {
      config.retryMaxAttempts = retryMaxAttempts;
    }

    const retryDelay = parseIntValue(env.VITE_LLM_RETRY_DELAY);
    if (retryDelay !== undefined) {
      config.retryDelay = retryDelay;
    }

    return config;
  }
}

/**
 * 从环境变量创建 LLM Client（便捷封装）。
 *
 * Phase 9.7 新增：供 ConversationEngine 构造函数自动调用。
 *
 * 内部流程：
 *   EnvRuntimeConfigProvider.loadLLMConfig()
 *     → LLMConfig | null
 *     → createLLMClient(config) | undefined
 *
 * 配置缺失（provider / apiKey / baseURL / model 任一为空）时返回 null，
 * 调用方应将 null 视为"使用 Simulator"。
 *
 * @returns LLMClient 实例，或 null（配置缺失时）
 */
export function createLLMClientFromEnv(): LLMClient | null {
  const provider = new EnvRuntimeConfigProvider();
  const config = provider.loadLLMConfig();
  if (!config) return null;
  return createLLMClient(config);
}

/**
 * LocalStorageRuntimeConfigProvider：从 localStorage 读取 LLM 配置。
 *
 * Phase 12 新增：让 Settings 页面保存的配置真正生效。
 *
 * 数据来源：localStorage key "prince-llm-config"
 *   - 由 src/store/llmConfig.ts 管理
 *   - 由 src/hooks/useLLMConfig.ts 的 save() 写入
 *   - 数据结构为 LLMSettingsConfig（所有字段可选，不含 protocol）
 *
 * 职责：
 *   - 读取 localStorage 的 LLMSettingsConfig
 *   - 适配为 LLMConfig（adapter 层）：补 protocol、校验必填、剔除空值
 *   - protocol 仍由 provider 推导，UI 不保存 protocol
 *   - 必填字段缺失返回 null（调用方回退到模拟器）
 *
 * 设计原则：
 *   - 不修改 src/store/llmConfig.ts（store 层保持原样）
 *   - 不修改 LLMClient 接口
 *   - 不让 UI 保存 protocol
 */
export class LocalStorageRuntimeConfigProvider
  implements RuntimeConfigProvider
{
  loadLLMConfig(): LLMConfig | null {
    const settings = loadLLMSettings();

    // 必填字段校验（trim 后非空）
    const provider = settings.provider;
    const apiKey = settings.apiKey?.trim();
    const baseURL = settings.baseURL?.trim();
    const model = settings.model?.trim();

    if (!provider || !apiKey || !baseURL || !model) {
      return null;
    }

    // 根据 Provider 推导 Protocol
    const protocol = resolveProtocol(provider);
    if (!protocol) {
      return null;
    }

    const config: LLMConfig = {
      provider,
      protocol,
      apiKey,
      baseURL,
      model,
    };

    // 可选字段（仅当有值时附加）
    if (settings.temperature !== undefined) {
      config.temperature = settings.temperature;
    }
    if (settings.maxTokens !== undefined) {
      config.maxTokens = settings.maxTokens;
    }
    if (settings.timeout !== undefined) {
      config.timeout = settings.timeout;
    }
    if (settings.retryMaxAttempts !== undefined) {
      config.retryMaxAttempts = settings.retryMaxAttempts;
    }
    if (settings.retryDelay !== undefined) {
      config.retryDelay = settings.retryDelay;
    }
    if (settings.headers) {
      config.headers = settings.headers;
    }

    return config;
  }
}

/**
 * 从运行时配置创建 LLM Client（便捷封装，带优先级 fallback + Cache）。
 *
 * Phase 12 新增：ConversationEngine 构造函数调用此函数。
 * Phase 12.5 新增：RuntimeClientCache，相同配置复用同一个 Client 实例。
 *
 * 优先级顺序：
 *   1. localStorage 配置（Settings 页面保存的）
 *   2. env 配置（VITE_LLM_* 环境变量）
 *   3. 都不存在 → 返回 null
 *
 * Cache 行为：
 *   - 配置未变化 → 返回 cachedClient（不重新 new）
 *   - 配置变化 → 重新 createLLMClient，更新 cache
 *   - 配置为空 → 不缓存，直接返回 null
 *   - createLLMClient 失败 → 不缓存失败对象，下次仍允许重新创建
 *
 * 配置缺失时返回 null，不抛错、不 console.error。
 * ConversationEngine 应将 null 视为"使用 Simulator"。
 *
 * @returns LLMClient 实例，或 null（配置缺失时）
 */

/**
 * 规范化 LLMConfig 为稳定字符串，用作 Cache Key。
 *
 * 按 key 排序后 JSON.stringify，保证字段顺序不影响比较。
 * 比较的字段：
 *   provider / protocol / baseURL / apiKey / model
 *   / temperature / maxTokens / timeout
 *   / retryMaxAttempts / retryDelay / headers
 *
 * headers 内部也按 key 排序，保证
 *   {"X-Title":"a","HTTP-Referer":"b"} 与 {"HTTP-Referer":"b","X-Title":"a"}
 * 产生相同的 Cache Key。
 */
function buildConfigCacheKey(config: LLMConfig): string {
  // headers 内部按 key 排序（如有）
  let normalizedHeaders: Record<string, string> | undefined;
  if (config.headers) {
    const headerKeys = Object.keys(config.headers).sort();
    normalizedHeaders = {};
    for (const hk of headerKeys) {
      normalizedHeaders[hk] = config.headers[hk];
    }
  }

  const normalized = {
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    headers: normalizedHeaders,
    maxTokens: config.maxTokens,
    model: config.model,
    provider: config.provider,
    protocol: config.protocol,
    retryDelay: config.retryDelay,
    retryMaxAttempts: config.retryMaxAttempts,
    temperature: config.temperature,
    timeout: config.timeout,
  };
  // 按 key 排序（Object.keys 已按字母序，但保险起见显式排序）
  const sortedKeys = Object.keys(normalized).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    sorted[k] = (normalized as Record<string, unknown>)[k];
  }
  return JSON.stringify(sorted);
}

/** Cache：缓存的配置 key + 对应的 Client 实例 */
interface RuntimeClientCache {
  key: string;
  client: LLMClient;
}

let runtimeClientCache: RuntimeClientCache | null = null;

/**
 * 加载运行时 LLMConfig（按优先级：localStorage > env）。
 *
 * 抽取为内部函数，供 createRuntimeLLMClient 复用。
 */
function loadRuntimeLLMConfig(): LLMConfig | null {
  // 1. 优先 localStorage
  const localStorageProvider = new LocalStorageRuntimeConfigProvider();
  const localConfig = localStorageProvider.loadLLMConfig();
  if (localConfig) return localConfig;

  // 2. fallback env
  const envProvider = new EnvRuntimeConfigProvider();
  const envConfig = envProvider.loadLLMConfig();
  if (envConfig) return envConfig;

  // 3. 都不存在
  return null;
}

export function createRuntimeLLMClient(): LLMClient | null {
  const config = loadRuntimeLLMConfig();

  // 配置为空 → 不缓存，直接返回 null
  if (!config) {
    return null;
  }

  // 生成稳定 Cache Key
  const key = buildConfigCacheKey(config);

  // Cache Hit：配置未变化 → 返回已缓存的 Client
  if (runtimeClientCache && runtimeClientCache.key === key) {
    return runtimeClientCache.client;
  }

  // Cache Miss：配置变化 → 重新创建 Client
  // 注意：createLLMClient 失败会 throw，不缓存失败对象，下次仍允许重新创建
  const client = createLLMClient(config);

  // 更新 Cache
  runtimeClientCache = { key, client };

  return client;
}

/**
 * 清除 Runtime LLM Client Cache。
 *
 * Phase 12.5 新增（本阶段不调用，留给未来）。
 *
 * 使用场景：
 *   - Settings Save 后，调用此函数清除旧 Client
 *   - 下次 createRuntimeLLMClient() 会用新配置重新创建
 *
 * 注意：此函数只清除 Cache，不主动重新创建 Client。
 * 不实现 EventBus / localStorage 监听 / 自动刷新。
 *
 * 设计原则：
 *   - 调用方负责决定何时 invalidate
 *   - Cache 清除后，下次 createRuntimeLLMClient() 自然 Cache Miss
 */
export function invalidateRuntimeLLMClient(): void {
  runtimeClientCache = null;
}
