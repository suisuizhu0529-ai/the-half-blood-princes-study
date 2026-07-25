import type { LibraryEntry } from "@/types/library";

/**
 * Literary Archive —— 文学档案（Phase 7A → 7B.5 → 7B.6）。
 *
 * Phase 7B.6 升级：
 *   - 每条 entry 增加 unlockFeatures
 *   - conversation 增加 memoryContext
 *
 * 阈值规则（高难度）：
 *   - conversation 永远 > audio > content > image
 *   - Forgotten Wizard Text 阈值最高（匿名残篇）
 *
 * 风格：偏散文化、有引文感，用风格化的"伪引文"营造氛围。
 */
export const literaryArchiveEntries: LibraryEntry[] = [
  {
    id: "literary-archive/language-of-silence",
    category: "literary-archive",
    title: "The Language of Silence",
    subtitle: "沉 默 之 语",
    description:
      "A short essay on what is said by those who refuse to speak.",
    relatedWords: ["solitude", "eloquent", "whisper"],
    unlocked: true,
    requiredProgress: 30,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `"There is a grammar of silence," the essay began, "and it is more exact than the grammar of speech."

The author argued that every quiet held the shape of a sentence not yet released — that the listener, not the speaker, was responsible for hearing it. The essay ended without conclusion, as though its own argument had been swallowed by its subject.

In the margin, in green ink: "At last — someone who understood."`,
    image: {
      src: "/images/library/literary-archive/language-of-silence.webp",
      alt: "An open book on a desk, a single line of green ink in the margin",
      caption: "At last — someone who understood.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The essay began: there is a grammar of silence, and it is more exact than the grammar of speech. It argued that every quiet held the shape of a sentence not yet released — that the listener, not the speaker, was responsible for hearing it. In the margin, in green ink, I wrote: at last, someone who understood.",
      estimatedDurationSec: 21,
    },
    conversation: {
      persona:
        "You are Severus Snape, discussing the literature of silence. You are philosophical and dry, willing to recommend texts but unwilling to explain them.",
      openingLine:
        "If you wish to understand silence, read this essay. I will not summarise it for you.",
      suggestedTopics: [
        "What is the grammar of silence?",
        "Who wrote that essay?",
        "Why did you write 'at last' in the margin?",
      ],
      memoryContext:
        "The student has unlocked a short essay on the grammar of silence, with a single margin note in green ink reading 'At last — someone who understood.' The essay argues that silence has a grammar more exact than speech, and that the listener is responsible for hearing what is not said. The Professor is philosophical and dry on this subject, and unwilling to summarise the essay for the student.",
    },
  },
  {
    id: "literary-archive/art-of-knowledge",
    category: "literary-archive",
    title: "The Art of Knowledge",
    subtitle: "知 识 的 技 艺",
    description:
      "Notes toward a treatise on learning as a discipline rather than a gift.",
    relatedWords: ["inevitable", "austere", "venerate"],
    unlocked: true,
    requiredProgress: 65,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The notes listed twelve propositions, of which only the first three were fully developed:

I. Knowledge is not possessed; it is practised.
II. The student who asks what to read has already failed.
III. A library is a kind of confession — its shelves reveal what the reader has avoided.

The remaining nine were left as headings, the page abandoned mid-sentence.`,
    image: {
      src: "/images/library/literary-archive/art-of-knowledge.webp",
      alt: "A notebook page with twelve headings, only three developed",
      caption: "The page abandoned mid-sentence.",
      portrait: false,
    },
    audio: {
      voiceText:
        "I listed twelve propositions, of which I only developed the first three. Knowledge is not possessed; it is practised. The student who asks what to read has already failed. A library is a confession — its shelves reveal what the reader has avoided. The remaining nine I left as headings. The page was abandoned mid-sentence.",
      estimatedDurationSec: 22,
    },
    conversation: {
      persona:
        "You are Severus Snape, discussing the philosophy of learning. You are severe, didactic, and believe knowledge requires discipline rather than talent.",
      openingLine:
        "You wish to speak of knowledge. Then begin by admitting that you have practised too little of it.",
      suggestedTopics: [
        "What are the remaining nine propositions?",
        "Why is asking what to read a failure?",
        "What does a library confess?",
      ],
      memoryContext:
        "The student has unlocked notes toward a treatise on learning, listing twelve propositions of which only three are developed. The developed propositions frame knowledge as practice rather than possession, condemn the student who asks what to read, and describe a library as a confession of what the reader has avoided. The remaining nine propositions were left as headings, the page abandoned mid-sentence. The Professor is severe and didactic on this subject.",
    },
  },
  {
    id: "literary-archive/forgotten-wizard-text",
    category: "literary-archive",
    title: "Forgotten Wizard Text",
    subtitle: "遗 忘 的 巫 师 文 本",
    description:
      "A fragment of unknown authorship, found pressed between two unrelated volumes.",
    relatedWords: ["luminous", "vigil", "oblivion"],
    unlocked: true,
    requiredProgress: 90,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The fragment was a single page, both sides. The script was old enough that the ink had browned through the paper. The translation, where the words yielded to it:

"He who keeps the lamp lit through the long hour will not be remembered for the lamp. He will be remembered for the hour."

No title, no signature, no date. The Professor had slipped it between two Potions manuals, perhaps to keep it from being read too soon.`,
    image: {
      src: "/images/library/literary-archive/forgotten-wizard-text.webp",
      alt: "A single browned page pressed between two leather volumes",
      caption: "He will be remembered for the hour.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The fragment was a single page, both sides, old enough that the ink had browned through the paper. The translation, where the words yielded, read: he who keeps the lamp lit through the long hour will not be remembered for the lamp. He will be remembered for the hour. No title, no signature, no date. I had slipped it between two Potions manuals, perhaps to keep it from being read too soon.",
      estimatedDurationSec: 24,
    },
    conversation: {
      persona:
        "You are Severus Snape, custodian of an anonymous literary fragment. You are guarded about its provenance and reluctant to interpret it. You quote it sparingly.",
      openingLine:
        "A single page, both sides, no signature. I will not tell you where I found it. Read it yourself.",
      suggestedTopics: [
        "What does that fragment mean to you?",
        "Why did you hide it between two manuals?",
        "Who could have written it?",
      ],
      memoryContext:
        "The student has unlocked an anonymous literary fragment, a single browned page with no title, signature, or date, found pressed between two Potions manuals. The translation reads: 'He who keeps the lamp lit through the long hour will not be remembered for the lamp. He will be remembered for the hour.' The Professor is guarded about the fragment's provenance and reluctant to interpret it, quoting it sparingly.",
    },
  },
];
