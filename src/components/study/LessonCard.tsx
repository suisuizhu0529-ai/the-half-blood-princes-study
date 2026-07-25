import { motion } from "framer-motion";
import Feather from "@/components/decor/Feather";
import Flourish from "@/components/decor/Flourish";
import ActionButtons from "./ActionButtons";

export interface Lesson {
  word: string;
  phonetic?: string;
  pos?: string;
  meaningZh: string;
  exampleEn: string;
  exampleZh: string;
}

interface LessonCardProps {
  lesson: Lesson;
  dateLabel?: string;
  /** 课程编号（1-based），显示为 "Lesson No. 17" */
  lessonNumber?: number;
  /** 是否开始翻开动画（入场完成后置 true） */
  start?: boolean;
  onListen?: () => void;
  onRepeat?: () => void;
  /** 收藏到 Notebook 回调（Phase 4A） */
  onAdd?: () => void;
  speaking?: boolean;
  /** 浏览器是否支持朗读 */
  speechSupported?: boolean;
  /** 当前 Lesson 是否已收藏（Phase 4A）。控制 Add 按钮文本/状态 */
  saved?: boolean;
}

export type { LessonCardProps };

/**
 * 中央"Today's Lesson"羊皮纸笔记卡。
 * Framer Motion 翻开入场：start=true 时 rotateX(-15) → 0 + opacity。
 */
export default function LessonCard({
  lesson,
  dateLabel,
  lessonNumber,
  start = true,
  onListen,
  onRepeat,
  onAdd,
  speaking,
  speechSupported,
  saved,
}: LessonCardProps) {
  return (
    <motion.article
      initial={{ rotateX: -15, opacity: 0, y: 24 }}
      animate={start ? { rotateX: 0, opacity: 1, y: 0 } : { rotateX: -15, opacity: 0, y: 24 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      style={{ transformOrigin: "center top", transformPerspective: 1200 }}
      className="parchment-surface relative mx-auto w-full max-w-[640px] rounded-sm shadow-parchment-deep"
      aria-label="Today's Lesson"
    >
      {/* 双层金色边框 */}
      <div className="pointer-events-none absolute inset-[6px] rounded-sm border border-gold/55" />
      <div className="pointer-events-none absolute inset-[10px] rounded-sm border border-gold/25" />

      {/* 角落羽毛笔装饰 */}
      <Feather
        className="absolute -right-6 -top-10 h-28 w-16 opacity-80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
        rotate={-22}
      />

      <div className="relative px-8 py-10 sm:px-12 sm:py-12">
        {/* 顶部标题 */}
        <header className="text-center">
          <p className="font-zh text-[10px] tracking-[0.5em] text-ink/55">
            今 日 之 课
          </p>
          <h2 className="mt-1.5 font-display text-xl tracking-widest3 text-ink/85">
            TODAY&apos;S LESSON
          </h2>
          <Flourish className="mx-auto mt-3 h-3 w-48" variant="center" />
          {(lessonNumber || dateLabel) && (
            <p className="mt-3 font-ui text-[10px] uppercase tracking-widest3 text-ink/55">
              {lessonNumber && (
                <>
                  <span className="text-gold/80">Lesson No.</span>{" "}
                  <span className="text-ink/75">
                    {String(lessonNumber).padStart(2, "0")}
                  </span>
                </>
              )}
              {lessonNumber && dateLabel && (
                <span className="mx-2 text-ink/25">·</span>
              )}
              {dateLabel && <span className="text-ink/65">{dateLabel}</span>}
            </p>
          )}
        </header>

        {/* 单词 */}
        <section className="mt-9 text-center">
          <h3 className="font-display text-[44px] font-500 leading-none tracking-widest2 text-[#7a5a12] sm:text-[56px]">
            {lesson.word}
          </h3>
          {(lesson.phonetic || lesson.pos) && (
            <p className="mt-3 font-serif text-base italic text-ink/65">
              {lesson.phonetic && <span>{lesson.phonetic}</span>}
              {lesson.phonetic && lesson.pos && (
                <span className="mx-2 text-ink/30">·</span>
              )}
              {lesson.pos && <span>{lesson.pos}</span>}
            </p>
          )}
          <p className="mt-4 font-zh text-xl tracking-wider text-ink/80">
            {lesson.meaningZh}
          </p>
        </section>

        {/* 分隔线 */}
        <div className="gold-rule mx-auto mt-9 w-2/3" />

        {/* 例句 */}
        <section className="mt-9">
          <div className="relative pl-5">
            <span className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-transparent via-gold to-transparent" />
            <p className="font-serif text-xl italic leading-relaxed text-ink/85 sm:text-2xl">
              &ldquo;{lesson.exampleEn}&rdquo;
            </p>
            <p className="mt-3 font-zh text-sm leading-relaxed text-ink/55">
              {lesson.exampleZh}
            </p>
          </div>
        </section>

        {/* 按钮组 */}
        <ActionButtons
          onListen={onListen}
          onRepeat={onRepeat}
          onAdd={onAdd}
          speaking={speaking}
          speechSupported={speechSupported}
          saved={saved}
        />
      </div>
    </motion.article>
  );
}
