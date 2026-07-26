import { useCallback } from "react";
import { motion, useTransform } from "framer-motion";
import LessonCard from "@/components/study/LessonCard";
import DailyQuote from "@/components/study/DailyQuote";
import DeskArtifactLayer from "@/components/decor/DeskArtifactLayer";
import LumosEntrance from "@/features/lumos/LumosEntrance";
import { useLumosRitual } from "@/features/lumos/hooks/useLumosRitual";
import { useEntered } from "@/hooks/useEntered";
import { useEntranceAnimation, stageOpacity } from "@/hooks/useEntranceAnimation";
import { useNotebook } from "@/hooks/useNotebook";
import { useSpeech } from "@/hooks/useSpeech";
import { useDeskParallax } from "@/hooks/useDeskParallax";
import { getDailyLesson, getLessonNumber } from "@/utils/dailyLesson";
import type { NotebookEntry } from "@/types/notebook";

/**
 * Dark Academia 风格日期格式。
 *
 * 输出形如 "19 July 2026 · Sunday"。
 * 不使用 toLocaleDateString，避免环境差异带来的格式漂移。
 */
function formatDarkAcademiaDate(d: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${days[d.getDay()]}`;
}

export default function StudyRoom() {
  const { entered } = useEntered();
  const { stage, shouldAnimate } = useEntranceAnimation();

  // Phase 19.2 Round 2：内容层 parallax（最前景 ±1px）
  //   层级：墙(0) < 书架(±3) < 桌面(±6) < 纸张(±1)
  //   纸张偏移最小，但比墙"更近"，建立前景层级
  //   prefers-reduced-motion 时 hook 自动禁用
  const { mouseX, mouseY } = useDeskParallax();
  const contentX = useTransform(mouseX, [0, 1], [1, -1]);
  const contentY = useTransform(mouseY, [0, 1], [1, -1]);

  // Phase 17.1-D：Lumos 激活时首页完全隐藏
  //   - idle：初始状态，只显示魔法阵入口（不显示 lesson）
  //   - closed：Lumos 退出后，显示 lesson 内容 + "再次施法"入口
  //   - awakening/research/verification/closure：Lumos 场景，首页完全隐藏
  const ritual = useLumosRitual();
  const isLumosScene =
    ritual.phase === "awakening" ||
    ritual.phase === "research" ||
    ritual.phase === "verification" ||
    ritual.phase === "closure";

  // idle 时只显示魔法阵，不显示 lesson 内容
  // closed 时显示 lesson 内容（学生已完成仪式）
  const showLesson = ritual.phase === "closed";

  // Phase 3B 精修：默认走 PROFESSOR_PROFILE（Potions Master）。
  //   - voice: en-GB-RyanNeural → fallback ThomasNeural → SoniaNeural
  //   - rate:  -12%   自然教授讲话节奏
  //   - pitch: -15%   Snape 式低沉压迫感
  //   - 自动停顿：句号 400ms / 逗号 150ms / 关键词前 250ms
  //   - mstts:express-as style="calm"
  // 调用方不再传 rate/pitch 数字，由 profile 统一管理。
  const { speaking, supported, speak, stop } = useSpeech();

  // Phase 4A：Notebook 收藏。useNotebook 订阅 storage，
  // 在 Notebook 页面删除后这里 saved 状态也会自动同步。
  const { isSaved, add } = useNotebook();

  // 每日课程：基于日期种子，同一天固定不变。
  //   Phase 17.2.1：删除魔杖刷新单词逻辑。
  //   魔法事件不再直接修改学习数据（MAGIC_SWEEP 改为进入 Lumos）。
  const today = new Date();
  const { word, quote } = getDailyLesson(today);
  const lessonNumber = getLessonNumber(today);
  const dateLabel = formatDarkAcademiaDate(today);

  // Word → LessonCard.Lesson 字段映射（partOfSpeech → pos）
  const lesson = {
    word: word.word,
    phonetic: word.phonetic,
    pos: word.partOfSpeech,
    meaningZh: word.meaningZh,
    exampleEn: word.exampleEn,
    exampleZh: word.exampleZh,
  };

  // 当前 Lesson 是否已收藏（按 word 去重，不区分大小写）
  const saved = isSaved(word.word);

  // Listen：标准朗读（走 profile 默认 -25%）。朗读中再点击 → 停止。
  const handleListen = useCallback(() => {
    if (speaking) {
      stop();
      return;
    }
    speak({ text: word.exampleEn });
  }, [speaking, speak, stop, word.exampleEn]);

  // Repeat：同句更慢朗读（-20%，比 profile 默认 -12% 再慢 8 个百分点）。
  // pitch 保持 profile 默认，避免变调。
  const handleRepeat = useCallback(() => {
    if (speaking) return;
    speak({ text: word.exampleEn, rate: "-20%" });
  }, [speaking, speak, word.exampleEn]);

  // Phase 4A：收藏当前 Lesson 到 Notebook。
  //   - id 用 `lesson-{lessonNumber}` 保证同日不重复
  //   - 已收藏时点击不重复添加（addEntry 内部已去重）
  const handleAdd = useCallback(() => {
    if (saved) return;
    const entry: NotebookEntry = {
      id: `lesson-${lessonNumber}`,
      word: word.word,
      phonetic: word.phonetic,
      partOfSpeech: word.partOfSpeech,
      meaningZh: word.meaningZh,
      exampleEn: word.exampleEn,
      exampleZh: word.exampleZh,
      lessonNumber,
      createdAt: new Date().toISOString(),
    };
    add(entry);
  }, [saved, add, lessonNumber, word]);

  return (
    <section className="container relative px-6 pt-32 pb-24 sm:pt-36">
      {/* ============================================================
       * Phase 17.1-D Scene Layer 架构
       *   1. BackgroundLayer  —— 环境背景
       *   2. ArtifactLayer    —— 桌面道具层
       *   3. LearningSurface  —— 学习内容
       *   4. MagicLayer       —— Lumos 仪式（独立 fixed 全屏）
       *
       * 关键：不用 display:none（会杀死 fixed 子元素），
       *   改为条件渲染——isLumosScene 时首页内容不渲染，
       *   LumosEntrance 始终渲染，fixed 场景不受父级影响
       * ============================================================ */}

      {/* === Layer 1-3：首页内容（Lumos 激活时不渲染） === */}
      {!isLumosScene && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        >
          {/* Layer 2: ArtifactLayer */}
          <DeskArtifactLayer
            entered={entered}
            stage={stage}
            shouldAnimate={shouldAnimate}
          />

          {/* === Phase 19.2 Round 3：Ambient lighting continuity ===
           * 仪式完成后（closed 阶段）保留微弱蜡烛余光，建立"同一房间"感知。
           *   - 仅在 showLesson 时显示（仪式已完成）
           *   - opacity 0.10，极克制（Snape 书房夜晚桌角余光，非再次燃烧）
           *   - 暖色 radial-gradient，呼应 Awakening 的 CandleAmbientLight
           *   - pointer-events:none，不影响交互
           *   - 不修改 useLumosRitual，仅消费 phase 状态
           *   - 与 AmbientLayer（背景层）互补：背景给静态氛围，此层给"仪式痕迹"
           */}
          {showLesson && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0"
              style={{
                zIndex: 1,
                background:
                  "radial-gradient(ellipse 55% 45% at 50% 68%, rgba(255, 200, 120, 0.18) 0%, rgba(250, 160, 80, 0.08) 35%, transparent 70%)",
                mixBlendMode: "screen",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              transition={{ duration: 1.8, ease: "easeOut", delay: 0.4 }}
            />
          )}

          {/* === idle 阶段：只显示魔法阵入口，不显示 lesson 内容 === */}
          {ritual.phase === "idle" && (
            <div className="flex min-h-[60vh] items-center justify-center -mt-40" />
          )}

          {/* === closed 阶段：Lumos 退出后，显示 lesson 内容 === */}
          {showLesson && (
            <>
              {/* 顶部入场标题 */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{
                  opacity: stageOpacity(stage, "title", shouldAnimate),
                  y: 0,
                }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                className="mb-10 text-center"
              >
                <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/60">
                  The Half-Blood Prince&apos;s Study
                </p>
                <h1 className="mt-2 font-display text-2xl tracking-widest2 text-parchment/85 sm:text-3xl">
                  A Quiet Hour with Words
                </h1>
              </motion.div>

              {/* 课程卡 */}
              {/* Phase 19.2 Round 2：外层 parallax（±1px），内层保留入场动画 */}
              <motion.div style={{ x: contentX, y: contentY }}>
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <LessonCard
                    lesson={lesson}
                    lessonNumber={lessonNumber}
                    dateLabel={dateLabel}
                    start={entered}
                    speaking={speaking}
                    speechSupported={supported}
                    onListen={handleListen}
                    onRepeat={handleRepeat}
                    saved={saved}
                    onAdd={handleAdd}
                  />
                </motion.div>
              </motion.div>

              {/* 每日一句 */}
              {/* Phase 19.2 Round 2：外层 parallax（±1px），内层保留入场动画 */}
              <motion.div style={{ x: contentX, y: contentY }}>
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  <DailyQuote quote={quote} start={entered} saved={false} />
                </motion.div>
              </motion.div>

              {/* 底部签名 */}
              <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.4, delay: 1.6 }}
                className="mt-20 text-center"
              >
                <p className="font-serif text-sm italic text-parchment/35">
                  · The candle burns low, but the night is long ·
                </p>
              </motion.footer>
            </>
          )}
        </motion.div>
      )}

      {/* === Layer 4: MagicLayer（Lumos 仪式，独立 fixed 全屏 z-999） === */}
      <LumosEntrance
        ritual={ritual}
        entered={entered}
        lessonCardProps={{
          lesson,
          lessonNumber,
          dateLabel,
          start: entered,
          speaking,
          speechSupported: supported,
          onListen: handleListen,
          onRepeat: handleRepeat,
          saved,
          onAdd: handleAdd,
        }}
      />
    </section>
  );
}
