/**
 * Settings persistence hook — localStorage backed.
 *
 * Key: "half-blood-prince-settings"
 * Values survive page reloads and browser restarts.
 */

import { useCallback, useState } from "react";

export interface UserSettings {
  voiceEnabled: boolean;
  volume: number;         // 0–100
  speechSpeed: number;    // 0.5–2.0
  autoPlayVocabulary: boolean;
  autoPlayQuote: boolean;
  reduceAnimation: boolean;
  musicEnabled: boolean;  // 氛围音乐开关
  musicVolume: number;    // 0–100
}

const STORAGE_KEY = "half-blood-prince-settings";

const DEFAULT_SETTINGS: UserSettings = {
  voiceEnabled: true,
  volume: 80,
  speechSpeed: 1.0,
  autoPlayVocabulary: false,
  autoPlayQuote: false,
  reduceAnimation: false,
  musicEnabled: false,
  musicVolume: 30,
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * React hook that manages user settings with localStorage persistence.
 *
 * Exposes:
 *   - `settings`: current settings snapshot (always up-to-date in state)
 *   - `setValue(key, value)`: update a single field and persist
 *   - `resetSettings()`: restore defaults and persist
 *   - `getSetting(key)`: read a setting outside of React render cycle
 */
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const setValue = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  /**
   * Imperative getter — returns the latest persisted settings.
   * Useful for non-React callers (e.g. utils/speech adapter) that
   * need to read the current volume/speed without a render cycle.
   */
  const getSetting = useCallback(<K extends keyof UserSettings>(key: K): UserSettings[K] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS[key];
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return (parsed[key] ?? DEFAULT_SETTINGS[key]) as UserSettings[K];
    } catch {
      return DEFAULT_SETTINGS[key];
    }
  }, []);

  return { settings, setValue, resetSettings, getSetting };
}
