/**
 * 统一音频管理服务（Phase 7F-1）。
 *
 * 职责：
 *   - 管理单个 HTMLAudioElement 实例
 *   - 播放 / 停止 / 暂停 / 恢复
 *   - 音量控制（从 localStorage "half-blood-prince-settings" 读取 volume）
 *   - 播放速度控制（从 localStorage 读取 speechSpeed）
 *   - 新的 play() 调用自动停止旧的播放
 *   - 错误处理：播放失败 catch 但不崩溃
 *
 * 使用原生 Web Audio API，不引入第三方库。
 * 支持未来扩展：Library archive audio、Vocabulary audio、Quote audio。
 */

const SETTINGS_KEY = "half-blood-prince-settings";

function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return (parsed[key] as unknown) !== undefined
      ? (parsed[key] as T)
      : defaultValue;
  } catch {
    return defaultValue;
  }
}

export class AudioManager {
  private audioEl: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;

  constructor() {
    // 初始化时创建 audio element
    this.audioEl = new Audio();
    this.audioEl.preload = "auto";
    // 初始音量
    this.applyVolume(loadSetting<number>("volume", 80));
    // 初始速度
    this.applySpeed(loadSetting<number>("speechSpeed", 1.0));
  }

  /**
   * 播放指定 URL 的音频。
   * 如果当前有播放，先停止再播放新的。
   */
  async play(url: string): Promise<void> {
    // 如果已经是同一个 URL，不做重复操作
    if (this.currentUrl === url && this.audioEl?.src === url) {
      return;
    }

    // 停止旧的
    this.stop();

    // 创建新的 audio element
    this.audioEl = new Audio();
    this.audioEl.preload = "auto";
    this.audioEl.src = url;
    this.currentUrl = url;

    // 应用当前设置
    this.applyVolume(loadSetting<number>("volume", 80));
    this.applySpeed(loadSetting<number>("speechSpeed", 1.0));

    try {
      await this.audioEl.play();
    } catch (err) {
      // 播放失败（如网络问题、格式不支持），catch 但不崩溃
      console.warn("[AudioManager] Play failed:", err);
      this.stop();
    }
  }

  /** 停止播放 */
  stop(): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      this.audioEl.src = "";
      this.audioEl = null;
    }
    this.currentUrl = null;
  }

  /** 暂停播放 */
  pause(): void {
    if (this.audioEl) {
      this.audioEl.pause();
    }
  }

  /** 恢复播放 */
  resume(): void {
    if (this.audioEl && this.currentUrl) {
      try {
        this.audioEl.play();
      } catch (err) {
        console.warn("[AudioManager] Resume failed:", err);
      }
    }
  }

  /** 设置音量 (0-100) */
  setVolume(value: number): void {
    this.applyVolume(value);
  }

  /** 获取当前音量 */
  getVolume(): number {
    return this.audioEl ? this.audioEl.volume * 100 : 80;
  }

  /** 设置播放速度 (0.5-2.0) */
  setPlaybackSpeed(speed: number): void {
    this.applySpeed(speed);
  }

  /** 获取当前播放速度 */
  getPlaybackSpeed(): number {
    return this.audioEl ? this.audioEl.playbackRate : 1.0;
  }

  /** 销毁实例，释放资源 */
  destroy(): void {
    this.stop();
  }

  /** 获取当前播放状态 */
  get isPlaying(): boolean {
    return !!this.audioEl && !this.audioEl.paused;
  }

  /** 获取当前播放进度（秒） */
  get currentTime(): number {
    return this.audioEl ? this.audioEl.currentTime : 0;
  }

  /** 获取音频总时长（秒） */
  get duration(): number {
    return this.audioEl ? this.audioEl.duration : 0;
  }

  /** 跳转到指定时间（秒） */
  seek(time: number): void {
    if (this.audioEl) {
      this.audioEl.currentTime = time;
    }
  }

  // ---- Private helpers ----

  private applyVolume(value: number): void {
    if (this.audioEl) {
      this.audioEl.volume = Math.max(0, Math.min(100, value)) / 100;
    }
  }

  private applySpeed(speed: number): void {
    if (this.audioEl) {
      this.audioEl.playbackRate = Math.max(0.5, Math.min(2.0, speed));
    }
  }
}

// 导出单例
export const audioManager = new AudioManager();
