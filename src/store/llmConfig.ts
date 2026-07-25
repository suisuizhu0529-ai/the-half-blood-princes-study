/**
 * LLM Config Store（Phase 11）。
 *
 * 定位：LLM 配置的持久化层（localStorage）。
 *   - 与 useSettings（语音/阅读/视觉偏好）分离，独立 key 管理
 *   - 所有字段可选（用户可能未配置）
 *   - 不做任何校验，原样保存（headers JSON 由 UI 层解析）
 *
 * 设计原则：
 *   - 纯函数，无副作用（除 localStorage 读写）
 *   - 不依赖任何 Provider / Client / RuntimeConfig
 *   - 类型安全，无 any
 *   - 不修改 src/config/llm.ts（RuntimeConfig 层保持不变）
 *
 * localStorage key：prince-llm-config（遵循项目 prince- 前缀惯例）
 *
 * 后续（不在本阶段范围）：
 *   - RuntimeConfig 可新增 LocalStorageRuntimeConfigProvider 从此 store 读取
 *   - 当前 ConversationEngine 仍从 env 读取，本 store 仅 UI 编辑用
 */

import type { LLMProvider } from "@/services/llm/types";

/**
 * LLM 配置（UI 编辑用，所有字段可选）。
 *
 * 与 LLMConfig 的区别：
 *   - 所有字段可选（用户未配置时为 undefined）
 *   - 不包含 protocol（由 provider 推导，不由用户填写）
 *   - headers 已解析为对象（不是 JSON 字符串）
 */
export interface LLMSettingsConfig {
  /** Provider 平台标识 */
  provider?: LLMProvider;
  /** API 端点 */
  baseURL?: string;
  /** API Key（明文存储在 localStorage，与 env 行为一致） */
  apiKey?: string;
  /** 模型名（由用户填写，不内置任何默认模型） */
  model?: string;
  /** 采样温度（0-2） */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 请求超时（毫秒） */
  timeout?: number;
  /** 重试最大次数（仅 429/5xx） */
  retryMaxAttempts?: number;
  /** 重试间隔（毫秒） */
  retryDelay?: number;
  /** 自定义请求头（已解析对象，全透传） */
  headers?: Record<string, string>;
}

/** localStorage key */
const STORAGE_KEY = "prince-llm-config";

/**
 * 从 localStorage 读取 LLM 配置。
 *
 * 解析失败或未配置时返回空对象（所有字段 undefined）。
 */
export function loadLLMSettings(): LLMSettingsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<LLMSettingsConfig>;
    return { ...parsed };
  } catch {
    return {};
  }
}

/**
 * 保存 LLM 配置到 localStorage。
 *
 * 原样保存，不做任何校验。
 */
export function saveLLMSettings(config: LLMSettingsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * 清空 LLM 配置（移除 localStorage key）。
 *
 * Reset 按钮调用此函数。
 * 不恢复任何默认值，全部清空。
 */
export function clearLLMSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently ignore
  }
}
