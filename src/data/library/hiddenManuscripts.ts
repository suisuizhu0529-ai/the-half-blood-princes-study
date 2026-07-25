import type { LibraryEntry } from "@/types/library";

/**
 * Hidden Manuscripts —— 隐秘手稿（Phase 7A → 7B.5 → 7B.6 → 7B.7）。
 *
 * Phase 7B.6 升级：
 *   - 每条 entry 增加 unlockFeatures（仅 image/content/audio，无 conversation）
 *   - 神秘档案不开放 AI 对话，故 unlockFeatures 不含 conversation 字段
 *
 * Phase 7B.7 调整：
 *   - requiredProgress 从 undefined 改为高门槛（120/180/250）
 *   - 不再永久 sealed，改为"高门槛可解锁"
 *   - 原 sealed 行为由 archiveUnlock.ts 自动转为 locked（有 requiredProgress 即非 sealed）
 *   - conversation 永远最高等级：神秘档案不开放 conversation 字段
 *
 * 阈值规则（最高难度）：
 *   - requiredProgress < unlockFeatures.image < content < audio
 *   - 阈值整体高于其他分类
 *   - Final Page 阈值最高（最神秘）
 *
 * 风格：克制到近乎空白，用"未说出口"代替"已写下"。
 */
export const hiddenManuscriptsEntries: LibraryEntry[] = [
  {
    id: "hidden-manuscripts/unsigned-letter",
    category: "hidden-manuscripts",
    title: "Unsigned Letter",
    subtitle: "未 署 名 信 件",
    description: "A single folded page, found in the desk after the office was cleared.",
    relatedWords: ["solitude", "lament"],
    unlocked: true,
    // Phase 7B.7：从 undefined 改为高门槛 120（可解锁，不再 sealed）
    requiredProgress: 120,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      // conversation 故意省略：神秘档案不开放 AI 对话
    },
    content: `The letter bore no salutation and no signature. It read, in full:

"If you are reading this, I was wrong about the hour."

The page had been refolded along its original creases, as though to be replaced exactly where it had been found.`,
    image: {
      src: "/images/library/hidden-manuscripts/unsigned-letter.webp",
      alt: "A single folded page on an empty desk, no signature visible",
      caption: "Refolded along its original creases.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The letter bore no salutation and no signature. It read, in full: if you are reading this, I was wrong about the hour. I will say no more.",
      estimatedDurationSec: 11,
    },
    // conversation 故意省略：神秘档案不开放 AI 对话
  },
  {
    id: "hidden-manuscripts/seventh-drawer",
    category: "hidden-manuscripts",
    title: "The Seventh Drawer",
    subtitle: "第 七 个 抽 屉",
    description: "A cabinet with eleven drawers — only ten of which were ever opened.",
    relatedWords: ["inevitable", "somber"],
    unlocked: true,
    locked: true,
    // Phase 7B.7：从 undefined 改为高门槛 180（可解锁，不再 sealed）
    requiredProgress: 180,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      // conversation 故意省略：神秘档案不开放 AI 对话
    },
    content: `The seventh drawer had no key. The Professor had never been seen to attempt it, nor to acknowledge its presence. Students who lingered after class reported that the drawer, when knocked, returned a sound unlike the others — heavier, as though something inside absorbed the blow.

Nothing further is recorded.`,
    image: {
      src: "/images/library/hidden-manuscripts/seventh-drawer.webp",
      alt: "An apothecary cabinet, one drawer slightly ajar, brass keyhole empty",
      caption: "Nothing further is recorded.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The seventh drawer had no key. I was never seen to attempt it. When knocked, it returned a sound unlike the others — heavier, as though something inside absorbed the blow. Nothing further is recorded.",
      estimatedDurationSec: 13,
    },
    // conversation 故意省略：神秘档案不开放 AI 对话
  },
  {
    id: "hidden-manuscripts/final-page",
    category: "hidden-manuscripts",
    title: "The Final Page",
    subtitle: "最 后 一 页",
    description: "A page torn cleanly from a bound volume, kept face-down beneath a paperweight.",
    relatedWords: ["vigil", "luminous", "oblivion"],
    unlocked: true,
    locked: true,
    // Phase 7B.7：从 undefined 改为高门槛 250（可解锁，不再 sealed）
    requiredProgress: 250,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      // conversation 故意省略：神秘档案不开放 AI 对话
    },
    content: `The page was turned face-down, weighted by a small glass orb. On its reverse — the side the Professor had not wished to see — was a single line of script, the ink faded nearly to nothing.

Whoever lifted the orb, the page remained face-down. It had not been read in the Professor's lifetime, and he had not instructed anyone to read it after.`,
    image: {
      src: "/images/library/hidden-manuscripts/final-page.webp",
      alt: "A page under a glass paperweight, turned face-down",
      caption: "It had not been read in his lifetime.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The page was turned face-down, weighted by a glass orb. On its reverse was a single line of script, faded nearly to nothing. Whoever lifted the orb, the page remained face-down. It had not been read in my lifetime.",
      estimatedDurationSec: 13,
    },
    // conversation 故意省略：神秘档案不开放 AI 对话
  },
];
