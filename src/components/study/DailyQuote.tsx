import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck } from "lucide-react";
import Flourish from "@/components/decor/Flourish";
import { cn } from "@/lib/utils";

export interface Quote {
  quoteEn: string;
  quoteZh: string;
  vocabulary?: { word: string; meaning: string }[];
}

interface DailyQuoteProps {
  quote: Quote;
  /** 是否开始入场动画（入场完成后置 true） */
  start?: boolean;
  saved?: boolean;
  onSave?: () => void;
}

/**
 * 每日一句卡片：金边引文样式，底部词汇解析。
 *
 * Phase 19.2 Round 2：空间化升级。
 *   - 微旋转 +0.3deg（与 LessonCard -0.5deg 反向，避免对称呆板）
 *   - 增强阴影：贴桌柔光 + 空间深影（保留墨水玻璃材质，与羊皮纸形成对比）
 *   - parallax 由 StudyRoom 外层 motion.div 提供（±1px，最前景层级）
 */
export default function DailyQuote({
  quote,
  start = true,
  saved = false,
  onSave,
}: DailyQuoteProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30, rotate: 0.3 }}
      animate={start ? { opacity: 1, y: 0, rotate: 0.3 } : { opacity: 0, y: 30, rotate: 0.3 }}
      transition={{ duration: 1, ease: "easeOut", delay: 0.9 }}
      className="relative mx-auto mt-14 w-full max-w-[640px]"
      aria-label="Daily Quote"
    >
      {/* 标题 */}
      <div className="mb-5 flex items-center justify-center gap-3">
        <Flourish className="h-3 w-24" variant="left" />
        <span className="font-display text-xs tracking-widest2 text-gold/80">
          DAILY QUOTE
        </span>
        <Flourish
          className="h-3 w-24 -scale-x-100"
          variant="left"
        />
      </div>

      {/* 引文卡片 — Phase 19.2 Round 2：双层阴影空间化 */}
      <div
        className="relative rounded-sm border border-gold/30 bg-ink/35 px-7 py-8 backdrop-blur-sm sm:px-10 sm:py-10"
        style={{
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.25), 0 18px 50px -12px rgba(0,0,0,0.7), 0 6px 18px -6px rgba(0,0,0,0.5)",
        }}
      >
        <div className="pointer-events-none absolute inset-[5px] rounded-sm border border-gold/15" />

        {/* 大引号 */}
        <span
          aria-hidden
          className="absolute -top-4 left-6 font-display text-5xl text-gold/40"
        >
          &ldquo;
        </span>

        <blockquote className="relative">
          <p className="font-serif text-xl italic leading-relaxed text-parchment sm:text-2xl">
            {quote.quoteEn}
          </p>
          <p className="mt-4 font-zh text-sm leading-relaxed text-parchment/65">
            {quote.quoteZh}
          </p>
        </blockquote>

        {/* 词汇解析 */}
        {quote.vocabulary && quote.vocabulary.length > 0 && (
          <div className="mt-7 border-t border-gold/15 pt-5">
            <p className="mb-3 font-ui text-[10px] uppercase tracking-widest2 text-gold/60">
              Vocabulary
            </p>
            <ul className="space-y-2">
              {quote.vocabulary.map((v, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif text-sm"
                >
                  <span className="font-display text-[13px] tracking-wider text-gold">
                    {v.word}
                  </span>
                  <span className="text-parchment/70">{v.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 收藏按钮 */}
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? "Remove from Library" : "Save to Library"}
          className={cn(
            "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300",
            saved
              ? "border-gold bg-gold/20 text-gold shadow-[0_0_14px_rgba(201,162,39,0.4)]"
              : "border-parchment/25 text-parchment/50 hover:border-gold hover:text-gold",
          )}
        >
          {saved ? (
            <BookmarkCheck size={15} strokeWidth={1.6} />
          ) : (
            <Bookmark size={15} strokeWidth={1.6} />
          )}
        </button>
      </div>
    </motion.section>
  );
}
