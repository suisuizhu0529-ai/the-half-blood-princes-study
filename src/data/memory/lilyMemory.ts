/**
 * Lily Memory 记忆数据（Phase 8.1）。
 *
 * 关于 Lily Evans 的记忆——Snape 一生之痛与一生之诺。
 */

import type { MemoryEntry } from "@/types/memory";

export const lilyMemoryEntries: MemoryEntry[] = [
  {
    id: "lily-memory/always",
    category: "lily-memory",
    title: "After All This Time?",
    subtitle: "始 终 如 一",
    summary:
      "A silver doe walks the forest edge — not a patronus for protection, but for remembrance. 'Always,' he says, and the word costs him every year he has left.",
    keywords: ["lily", "patronus", "doe", "always", "remembrance", "love"],
    relatedArchives: [
      "literary-archive/language-of-silence",
      "hidden-manuscripts/unsigned-letter",
    ],
    emotion: "bittersweet",
    importance: 5,
  },
];
