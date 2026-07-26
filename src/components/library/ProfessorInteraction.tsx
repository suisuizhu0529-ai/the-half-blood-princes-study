import { useEffect, useRef, useState } from "react";
import { Volume2, BookOpen, MessageSquare, Lock, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import type { LibraryEntry } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import { getFeatureUnlockStatus } from "@/utils/archiveUnlock";
import {
  getArchiveProgress,
  updateArchiveProgress,
} from "@/utils/archiveProgressStorage";

interface ProfessorInteractionProps {
  /** 当前书页对应的 entry */
  entry: LibraryEntry;
  /** 学习进度（用于判定 unlockFeatures 各特性是否解锁） */
  progress: LearningProgress;
  /** Phase 20.2 修复：点击图片打开全屏 Archive Viewer */
  onImageView: (entry: LibraryEntry) => void;
}

/**
 * ProfessorInteraction —— Phase 20.2 教授互动区域。
 *
 * 替代旧 ArchiveChamber 在 MemoryChamberOverlay 中的位置，作为独立区域
 * 渲染当前书页 entry 的四类教授互动：
 *
 *   1. Image 区（The Illustration）—— 图片展示 + 点击查看大图
 *   2. Content 区（The Manuscript）—— 长文本正文阅读
 *   3. Listen 区（Professor's Voice）—— Azure TTS 教授语音讲解
 *   4. Conversation 区（Conversation Chamber）—— AI 对话入口（Phase 7C 预留）
 *
 * 复用 ArchiveChamber 的核心逻辑：
 *   - getFeatureUnlockStatus 判定各特性解锁状态
 *   - archiveProgressStorage 读写阅读进度
 *   - useSpeech 复用 Azure TTS
 *   - Restricted Archive 提示（locked entry 点击图片时显示）
 *
 * Phase 20.2：作为 Memory Chamber 的独立区域，跟随 MemoryBook 翻页切换 entry。
 * Phase 20.2 修复：恢复 Image 区，原 ArchiveChamber 的图片展示逻辑完整保留。
 */
export default function ProfessorInteraction({
  entry,
  progress,
  onImageView,
}: ProfessorInteractionProps) {
  const { speaking, supported, speak, stop } = useSpeech();

  // Phase 7D-5：Restricted Archive 提示（轻量内联，自动消失）
  const [restrictedHint, setRestrictedHint] = useState(false);
  const restrictedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 进入即写入 discovered + lastVisitedAt（useRef 防 StrictMode 双调用）
  const enteredRef = useRef(false);
  useEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    updateArchiveProgress(entry.id, { discovered: true });
  }, [entry.id]);

  // 当前阅读状态（用于 UI 显示已读 / 未读）
  const archiveProgress = getArchiveProgress(entry.id);

  // 各特性解锁状态
  const featureStatus = getFeatureUnlockStatus(entry, progress);

  // ---- content 进入即视为已读 ----
  useEffect(() => {
    if (featureStatus.content && entry.content) {
      updateArchiveProgress(entry.id, { contentRead: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- image 占位时（src 留空）视为已查看 ----
  useEffect(() => {
    if (
      featureStatus.image &&
      entry.image &&
      !entry.image.src
    ) {
      updateArchiveProgress(entry.id, { imageViewed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 图片加载完成 ----
  const handleImageLoaded = () => {
    updateArchiveProgress(entry.id, { imageViewed: true });
  };

  // Phase 7D-5：图片点击 —— locked 时显示提示而非 Viewer
  const handleImageClick = () => {
    if (entry.locked) {
      setRestrictedHint(true);
      if (restrictedTimerRef.current) clearTimeout(restrictedTimerRef.current);
      restrictedTimerRef.current = setTimeout(
        () => setRestrictedHint(false),
        2800,
      );
      return;
    }
    onImageView(entry);
  };

  const handleImageKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleImageClick();
  };

  // 组件卸载时清理提示定时器
  useEffect(() => {
    return () => {
      if (restrictedTimerRef.current) clearTimeout(restrictedTimerRef.current);
    };
  }, []);

  // ---- Listen 按钮 ----
  const handleListen = () => {
    if (speaking) {
      stop();
      return;
    }
    if (!entry.audio?.voiceText) return;
    speak({ text: entry.audio.voiceText });
    updateArchiveProgress(entry.id, { audioPlayed: true });
  };

  // ---- 无任何互动特性时，不渲染 ----
  if (!entry.image && !entry.content && !entry.audio && !entry.conversation) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-gold/25 pt-6">
      {/* 标识 */}
      <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/70">
        Professor Interaction
      </p>
      <div className="mt-1 h-px w-12 bg-gradient-to-r from-gold/70 to-transparent" />

      {/* ====== Image 区（The Illustration） ====== */}
      {entry.image && (
        <section className="mt-5">
          <SectionLabel
            icon={<ImageIcon size={11} strokeWidth={1.6} />}
            label="The Illustration"
            unlocked={featureStatus.image}
            requiredProgress={entry.unlockFeatures?.image}
            currentProgress={progress.collectedWords}
            viewed={archiveProgress.imageViewed}
          />

          {featureStatus.image ? (
            entry.image.src ? (
              <figure className="mt-3">
                <div
                  onClick={handleImageClick}
                  onKeyDown={handleImageKey}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    entry.locked
                      ? "Restricted archive"
                      : "View image in full screen"
                  }
                  className={cn(
                    "group relative mx-auto overflow-hidden rounded-[12px] border border-gold/30 shadow-parchment-deep",
                    entry.image.portrait
                      ? "max-h-[360px] max-w-[260px]"
                      : "max-h-[220px] max-w-[280px]",
                    entry.locked
                      ? "cursor-not-allowed"
                      : "cursor-zoom-in",
                  )}
                >
                  <img
                    src={entry.image.src}
                    alt={entry.image.alt}
                    onLoad={handleImageLoaded}
                    className={cn(
                      "h-full w-full object-cover transition-transform duration-700 ease-out",
                      !entry.locked && "group-hover:scale-[1.03]",
                      entry.locked && "brightness-[0.45] grayscale-[0.35]",
                    )}
                  />
                  {/* 深色渐变遮罩 —— 营造档案室昏黄灯下的电影感 */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />

                  {/* Phase 7D-5：Restricted Archive 覆盖层 —— 金色风格 */}
                  {entry.locked && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45">
                      <Lock
                        size={18}
                        strokeWidth={1.5}
                        className="text-gold/85 drop-shadow-[0_0_6px_rgba(201,162,39,0.4)]"
                      />
                      <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/85">
                        Restricted Archive
                      </p>
                    </div>
                  )}
                </div>
                {entry.image.caption && !entry.locked && (
                  <figcaption className="mt-2 text-center font-serif text-xs italic leading-relaxed text-ink/55">
                    {entry.image.caption}
                  </figcaption>
                )}
                {/* Phase 7D-5：Restricted 提示 —— 轻量内联，自动消失 */}
                {entry.locked && restrictedHint && (
                  <p className="mt-3 animate-pulse text-center font-serif text-xs italic text-gold/75">
                    Restricted archive. Further memories required.
                  </p>
                )}
              </figure>
            ) : (
              // Phase 7B.5 占位：src 留空时显示"图片待揭示"诗意占位
              <div className="mt-3 rounded-sm border border-dashed border-gold/20 px-5 py-8 text-center">
                <p className="font-serif text-sm italic text-ink/45">
                  The image awaits its reveal.
                </p>
                <p className="mt-1 font-serif text-xs italic text-ink/35">
                  {entry.image.alt}
                </p>
              </div>
            )
          ) : (
            <FeatureLockedHint
              requiredProgress={entry.unlockFeatures?.image}
              currentProgress={progress.collectedWords}
              noun="illustration"
            />
          )}
        </section>
      )}

      {/* ====== Content 区（The Manuscript） ====== */}
      {entry.content && (
        <section className="mt-6">
          <SectionLabel
            icon={<BookOpen size={11} strokeWidth={1.6} />}
            label="The Manuscript"
            unlocked={featureStatus.content}
            requiredProgress={entry.unlockFeatures?.content}
            currentProgress={progress.collectedWords}
            viewed={archiveProgress.contentRead}
          />

          {featureStatus.content ? (
            <div className="mt-3 pl-5">
              <span className="relative float-left mt-1 mr-2 font-display text-3xl leading-none text-gold/70">
                {entry.content.charAt(0)}
              </span>
              <p className="font-serif text-sm leading-7 text-ink/80 whitespace-pre-line sm:text-base sm:leading-8">
                {entry.content.slice(1)}
              </p>
            </div>
          ) : (
            <FeatureLockedHint
              requiredProgress={entry.unlockFeatures?.content}
              currentProgress={progress.collectedWords}
              noun="manuscript"
            />
          )}
        </section>
      )}

      {/* ====== Listen 区（Professor's Voice） ====== */}
      {entry.audio && (
        <section className="mt-6">
          <SectionLabel
            icon={<Volume2 size={11} strokeWidth={1.6} />}
            label="Professor's Voice"
            unlocked={featureStatus.audio}
            requiredProgress={entry.unlockFeatures?.audio}
            currentProgress={progress.collectedWords}
            viewed={archiveProgress.audioPlayed}
          />

          {featureStatus.audio ? (
            <div className="mt-3">
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
              {entry.audio.estimatedDurationSec && (
                <p className="mt-2 font-ui text-[10px] uppercase tracking-widest3 text-ink/40">
                  ~ {entry.audio.estimatedDurationSec}s
                </p>
              )}
            </div>
          ) : (
            <FeatureLockedHint
              requiredProgress={entry.unlockFeatures?.audio}
              currentProgress={progress.collectedWords}
              noun="voice"
            />
          )}
        </section>
      )}

      {/* ====== Conversation 区（Phase 7C 预留） ====== */}
      {entry.conversation && (
        <section className="mt-6">
          <SectionLabel
            icon={<MessageSquare size={11} strokeWidth={1.6} />}
            label="Conversation Chamber"
            unlocked={featureStatus.conversation}
            requiredProgress={entry.unlockFeatures?.conversation}
            currentProgress={progress.collectedWords}
            viewed={archiveProgress.conversationStarted}
          />

          {featureStatus.conversation ? (
            <div className="mt-3">
              {/* Phase 7C 占位：未来 Professor Conversation Chamber 接入点 */}
              <button
                type="button"
                disabled
                className="btn-quill cursor-not-allowed opacity-50"
                title="Conversation Chamber will open in a future phase."
              >
                <MessageSquare size={15} strokeWidth={1.6} />
                <span>Enter Conversation (Soon)</span>
              </button>
              <p className="mt-2 font-serif text-xs italic leading-relaxed text-ink/45">
                &ldquo;{entry.conversation.openingLine}&rdquo;
              </p>
            </div>
          ) : (
            <FeatureLockedHint
              requiredProgress={entry.unlockFeatures?.conversation}
              currentProgress={progress.collectedWords}
              noun="conversation"
            />
          )}
        </section>
      )}
    </div>
  );
}

/**
 * 区块小标题（image / content / audio / conversation 通用）。
 *
 * 显示：图标 + 区块名 + 解锁状态 + 已读 / 未读小标识。
 */
function SectionLabel({
  icon,
  label,
  unlocked,
  requiredProgress,
  currentProgress,
  viewed,
}: {
  icon: React.ReactNode;
  label: string;
  unlocked: boolean;
  requiredProgress?: number;
  currentProgress: number;
  viewed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={cn("text-gold/70", !unlocked && "text-ink/35")}>
          {unlocked ? (
            icon
          ) : (
            <Lock size={11} strokeWidth={1.6} />
          )}
        </span>
        <p
          className={cn(
            "font-ui text-[10px] uppercase tracking-widest3",
            unlocked ? "text-ink/55" : "text-ink/40",
          )}
        >
          {label}
        </p>
      </div>

      <div className="flex items-center gap-3 font-ui text-[9px] uppercase tracking-widest3">
        {unlocked ? (
          viewed !== undefined && (
            <>
              {viewed ? (
                <span className="text-gold/70">Viewed</span>
              ) : (
                <span className="text-ink/40">Unviewed</span>
              )}
            </>
          )
        ) : (
          requiredProgress !== undefined && (
            <span className="text-ink/40">
              {currentProgress} / {requiredProgress}
            </span>
          )
        )}
      </div>
    </div>
  );
}

/**
 * 特性未解锁时的诗意提示。
 */
function FeatureLockedHint({
  requiredProgress,
  currentProgress,
  noun,
}: {
  requiredProgress?: number;
  currentProgress: number;
  noun: string;
}) {
  if (requiredProgress === undefined) return null;
  const remaining = Math.max(0, requiredProgress - currentProgress);
  return (
    <div className="mt-3 rounded-sm border border-gold/10 bg-parchment/20 px-4 py-3">
      <p className="font-serif text-xs italic leading-relaxed text-ink/45">
        The {noun} remains sealed.
        {remaining > 0 && (
          <>
            {" "}
            Gather{" "}
            <span className="text-gold/70">{remaining}</span> more{" "}
            {remaining === 1 ? "spell" : "spells"} to reveal it.
          </>
        )}
      </p>
    </div>
  );
}
