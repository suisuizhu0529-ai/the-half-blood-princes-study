/**
 * Voice Profile 定义（Phase 3B 升级版）。
 *
 * 关键变化：
 *   - rate / pitch 直接用 SSML 字符串（如 "-25%"），避免比例尺换算歧义
 *   - 停顿规则独立配置，按句号 / 逗号 / 关键词前分级
 *   - 导出 PROFESSOR_PROFILE / NARRATOR_PROFILE 两个预设
 *
 * 调音目标：
 *   Dark Academia / Hogwarts Professor，而非单纯低音。
 *   避免过度降低 pitch 导致鼻音增强。
 *   重点通过慢速 + 停顿 + 节奏提升教授感。
 */

export interface BreakRules {
  /** 句号后停顿 ms（500–700） */
  period: number;
  /** 逗号后停顿 ms（200–300） */
  comma: number;
  /** 分号后停顿 ms */
  semicolon: number;
  /** 冒号后停顿 ms */
  colon: number;
  /** 关键词前停顿 ms（300–500） */
  beforeKeyword: number;
}

/**
 * 需要在朗读前插入停顿的关键词（Phase 3B 精修版）。
 *
 * 只保留少量高分量词汇，避免每个关键词都停顿导致机械感。
 *
 * 选择标准：与 Dark Academia / Snape 气质强相关的核心意象词。
 */
export const KEYWORDS_FOR_BREAK = [
  "truth",
  "silence",
  "shadow",
  "eternal",
  "inevitable",
  "solitude",
];

export interface VoiceProfile {
  /** 唯一标识 */
  id: string;
  /** 显示名（英文） */
  name: string;
  /** 显示名（中文） */
  nameZh: string;
  /** 描述 */
  description: string;
  /**
   * Azure 声音名，按优先级排列。
   * 第一个可用的会被使用，其余作为 fallback。
   */
  voices: string[];
  /** SSML prosody rate 字符串，如 "-25%" */
  rate: string;
  /** SSML prosody pitch 字符串，如 "-8%" */
  pitch: string;
  /** SSML prosody volume 字符串，如 "100" */
  volume: string;
  /** 停顿规则 */
  breaks: BreakRules;
  /** Azure express-as 风格（可选） */
  style?: string;
}

/**
 * Potions Master（默认）。
 *
 * Phase 3B 精修调音（解决"人机感 / 偏慢 / 机械停顿 / 偏高"）：
 *   - voices: en-GB-RyanNeural（更低沉成熟）→ fallback ThomasNeural → SoniaNeural
 *   - rate:   -12%   自然教授讲话节奏（不再 -25% 机器人慢速）
 *   - pitch:  -15%   降低音高，接近 Snape 式压迫感，但保持自然
 *   - 句号后 400ms / 逗号 150ms / 关键词前 250ms（更短、更自然）
 *   - style:  "calm"  mstts:express-as 启用，增加从容感
 *
 * 感觉：英式教授、克制、低沉、思辨、压迫而不阴沉。
 *
 * 注意：RyanNeural 在某些 region 可能未部署，
 * Azure adapter 会缓存失败结果并自动 fallback 到 ThomasNeural。
 */
export const PROFESSOR_PROFILE: VoiceProfile = {
  id: "potions-master",
  name: "Potions Master",
  nameZh: "魔药教授",
  description: "低沉而不压抑，缓慢而不迟滞——夜书房里的英式教授",
  voices: ["en-GB-RyanNeural", "en-GB-ThomasNeural", "en-GB-SoniaNeural"],
  rate: "-12%",
  pitch: "-15%",
  volume: "100",
  style: "calm",
  breaks: {
    period: 400,
    comma: 150,
    semicolon: 300,
    colon: 300,
    beforeKeyword: 250,
  },
};

/**
 * Narrator（备用，未启用）。
 *
 * 调音思路：
 *   - 更接近有声书旁白的中性声音
 *   - 节奏稍快，但仍保持 Dark Academia 气质
 *
 * 未来 Settings 页面可让用户在 PROFESSOR / NARRATOR 之间切换。
 */
export const NARRATOR_PROFILE: VoiceProfile = {
  id: "narrator",
  name: "Narrator",
  nameZh: "旁白",
  description: "克制而清亮——适合长段朗读的旁白声",
  voices: ["en-GB-ThomasNeural", "en-GB-SoniaNeural"],
  rate: "-10%",
  pitch: "-8%",
  volume: "100",
  breaks: {
    period: 400,
    comma: 150,
    semicolon: 300,
    colon: 300,
    beforeKeyword: 250,
  },
};

/**
 * 所有内置 Voice Profile。
 *
 * 未来 Settings 页面：渲染 VOICE_PROFILES 下拉，让用户选择。
 */
export const VOICE_PROFILES: VoiceProfile[] = [
  PROFESSOR_PROFILE,
  NARRATOR_PROFILE,
];

/**
 * 默认 Voice Profile：Potions Master。
 */
export const DEFAULT_VOICE_PROFILE: VoiceProfile = PROFESSOR_PROFILE;

/**
 * 根据 id 查找 Voice Profile。
 */
export function findVoiceProfile(id: string): VoiceProfile | undefined {
  return VOICE_PROFILES.find((p) => p.id === id);
}
