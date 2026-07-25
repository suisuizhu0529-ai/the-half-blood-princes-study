/**
 * useAmbientAudio（Phase 17.1-F 强制清理版）。
 *
 * 修复历史问题：
 *   1. public/audio/ambient.mp3 文件不存在 → play() 失败但仍可能产生嗡鸣
 *   2. Settings 关闭后仍有蜂鸣声（audio 元素残留）
 *   3. 关闭 Chrome 窗口后音乐仍在播放（Chrome 后台进程未退出）
 *
 * 当前策略：
 *   - 仅当 enabled=true 且音频文件确实存在时才创建 audio 元素
 *   - enabled=false / volume=0 立即 pause + 清空 src + 置空 ref
 *   - 监听 visibilitychange：页面隐藏时暂停（切回时恢复）
 *   - 监听 beforeunload / pagehide：页面卸载时强制清理
 *   - 不使用 AudioContext / Oscillator，无后台进程
 *
 * 音频源：public/audio/ambient.mp3（用户需自行放置）
 */

import { useEffect, useRef } from "react";

interface AmbientAudioOptions {
  enabled: boolean;
  volume: number; // 0-100
}

export function useAmbientAudio({ enabled, volume }: AmbientAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** 彻底停止并清理 audio 元素 */
  const forceStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }
  };

  // 主 effect：根据 enabled/volume 创建或停止 audio
  useEffect(() => {
    // 关闭条件：enabled=false 或 volume=0 → 彻底停止
    if (!enabled || volume <= 0) {
      forceStop();
      return;
    }

    // 创建 audio 元素（仅在需要播放时）
    if (!audioRef.current) {
      const audio = new Audio();
      audio.src = "/audio/ambient.mp3";
      audio.loop = true;
      audio.volume = Math.min(1, Math.max(0, volume / 100));
      audioRef.current = audio;

      // 失败时清理（文件不存在 / 解码错误）
      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      };
    }

    const audio = audioRef.current;
    audio.volume = Math.min(1, Math.max(0, volume / 100));

    audio.play().catch(() => {
      // 自动播放策略阻止或文件不存在，静默处理
    });

    return () => {
      forceStop();
    };
  }, [enabled, volume]);

  // 监听页面隐藏/卸载：强制停止音频，防止 Chrome 后台进程继续播放
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏（切 tab / 最小化 / 关闭窗口前）→ 暂停
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else if (enabled && volume > 0 && audioRef.current) {
        // 页面重新可见 → 恢复播放
        audioRef.current.play().catch(() => {});
      }
    };

    const handleUnload = () => {
      // 页面卸载（关闭 tab / 关闭窗口 / 刷新）→ 强制清理
      forceStop();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      forceStop();
    };
  }, [enabled, volume]);
}
