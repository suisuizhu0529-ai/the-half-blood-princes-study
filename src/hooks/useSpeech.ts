import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelSpeech,
  isSpeechSupported,
  onVoicesReady,
  speak,
} from "@/utils/speech";
import {
  DEFAULT_VOICE_PROFILE,
  type VoiceProfile,
} from "@/voice/profiles";

export interface UseSpeechOptions {
  /** Voice Profile（Phase 3B）。默认 Potions Master */
  profile?: VoiceProfile;
  /**
   * 默认语速覆盖（SSML 字符串，如 "-25%"）。
   * 留空则使用 profile.rate。
   *
   * 注意：Phase 3B 升级后字段类型由 number 改为 string。
   * 调用方若仍传 number 会被 TypeScript 拒绝——这是有意的，
   * 强制使用与 profile 同尺度。
   */
  rate?: string;
  /** 默认音调覆盖（SSML 字符串，如 "-8%"） */
  pitch?: string;
  /** 默认音量覆盖（SSML 字符串，如 "100"） */
  volume?: string;
}

export interface SpeakParams {
  text: string;
  /** 覆盖默认 rate（SSML 字符串） */
  rate?: string;
  /** 覆盖默认 pitch（SSML 字符串） */
  pitch?: string;
}

export interface UseSpeechReturn {
  /** 是否正在朗读 */
  speaking: boolean;
  /** 浏览器是否支持 SpeechSynthesis */
  supported: boolean;
  /** 声音是否已就绪（voiceschanged 后置 true） */
  ready: boolean;
  /** 朗读一段文本（已自动取消上一次朗读，防重复） */
  speak: (params: SpeakParams) => void;
  /** 立即停止 */
  stop: () => void;
}

/**
 * 朗读状态管理 hook。
 *
 * - 自动取消上一次朗读，避免多个 speech 叠加
 * - speaking 状态由 adapter 事件驱动
 * - 组件卸载时自动停止当前朗读
 * - 等待 voices 就绪后才允许触发（避免首帧空声音列表）
 *
 * Phase 3B 升级：
 *   - 默认使用 PROFESSOR_PROFILE（Potions Master）
 *   - rate / pitch 改为 SSML 字符串（与 VoiceProfile 一致）
 *
 * 架构上不直接耦合 Azure / SpeechSynthesis，未来替换为 Piper TTS 时
 * 只需修改 src/utils/speech.ts 的实现，本 hook 与调用方不变。
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const {
    profile = DEFAULT_VOICE_PROFILE,
    rate: rateOverride,
    pitch: pitchOverride,
    volume: volumeOverride,
  } = options;

  // 默认值优先级：override > profile
  const defaultRate = rateOverride ?? profile.rate;
  const defaultPitch = pitchOverride ?? profile.pitch;
  const defaultVolume = volumeOverride ?? profile.volume;

  const supported = isSpeechSupported();
  const [speaking, setSpeaking] = useState(false);
  const [ready, setReady] = useState(() => {
    if (!supported) return false;
    // Azure 模式或浏览器无 SpeechSynthesis 时立即就绪
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return true;
    }
    return window.speechSynthesis.getVoices().length > 0;
  });

  // 防止 onEnd 在组件卸载后触发 setSpeaking
  const aliveRef = useRef(true);
  // profile 引用可能在调用方变化时切换，用 ref 保留最新值
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      cancelSpeech();
    };
  }, []);

  // 等待 voices 就绪
  useEffect(() => {
    if (!supported) return;
    if (ready) return;
    const dispose = onVoicesReady(() => setReady(true));
    return dispose;
  }, [supported, ready]);

  const speakFn = useCallback(
    (params: SpeakParams) => {
      if (!supported) return;
      // 防重复触发多个 speech
      cancelSpeech();
      setSpeaking(true);
      speak({
        text: params.text,
        profile: profileRef.current,
        rate: params.rate ?? defaultRate,
        pitch: params.pitch ?? defaultPitch,
        volume: defaultVolume,
        onStart: () => {
          if (aliveRef.current) setSpeaking(true);
        },
        onEnd: () => {
          if (aliveRef.current) setSpeaking(false);
        },
        onError: () => {
          if (aliveRef.current) setSpeaking(false);
        },
      });
    },
    [supported, defaultRate, defaultPitch, defaultVolume],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    cancelSpeech();
    if (aliveRef.current) setSpeaking(false);
  }, [supported]);

  return {
    speaking,
    supported,
    ready,
    speak: speakFn,
    stop,
  };
}
