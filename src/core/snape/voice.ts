/**
 * SnapeVoice（Phase 17.1-C Step 2）。
 *
 * 定位：Snape 专属语音 profile（domain 层）。
 *   - 基于 PROFESSOR_PROFILE，但独立配置
 *   - 不污染 @/voice/profiles 的默认 profile
 *   - 供未来 SnapeWhisper 调用 useSpeech 时使用
 *
 * 设计意图：
 *   Snape 未来可能有多种语音模式：
 *     - Whisper 模式（低语，更慢更轻）
 *     - Lesson 模式（教学，正常节奏）
 *     - Story 模式（叙事，更慢更戏剧）
 *
 *   现在不实现这些模式，但保留独立 profile，
 *   避免直接修改 PROFESSOR_PROFILE 影响其他功能。
 *
 * Step 2 范围：
 *   - 独立 SNAPE_VOICE_PROFILE（基于 PROFESSOR_PROFILE 覆盖）
 *   - rate / pitch 略微调慢调低（Whisper 倾向）
 *
 * 不做：
 *   - 不修改 @/voice/profiles
 *   - 不创建多模式（Whisper/Lesson/Story 留待后续）
 *   - 不接入 useSpeech（由 SnapeWhisper 组件负责，Step 3+）
 */

import { PROFESSOR_PROFILE, type VoiceProfile } from "@/voice/profiles";

/**
 * Snape 语音 profile。
 *
 * 基于 PROFESSOR_PROFILE（Potions Master）：
 *   - voices: en-GB-RyanNeural → fallback ThomasNeural → SoniaNeural
 *   - style: "calm"
 *
 * 覆盖项（Whisper 倾向）：
 *   - id: "snape-whisper"（独立标识）
 *   - name: "Snape Whisper"
 *   - rate: -15%（比 PROFESSOR 的 -12% 略慢）
 *   - pitch: -18%（比 PROFESSOR 的 -15% 略低）
 *   - volume: 90（略低于默认 100，低语感）
 *
 * 注意：此处用 spread + 覆盖，不修改原 PROFESSOR_PROFILE 对象。
 */
export const SNAPE_VOICE_PROFILE: VoiceProfile = {
  ...PROFESSOR_PROFILE,
  id: "snape-whisper",
  name: "Snape Whisper",
  nameZh: "斯内普低语",
  description: "克制而低沉——书房角落的观察者",
  rate: "-15%",
  pitch: "-18%",
  volume: "90",
};
