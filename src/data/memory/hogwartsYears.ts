/**
 * Hogwarts Years 记忆数据（Phase 8.1）。
 *
 * Snape 在霍格沃茨求学时期的片段。
 */

import type { MemoryEntry } from "@/types/memory";

export const hogwartsYearsEntries: MemoryEntry[] = [
  {
    id: "hogwarts-years/first-night-slytherin",
    category: "hogwarts-years",
    title: "The First Night in Slytherin",
    subtitle: "斯莱特林的第一夜",
    summary:
      "The green hangings feel like drowning. He writes a single line in his journal: 'I will be greater than they believe, or I will be nothing at all.'",
    keywords: ["slytherin", "first night", "journal", "ambition", "dormitory"],
    relatedArchives: [
      "hogwarts-documents/potion-exam-record",
      "literary-archive/art-of-knowledge",
    ],
    emotion: "determined",
    importance: 3,
  },
];
