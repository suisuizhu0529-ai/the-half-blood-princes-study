import { AnimatePresence, motion } from "framer-motion";
import { Lock, Check, Feather, Volume2, MessageSquare } from "lucide-react";
import type { BookColorTheme, LibraryEntry } from "@/types/library";
import type { UnlockStatus, LearningProgress } from "@/utils/archiveUnlock";

/** Phase 20.2.2：entry 内部特性解锁状态（由 MemoryChamberOverlay 计算后透传） */
type FeatureStatus = {
  image: boolean;
  content: boolean;
  audio: boolean;
  conversation: boolean;
};

interface MemoryPageProps {
  /** 当前展示的 entry */
  entry: LibraryEntry;
  /** 解锁状态 */
  status: UnlockStatus;
  /** 该 entry 在 entries 中的索引（页码用） */
  index: number;
  /** 总 entry 数（页码用） */
  total: number;
  /** 是否已查看（打开过 Viewer） */
  viewed: boolean;
  /** 书本主题色（用于金线/封蜡配色） */
  theme: BookColorTheme;
  /** 点击 unlocked entry → 打开 ArchiveViewer 或就地展开 Chamber */
  onOpenArchive: (entry: LibraryEntry) => void;
  /** Phase 20.2.2：学习进度（用于未解锁特性的提示文案） */
  progress: LearningProgress;
  /** Phase 20.2.2：entry 内部特性解锁状态 */
  featureStatus: FeatureStatus;
  /** Phase 20.2.2：TTS 是否正在播放 */
  speaking: boolean;
  /** Phase 20.2.2：TTS 是否可用 */
  audioSupported: boolean;
  /** Phase 20.2.2：点击 Listen 触发（speak/stop + 写入 audioPlayed 由上层处理） */
  onListen: () => void;
}

/**
 * MemoryPage —— Phase 20.2.1 单个记忆书页（阅读级排版）。
 *
 * Phase 20.2.1 视觉重写：
 *   - 标题放大至 display 级（3xl-4xl），呈魔法书章节标题气质
 *   - 正文使用衬线 + drop cap（首字母大写）+ 行高 1.9，阅读级
 *   - 减少卡片感：去除多余 border/shadow，让内容直接落在羊皮纸上
 *   - 保留羊皮纸底、顶部金线、底部封蜡徽章、羽毛笔装饰
 *   - 页码居底，配 "Page x of y" 小标
 *
 * 不改：
 *   - 数据结构、unlock 逻辑
 *   - onOpenArchive 行为
 */
export default function MemoryPage({
  entry,
  status,
  index,
  total,
  viewed,
  theme,
  onOpenArchive,
  progress,
  featureStatus,
  speaking,
  audioSupported,
  onListen,
}: MemoryPageProps) {
  const isSealed = entry.locked || status === "sealed";

  return (
    <motion.article
      initial={{ opacity: 0, rotateY: 8 }}
      animate={{ opacity: 1, rotateY: 0 }}
      exit={{ opacity: 0, rotateY: -8 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-full w-full flex-col"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* === 书页本体：羊皮纸 ===
          Phase 20.2.1：去除卡片化 shadow，仅保留书页质感 */}
      <div
        className="parchment-surface relative flex h-full flex-col overflow-hidden rounded-sm"
        style={{
          boxShadow: "inset 0 0 80px rgba(120,90,40,0.12)",
        }}
      >
        {/* === 顶部装饰：金线 + 章节小标 === */}
        <div className="flex flex-col items-center pt-12 lg:pt-14">
          <div
            className="h-px w-40"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.gold}90, transparent)`,
            }}
          />
          <p
            className="mt-3 font-ui text-[10px] uppercase tracking-widest3"
            style={{ color: `${theme.gold}aa` }}
          >
            ✦ Memory Fragment ✦
          </p>
        </div>

        {/* === 标题区 ===
            Phase 20.2.1：放大至 display 级，魔法书章节标题 */}
        <div className="px-12 pt-8 text-center lg:px-14">
          <h3 className="font-display text-3xl leading-tight tracking-widest2 text-ink/90 sm:text-4xl lg:text-[2.6rem]">
            {isSealed ? "Sealed Page" : entry.title}
          </h3>
          {entry.subtitle && !isSealed && (
            <p className="mt-4 font-zh text-sm tracking-[0.55em] text-ink/55 lg:text-base">
              {entry.subtitle}
            </p>
          )}
        </div>

        {/* === 中段装饰：羽毛笔 === */}
        <div className="flex justify-center pt-6">
          <Feather
            size={16}
            strokeWidth={1.2}
            className="text-ink/35"
            aria-hidden
          />
        </div>

        {/* === 正文区：阅读级排版 ===
            Phase 20.2.1：
            - drop cap 首字母放大
            - 衬线字体 + leading-loose（1.9 行高）
            - 减少 UI 卡片感，无 border */}
        <div className="flex-1 px-14 py-8 lg:px-16 lg:py-10">
          {isSealed ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              {/* 封蜡印章 */}
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: `radial-gradient(circle, ${theme.leather} 0%, ${theme.leatherHighlight} 100%)`,
                  boxShadow: `0 0 0 2px ${theme.gold}50, inset 0 0 16px rgba(0,0,0,0.5)`,
                }}
              >
                <Lock size={24} strokeWidth={1.5} style={{ color: theme.gold }} />
              </div>
              <p className="max-w-xs text-center font-serif text-base italic leading-relaxed text-ink/55">
                {status === "sealed"
                  ? "Sealed beyond progress — the Professor never wished to share this."
                  : "More spells must be collected before this page reveals itself."}
              </p>
              {entry.requiredProgress !== undefined && (
                <p
                  className="font-ui text-[10px] uppercase tracking-widest3"
                  style={{ color: `${theme.gold}90` }}
                >
                  Requires {entry.requiredProgress} spells
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* 正文：drop cap + 阅读级排版 */}
              <p className="font-serif text-base leading-loose text-ink/80 sm:text-lg sm:leading-[1.9] lg:text-xl lg:leading-[1.9]">
                <span
                  className="float-left mr-3 mt-1 font-display text-5xl leading-none sm:text-6xl"
                  style={{ color: `${theme.gold}cc` }}
                >
                  {entry.description.charAt(0)}
                </span>
                {entry.description.slice(1)}
              </p>

              {/* 关联词汇 */}
              {entry.relatedWords && entry.relatedWords.length > 0 && (
                <div className="mt-8 flex flex-wrap items-center gap-2.5">
                  <span className="font-ui text-[10px] uppercase tracking-widest3 text-ink/45">
                    Related
                  </span>
                  {entry.relatedWords.slice(0, 5).map((word) => (
                    <span
                      key={word}
                      className="font-serif text-sm italic text-ink/65"
                    >
                      · {word}
                    </span>
                  ))}
                </div>
              )}

              {/* 图片缩略（如有）—— 不再使用卡片包裹，融入正文流 */}
              {entry.image && (
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => onOpenArchive(entry)}
                    className="group relative block w-full overflow-hidden rounded-sm transition-all duration-500 hover:rounded"
                    aria-label={`View ${entry.title} image`}
                  >
                    <img
                      src={entry.image.src}
                      alt={entry.image.alt || entry.title}
                      className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      style={{ maxHeight: "220px" }}
                    />
                    {/* 底部渐变 + caption */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent transition-opacity duration-500"
                      aria-hidden
                    />
                    {entry.image.caption && (
                      <p className="absolute bottom-3 left-0 right-0 px-6 text-center font-serif text-xs italic leading-relaxed text-parchment/85">
                        {entry.image.caption}
                      </p>
                    )}
                  </button>
                </div>
              )}

              {/* === Phase 20.2.2：Listen 区（页边魔法印记风格） ===
                  从 ProfessorInteraction 移入，融入书页视觉语言。
                  不再是按钮，而是书页上的魔法印记：金线 + 图标 + 引言。 */}
              {entry.audio && (
                <div className="mt-10">
                  {featureStatus.audio ? (
                    <button
                      type="button"
                      onClick={onListen}
                      disabled={!audioSupported}
                      aria-label={speaking ? "Stop playback" : "Listen to the Professor"}
                      className="group flex w-full items-center justify-center gap-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        className="h-px w-10 transition-all duration-500 group-hover:w-14"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${theme.gold}80)`,
                        }}
                      />
                      <span className="relative flex h-7 w-7 items-center justify-center">
                        {speaking ? (
                          <motion.span
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `radial-gradient(circle, ${theme.gold}55 0%, transparent 70%)`,
                            }}
                            animate={{
                              opacity: [0.5, 1, 0.5],
                              scale: [0.9, 1.1, 0.9],
                            }}
                            transition={{
                              duration: 1.6,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        ) : (
                          <span
                            className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                            style={{
                              background: `radial-gradient(circle, ${theme.gold}33 0%, transparent 70%)`,
                            }}
                          />
                        )}
                        <Volume2
                          size={13}
                          strokeWidth={1.4}
                          className="relative"
                          style={{ color: speaking ? theme.gold : `${theme.gold}cc` }}
                        />
                      </span>
                      <span
                        className="font-serif text-sm italic tracking-wide transition-colors duration-500"
                        style={{
                          color: speaking ? theme.gold : `${theme.gold}cc`,
                        }}
                      >
                        {speaking
                          ? "The Professor is speaking…"
                          : "Hear the Professor's recollection"}
                      </span>
                      <span
                        className="h-px w-10 transition-all duration-500 group-hover:w-14"
                        style={{
                          background: `linear-gradient(90deg, ${theme.gold}80, transparent)`,
                        }}
                      />
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <span
                        className="h-px w-10"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${theme.gold}40)`,
                        }}
                      />
                      <Volume2
                        size={12}
                        strokeWidth={1.2}
                        style={{ color: `${theme.gold}60` }}
                      />
                      <span
                        className="font-serif text-xs italic"
                        style={{ color: `${theme.gold}90` }}
                      >
                        The voice remains sealed.
                        {entry.unlockFeatures?.audio !== undefined && (
                          <>
                            {" "}
                            Gather{" "}
                            <span style={{ color: theme.gold }}>
                              {Math.max(
                                0,
                                entry.unlockFeatures.audio -
                                  progress.collectedWords,
                              )}
                            </span>{" "}
                            more spells to hear it.
                          </>
                        )}
                      </span>
                      <span
                        className="h-px w-10"
                        style={{
                          background: `linear-gradient(90deg, ${theme.gold}40, transparent)`,
                        }}
                      />
                    </div>
                  )}
                  {entry.audio.estimatedDurationSec &&
                    featureStatus.audio && (
                      <p className="mt-1 text-center font-ui text-[9px] uppercase tracking-widest3 text-ink/35">
                        ~ {entry.audio.estimatedDurationSec}s recollection
                      </p>
                    )}

                  {/* === Phase 20.2.3-A：Listen 字幕卷轴 ===
                      speaking 时展开，显示 voiceText 全文。
                      - 不改 speech 架构，仅读 entry.audio.voiceText
                      - 羊皮纸卷轴质感，衬线斜体，金线落款
                      - AnimatePresence 提供展开/收起过渡 */}
                  <AnimatePresence initial={false}>
                    {speaking && entry.audio.voiceText && (
                      <motion.div
                        key="voice-transcript"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          marginTop: 16,
                        }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div
                          className="relative rounded-sm px-6 py-5"
                          style={{
                            // 羊皮纸卷轴：略深于书页底色，加内阴影显层次
                            background:
                              "linear-gradient(180deg, rgba(60,42,20,0.08), rgba(60,42,20,0.04))",
                            boxShadow:
                              "inset 0 0 30px rgba(120,90,40,0.10), inset 0 0 0 1px rgba(120,90,40,0.18)",
                          }}
                        >
                          {/* 顶部小标：Listening... + 脉动点 */}
                          <div className="flex items-center justify-center gap-2">
                            <motion.span
                              className="h-1 w-1 rounded-full"
                              style={{ background: theme.gold }}
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{
                                duration: 1.4,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                            <span
                              className="font-ui text-[9px] uppercase tracking-widest3"
                              style={{ color: `${theme.gold}cc` }}
                            >
                              ✦ Listening ✦
                            </span>
                            <motion.span
                              className="h-1 w-1 rounded-full"
                              style={{ background: theme.gold }}
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{
                                duration: 1.4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.7,
                              }}
                            />
                          </div>

                          {/* 顶部金线 */}
                          <div
                            className="mx-auto mt-3 h-px w-16"
                            style={{
                              background: `linear-gradient(90deg, transparent, ${theme.gold}80, transparent)`,
                            }}
                          />

                          {/* 字幕正文：衬线斜体，阅读级排版 */}
                          <p className="mt-4 text-center font-serif text-sm italic leading-relaxed text-ink/75 sm:text-[15px] sm:leading-[1.85]">
                            {entry.audio.voiceText}
                          </p>

                          {/* 底部金线 */}
                          <div
                            className="mx-auto mt-4 h-px w-16"
                            style={{
                              background: `linear-gradient(90deg, transparent, ${theme.gold}60, transparent)`,
                            }}
                          />

                          {/* 落款 */}
                          <p
                            className="mt-3 text-center font-serif text-xs italic tracking-widest2"
                            style={{ color: `${theme.gold}aa` }}
                          >
                            — Severus Snape
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* === Phase 20.2.2：Conversation 区（封蜡/未解锁章节风格） ===
                  不打开新页面，不实现真实对话。
                  像未解锁章节的封蜡印记，提示未来可开启。 */}
              {entry.conversation && (
                <div className="mt-6">
                  {featureStatus.conversation ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-px w-8"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${theme.gold}60)`,
                          }}
                        />
                        <MessageSquare
                          size={11}
                          strokeWidth={1.3}
                          style={{ color: `${theme.gold}80` }}
                        />
                        <span
                          className="h-px w-8"
                          style={{
                            background: `linear-gradient(90deg, ${theme.gold}60, transparent)`,
                          }}
                        />
                      </div>
                      <p
                        className="font-serif text-xs italic"
                        style={{ color: `${theme.gold}95` }}
                      >
                        A conversation remains sealed…
                      </p>
                      <p className="font-ui text-[9px] uppercase tracking-widest3 text-ink/40">
                        Open when the memory awakens
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-px w-8"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${theme.gold}40)`,
                          }}
                        />
                        <Lock
                          size={10}
                          strokeWidth={1.4}
                          style={{ color: `${theme.gold}60` }}
                        />
                        <span
                          className="h-px w-8"
                          style={{
                            background: `linear-gradient(90deg, ${theme.gold}40, transparent)`,
                          }}
                        />
                      </div>
                      <p
                        className="font-serif text-xs italic"
                        style={{ color: `${theme.gold}75` }}
                      >
                        The conversation chamber lies dormant.
                        {entry.unlockFeatures?.conversation !== undefined && (
                          <>
                            {" "}
                            Gather{" "}
                            <span style={{ color: theme.gold }}>
                              {Math.max(
                                0,
                                entry.unlockFeatures.conversation -
                                  progress.collectedWords,
                              )}
                            </span>{" "}
                            more spells to awaken it.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* === 底部：页码 + 封蜡徽章 === */}
        <div className="flex items-center justify-between px-14 pb-10 pt-4 lg:px-16">
          {/* 页码 */}
          <p className="font-ui text-[10px] uppercase tracking-widest3 text-ink/45">
            Page {index + 1} of {total}
          </p>

          {/* 状态徽章 */}
          <SealBadge
            status={status}
            sealed={isSealed}
            viewed={viewed}
            theme={theme}
          />
        </div>

        {/* === 底部金线装饰 === */}
        <div className="flex flex-col items-center pb-8">
          <div
            className="h-px w-24"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.gold}70, transparent)`,
            }}
          />
        </div>
      </div>

      {/* 书页右侧阴影（翻页立体感） */}
      <div
        className="pointer-events-none absolute right-0 top-2 bottom-2 w-3 rounded-r-sm"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(60,40,15,0.12) 50%, rgba(60,40,15,0.28) 100%)",
        }}
      />
    </motion.article>
  );
}

/**
 * 封蜡徽章 —— 右下角状态标记。
 *
 * 三状态对应三色封蜡：
 *   - unlocked & viewed  → ✓ Examined（金色实心）
 *   - unlocked & !viewed → ◇ Available（金色脉动呼吸）
 *   - locked/sealed      → 🔒 Sealed（皮革暗色）
 */
function SealBadge({
  status,
  sealed,
  viewed,
  theme,
}: {
  status: UnlockStatus;
  sealed: boolean;
  viewed: boolean;
  theme: BookColorTheme;
}) {
  if (sealed || status !== "unlocked") {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-widest3"
        style={{ color: `${theme.gold}90` }}
      >
        <Lock size={10} strokeWidth={1.6} />
        {status === "sealed" ? "Sealed" : "Locked"}
      </span>
    );
  }

  if (viewed) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-widest3"
        style={{ color: theme.gold }}
      >
        <Check size={10} strokeWidth={1.8} />
        Examined
      </span>
    );
  }

  return (
    <motion.span
      className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-widest3"
      style={{ color: theme.gold }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: theme.gold }}
      />
      Available
    </motion.span>
  );
}
