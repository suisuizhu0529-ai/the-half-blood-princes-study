import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import type { NotebookEntry } from "@/types/notebook";

interface MemoryChamberProps {
  /** 当前展开的词条 */
  entry: NotebookEntry;
  /**
   * 进入 Memory Chamber（首次挂载）时回调。
   * 调用方在此更新 reviewCount / lastReviewedAt。
   *
   * Phase 6.2 调整：进入即回忆，不再要求点击 Reveal。
   */
  onReviewed?: (entry: NotebookEntry) => void;
}

/**
 * Memory Chamber —— 私人冥想室（Phase 6.2 极简化）。
 *
 * 定位：a private meditation room for recalling a spell,
 *       not a dictionary detail page.
 *
 * 只显示：
 *   1. Literary Example（英文例句 + 中文翻译）
 *   2. Listen 按钮（复用 Azure TTS）
 *   3. Memory Strength（复习次数 + 最近回忆时间）
 *
 * 删除（Phase 6 → 6.2）：
 *   - Word / Phonetic / Part of Speech / Chinese Meaning
 *   - Reveal Meaning 切换
 *   - Professor Voice 标题
 *   - DetailRow 组件
 *
 * 学习行为：
 *   - 进入 Memory Chamber 即触发 onReviewed（首次挂载）
 *   - reviewCount + 1, lastReviewedAt = now
 *
 * 复用（未修改）：
 *   - useSpeech（Azure PROFESSOR_PROFILE: RyanNeural + calm）
 *   - speech.ts / useSpeech.ts / profiles.ts
 */
export default function MemoryChamber({
  entry,
  onReviewed,
}: MemoryChamberProps) {
  const { speaking, supported, speak, stop } = useSpeech();

  // 进入即回忆：挂载时调用一次 onReviewed。
  // useRef 防止 StrictMode 双调用导致重复 +1。
  const countedRef = useRef(false);
  useEffect(() => {
    if (countedRef.current) return;
    countedRef.current = true;
    onReviewed?.(entry);
  }, [entry, onReviewed]);

  const handleListen = () => {
    if (speaking) {
      stop();
      return;
    }
    speak({ text: entry.exampleEn });
  };

  return (
    <div className="mt-6 border-t border-gold/25 pt-6">
      {/* 标识 */}
      <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/70">
        Memory Chamber
      </p>
      <div className="mt-1 h-px w-12 bg-gradient-to-r from-gold/70 to-transparent" />

      {/* 文学例句 */}
      <div className="mt-5">
        <p className="font-ui text-[10px] uppercase tracking-widest3 text-ink/45">
          Literary Example
        </p>
        <div className="relative mt-3 pl-5">
          <span className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-transparent via-gold/70 to-transparent" />
          <p className="font-serif text-base italic leading-relaxed text-ink/85 sm:text-lg">
            &ldquo;{entry.exampleEn}&rdquo;
          </p>
          <p className="mt-2 font-zh text-xs leading-relaxed text-ink/55 sm:text-sm">
            {entry.exampleZh}
          </p>
        </div>
      </div>

      {/* Listen 按钮（无标题，简单按钮） */}
      <div className="mt-5">
        <button
          type="button"
          onClick={handleListen}
          disabled={!supported}
          aria-label={speaking ? "Stop" : "Listen"}
          className={cn(
            "btn-quill",
            speaking && "animate-pulse-gold border-gold text-gold",
            !supported && "cursor-not-allowed opacity-40",
          )}
        >
          <Volume2 size={15} strokeWidth={1.6} />
          <span>{speaking ? "Speaking…" : "Listen"}</span>
        </button>
      </div>

      {/* Memory Strength（原 Review Progress 重命名） */}
      <div className="mt-6 border-t border-gold/15 pt-4">
        <p className="font-ui text-[10px] uppercase tracking-widest3 text-ink/45">
          Memory Strength
        </p>
        <p className="mt-2 font-serif text-sm italic text-ink/65">
          Reviewed{" "}
          <span className="text-ink/85">{entry.reviewCount ?? 0}</span>{" "}
          {entry.reviewCount === 1 ? "time" : "times"}
        </p>
        {entry.lastReviewedAt && (
          <p className="mt-1 font-serif text-xs italic text-ink/50">
            Last recalled: {formatDate(entry.lastReviewedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 将 ISO 时间字符串格式化为 Dark Academia 风格短日期。
 *
 * 例如 "2026-07-19T11:56:50.123Z" → "19 July 2026"
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
