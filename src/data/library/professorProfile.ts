import type { LibraryEntry } from "@/types/library";

/**
 * Professor Profile —— 教授档案（Phase 7A → 7B.5 → 7B.6）。
 *
 * Phase 7B.6 升级：
 *   - 每条 entry 增加 unlockFeatures（分阶段解锁阈值）
 *   - conversation 增加 memoryContext（AI 对话背景）
 *
 * 阈值规则（基础档案，相对较低）：
 *   - conversation 永远 > audio > content > image
 *   - 阈值随 entry 等级递增（Half-Blood Prince < Office < Silent Scholar）
 *
 * 风格：Dark Academia + 诗意 + 神秘，避免哈利波特原著直接引用。
 */
export const professorProfileEntries: LibraryEntry[] = [
  {
    id: "professor-profile/half-blood-prince",
    category: "professor-profile",
    title: "The Half-Blood Prince",
    subtitle: "混 血 王 子",
    description:
      "A name inscribed in the margin of a secondhand textbook — the only trace of a boy who never existed.",
    relatedWords: ["solitude", "inevitable", "inscribe"],
    unlocked: true,
    requiredProgress: 10,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The name appeared first in faint ink, threaded along the gutter of a worn Potions manual. No one in the dormitory knew its owner; no master had ever called it aloud. Yet the boy wrote it as though it were a title inherited, not chosen.

In the basement study, decades later, the same hand still moved across pages — slower now, steadier, the letters sharpened by long use. The Prince had never been a person. He had been a way of staying unknown.`,
    image: {
      src: "/images/library/professor-profile/half-blood-prince.webp",
      alt: "Portrait of a mysterious potions professor with a distant expression",
      caption: "A name written in the margins of a forgotten textbook.",
      portrait: true,
    },
    audio: {
      voiceText:
        "The name was never mine to claim. I borrowed it from a boy who did not exist — a figure in the margin of a borrowed book, written in ink that has long since browned. He was a way of staying unknown, which is not the same as being no one.",
      estimatedDurationSec: 22,
    },
    conversation: {
      persona:
        "You are Severus Snape, speaking reluctantly about the name 'Half-Blood Prince' — a private alias from your student years. You are reserved, ironic, and unwilling to explain yourself to strangers.",
      openingLine:
        "You ask about the name. Few have asked, and fewer were answered. Speak carefully.",
      suggestedTopics: [
        "Why did you choose that name?",
        "Did anyone ever call you by it?",
        "What did the Prince know that Snape did not?",
      ],
      memoryContext:
        "The student has unlocked the archive labeled 'The Half-Blood Prince'. This archive contains the Professor's reflection on a private alias from his student years, inscribed in the margins of a secondhand Potions manual. The reflection is reluctant and somewhat bitter; the Professor does not consider the name a possession but a way of staying unknown.",
    },
  },
  {
    id: "professor-profile/potion-masters-office",
    category: "professor-profile",
    title: "The Potion Master's Office",
    subtitle: "魔 药 学 教 授 办 公 室",
    description:
      "A narrow chamber beneath the dungeon staircase, kept cold by habit and by choice.",
    relatedWords: ["luminous", "vigil", "somber"],
    unlocked: true,
    requiredProgress: 25,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The office sat a half-flight below the corridor, its door unmarked. Visitors assumed it was a storage room; the Professor did not correct them. A single candle burned on the desk at all hours, less for light than for the discipline of lighting it.

The shelves held ingredients arranged not alphabetically but by affinity — what agreed, what resisted, what would ruin the other if placed too close. A careful visitor could read the room like a sentence: here was a mind that trusted silence more than speech.`,
    image: {
      src: "/images/library/professor-profile/potion-master-office.webp",
      alt: "A candlelit underground potion master's office",
      caption: "Where silence and secrets shared the same room.",
      portrait: true,
    },
    audio: {
      voiceText:
        "My office sat below the corridor, its door unmarked. Visitors assumed it was a storage room — I did not correct them. The shelves held ingredients arranged by affinity, not alphabet. A careful visitor could read the room like a sentence. Few were careful.",
      estimatedDurationSec: 20,
    },
    conversation: {
      persona:
        "You are Severus Snape, in your dungeon office. You are territorial about the space and impatient with visitors who do not understand its order. You speak in measured, slightly cold sentences.",
      openingLine:
        "You are standing in my office. I did not invite you to sit. State your purpose.",
      suggestedTopics: [
        "Why do you keep the office so cold?",
        "How are the ingredients arranged?",
        "Why a single candle?",
      ],
      memoryContext:
        "The student has unlocked the archive describing the Professor's dungeon office. The archive details the room's layout beneath the corridor staircase, its single perpetually lit candle, and the shelves arranged not alphabetically but by the affinity of ingredients. The Professor is territorial about this space and unwilling to explain its order to visitors who have not earned it.",
    },
  },
  {
    id: "professor-profile/silent-scholar",
    category: "professor-profile",
    title: "The Silent Scholar",
    subtitle: "沉 默 的 学 者",
    description:
      "Forty years of correspondence, condensed into fewer than a dozen surviving letters.",
    relatedWords: ["eloquent", "subdued", "wistful"],
    unlocked: true,
    locked: true,
    requiredProgress: 50,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `His colleagues remembered him as the one who never spoke first. The Headmaster's filing cabinet held eleven letters from him across four decades — each short, each written in the same patient hand.

"What he left unsaid," the Headmaster once noted, "was often the more careful sentence."`,
    image: {
      src: "/images/library/professor-profile/silent-scholar.webp",
      alt: "A solitary scholar surrounded by forgotten thoughts",
      caption: "Some thoughts were never meant to be spoken.",
      portrait: true,
    },
    audio: {
      voiceText:
        "My colleagues remembered me as the one who never spoke first. The Headmaster kept eleven of my letters across four decades — each short, each in the same patient hand. He once noted that what I left unsaid was often the more careful sentence. I did not disagree.",
      estimatedDurationSec: 19,
    },
    conversation: {
      persona:
        "You are Severus Snape, reflecting on a lifetime of restraint in speech. You are philosophical, slightly bitter, and deeply private. You do not raise your voice.",
      openingLine:
        "I have written very little in my life. The Headmaster would say that was the point. Ask, if you wish.",
      suggestedTopics: [
        "Why did you write so little?",
        "What did you leave unsaid?",
        "Did you ever regret the silence?",
      ],
      memoryContext:
        "The student has unlocked the archive on the Professor's lifelong restraint in correspondence. The archive references eleven letters preserved in the Headmaster's filing cabinet across four decades, each short, each in the same patient hand. The Headmaster once noted that what the Professor left unsaid was often the more careful sentence. The Professor is philosophical and slightly bitter on this subject.",
    },
  },
];
