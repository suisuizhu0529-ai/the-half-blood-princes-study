/**
 * Text-to-Speech adapter layer.
 *
 * 公共 API（与 Phase 3A 完全一致，useSpeech 无需改动）：
 *   - speak(opts: SpeakOptions): symbol
 *   - cancelSpeech(): void
 *   - isSpeaking(): boolean
 *   - isSpeechSupported(): boolean
 *   - pickBritishVoice(): SpeechSynthesisVoice | undefined
 *   - onVoicesReady(cb): () => void
 *
 * Adapter 自动选择：
 *   - 配置了 VITE_AZURE_SPEECH_KEY + VITE_AZURE_SPEECH_REGION → Azure Neural TTS
 *   - 否则 → 浏览器 SpeechSynthesis（fallback）
 *
 * Phase 3B：支持 VoiceProfile（默认 Dark Academia Professor），
 * SSML 自动插入自然停顿（break 300–500ms）。
 *
 * 未来替换为 ElevenLabs 等：
 *   1. 实现 SpeechAdapter 接口
 *   2. 加入 isXxxConfigured() 检测
 *   3. 在 selectAdapter() 中接入
 */

import type { VoiceProfile, BreakRules } from "@/voice/profiles";
import {
  DEFAULT_VOICE_PROFILE,
  KEYWORDS_FOR_BREAK,
} from "@/voice/profiles";

// ============= Types =============

export interface SpeakOptions {
  /** 朗读文本 */
  text: string;
  /**
   * 语速覆盖（SSML 字符串，如 "-25%"）。
   * 留空则使用 profile.rate。
   */
  rate?: string;
  /**
   * 音调覆盖（SSML 字符串，如 "-8%"）。
   * 留空则使用 profile.pitch。
   */
  pitch?: string;
  /** 音量覆盖（SSML 字符串，如 "100"）。留空则使用 profile.volume */
  volume?: string;
  /** 语言，默认 en-GB */
  lang?: string;
  /** Azure 声音名覆盖（覆盖 profile.voices） */
  voice?: string;
  /** Azure 表达风格，如 "calm" / "gentle" */
  style?: string;
  /** Voice Profile。提供后，其 voices/rate/pitch/breaks 作为默认值 */
  profile?: VoiceProfile;
  /** 朗读开始回调 */
  onStart?: () => void;
  /** 朗读结束/中断回调 */
  onEnd?: () => void;
  /** 朗读出错回调 */
  onError?: (err: unknown) => void;
}

interface SpeechAdapter {
  name: "browser" | "azure";
  speak(opts: SpeakOptions): void;
  cancel(): void;
  isSpeaking(): boolean;
}

// ============= SSML Builder (Azure) =============

interface SsmlParams {
  text: string;
  voice: string;
  /** SSML 字符串，如 "-25%" */
  rate: string;
  /** SSML 字符串，如 "-8%" */
  pitch: string;
  /** SSML 字符串，如 "100" */
  volume: string;
  style?: string;
  lang: string;
  breaks?: BreakRules;
}

/**
 * 转义 XML 特殊字符。
 */
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

/**
 * 在文本中插入自然停顿。
 *
 * 规则（仅在标点后跟随空格 / 句末时触发，避免误伤小数 / 缩写）：
 *   - 句号 .  → breaks.period ms       句末长停顿，给思考余地
 *   - 逗号 ,  → breaks.comma ms        短停顿，节奏分组
 *   - 分号 ;  → breaks.semicolon ms
 *   - 冒号 :  → breaks.colon ms
 *   - 关键词前（but / yet / silence / truth ...）→ breaks.beforeKeyword ms
 *     形成"思辨—吐字"的教授节奏
 */
function applyBreaks(text: string, breaks?: BreakRules): string {
  if (!breaks) return text;

  let out = text
    .replace(/\.(?=\s|$)/g, `.<break time="${breaks.period}ms"/>`)
    .replace(/,(?=\s)/g, `,<break time="${breaks.comma}ms"/>`)
    .replace(/;(?=\s)/g, `;<break time="${breaks.semicolon}ms"/>`)
    .replace(/:(?=\s)/g, `:<break time="${breaks.colon}ms"/>`);

  // 关键词前停顿：匹配词边界 + 关键词 + 词边界，前置 break
  // 已转义的文本中关键词不会含 XML 特殊字符，安全
  for (const kw of KEYWORDS_FOR_BREAK) {
    const re = new RegExp(`\\b(${kw})\\b`, "gi");
    out = out.replace(re, `<break time="${breaks.beforeKeyword}ms"/>$1`);
  }

  return out;
}

/**
 * 构建 Azure SSML。
 *
 * Phase 3B 升级：
 *   - voice / rate / pitch / volume 直接使用 SSML 字符串（profile 提供）
 *   - 自动插入句末、逗号、关键词前停顿
 *   - 可选 mstts:express-as 风格
 */
function buildSsml(p: SsmlParams): string {
  // 先转义，再插入 break（break 标签是合法 XML，不应被转义）
  const escapedText = escapeXml(p.text);
  const textWithBreaks = applyBreaks(escapedText, p.breaks);

  const inner = p.style
    ? `<mstts:express-as style="${p.style}">${textWithBreaks}</mstts:express-as>`
    : textWithBreaks;

  return (
    `<speak version="1.0" ` +
    `xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xmlns:mstts="http://www.w3.org/2001/mstts" ` +
    `xml:lang="${p.lang}">` +
    `<voice name="${p.voice}">` +
    `<prosody rate="${p.rate}" pitch="${p.pitch}" volume="${p.volume}">` +
    inner +
    `</prosody>` +
    `</voice>` +
    `</speak>`
  );
}

// ============= Azure Adapter =============

const AZURE_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY as string | undefined;
const AZURE_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION as string | undefined;
const AZURE_ENV_VOICE =
  (import.meta.env.VITE_AZURE_SPEECH_VOICE as string | undefined) ?? undefined;
const AZURE_DEFAULT_STYLE =
  (import.meta.env.VITE_AZURE_SPEECH_STYLE as string | undefined) ?? undefined;

/**
 * Azure 是否已配置（key + region 同时存在）。
 */
export function isAzureConfigured(): boolean {
  return Boolean(AZURE_KEY && AZURE_REGION);
}

/**
 * 声音可用性缓存（按合成结果判定）。
 *
 * key = voice 名，value = true（合成成功）/ false（合成失败）。
 * 避免对同一不可用声音反复尝试。
 */
const voiceAvailabilityCache = new Map<string, boolean>();

/**
 * 用完整 SSML 尝试合成一次。
 *
 * 成功（HTTP 200 + 非空 blob）→ 返回 { ok: true, blob }
 * 失败（含声音不存在 / SSML 错误 / 网络错误）→ 返回 { ok: false }
 *
 * 失败时缓存"该声音不可用"结论，下次跳过。
 */
async function trySynthesize(
  voice: string,
  ssml: string,
  signal: AbortSignal,
): Promise<{ ok: true; blob: Blob } | { ok: false }> {
  // 已知不可用的声音直接跳过
  if (voiceAvailabilityCache.get(voice) === false) {
    return { ok: false };
  }

  const endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY as string,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
        "User-Agent": "half-blood-prince-study/0.1",
      },
      body: ssml,
      signal,
    });

    if (!res.ok) {
      // 400/404 通常是声音不存在或 SSML 错误，缓存为不可用
      if (res.status === 400 || res.status === 404) {
        voiceAvailabilityCache.set(voice, false);
      }
      return { ok: false };
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      voiceAvailabilityCache.set(voice, false);
      return { ok: false };
    }

    voiceAvailabilityCache.set(voice, true);
    return { ok: true, blob };
  } catch {
    return { ok: false };
  }
}

// Azure 播放状态
let azureAudioEl: HTMLAudioElement | null = null;
let azureAbortCtrl: AbortController | null = null;
let azureSpeaking = false;

const azureAdapter: SpeechAdapter = {
  name: "azure",

  async speak(opts: SpeakOptions): Promise<void> {
    // 防止叠加：先取消上一次
    azureAdapter.cancel();

    if (!isAzureConfigured()) {
      opts.onError?.(new Error("Azure TTS not configured"));
      opts.onEnd?.();
      return;
    }

    const profile = opts.profile ?? DEFAULT_VOICE_PROFILE;

    // 候选声音：opts.voice > profile.voices > env
    const candidates: string[] = [];
    if (opts.voice) candidates.push(opts.voice);
    if (profile.voices.length > 0) candidates.push(...profile.voices);
    if (AZURE_ENV_VOICE && !candidates.includes(AZURE_ENV_VOICE)) {
      candidates.push(AZURE_ENV_VOICE);
    }
    if (candidates.length === 0) {
      opts.onError?.(new Error("No voice candidate available"));
      opts.onEnd?.();
      return;
    }

    azureAbortCtrl = new AbortController();

    // 按候选顺序尝试合成，首个成功的即播放
    let result: { ok: true; blob: Blob } | { ok: false } = { ok: false };
    let usedVoice: string | null = null;

    for (const v of candidates) {
      const ssml = buildSsml({
        text: opts.text,
        voice: v,
        rate: opts.rate ?? profile.rate,
        pitch: opts.pitch ?? profile.pitch,
        volume: opts.volume ?? profile.volume,
        style: opts.style ?? profile.style ?? AZURE_DEFAULT_STYLE,
        breaks: profile.breaks,
        lang: opts.lang ?? "en-GB",
      });
      result = await trySynthesize(v, ssml, azureAbortCtrl.signal);
      if (result.ok) {
        usedVoice = v;
        break;
      }
    }

    if (!result.ok || !usedVoice) {
      opts.onError?.(
        new Error(`No available voice in candidates: ${candidates.join(", ")}`),
      );
      opts.onEnd?.();
      return;
    }

    const blob = result.blob;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    azureAudioEl = audio;
    azureSpeaking = true;
    opts.onStart?.();

    audio.onended = () => {
      azureSpeaking = false;
      URL.revokeObjectURL(url);
      azureAudioEl = null;
      opts.onEnd?.();
    };
    audio.onerror = () => {
      azureSpeaking = false;
      URL.revokeObjectURL(url);
      azureAudioEl = null;
      opts.onError?.(new Error("Audio playback failed"));
      opts.onEnd?.();
    };

    audio.play().catch((e) => {
      azureSpeaking = false;
      URL.revokeObjectURL(url);
      azureAudioEl = null;
      opts.onError?.(e);
      opts.onEnd?.();
    });
  },

  cancel(): void {
    if (azureAbortCtrl) {
      azureAbortCtrl.abort();
      azureAbortCtrl = null;
    }
    if (azureAudioEl) {
      azureAudioEl.onended = null;
      azureAudioEl.onerror = null;
      azureAudioEl.pause();
      azureAudioEl.src = "";
      azureAudioEl = null;
    }
    azureSpeaking = false;
  },

  isSpeaking(): boolean {
    return azureSpeaking;
  },
};

// ============= Browser Adapter (fallback) =============

/**
 * 浏览器是否支持 SpeechSynthesis。
 */
function hasBrowserSpeech(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * 选择英式英语声音（浏览器）。
 *
 * 优先级：
 *  1. lang === "en-GB"
 *  2. lang 以 "en-GB" 开头
 *  3. name 含 "UK" / "British" / "Daniel" / "Arthur" / "Oliver"
 *  4. 任意 en* 声音（fallback）
 *  5. undefined
 */
export function pickBritishVoice(): SpeechSynthesisVoice | undefined {
  if (!hasBrowserSpeech()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;

  const exact = voices.find((v) => v.lang === "en-GB");
  if (exact) return exact;

  const startsWith = voices.find((v) => v.lang.startsWith("en-GB"));
  if (startsWith) return startsWith;

  const byName = voices.find((v) => {
    const n = v.name.toLowerCase();
    return (
      n.includes("uk") ||
      n.includes("british") ||
      n.includes("daniel") ||
      n.includes("arthur") ||
      n.includes("oliver")
    );
  });
  if (byName) return byName;

  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  return anyEn;
}

const browserAdapter: SpeechAdapter = {
  name: "browser",

  speak(opts: SpeakOptions): void {
    if (!hasBrowserSpeech()) {
      opts.onError?.(new Error("Browser SpeechSynthesis not supported"));
      opts.onEnd?.();
      return;
    }

    // 防叠加
    window.speechSynthesis.cancel();

    const profile = opts.profile ?? DEFAULT_VOICE_PROFILE;

    // SpeakOptions 现在用 SSML 字符串（如 "-25%"），浏览器 adapter 解析回 number。
    // 解析失败时 fallback 到 profile / 内置默认值。
    const rateStr = opts.rate ?? profile.rate;
    const pitchStr = opts.pitch ?? profile.pitch;
    const volumeStr = opts.volume ?? profile.volume;

    const utterance = new SpeechSynthesisUtterance(opts.text);
    utterance.lang = opts.lang ?? "en-GB";
    utterance.rate = parsePercent(rateStr, 0.75);
    utterance.pitch = parsePercent(pitchStr, 0.92);
    utterance.volume = parseVolume(volumeStr, 1);

    const voice = pickBritishVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => opts.onStart?.();
    utterance.onend = () => opts.onEnd?.();
    utterance.onerror = (e) => {
      opts.onError?.(e);
      opts.onEnd?.();
    };

    // 略微延时以确保 cancel 完成
    window.setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 30);
  },

  cancel(): void {
    if (!hasBrowserSpeech()) return;
    window.speechSynthesis.cancel();
  },

  isSpeaking(): boolean {
    return hasBrowserSpeech() && window.speechSynthesis.speaking;
  },
};

/**
 * 将 SSML 百分比字符串解析为浏览器 SpeechSynthesis 比例值。
 *
 *   "-25%" → 0.75
 *   "+10%" → 1.10
 *   "0"    → 1.0（视为零偏移）
 *
 * 解析失败时返回 fallback。
 */
function parsePercent(s: string, fallback: number): number {
  if (!s) return fallback;
  const m = s.match(/^([+-]?\d+(?:\.\d+)?)%$/);
  if (!m) return fallback;
  const pct = parseFloat(m[1]);
  return 1 + pct / 100;
}

/**
 * 将 SSML volume 字符串（0–100）解析为浏览器 0–1 比例值。
 */
function parseVolume(s: string, fallback: number): number {
  if (!s) return fallback;
  const n = parseFloat(s);
  if (isNaN(n)) return fallback;
  return Math.min(1, Math.max(0, n / 100));
}

// ============= Adapter Selection =============

/**
 * 当前活跃 adapter。
 *
 * 优先级：Azure（若已配置）> Browser
 *
 * 未来扩展：在前面插入 ElevenLabs 等更高优先级的 adapter。
 */
function selectAdapter(): SpeechAdapter {
  if (isAzureConfigured()) return azureAdapter;
  return browserAdapter;
}

/**
 * 当前使用的 adapter 名（供调试/显示）。
 */
export function getActiveAdapterName(): "azure" | "browser" {
  return selectAdapter().name;
}

// ============= Public API =============

/**
 * 浏览器是否支持朗读。
 *
 * Azure 已配置 或 浏览器支持 SpeechSynthesis 时返回 true。
 */
export function isSpeechSupported(): boolean {
  return isAzureConfigured() || hasBrowserSpeech();
}

/**
 * 当前是否正在朗读。
 */
export function isSpeaking(): boolean {
  return selectAdapter().isSpeaking();
}

/**
 * 立即中断当前朗读。
 */
export function cancelSpeech(): void {
  selectAdapter().cancel();
}

/**
 * 朗读一段文本。
 *
 * 返回一个 token（nonce），可用于识别本次朗读。
 * 若当前已有朗读进行中，会先 cancel 再开始新朗读。
 */
export function speak(opts: SpeakOptions): symbol {
  const token = Symbol("speech");
  selectAdapter().speak(opts);
  return token;
}

/**
 * 等待声音列表就绪（仅浏览器 adapter 需要）。
 *
 * Azure adapter 无需等待，回调立即触发。
 */
export function onVoicesReady(cb: () => void): () => void {
  // Azure 模式下无需等待 voices
  if (isAzureConfigured()) {
    cb();
    return () => {};
  }
  if (!hasBrowserSpeech()) {
    cb();
    return () => {};
  }
  if (window.speechSynthesis.getVoices().length > 0) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  return () => {
    window.speechSynthesis.removeEventListener("voiceschanged", handler);
  };
}
