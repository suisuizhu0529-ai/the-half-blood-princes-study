/**
 * LLM Settings Panel（Phase 11）。
 *
 * 定位：LLM 配置的可视化编辑面板。
 *   - 支持编辑 Provider / BaseURL / APIKey / Model / Temperature
 *     / MaxTokens / Timeout / Retry / Headers
 *   - Test Connection：用当前 draft 创建临时 client，发送最小请求
 *   - Save：持久化 draft 到 localStorage
 *   - Reset：清空所有字段（不恢复默认）
 *
 * 设计原则：
 *   - Dark Academia 视觉风格（parchment / gold / ink）
 *   - 不修改任何 Provider / Client / RuntimeConfig
 *   - Test Connection 不保存配置，仅验证
 *   - 切换 Provider 不自动修改任何字段
 *   - 类型安全，无 any
 *
 * 数据流：
 *   UI draft → Save → localStorage（prince-llm-config）
 *   后续 RuntimeConfig 可从 localStorage 读取（本阶段不实现）
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  FlaskConical,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import Flourish from "@/components/decor/Flourish";
import { useLLMConfig, LLM_PROVIDER_OPTIONS } from "@/hooks/useLLMConfig";
import { createLLMClient } from "@/services/llm/client";
import type {
  LLMConfig,
  LLMMessage,
  LLMProtocol,
  LLMProvider,
} from "@/services/llm/types";
import { LLMError } from "@/services/llm/errors";

/* ------------------------------------------------------------------ */
/*  Provider → Protocol 映射（UI 层内部，不修改 RuntimeConfig）        */
/* ------------------------------------------------------------------ */

const PROVIDER_PROTOCOL_MAP: Record<LLMProvider, LLMProtocol> = {
  openai: "openai-compatible",
  openrouter: "openai-compatible",
  deepseek: "openai-compatible",
  agnes: "openai-compatible",
  anthropic: "anthropic",
};

/* ------------------------------------------------------------------ */
/*  Test Connection 状态                                              */
/* ------------------------------------------------------------------ */

type TestStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

/* ------------------------------------------------------------------ */
/*  Field Label（统一字段标签样式）                                    */
/* ------------------------------------------------------------------ */

interface FieldLabelProps {
  label: string;
  labelZh: string;
  description?: string;
}

function FieldLabel({ label, labelZh, description }: FieldLabelProps) {
  return (
    <div className="mb-2">
      <div className="flex items-baseline gap-2">
        <span className="font-ui text-sm tracking-wide text-ink/80">
          {label}
        </span>
        <span className="font-zh text-[10px] tracking-[0.3em] text-ink/45">
          {labelZh}
        </span>
      </div>
      {description && (
        <p className="mt-0.5 font-serif text-xs italic text-ink/50">
          {description}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Text Input（统一文本框样式）                                       */
/* ------------------------------------------------------------------ */

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "number";
  min?: number;
  max?: number;
  step?: number;
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  step,
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className="w-full rounded-sm border border-gold/30 bg-parchment/40 px-3 py-2 font-ui text-sm text-ink placeholder:text-ink/30 transition-colors focus:border-gold focus:bg-parchment/60 focus:outline-none"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Range Slider（复用 Settings 页面风格）                             */
/* ------------------------------------------------------------------ */

interface RangeSliderProps {
  label: string;
  labelZh: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function RangeSlider({
  label,
  labelZh,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: RangeSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-3">
      <div className="mb-2 flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-ui text-sm tracking-wide text-ink/80">
            {label}
          </span>
          <span className="font-zh text-[10px] tracking-[0.3em] text-ink/45">
            {labelZh}
          </span>
        </div>
        <span className="font-ui text-xs tracking-wider text-gold-soft">
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <div className="relative h-2 w-full">
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-ink/15" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold to-ember"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-y-0 left-0 right-0 z-10 w-full cursor-pointer appearance-none bg-transparent opacity-0"
          style={{ WebkitAppearance: "none" }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-gold bg-parchment shadow-md transition-[left] duration-150"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                        */
/* ------------------------------------------------------------------ */

export default function LLMSettingsPanel() {
  const { draft, setField, save, reset } = useLLMConfig();
  const [showApiKey, setShowApiKey] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [headersText, setHeadersText] = useState<string>(() => {
    if (!draft.headers) return "";
    try {
      return JSON.stringify(draft.headers, null, 2);
    } catch {
      return "";
    }
  });
  const [testStatus, setTestStatus] = useState<TestStatus>({ kind: "idle" });

  /* ---- API Key 复制 ---- */
  const handleCopyApiKey = async () => {
    if (!draft.apiKey) return;
    try {
      await navigator.clipboard.writeText(draft.apiKey);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch {
      // clipboard 不可用时静默失败
    }
  };

  /* ---- API Key 清空 ---- */
  const handleClearApiKey = () => {
    setField("apiKey", undefined);
  };

  /* ---- Headers 文本变化（原样保存文本，仅在 Save 时解析） ---- */
  const handleHeadersChange = (text: string) => {
    setHeadersText(text);
    // 实时尝试解析，成功则更新 draft.headers，失败则清空（不阻塞输入）
    if (!text.trim()) {
      setField("headers", undefined);
      return;
    }
    try {
      const parsed = JSON.parse(text) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v === "string") result[k] = v;
        }
        setField("headers", result);
      }
    } catch {
      // JSON 解析失败，不更新 draft.headers（等用户改对再保存）
    }
  };

  /* ---- Test Connection ---- */
  const handleTestConnection = async () => {
    // 校验必填字段
    if (!draft.provider || !draft.baseURL || !draft.apiKey || !draft.model) {
      setTestStatus({
        kind: "error",
        message: "请先填写 Provider / Base URL / API Key / Model 四个必填字段",
      });
      return;
    }

    setTestStatus({ kind: "testing" });

    try {
      // 构建 LLMConfig（含 protocol 推导）
      const config: LLMConfig = {
        provider: draft.provider,
        protocol: PROVIDER_PROTOCOL_MAP[draft.provider],
        apiKey: draft.apiKey,
        baseURL: draft.baseURL,
        model: draft.model,
      };
      if (draft.temperature !== undefined)
        config.temperature = draft.temperature;
      if (draft.maxTokens !== undefined) config.maxTokens = draft.maxTokens;
      if (draft.timeout !== undefined) config.timeout = draft.timeout;
      if (draft.retryMaxAttempts !== undefined)
        config.retryMaxAttempts = draft.retryMaxAttempts;
      if (draft.retryDelay !== undefined) config.retryDelay = draft.retryDelay;
      if (draft.headers) config.headers = draft.headers;

      const client = createLLMClient(config);
      // 最小请求：Hello
      const messages: LLMMessage[] = [
        { role: "system", content: "You are a test assistant. Reply briefly." },
        { role: "user", content: "Hello" },
      ];
      const content = await client.chat(messages);
      const preview =
        content.length > 80 ? content.slice(0, 80) + "…" : content;
      setTestStatus({
        kind: "success",
        message: `Connection Successful · ${preview}`,
      });
    } catch (err) {
      const message =
        err instanceof LLMError
          ? `[${err.errorType}] ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      setTestStatus({ kind: "error", message });
    }
  };

  /* ---- Save ---- */
  const handleSave = () => {
    save();
  };

  /* ---- Reset ---- */
  const handleReset = () => {
    reset();
    setHeadersText("");
    setTestStatus({ kind: "idle" });
    setShowApiKey(false);
  };

  /* ---- 数字字段辅助 ---- */
  const numValue = (v: number | undefined, fallback: number): number =>
    v ?? fallback;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="rounded-sm border border-gold/40 bg-parchment-paper p-6 shadow-parchment-deep sm:p-8"
    >
      {/* ---- Header ---- */}
      <div className="mb-4 flex items-center gap-3">
        <KeyRound size={20} strokeWidth={1.5} className="text-gold-soft/70" />
        <div>
          <h2 className="font-display text-base tracking-widest text-ink/80 sm:text-lg">
            LLM Settings
          </h2>
          <p className="font-zh text-[10px] tracking-[0.35em] text-ink/45">
            模 型 配 置
          </p>
        </div>
      </div>
      <Flourish className="mb-6 h-2.5 w-44" variant="center" />

      <div className="divide-y divide-gold/20">
        {/* ---- Provider ---- */}
        <div className="py-4">
          <FieldLabel
            label="Provider"
            labelZh="平 台"
            description="选择 LLM 服务商（仅用于保存配置，不自动修改其他字段）"
          />
          <select
            value={draft.provider ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setField("provider", (v || undefined) as LLMProvider | undefined);
            }}
            className="w-full rounded-sm border border-gold/30 bg-parchment/40 px-3 py-2 font-ui text-sm text-ink transition-colors focus:border-gold focus:bg-parchment/60 focus:outline-none"
          >
            <option value="">— 未选择 —</option>
            {LLM_PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}（{opt.description}）
              </option>
            ))}
          </select>
        </div>

        {/* ---- Base URL ---- */}
        <div className="py-4">
          <FieldLabel
            label="Base URL"
            labelZh="端 点"
            description="API 端点地址，如 https://openrouter.ai/api/v1"
          />
          <TextInput
            value={draft.baseURL ?? ""}
            onChange={(v) => setField("baseURL", v || undefined)}
            placeholder="https://..."
          />
        </div>

        {/* ---- API Key ---- */}
        <div className="py-4">
          <FieldLabel
            label="API Key"
            labelZh="密 钥"
            description="密码框，默认隐藏；支持显示/隐藏、复制、清空"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <TextInput
                value={draft.apiKey ?? ""}
                onChange={(v) => setField("apiKey", v || undefined)}
                placeholder="sk-..."
                type={showApiKey ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/50 transition-colors hover:text-gold"
                aria-label={showApiKey ? "隐藏密钥" : "显示密钥"}
              >
                {showApiKey ? (
                  <EyeOff size={16} strokeWidth={1.5} />
                ) : (
                  <Eye size={16} strokeWidth={1.5} />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleCopyApiKey}
              disabled={!draft.apiKey}
              className="inline-flex items-center justify-center rounded-sm border border-gold/40 px-3 py-2 text-ink/60 transition-colors hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="复制密钥"
              title={copyStatus === "copied" ? "已复制" : "复制"}
            >
              <Copy size={15} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleClearApiKey}
              disabled={!draft.apiKey}
              className="inline-flex items-center justify-center rounded-sm border border-ember/40 px-3 py-2 text-ink/60 transition-colors hover:border-ember hover:text-ember disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="清空密钥"
              title="清空"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </div>
          {copyStatus === "copied" && (
            <p className="mt-1.5 font-serif text-xs italic text-gold-soft">
              ✓ 已复制到剪贴板
            </p>
          )}
        </div>

        {/* ---- Model ---- */}
        <div className="py-4">
          <FieldLabel
            label="Model"
            labelZh="模 型"
            description="由用户填写，不内置任何默认模型名"
          />
          <TextInput
            value={draft.model ?? ""}
            onChange={(v) => setField("model", v || undefined)}
            placeholder="模型名（如 gemma-3-27b-it:free）"
          />
        </div>

        {/* ---- Temperature ---- */}
        <div className="py-2">
          <RangeSlider
            label="Temperature"
            labelZh="温 度"
            value={numValue(draft.temperature, 1)}
            min={0}
            max={2}
            step={0.1}
            onChange={(v) => setField("temperature", v)}
          />
        </div>

        {/* ---- Max Tokens ---- */}
        <div className="py-4">
          <FieldLabel
            label="Max Tokens"
            labelZh="最 大 Token"
            description="响应最大 token 数（默认 1024）"
          />
          <TextInput
            value={String(draft.maxTokens ?? 1024)}
            onChange={(v) => {
              const n = Number.parseInt(v, 10);
              setField("maxTokens", Number.isFinite(n) ? n : undefined);
            }}
            type="number"
            min={1}
            step={1}
          />
        </div>

        {/* ---- Timeout ---- */}
        <div className="py-4">
          <FieldLabel
            label="Timeout"
            labelZh="超 时"
            description="请求超时时间，单位毫秒（默认 60000）"
          />
          <TextInput
            value={String(draft.timeout ?? 60000)}
            onChange={(v) => {
              const n = Number.parseInt(v, 10);
              setField("timeout", Number.isFinite(n) ? n : undefined);
            }}
            type="number"
            min={1000}
            step={1000}
          />
        </div>

        {/* ---- Retry Count ---- */}
        <div className="py-4">
          <FieldLabel
            label="Retry Count"
            labelZh="重 试 次 数"
            description="429 / 5xx 自动重试次数（默认 1）"
          />
          <TextInput
            value={String(draft.retryMaxAttempts ?? 1)}
            onChange={(v) => {
              const n = Number.parseInt(v, 10);
              setField(
                "retryMaxAttempts",
                Number.isFinite(n) ? n : undefined,
              );
            }}
            type="number"
            min={0}
            step={1}
          />
        </div>

        {/* ---- Retry Delay ---- */}
        <div className="py-4">
          <FieldLabel
            label="Retry Delay"
            labelZh="重 试 间 隔"
            description="重试间隔，单位毫秒（默认 1000）"
          />
          <TextInput
            value={String(draft.retryDelay ?? 1000)}
            onChange={(v) => {
              const n = Number.parseInt(v, 10);
              setField("retryDelay", Number.isFinite(n) ? n : undefined);
            }}
            type="number"
            min={0}
            step={100}
          />
        </div>

        {/* ---- Headers ---- */}
        <div className="py-4">
          <FieldLabel
            label="Headers (JSON)"
            labelZh="自 定 义 头"
            description='JSON 格式，原样保存，不校验平台。例：{"HTTP-Referer":"https://example.com","X-Title":"Half Blood Prince"}'
          />
          <textarea
            value={headersText}
            onChange={(e) => handleHeadersChange(e.target.value)}
            placeholder={'{\n  "HTTP-Referer": "https://example.com",\n  "X-Title": "Half Blood Prince"\n}'}
            rows={5}
            className="w-full rounded-sm border border-gold/30 bg-parchment/40 px-3 py-2 font-ui text-xs text-ink placeholder:text-ink/30 transition-colors focus:border-gold focus:bg-parchment/60 focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* ---- Test Connection ---- */}
        <div className="py-4">
          <FieldLabel
            label="Test Connection"
            labelZh="连 接 测 试"
            description="使用当前输入的数据发送最小请求（Hello），不保存配置"
          />
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus.kind === "testing"}
            className="inline-flex items-center gap-2 rounded-sm border border-gold/50 bg-ink/20 px-4 py-2 font-ui text-xs tracking-wider text-parchment transition-colors hover:border-gold hover:bg-gold/15 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testStatus.kind === "testing" ? (
              <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <FlaskConical size={14} strokeWidth={1.5} />
            )}
            <span>
              {testStatus.kind === "testing" ? "Testing..." : "Test Connection"}
            </span>
          </button>

          {/* 测试结果 */}
          {testStatus.kind === "success" && (
            <div className="mt-3 flex items-start gap-2 rounded-sm border border-emerald-700/40 bg-emerald-900/15 px-3 py-2">
              <CheckCircle2
                size={14}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-emerald-400"
              />
              <p className="font-ui text-xs text-emerald-200">
                {testStatus.message}
              </p>
            </div>
          )}
          {testStatus.kind === "error" && (
            <div className="mt-3 flex items-start gap-2 rounded-sm border border-red-700/40 bg-red-900/15 px-3 py-2">
              <XCircle
                size={14}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <p className="font-ui text-xs text-red-200 break-all">
                {testStatus.message}
              </p>
            </div>
          )}
        </div>

        {/* ---- Save / Reset ---- */}
        <div className="flex flex-wrap gap-3 py-5">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-sm border border-gold bg-gold/15 px-5 py-2.5 font-ui text-xs tracking-widest text-parchment transition-colors hover:bg-gold/25"
          >
            <Save size={14} strokeWidth={1.5} />
            <span>SAVE</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-sm border border-ink/40 bg-ink/20 px-5 py-2.5 font-ui text-xs tracking-widest text-parchment/70 transition-colors hover:border-ink/60 hover:text-parchment"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
