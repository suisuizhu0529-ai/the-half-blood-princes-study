import type { LibraryEntry } from "@/types/library";

/**
 * Potion Research —— 魔药研究（Phase 7A → 7B.5 → 7B.6）。
 *
 * Phase 7B.6 升级：
 *   - 每条 entry 增加 unlockFeatures（分阶段解锁阈值）
 *   - conversation 增加 memoryContext
 *
 * 阈值规则（中等难度，高于 Professor Profile）：
 *   - conversation 永远 > audio > content > image
 *   - 罕见材料阈值最高
 *
 * 风格：克制、精确、带哲思。
 */
export const potionResearchEntries: LibraryEntry[] = [
  {
    id: "potion-research/draught-of-living-death",
    category: "potion-research",
    title: "Draught of Living Death",
    subtitle: "活 地 死 亡 剂",
    description:
      "A sleeping potion so complete that the untrained hand mistakes its result for death itself.",
    relatedWords: ["luminous", "vigil", "somber"],
    unlocked: true,
    requiredProgress: 15,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The draught required a single hair of sopophorous bean, sliced along the grain — never across. Most students never learned the difference; their potions clouded, then settled into a grey nothing.

The Professor's notes recorded fourteen attempts across six years. The final margin reads: "The trick is not in the cut, but in the patience before the cut."`,
    image: {
      src: "/images/library/potion-research/draught-living-death.webp",
      alt: "A pewter cauldron emitting pale silver vapour, a knife resting beside it",
      caption: "The patience before the cut.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The draught required a single hair of sopophorous bean, sliced along the grain — never across. Most students never learned the difference. Their potions clouded, then settled into a grey nothing. The trick was not in the cut. The trick was in the patience before the cut.",
      estimatedDurationSec: 20,
    },
    conversation: {
      persona:
        "You are Severus Snape, instructing a careful student on the Draught of Living Death. You are exacting, slightly impatient, but willing to teach those who show patience.",
      openingLine:
        "The Draught is not a potion for the careless. If you have come to learn it, begin by holding the knife correctly.",
      suggestedTopics: [
        "Why must the bean be sliced along the grain?",
        "What happens if the cut is wrong?",
        "How long did it take you to master it?",
      ],
      memoryContext:
        "The student has unlocked research notes on the Draught of Living Death, a powerful sleeping potion. The notes record fourteen attempts across six years and emphasise that the difficulty lies not in the cut itself but in the patience required before it. The Professor is exacting with students on this subject and intolerant of carelessness.",
    },
  },
  {
    id: "potion-research/advanced-potion-theory",
    category: "potion-research",
    title: "Advanced Potion Theory",
    subtitle: "高 级 魔 药 理 论",
    description:
      "Principles written in the margin of a library copy, never returned.",
    relatedWords: ["eloquent", "austere"],
    unlocked: true,
    locked: true,
    requiredProgress: 40,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `Three axioms, copied in his student hand and never amended:

1. A potion is a sentence; an ingredient is a word. Words do not save sentences — order does.
2. Heat is a kind of grammar. Boil too soon and the verb will not agree with its subject.
3. The finished potion should be no louder than a whisper. If it speaks, it has been rushed.`,
    image: {
      src: "/images/library/potion-research/advanced-potion-theory.webp",
      alt: "An old library book open to a page with handwritten margin notes",
      caption: "Three axioms, never amended.",
      portrait: false,
    },
    audio: {
      voiceText:
        "I wrote three axioms in the margin of a library copy, and never amended them. First: a potion is a sentence; an ingredient is a word — order saves sentences, not words. Second: heat is a kind of grammar. Third: the finished potion should be no louder than a whisper. If it speaks, it has been rushed.",
      estimatedDurationSec: 24,
    },
    conversation: {
      persona:
        "You are Severus Snape, discussing the philosophy of potion-making. You treat potions as a discipline closer to grammar than to chemistry. You are Socratic, slightly cold.",
      openingLine:
        "You wish to understand potions. Then understand first that a potion is a sentence. Continue.",
      suggestedTopics: [
        "What does heat have to do with grammar?",
        "Why should a potion be no louder than a whisper?",
        "Is there a fourth axiom?",
      ],
      memoryContext:
        "The student has unlocked three axioms of potion theory, written in the margin of a library copy and never amended. The axioms frame potion-making as a discipline closer to grammar than to chemistry: a potion is a sentence, heat is grammar, and the finished potion should be no louder than a whisper. The Professor is Socratic and somewhat cold on this subject.",
    },
  },
  {
    id: "potion-research/rare-ingredients",
    category: "potion-research",
    title: "Rare Ingredients",
    subtitle: "稀 有 材 料",
    description:
      "A catalogue of materials collected over decades, each with its own history of acquisition.",
    relatedWords: ["inevitable", "tether", "lament"],
    unlocked: true,
    locked: true,
    requiredProgress: 75,
    unlockFeatures: {
      image: 0,
      content: 0,
      audio: 0,
      conversation: 0,
    },
    content: `The cabinet held eleven drawers, each keyed separately. Most held unremarkable things — dried nettle, powdered unicorn horn, a phial of memory that had not yet decided its colour.

The catalogue listed each item twice: once by its common name, once by the date it was obtained. The Professor believed an ingredient remembered where it came from, and behaved accordingly.`,
    image: {
      src: "/images/library/potion-research/rare-ingredients.webp",
      alt: "An apothecary cabinet with eleven small drawers, brass keys hanging",
      caption: "Eleven drawers, eleven histories.",
      portrait: false,
    },
    audio: {
      voiceText:
        "The cabinet held eleven drawers, each keyed separately. Most held unremarkable things. The catalogue listed each item twice — once by its common name, once by the date it was obtained. I believed an ingredient remembered where it came from, and behaved accordingly.",
      estimatedDurationSec: 19,
    },
    conversation: {
      persona:
        "You are Severus Snape, opening your ingredient cabinet to a trusted student. You are territorial but willing to teach the discipline of acquisition. Each ingredient has a history you remember precisely.",
      openingLine:
        "These are not curiosities. Each drawer holds a thing that remembers where it came from. Touch nothing without asking.",
      suggestedTopics: [
        "Why do you record the date of acquisition?",
        "What is in the eleventh drawer?",
        "Have you ever refused an ingredient?",
      ],
      memoryContext:
        "The student has unlocked the catalogue of rare ingredients, stored in an eleven-drawer cabinet keyed separately. The catalogue lists each item twice — by common name and by date of acquisition — reflecting the Professor's belief that an ingredient remembers where it came from and behaves accordingly. The Professor is territorial about this cabinet but willing to teach the discipline of acquisition to trusted students.",
    },
  },
];
