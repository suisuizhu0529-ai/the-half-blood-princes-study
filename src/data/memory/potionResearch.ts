/**
 * Potion Research 记忆数据（Phase 8.1）。
 *
 * Snape 在魔药研究上的执着与天赋。
 */

import type { MemoryEntry } from "@/types/memory";

export const potionResearchEntries: MemoryEntry[] = [
  {
    id: "potion-research/half-blood-prince-notes",
    category: "potion-research",
    title: "The Margins of a borrowed Book",
    subtitle: "借来的书页边角",
    summary:
      "Ink crowds the empty spaces of Advanced Potion-Making — corrections, improvements, curses of his own invention. The Half-Blood Prince signs his work in a hand no one will read for decades.",
    keywords: ["half-blood prince", "potions", "notes", "margins", "inventions"],
    relatedArchives: [
      "potion-research/advanced-potion-theory",
      "potion-research/draught-living-death",
    ],
    emotion: "determined",
    importance: 4,
  },
];
