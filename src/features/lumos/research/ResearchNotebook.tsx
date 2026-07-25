/**
 * ResearchNotebook（Phase 17.1-D 书页版）。
 *
 * 定位：魔法书打开后的内页内容。
 *
 * Phase 17.1-D 变化：
 *   - 删除 LessonCard 复用（避免"书页里套卡片"的视觉冲突）
 *   - 直接以书页风格渲染：无圆角、无阴影、无独立背景
 *   - 左右双页布局：左页研究插图 + 标题，右页单词 + 释义 + Snape 批注
 *   - 全部使用 serif 字体，手稿风格
 *   - 内容由 AncientSpellBook 的羊皮纸内页承载，本组件只负责文字排版
 *
 * 数据来源：由 StudyRoom 计算并传入（保证书内与首页一致）。
 */

import type { LessonCardProps } from "@/components/study/LessonCard";

interface ResearchNotebookProps {
  /** LessonCard 所需的全部 props（由 StudyRoom 传入） */
  lessonCardProps: LessonCardProps;
}

/**
 * 研究笔记本（魔法书内页 · 书页风格）。
 *
 * 布局：
 *   左页（40%）：装饰首字母 + 今日研究标题 + 插图区域
 *   右页（60%）：单词 + 音标 + 释义 + 例句 + Snape 批注
 *
 * 无卡片样式：无 rounded / shadow / border / 独立背景。
 * 字体：Cinzel 标题 + Cormorant Garamond 正文 + 手写体批注。
 */
export default function ResearchNotebook({
  lessonCardProps,
}: ResearchNotebookProps) {
  const { lesson, lessonNumber, onListen, onRepeat, speaking, speechSupported } =
    lessonCardProps;
  const word = lesson.word;
  const firstLetter = word.charAt(0).toUpperCase();

  return (
    <div
      className="flex h-full w-full flex-col gap-8 px-8 py-6 text-ink sm:flex-row sm:px-12"
      style={{
        fontFamily: "'Cormorant Garamond', 'EB Garamond', serif",
      }}
    >
      {/* === 左页：研究插图 + 标题 === */}
      <div className="flex w-full flex-col items-center justify-start sm:w-[40%] sm:pr-8">
        {/* 装饰首字母（单词首字母放大） */}
        <div className="relative mb-3 flex items-center justify-center">
          <span
            className="text-5xl leading-none sm:text-6xl"
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              color: "#7a5a12",
              textShadow: "0 1px 2px rgba(122,90,18,0.2)",
            }}
          >
            {firstLetter}
          </span>
          {/* 装饰星标 */}
          <span
            className="absolute -right-3 -top-1 text-xs"
            style={{ color: "#c9a227", opacity: 0.6 }}
          >
            ✦
          </span>
        </div>

        {/* 今日研究标题 */}
        <p
          className="text-[9px] uppercase tracking-[0.3em]"
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 600,
            color: "#5a4030",
            opacity: 0.7,
          }}
        >
          Today&apos;s Research
        </p>
        <div
          className="mt-1.5 h-px w-16"
          style={{
            background:
              "linear-gradient(90deg, transparent, #8a7020, transparent)",
          }}
        />

        {/* 课程编号 */}
        {lessonNumber && (
          <p
            className="mt-3 text-[10px] italic"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: "#5a4030",
              opacity: 0.6,
            }}
          >
            Research No. {String(lessonNumber).padStart(2, "0")}
          </p>
        )}

        {/* 插图区域（SVG 装饰） */}
        <div className="mt-4 flex flex-1 items-center justify-center">
          <svg viewBox="0 0 80 80" className="h-20 w-20 opacity-50">
            <defs>
              <radialGradient id="illustGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c9a227" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="40" cy="40" r="36" fill="url(#illustGlow)" />
            <circle cx="40" cy="40" r="28" fill="none" stroke="#8a7020" strokeWidth="0.5" opacity="0.5" />
            <circle cx="40" cy="40" r="22" fill="none" stroke="#8a7020" strokeWidth="0.3" opacity="0.3" />
            <path
              d="M 40 20 L 44 34 L 58 34 L 47 42 L 51 56 L 40 48 L 29 56 L 33 42 L 22 34 L 36 34 Z"
              fill="none" stroke="#7a5a12" strokeWidth="0.6" strokeLinejoin="round" opacity="0.6"
            />
            {[
              { x: 40, y: 8 }, { x: 40, y: 72 }, { x: 8, y: 40 }, { x: 72, y: 40 },
            ].map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="1" fill="#c9a227" opacity="0.5" />
            ))}
          </svg>
        </div>
      </div>

      {/* === 右页：单词 + 释义 + Snape 批注 === */}
      <div className="flex w-full flex-col sm:w-[60%] sm:pl-6">
        {/* 单词（大号衬线） */}
        <h2
          className="text-3xl leading-tight sm:text-4xl"
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 700,
            color: "#3a2818",
            letterSpacing: "0.05em",
          }}
        >
          {word}
        </h2>

        {/* 音标 + 词性 */}
        {(lesson.phonetic || lesson.pos) && (
          <p
            className="mt-2 text-sm italic"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: "#5a4030",
              opacity: 0.7,
            }}
          >
            {lesson.phonetic && <span>{lesson.phonetic}</span>}
            {lesson.phonetic && lesson.pos && (
              <span className="mx-2 opacity-40">·</span>
            )}
            {lesson.pos && <span>{lesson.pos}</span>}
          </p>
        )}

        {/* 中文释义 */}
        <p
          className="mt-3 text-base"
          style={{
            fontFamily: "'LXGW WenKai', 'Noto Serif SC', serif",
            color: "#3a2818",
            opacity: 0.85,
          }}
        >
          {lesson.meaningZh}
        </p>

        {/* 分隔线（金色渐变） */}
        <div
          className="my-4 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #c9a227 30%, #c9a227 70%, transparent)",
            opacity: 0.5,
          }}
        />

        {/* 英文例句 */}
        <p
          className="text-base italic leading-relaxed sm:text-lg"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "#3a2818",
            opacity: 0.85,
          }}
        >
          &ldquo;{lesson.exampleEn}&rdquo;
        </p>

        {/* 中文例句翻译 */}
        <p
          className="mt-2 text-xs leading-relaxed"
          style={{
            fontFamily: "'LXGW WenKai', 'Noto Serif SC', serif",
            color: "#5a4030",
            opacity: 0.6,
          }}
        >
          {lesson.exampleZh}
        </p>

        {/* Snape 手写批注 */}
        <div className="mt-5 pl-4" style={{ borderLeft: "1px solid rgba(138,112,32,0.3)" }}>
          <p
            className="text-xs italic leading-relaxed"
            style={{
              fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
              color: "#5a4030",
              opacity: 0.75,
              fontSize: "14px",
            }}
          >
            — Commit this to memory. Words are the simplest form of magic.
          </p>
        </div>

        {/* 听力按钮（融入书页，无卡片样式） */}
        {(speechSupported || onListen) && (
          <div className="mt-5 flex gap-3">
            {onListen && (
              <button
                type="button"
                onClick={onListen}
                className="text-[11px] uppercase tracking-[0.2em] transition-colors"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: speaking ? "#c9a227" : "#7a5a12",
                  opacity: 0.7,
                  borderBottom: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = "#c9a227";
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = "transparent";
                  e.currentTarget.style.opacity = "0.7";
                }}
              >
                {speaking ? "◼ Stop" : "▶ Listen"}
              </button>
            )}
            {onRepeat && (
              <button
                type="button"
                onClick={onRepeat}
                className="text-[11px] uppercase tracking-[0.2em] transition-colors"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: "#7a5a12",
                  opacity: 0.6,
                  borderBottom: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = "#c9a227";
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = "transparent";
                  e.currentTarget.style.opacity = "0.6";
                }}
              >
                ↻ Repeat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
