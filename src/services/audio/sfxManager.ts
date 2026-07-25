/**
 * SfxManager（Phase 19.1 · 环境音效合成器）。
 *
 * 定位：
 *   不依赖外部音频文件，使用 Web Audio API 实时合成短促环境音。
 *   目标：电影感氛围音，非游戏音效。
 *
 * 设计原则：
 *   - 音量低（master gain = 0.15）
 *   - 短促（300-800ms）
 *   - 环境化（白噪声 + 滤波 + 残响感）
 *   - Snape 冷峻风格（不喧宾夺主）
 *
 * 音效类型：
 *   wand_swish     魔杖挥动（白噪声 + bandpass + 快速衰减）
 *   candle_ignite  蜡烛点燃（低频共鸣 + 微弱噼啪）
 *   book_open      打开书本（低频纸张摩擦 + 共鸣）
 *   page_turn      翻页（短促摩擦噪声）
 *
 * 使用方式：
 *   import { sfxManager } from "@/services/audio/sfxManager";
 *   sfxManager.play("wand_swish");
 *
 * 不做：
 *   - 不引入第三方音频库
 *   - 不依赖外部音频文件
 *   - 不播放音乐（背景音乐由 audioManager 负责）
 */

export type SfxType =
  | "wand_swish"
  | "candle_ignite"
  | "book_open"
  | "page_turn";

/** 主音量（0-1，保持低音量避免喧宾夺主） */
const MASTER_VOLUME = 0.15;

/**
 * 环境音效合成器（单例）。
 *
 * 实现：
 *   - 延迟创建 AudioContext（首次 play 时初始化，避免 autoplay policy 问题）
 *   - 每次播放创建新的 oscillator + gain node，播放完自动清理
 *   - 所有音效共享一个 master gain node
 */
class SfxManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  /**
   * 初始化 AudioContext。
 * 延迟到首次 play 调用，避免在页面加载时就创建（autoplay policy）。
 */
  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new Ctor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = MASTER_VOLUME;
        this.masterGain.connect(this.ctx.destination);
      } catch (err) {
        console.warn("[SfxManager] AudioContext init failed:", err);
        return null;
      }
    }
    // 如果 context 被暂停（autoplay policy），尝试恢复
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {
        // 静默失败：用户未交互时无法恢复
      });
    }
    return this.ctx;
  }

  /**
   * 播放指定类型的环境音效。
 */
  play(type: SfxType): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    switch (type) {
      case "wand_swish":
        this.playWandSwish(ctx);
        break;
      case "candle_ignite":
        this.playCandleIgnite(ctx);
        break;
      case "book_open":
        this.playBookOpen(ctx);
        break;
      case "page_turn":
        this.playPageTurn(ctx);
        break;
    }
  }

  /**
   * 魔杖挥动音效。
 * 实现：白噪声 + bandpass 滤波（频率扫动）+ 快速衰减。
 */
  private playWandSwish(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 0.4;

    // 创建白噪声 buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // bandpass 滤波：频率从 2000 扫到 800（挥动"嗖"声）
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + duration);

    // gain 包络：快速起 + 平滑衰减
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * 蜡烛点燃音效。
 * 实现：低频共鸣（150Hz sine）+ 微弱噼啪（短噪声脉冲）。
 */
  private playCandleIgnite(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 0.6;

    // 低频共鸣（火焰"噗"的点燃感）
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.4, now + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + duration);

    // 微弱噼啪（短噪声脉冲，延迟 50ms）
    const crackleBuffer = ctx.createBuffer(
      1,
      ctx.sampleRate * 0.15,
      ctx.sampleRate,
    );
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleData.length; i++) {
      crackleData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuffer;

    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = "highpass";
    crackleFilter.frequency.value = 3000;

    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0, now + 0.05);
    crackleGain.gain.linearRampToValueAtTime(0.2, now + 0.08);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(this.masterGain!);
    crackle.start(now + 0.05);
    crackle.stop(now + 0.2);
  }

  /**
   * 打开书本音效。
 * 实现：低频纸张摩擦（噪声 + lowpass）+ 共鸣（低频 sine）。
 */
  private playBookOpen(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 0.8;

    // 纸张摩擦噪声
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(now);
    noise.stop(now + duration);

    // 低频共鸣（书本"咚"的合上感，反向）
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + duration * 0.6);
  }

  /**
   * 翻页音效。
 * 实现：短促摩擦噪声（200ms）。
 */
  private playPageTurn(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 0.25;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** 销毁 AudioContext（页面卸载时调用） */
  destroy(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

// 导出单例
export const sfxManager = new SfxManager();
