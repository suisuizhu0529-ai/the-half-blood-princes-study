/**
 * Persona Test Page（Phase 14.4）。
 *
 * 仅开发环境可访问（/persona-test）。
 * 用于验证 Phase 14.1 Persona Enhancement 在真实 LLM 调用下的实际表现。
 *
 * 功能：
 *   - 显示当前 Persona / Provider / Model / LLM Mode（REAL / SIMULATOR）
 *   - 输入框 + Send 按钮，调用 ConversationEngine.converse()
 *   - 展示响应内容 + Debug Payload（折叠）
 *     - system message / contextPrompt / relationshipSummary / messages array
 *
 * 设计原则：
 *   - 不修改 ConversationEngine 核心逻辑
 *   - messages 通过 buildMessages() 重建（维护本地 history 镜像 engine 内部 history）
 *   - Dark Academia 视觉风格
 *
 * 数据流：
 *   用户输入 → engine.converse() → 重建 messages → 展示
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  CircleDot,
  Zap,
  Sliders,
} from "lucide-react";
import Flourish from "@/components/decor/Flourish";
import { ConversationEngine } from "@/services/conversation";
import type { ConversationResult } from "@/services/conversation/types";
import { buildMessages } from "@/utils/messageBuilder";
import type { ConversationTurn } from "@/utils/messageBuilder";
import type { LLMMessage } from "@/services/llm/types";
import { snapePersona } from "@/data/persona";
import { loadLLMSettings } from "@/store/llmConfig";
import { createRuntimeLLMClient } from "@/config/llm";
import { resolveBehaviorGuidance } from "@/utils/relationshipBehaviorResolver";
import type { RelationshipContext } from "@/types/relationshipContext";
import type { InteractionGuidance } from "@/types/interactionGuidance";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface TestResult {
  userMessage: string;
  result: ConversationResult;
  messages: LLMMessage[];
}

/**
 * Debug Panel 输入状态（Phase 15.5-G）。
 *
 * 用户手动控制的 RelationshipContext 输入字段。
 * 不包含 userName（测试模式默认无姓名）。
 */
interface DebugInputState {
  trust: number;
  curiosity: number;
  patience: number;
  hasFirstMeeting: boolean;
  hasViewedArchive: boolean;
  hasActivatedMemory: boolean;
}

/**
 * Debug Panel 预设场景（Phase 15.5-G）。
 */
type PresetName = "Stranger" | "Student" | "Researcher" | "Confidant";

/** 预设场景配置 */
const PRESETS: Record<PresetName, DebugInputState> = {
  Stranger: {
    trust: 5,
    curiosity: 5,
    patience: 50,
    hasFirstMeeting: false,
    hasViewedArchive: false,
    hasActivatedMemory: false,
  },
  Student: {
    trust: 40,
    curiosity: 40,
    patience: 50,
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: false,
  },
  Researcher: {
    trust: 70,
    curiosity: 85,
    patience: 60,
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: true,
  },
  Confidant: {
    trust: 95,
    curiosity: 95,
    patience: 70,
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: true,
  },
};

/** 默认 Debug 输入（Stranger 预设） */
const DEFAULT_DEBUG_INPUT: DebugInputState = PRESETS.Stranger;

/**
 * 根据 Debug 输入构造 RelationshipContext。
 *
 * 规则：
 *   - userName 默认 undefined（测试模式不模拟姓名）
 *   - eventsCount = milestone 布尔值之和
 *   - isReturningUser = hasFirstMeeting
 *   - knowsUserName = false（userName 未设置）
 */
function buildRelationshipContextFromDebug(
  input: DebugInputState,
): RelationshipContext {
  const eventsCount =
    (input.hasFirstMeeting ? 1 : 0) +
    (input.hasViewedArchive ? 1 : 0) +
    (input.hasActivatedMemory ? 1 : 0);

  return {
    userName: undefined,
    relationshipLevel: {
      trust: input.trust,
      patience: input.patience,
      curiosity: input.curiosity,
    },
    milestones: {
      hasFirstMeeting: input.hasFirstMeeting,
      hasViewedArchive: input.hasViewedArchive,
      hasActivatedMemory: input.hasActivatedMemory,
      eventsCount,
    },
    summaryFlags: {
      isReturningUser: input.hasFirstMeeting,
      knowsUserName: false,
    },
  };
}

/**
 * 内联渲染 <relationship_context> block（用于 Debug Payload 展示）。
 *
 * 与 messageBuilder.buildRelationshipContextBlock 逻辑一致，
 * 但为避免导出内部函数，此处内联实现。
 */
function renderRelationshipContextBlock(ctx: RelationshipContext): string {
  const lines: string[] = ["<relationship_context>"];

  lines.push(`User: ${ctx.userName ?? "(not provided)"}`);
  lines.push("");
  lines.push("Relationship:");
  lines.push(`Trust level: ${ctx.relationshipLevel.trust}`);
  lines.push(`Curiosity level: ${ctx.relationshipLevel.curiosity}`);
  lines.push("");

  lines.push("Milestones:");
  const m = ctx.milestones;
  if (!m.hasFirstMeeting && !m.hasViewedArchive && !m.hasActivatedMemory) {
    lines.push("no milestones yet");
  } else {
    lines.push(`- First meeting: ${m.hasFirstMeeting ? "yes" : "no"}`);
    lines.push(`- Archive explored: ${m.hasViewedArchive ? "yes" : "no"}`);
    lines.push(`- Memory activated: ${m.hasActivatedMemory ? "yes" : "no"}`);
  }

  lines.push("</relationship_context>");
  return lines.join("\n");
}

/**
 * 内联渲染 <interaction_guidance> block（用于 Debug Payload 展示）。
 *
 * 与 messageBuilder.buildInteractionGuidanceBlock 逻辑一致，
 * 但为避免导出内部函数，此处内联实现。
 */
function renderInteractionGuidanceBlock(guidance: InteractionGuidance): string {
  const lines: string[] = ["<interaction_guidance>"];

  lines.push("Tone:");
  lines.push(guidance.toneDirective);
  lines.push("");

  lines.push("Teaching approach:");
  lines.push(guidance.teachingDirective);

  if (guidance.relationshipNotes.length > 0) {
    lines.push("");
    lines.push("Relationship notes:");
    for (const note of guidance.relationshipNotes) {
      lines.push(`- ${note}`);
    }
  }

  lines.push("</interaction_guidance>");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PersonaTest() {
  // --- Engine & mode detection ---
  const engineRef = useRef<ConversationEngine | null>(null);
  const historyRef = useRef<ConversationTurn[]>([]);

  if (engineRef.current === null) {
    engineRef.current = new ConversationEngine();
  }

  // Detect LLM mode: if createRuntimeLLMClient() returns non-null, mode is REAL
  const llmClient = useRef(createRuntimeLLMClient());
  const isRealLLM = llmClient.current !== null;

  // Get config info for display
  const savedSettings = loadLLMSettings();
  const provider = savedSettings?.provider ?? import.meta.env.VITE_LLM_PROVIDER ?? "—";
  const model = savedSettings?.model ?? import.meta.env.VITE_LLM_MODEL ?? "—";

  // --- Input state ---
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedDebug, setExpandedDebug] = useState<Record<number, boolean>>({});
  // Phase 14.7: history mirror for multi-turn debug display
  const [historyTurns, setHistoryTurns] = useState<ConversationTurn[]>([]);

  // --- Phase 15.5-G: Relationship Debug Mode ---
  // Debug Panel 输入状态（默认 Stranger 预设）
  const [debugInput, setDebugInput] = useState<DebugInputState>(DEFAULT_DEBUG_INPUT);
  // Debug Panel 折叠状态
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  // 是否已 Apply（使用 override Context）
  const [debugApplied, setDebugApplied] = useState(false);

  // 根据 debugInput 实时计算 RelationshipContext + InteractionGuidance
  const debugContext = useMemo(
    () => buildRelationshipContextFromDebug(debugInput),
    [debugInput],
  );
  const debugGuidance = useMemo(
    () => resolveBehaviorGuidance(debugContext),
    [debugContext],
  );

  // --- Handlers ---
  const handleSend = useCallback(async () => {
    const message = input.trim();
    if (!message || loading) return;

    setLoading(true);
    try {
      const engine = engineRef.current!;
      const result = await engine.converse({ userMessage: message });

      // Rebuild messages for debug display (mirrors engine's internal logic)
      const messages = buildMessages(
        result.prompt,
        message,
        historyRef.current,
      );

      // Update local history mirror
      historyRef.current.push({
        user: message,
        assistant: result.response.content,
      });
      // Phase 14.7: sync to state for multi-turn history display
      setHistoryTurns([...historyRef.current]);

      setResults((prev) => [...prev, { userMessage: message, result, messages }]);
      setInput("");
    } catch (err) {
      console.error("[PersonaTest] converse failed:", err);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  // Phase 15.5-G: Apply Debug State → 重建 Engine 使用 override Context
  const handleApplyDebug = useCallback(() => {
    // 清空历史与结果（新 Engine 不继承旧 history）
    historyRef.current = [];
    setHistoryTurns([]);
    setResults([]);

    // 重建 Engine：注入 override + skipPersistence
    engineRef.current = new ConversationEngine({
      relationshipContextOverride: debugContext,
      skipPersistence: true,
    });

    setDebugApplied(true);
  }, [debugContext]);

  // Phase 15.5-G: 重置到 production 模式
  const handleResetDebug = useCallback(() => {
    historyRef.current = [];
    setHistoryTurns([]);
    setResults([]);

    // 重建 Engine：不注入 override，走 production 路径
    engineRef.current = new ConversationEngine();

    setDebugApplied(false);
    setDebugInput(DEFAULT_DEBUG_INPUT);
  }, []);

  // Phase 15.5-G: 应用预设场景
  const handleApplyPreset = useCallback((preset: PresetName) => {
    setDebugInput(PRESETS[preset]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const toggleDebug = useCallback((index: number) => {
    setExpandedDebug((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const handleClear = useCallback(() => {
    setResults([]);
    historyRef.current = [];
    setHistoryTurns([]);
  }, []);

  // --- Render ---
  return (
    <div className="min-h-screen bg-ink px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-gold md:text-4xl">
            Persona Test Harness
          </h1>
          <p className="mt-2 font-zh text-sm text-ink-soft">
            人 格 行 为 验 证 · Phase 14.4
          </p>
          <Flourish className="mx-auto mt-4 h-2.5 w-44" variant="center" />
        </div>

        {/* Info Panel */}
        <div className="parchment-paper mb-6 rounded-lg p-5 shadow-parchment-deep">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <InfoBlock label="Persona" value={snapePersona.name} />
            <InfoBlock label="Provider" value={provider} />
            <InfoBlock label="Model" value={model} />
            <div>
              <div className="mb-1 font-ui text-xs uppercase tracking-wider text-ink-muted">
                LLM Mode
              </div>
              <div className="flex items-center gap-1.5">
                {isRealLLM ? (
                  <>
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <span className="font-display text-lg font-bold text-emerald-700">
                      REAL
                    </span>
                  </>
                ) : (
                  <>
                    <CircleDot className="h-4 w-4 text-amber-600" />
                    <span className="font-display text-lg font-bold text-amber-700">
                      SIMULATOR
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {!isRealLLM && (
            <p className="mt-3 font-ui text-xs text-amber-700">
              ⚠ No LLM config found in localStorage or env. Responses will come from
              ResponseSimulator. Configure LLM in{" "}
              <a href="/settings" className="underline">Settings</a>.
            </p>
          )}
        </div>

        {/* Conversation History (Phase 14.7) — multi-turn debug */}
        <ConversationHistoryPanel turns={historyTurns} />

        {/* Relationship Debug Panel (Phase 15.5-G) */}
        <RelationshipDebugPanel
          open={debugPanelOpen}
          onToggle={() => setDebugPanelOpen((v) => !v)}
          input={debugInput}
          onChange={setDebugInput}
          context={debugContext}
          guidance={debugGuidance}
          applied={debugApplied}
          onApply={handleApplyDebug}
          onReset={handleResetDebug}
          onPreset={handleApplyPreset}
        />

        {/* Input Area */}
        <div className="parchment-paper mb-6 rounded-lg p-5 shadow-parchment-deep">
          <label className="mb-2 block font-ui text-xs uppercase tracking-wider text-ink-muted">
            User Message
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message to test Snape's persona..."
            rows={2}
            className="w-full resize-none rounded-md border border-gold/30 bg-parchment/50 px-4 py-3 font-serif text-ink placeholder:text-ink-muted/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
            disabled={loading}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="font-ui text-xs text-ink-muted">
              Press Enter to send · Shift+Enter for newline
            </span>
            <div className="flex gap-3">
              {results.length > 0 && (
                <button
                  onClick={handleClear}
                  className="rounded-md px-4 py-2 font-ui text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex items-center gap-2 rounded-md bg-ink px-5 py-2 font-ui text-sm text-parchment transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Test Message
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <AnimatePresence>
            {results.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="parchment-paper rounded-lg p-5 shadow-parchment-deep"
              >
                {/* User Message */}
                <div className="mb-4">
                  <div className="mb-1 font-ui text-xs uppercase tracking-wider text-ink-muted">
                    User Message
                  </div>
                  <p className="font-serif text-ink">{item.userMessage}</p>
                </div>

                {/* Response */}
                <div className="mb-4 border-l-2 border-gold/40 pl-4">
                  <div className="mb-1 font-ui text-xs uppercase tracking-wider text-gold-soft">
                    Snape's Response
                  </div>
                  <p className="font-serif text-ink whitespace-pre-wrap">
                    {item.result.response.content}
                  </p>
                </div>

                {/* Debug Payload (collapsible) */}
                <div className="border-t border-gold/20 pt-3">
                  <button
                    onClick={() => toggleDebug(index)}
                    className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                  >
                    {expandedDebug[index] ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    Debug Payload
                  </button>

                  {expandedDebug[index] && (
                    <div className="mt-3 space-y-4">
                      {/* System Prompt */}
                      <DebugSection
                        title="System Message (systemPrompt)"
                        content={item.result.prompt.systemPrompt}
                      />

                      {/* Context Prompt */}
                      <DebugSection
                        title="Context (contextPrompt)"
                        content={item.result.prompt.contextPrompt || "(empty — base context)"}
                      />

                      {/* Relationship Summary */}
                      <DebugSection
                        title="Relationship (relationshipSummary)"
                        content={item.result.prompt.relationshipSummary}
                      />

                      {/* Phase 15.5-G: Relationship Context (JSON) */}
                      {item.result.prompt.relationshipContext && (
                        <div>
                          <div className="mb-1.5 font-ui text-xs font-semibold text-ink-muted">
                            Relationship Context (JSON)
                          </div>
                          <pre className="max-h-64 overflow-auto rounded-md bg-ink/90 p-3 font-mono text-xs text-parchment/90">
                            {JSON.stringify(item.result.prompt.relationshipContext, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Phase 15.5-G: Interaction Guidance (JSON) */}
                      {item.result.prompt.interactionGuidance && (
                        <div>
                          <div className="mb-1.5 font-ui text-xs font-semibold text-ink-muted">
                            Interaction Guidance (JSON)
                          </div>
                          <pre className="max-h-64 overflow-auto rounded-md bg-ink/90 p-3 font-mono text-xs text-parchment/90">
                            {JSON.stringify(item.result.prompt.interactionGuidance, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Phase 15.5-G: Final <relationship_context> block */}
                      {item.result.prompt.relationshipContext && (
                        <DebugSection
                          title="Final <relationship_context> block"
                          content={renderRelationshipContextBlock(item.result.prompt.relationshipContext)}
                        />
                      )}

                      {/* Phase 15.5-G: Final <interaction_guidance> block */}
                      {item.result.prompt.interactionGuidance && (
                        <DebugSection
                          title="Final <interaction_guidance> block"
                          content={renderInteractionGuidanceBlock(item.result.prompt.interactionGuidance)}
                        />
                      )}

                      {/* Final Messages Array */}
                      <div>
                        <div className="mb-1.5 font-ui text-xs font-semibold text-ink-muted">
                          Final Messages Array ({item.messages.length} messages)
                        </div>
                        <pre className="max-h-96 overflow-auto rounded-md bg-ink/90 p-3 font-mono text-xs text-parchment/90">
                          {JSON.stringify(item.messages, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {results.length === 0 && !loading && (
            <div className="parchment-paper rounded-lg p-8 text-center shadow-parchment-deep">
              <FlaskConical className="mx-auto mb-3 h-8 w-8 text-gold/50" />
              <p className="font-zh text-sm text-ink-muted">
                尚无测试结果 · 发送一条消息开始验证
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 font-ui text-xs uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="truncate font-display text-base text-ink" title={value}>
        {value}
      </div>
    </div>
  );
}

function DebugSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <div className="mb-1.5 font-ui text-xs font-semibold text-ink-muted">
        {title}
      </div>
      <pre className="max-h-64 overflow-auto rounded-md bg-ink/90 p-3 font-mono text-xs text-parchment/90 whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}

/**
 * Relationship Debug Panel（Phase 15.5-G）。
 *
 * 人工控制 RelationshipContext 输入，实时展示 resolver 输出。
 * Apply 按钮重建 Engine 使用 override Context + skipPersistence。
 *
 * 不修改 production flow：未 Apply 时仍使用 production RelationshipMemory。
 */
function RelationshipDebugPanel({
  open,
  onToggle,
  input,
  onChange,
  context,
  guidance,
  applied,
  onApply,
  onReset,
  onPreset,
}: {
  open: boolean;
  onToggle: () => void;
  input: DebugInputState;
  onChange: (next: DebugInputState) => void;
  context: RelationshipContext;
  guidance: InteractionGuidance;
  applied: boolean;
  onApply: () => void;
  onReset: () => void;
  onPreset: (preset: PresetName) => void;
}) {
  const updateField = <K extends keyof DebugInputState>(
    key: K,
    value: DebugInputState[K],
  ) => {
    onChange({ ...input, [key]: value });
  };

  return (
    <div className="parchment-paper mb-6 rounded-lg p-5 shadow-parchment-deep">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-gold" />
          <span className="font-ui text-xs uppercase tracking-wider text-ink-muted">
            Relationship Debug Mode
          </span>
          {applied && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-ui text-xs text-emerald-700">
              Applied
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-ink-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 text-ink-muted" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          {/* Preset Buttons */}
          <div>
            <div className="mb-2 font-ui text-xs uppercase tracking-wider text-ink-muted">
              Presets
            </div>
            <div className="flex flex-wrap gap-2">
              {(["Stranger", "Student", "Researcher", "Confidant"] as PresetName[]).map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => onPreset(preset)}
                    className="rounded-md border border-gold/30 bg-parchment/50 px-3 py-1.5 font-ui text-xs text-ink transition-colors hover:border-gold hover:bg-gold/10"
                  >
                    {preset}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SliderInput
              label="Trust"
              value={input.trust}
              onChange={(v) => updateField("trust", v)}
            />
            <SliderInput
              label="Curiosity"
              value={input.curiosity}
              onChange={(v) => updateField("curiosity", v)}
            />
          </div>

          {/* Patience (read-only) */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-ui text-xs uppercase tracking-wider text-ink-muted">
                Patience (read-only)
              </span>
              <span className="font-mono text-sm text-ink">{input.patience}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-ink/10">
              <div
                className="h-2 rounded-full bg-ink/40"
                style={{ width: `${input.patience}%` }}
              />
            </div>
          </div>

          {/* Milestone Checkboxes */}
          <div>
            <div className="mb-2 font-ui text-xs uppercase tracking-wider text-ink-muted">
              Milestones
            </div>
            <div className="space-y-2">
              <CheckboxInput
                label="First meeting completed"
                checked={input.hasFirstMeeting}
                onChange={(v) => updateField("hasFirstMeeting", v)}
              />
              <CheckboxInput
                label="Archive explored"
                checked={input.hasViewedArchive}
                onChange={(v) => updateField("hasViewedArchive", v)}
              />
              <CheckboxInput
                label="Memory activated"
                checked={input.hasActivatedMemory}
                onChange={(v) => updateField("hasActivatedMemory", v)}
              />
            </div>
          </div>

          {/* Generated RelationshipContext (read-only) */}
          <div>
            <div className="mb-1.5 font-ui text-xs font-semibold text-ink-muted">
              Generated RelationshipContext
            </div>
            <pre className="max-h-48 overflow-auto rounded-md bg-ink/90 p-3 font-mono text-xs text-parchment/90">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>

          {/* Generated InteractionGuidance (read-only, resolver output) */}
          <div>
            <div className="mb-1.5 font-ui text-xs font-semibold text-ink-muted">
              Generated Interaction Guidance (resolver output)
            </div>
            <div className="rounded-md border border-gold/20 bg-parchment/30 p-3">
              <div className="mb-2">
                <div className="font-ui text-xs font-semibold text-gold-soft">
                  Tone:
                </div>
                <p className="mt-0.5 font-serif text-sm text-ink">
                  {guidance.toneDirective}
                </p>
              </div>
              <div className="mb-2">
                <div className="font-ui text-xs font-semibold text-gold-soft">
                  Teaching approach:
                </div>
                <p className="mt-0.5 font-serif text-sm text-ink">
                  {guidance.teachingDirective}
                </p>
              </div>
              {guidance.relationshipNotes.length > 0 && (
                <div>
                  <div className="font-ui text-xs font-semibold text-gold-soft">
                    Relationship notes:
                  </div>
                  <ul className="mt-0.5 space-y-0.5">
                    {guidance.relationshipNotes.map((note, i) => (
                      <li
                        key={i}
                        className="font-serif text-sm text-ink"
                      >
                        - {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onApply}
              className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-ui text-sm text-parchment transition-colors hover:bg-ink-soft"
            >
              <Zap className="h-3.5 w-3.5" />
              Apply Relationship State
            </button>
            {applied && (
              <button
                onClick={onReset}
                className="rounded-md border border-gold/30 px-4 py-2 font-ui text-sm text-ink-muted transition-colors hover:border-gold hover:text-ink"
              >
                Reset to Production
              </button>
            )}
          </div>
          {applied && (
            <p className="font-ui text-xs text-emerald-700">
              ✓ Engine rebuilt with override Context · skipPersistence=true ·
              localStorage untouched
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Slider 输入组件（Phase 15.5-G）。
 */
function SliderInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-ui text-xs uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <span className="font-mono text-sm text-ink">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold"
      />
    </div>
  );
}

/**
 * Checkbox 输入组件（Phase 15.5-G）。
 */
function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-gold"
      />
      <span className="font-serif text-sm text-ink">{label}</span>
    </label>
  );
}

/**
 * Conversation History Panel（Phase 14.7）。
 *
 * 显示当前累积的 ConversationTurn[]（即将在下一轮传入 LLM 的 history）。
 * 用于验证 multi-turn 场景下 history 是否正确累积与传入。
 */
function ConversationHistoryPanel({ turns }: { turns: ConversationTurn[] }) {
  return (
    <div className="parchment-paper mb-6 rounded-lg p-5 shadow-parchment-deep">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-ui text-xs uppercase tracking-wider text-ink-muted">
            Conversation History
          </div>
          <div className="font-zh text-xs text-ink-muted/70">
            下一轮调用将传入此 history · Phase 14.7
          </div>
        </div>
        <span className="rounded-full bg-ink/10 px-2.5 py-0.5 font-ui text-xs text-ink-soft">
          {turns.length} turn{turns.length === 1 ? "" : "s"}
        </span>
      </div>

      {turns.length === 0 ? (
        <p className="font-zh text-sm text-ink-muted">
          尚无历史记录 · 发送消息后此处将显示累积的对话历史
        </p>
      ) : (
        <div className="space-y-3">
          {turns.map((turn, i) => (
            <div
              key={i}
              className="rounded-md border border-gold/20 bg-parchment/30 p-3"
            >
              <div className="mb-1 font-ui text-xs uppercase tracking-wider text-ink-muted">
                Turn {i + 1}
              </div>
              <div className="mb-1.5">
                <span className="font-ui text-xs font-semibold text-gold-soft">
                  user:
                </span>
                <span className="ml-2 font-serif text-sm text-ink">
                  {turn.user}
                </span>
              </div>
              <div>
                <span className="font-ui text-xs font-semibold text-gold-soft">
                  assistant:
                </span>
                <span className="ml-2 font-serif text-sm text-ink">
                  {turn.assistant}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
