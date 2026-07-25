import type { LibraryEntry } from "@/types/library";

/**
 * Hogwarts Documents —— 霍格沃茨文件（Phase 7A → 7B.5 → 7B.6）。
 *
 * Phase 7B.6 升级：
 *   - 每条 entry 增加 unlockFeatures
 *   - conversation 增加 memoryContext
 *
 * 阈值规则（中高难度）：
 *   - conversation 永远 > audio > content > image
 *   - Professor Archive File 阈值最高（密封档案）
 *
 * 风格：偏档案体、克制的官方语气，夹杂私人注脚。
 */
export const hogwartsDocumentsEntries: LibraryEntry[] = [
  {
    id: "hogwarts-documents/potion-examination-record",
    category: "hogwarts-documents",
    title: "Potion Examination Record",
    subtitle: "魔 药 学 考 试 记 录",
    description:
      "Annual examination reports, annotated by the examiner in a single shade of green ink.",
    relatedWords: ["eloquent", "inevitable", "candid"],
    unlocked: true,
    requiredProgress: 20,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The record spanned four decades. Each year listed the same column headings: Student, Mark, Remark. The Remarks, in the Professor's hand, were never longer than three words.

1981 — "Promising, if patient."
1996 — "Patient, if listened to."
2004 — "Listened, at last."

The examiner's tone did not soften with age. It simply grew quieter.`,
    image: {
      src: "/images/library/hogwarts-documents/potion-exam-record.webp",
      alt: "A leather-bound examination ledger, entries in green ink",
      caption: "Three words, never more.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The record spanned four decades. Each year carried the same headings: Student, Mark, Remark. My remarks were never longer than three words. The tone did not soften with age. It simply grew quieter.",
      estimatedDurationSec: 17,
    },
    conversation: {
      persona:
        "You are Severus Snape, reviewing decades of examination records. You are dry, precise, and quietly proud of the consistency of your judgment.",
      openingLine:
        "Forty years of examinations. The same headings. Read the third column carefully.",
      suggestedTopics: [
        "What did 'Patient, if listened to' mean?",
        "Did any student surprise you?",
        "Why only three words?",
      ],
      memoryContext:
        "The student has unlocked four decades of Potion examination records, annotated in green ink with remarks never longer than three words. The remarks grew quieter with age rather than softer. The Professor is dry and quietly proud of the consistency of his judgment across this record.",
    },
  },
  {
    id: "hogwarts-documents/ancient-research-notes",
    category: "hogwarts-documents",
    title: "Ancient Research Notes",
    subtitle: "古 代 研 究 笔 记",
    description:
      "Loose pages recovered from the dungeon archive, attributed to a former Head of Slytherin.",
    relatedWords: ["luminous", "reverie", "oblivion"],
    unlocked: true,
    requiredProgress: 60,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The pages were undated and unsigned, written in a hand two centuries older than the present building. The Professor had indexed them by subject but never quoted them aloud.

One fragment, half-burned, read: "A memory unrecorded is a memory not yet owed. Choose carefully what you write."`,
    image: {
      src: "/images/library/hogwarts-documents/ancient-research-notes.webp",
      alt: "Yellowed loose pages with browned ink, edges charred",
      caption: "A memory unrecorded is a memory not yet owed.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The pages were undated and unsigned, two centuries older than the present building. I had indexed them by subject, but never quoted them aloud. One fragment, half-burned, read: a memory unrecorded is a memory not yet owed. Choose carefully what you write.",
      estimatedDurationSec: 18,
    },
    conversation: {
      persona:
        "You are Severus Snape, custodian of ancient Slytherin research notes. You are protective of the archive and unwilling to interpret it for strangers. You quote sparingly.",
      openingLine:
        "These pages are older than the castle's present stones. I have indexed them. I will not interpret them for you.",
      suggestedTopics: [
        "Who wrote these pages?",
        "What does that fragment mean?",
        "Why did you never quote them aloud?",
      ],
      memoryContext:
        "The student has unlocked undated, unsigned research pages attributed to a former Head of Slytherin, two centuries older than the present building. The Professor has indexed them by subject but never quoted them aloud. One fragment, half-burned, reads: 'A memory unrecorded is a memory not yet owed. Choose carefully what you write.' The Professor is protective of this archive and unwilling to interpret it.",
    },
  },
  {
    id: "hogwarts-documents/professor-archive-file",
    category: "hogwarts-documents",
    title: "Professor Archive File",
    subtitle: "教 授 档 案 文 件",
    description:
      "A sealed personnel file in the Headmaster's cabinet, marked to be opened only by succession.",
    relatedWords: ["solitude", "endure", "resolute"],
    unlocked: true,
    requiredProgress: 100,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The file's existence was known to three people, two of whom had since died. Its contents were summarised on the envelope in a single line:

"For the one who comes after — should there be one."

The envelope had not been opened. The wax was intact.`,
    image: {
      src: "/images/library/hogwarts-documents/professor-archive-file.webp",
      alt: "A sealed envelope in red wax, resting in a wooden drawer",
      caption: "The wax was intact.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The file's existence was known to three people, two of whom had since died. Its contents were summarised on the envelope in a single line: for the one who comes after — should there be one. The envelope had not been opened. The wax was intact.",
      estimatedDurationSec: 17,
    },
    conversation: {
      persona:
        "You are Severus Snape, aware of your own sealed personnel file in the Headmaster's cabinet. You are reflective, slightly mortal, and unwilling to discuss what the file contains.",
      openingLine:
        "There is a file with my name on it, sealed in wax. I will not describe its contents. Ask something else.",
      suggestedTopics: [
        "Who are the three who knew?",
        "What is the file for?",
        "Have you considered opening it?",
      ],
      memoryContext:
        "The student has unlocked knowledge of a sealed personnel file in the Headmaster's cabinet, marked 'For the one who comes after — should there be one.' The file's existence was known to three people, two of whom have since died. The wax is intact; the file has not been opened. The Professor is reflective and slightly mortal on this subject, and unwilling to discuss the file's contents.",
    },
  },
];
