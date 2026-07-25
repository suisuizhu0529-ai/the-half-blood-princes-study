/**
 * useLLMConfig hook（Phase 11）。
 *
 * 定位：LLM 配置的 React 状态管理层。
 *   - 包装 store 层（localStorage）为响应式 hook
 *   - 表单编辑用 draft 状态（未保存不写 localStorage）
 *   - Save 时持久化，Reset 时清空
 *
 * 设计原则：
 *   - 不依赖任何 Provider / Client
 *   - 不修改 ConversationEngine
 *   - 类型安全，无 any
 */

import { useCallback, useState } from "react";
import type { LLMProvider } from "@/services/llm/types";
import {
  loadLLMSettings,
  saveLLMSettings,
  clearLLMSettings,
  type LLMSettingsConfig,
} from "@/store/llmConfig";

/**
 * LLM 配置 hook。
 *
 * 返回：
 *   - draft：当前编辑中的配置（未保存）
 *   - saved：已持久化的配置快照
 *   - setField：更新 draft 中某个字段
 *   - replaceDraft：整体替换 draft
 *   - save：把 draft 持久化到 localStorage
 *   - reset：清空 localStorage + draft（全部置空，不恢复默认）
 */
export function useLLMConfig() {
  const [draft, setDraft] = useState<LLMSettingsConfig>(loadLLMSettings);
  const [saved, setSaved] = useState<LLMSettingsConfig>(loadLLMSettings);

  /** 更新 draft 中单个字段 */
  const setField = useCallback(
    <K extends keyof LLMSettingsConfig>(
      key: K,
      value: LLMSettingsConfig[K],
    ) => {
      setDraft((prev) => {
        // undefined 值从对象中移除，保持 draft 干净
        if (value === undefined || value === "") {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: value };
      });
    },
    [],
  );

  /** 整体替换 draft（用于 Reset 清空） */
  const replaceDraft = useCallback((next: LLMSettingsConfig) => {
    setDraft(next);
  }, []);

  /** 把 draft 持久化到 localStorage */
  const save = useCallback(() => {
    saveLLMSettings(draft);
    setSaved({ ...draft });
  }, [draft]);

  /** 清空 localStorage + draft（全部置空，不恢复默认） */
  const reset = useCallback(() => {
    clearLLMSettings();
    setDraft({});
    setSaved({});
  }, []);

  return {
    draft,
    saved,
    setField,
    replaceDraft,
    save,
    reset,
  };
}

/** Provider 选项（仅用于 UI 下拉框显示） */
export const LLM_PROVIDER_OPTIONS: ReadonlyArray<{
  value: LLMProvider;
  label: string;
  description: string;
}> = [
  { value: "openrouter", label: "OpenRouter", description: "OpenAI 兼容协议" },
  { value: "agnes", label: "Agnes", description: "OpenAI 兼容协议" },
  { value: "openai", label: "OpenAI", description: "OpenAI 兼容协议" },
  { value: "deepseek", label: "DeepSeek", description: "OpenAI 兼容协议" },
  { value: "anthropic", label: "Anthropic", description: "Anthropic 原生协议" },
];
