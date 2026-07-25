import { useEffect, useRef, useState } from "react";
import { Volume2, BookOpen, MessageSquare, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import type { LibraryEntry } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import { getFeatureUnlockStatus } from "@/utils/archiveUnlock";
import {
  getArchiveProgress,
  updateArchiveProgress,
} from "@/utils/archiveProgressStorage";

interface ArchiveChamberProps {
  /** 当前展开的 archive entry */
  entry: LibraryEntry;
  /** 学习进度（用于判定 unlockFeatures 各特性是否解锁） */
  progress: LearningProgress;
  /** Phase 7D-3.2：点击图片打开全屏 Archive Viewer */
  onImageView: (entry: LibraryEntry) => void;
}

/**
 * Archive Chamber —— 档案阅读室（Phase 7C）。
 *
 * 定位：Library 内嵌展开组件，与 Notebook 的 MemoryChamber 结构对称：
 *   Library → ArchiveCategoryCard → ArchiveEntryCard → ArchiveChamber（展开）
 *
 * 职责：
 *   1. image 展示（受 unlockFeatures.image 控制）
 *   2. content 阅读（受 unlockFeatures.content 控制）
 *   3. Listen 教授语音讲解（受 unlockFeatures.audio 控制，复用 Azure TTS）
 *   4. unlockFeatures 判定 + ArchiveProgress 写入
 *   5. AI Conversation Chamber 入口（Phase 7C 仅预留，未来扩展）
 *
 * 数据流：
 *   - 静态数据：entry（LibraryEntry，从 Library 透传）
 *   - 解锁判定：getFeatureUnlockStatus(entry, progress)
 *   - 阅读状态：archiveProgressStorage（独立 localStorage key）
 *
 * 进入即写入：
 *   - discovered = true
 *   - lastVisitedAt = now
 *   - 首次进入时 firstUnlockedAt 自动补全（由 storage 层处理）
 *
 * 各特性查看后单独写入对应 boolean。
 * storage 层浅合并 + boolean 单调写入，重复调用无副作用。
 *
 * 视觉延续 Dark Academia：羊皮纸 + 金色细边 + Cinzel + 衬线斜体。
 */
export default function ArchiveChamber({
  entry,
  progress,
  onImageView,
}: ArchiveChamberProps) {
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
  // 仅在 feature 解锁且有正文时写入一次。
  // storage 层浅合并 + boolean 单调写入，重复调用无副作用。
  useEffect(() => {
    if (featureStatus.content && entry.content) {
      updateArchiveProgress(entry.id, { contentRead: true });
    }
    // 仅在挂载时执行一次（featureStatus / entry.content 在挂载时已确定）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- image 占位时（src 留空）视为已查看 ----
  useEffect(() => {
    if (
      featureStatus.image &&
      entry.image &&
      !entry.image.src // Phase 7B.5 占位：无 src 时仍标记已查看
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
    // 播放开始即视为已播放（boolean 单调写入，重复无副作用）
    updateArchiveProgress(entry.id, { audioPlayed: true });
  };

  // ---- 渲染 ----

  return (
    <div className="mt-6 border-t border-gold/25 pt-6">
      {/* 标识 */}
      <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/70">
        Archive Chamber
      </p>
      <div className="mt-1 h-px w-12 bg-gradient-to-r from-gold/70 to-transparent" />

      {/* ====== Image 区 ====== */}
      {entry.image && (
        <section className="mt-5">
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
              noun="image"
            />
          )}
        </section>
      )}

      {/* ====== Content 区 ====== */}
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

      {/* ====== Listen 区 ====== */}
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
  /** Phase 7D：optional —— 不传时隐藏 Viewed/Unviewed 标识 */
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
 *
 * 不暴露具体数字（数字在 SectionLabel 已显示），保持 Dark Academia 沉浸感。
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


