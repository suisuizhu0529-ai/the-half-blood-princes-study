import { Volume2, Repeat, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  onListen?: () => void;
  onRepeat?: () => void;
  onAdd?: () => void;
  /** 是否正在朗读 */
  speaking?: boolean;
  /** 浏览器是否支持朗读（不支持时禁用按钮） */
  speechSupported?: boolean;
  /** 当前 Lesson 是否已收藏到 Notebook（Phase 4A） */
  saved?: boolean;
}

/**
 * 课程卡三按钮：🔊 Listen / 🗣 Repeat / ✍ Add to Notebook
 *
 * Listen：朗读中显示金色微光（animate-pulse-gold + border-gold），
 * 再次点击会停止当前朗读（由调用方决定）。
 * Repeat：朗读中禁用，避免叠加上一次 speech。
 *
 * Phase 4A：Add 按钮根据 saved 切换文本：
 *   - 未收藏："Add to Notebook"
 *   - 已收藏："Added to Notebook"（视觉风格不变，仅状态切换）
 */
export default function ActionButtons({
  onListen,
  onRepeat,
  onAdd,
  speaking = false,
  speechSupported = true,
  saved = false,
}: ActionButtonsProps) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={onListen}
        disabled={!speechSupported}
        aria-label={speaking ? "Stop" : "Listen"}
        className={cn(
          "btn-quill",
          speaking && "animate-pulse-gold border-gold text-gold",
          !speechSupported && "cursor-not-allowed opacity-40",
        )}
      >
        <Volume2 size={15} strokeWidth={1.6} />
        <span>{speaking ? "Speaking…" : "Listen"}</span>
      </button>
      <button
        type="button"
        onClick={onRepeat}
        disabled={!speechSupported || speaking}
        aria-label="Repeat"
        className={cn(
          "btn-quill",
          (!speechSupported || speaking) && "cursor-not-allowed opacity-40",
        )}
      >
        <Repeat size={15} strokeWidth={1.6} />
        <span>Repeat</span>
      </button>
      <button
        type="button"
        onClick={onAdd}
        aria-label={saved ? "Added to Notebook" : "Add to Notebook"}
        className={cn(
          "btn-quill",
          saved && "border-gold bg-gold/20 text-gold",
        )}
      >
        <PenLine size={15} strokeWidth={1.6} />
        <span>{saved ? "Added to Notebook" : "Add to Notebook"}</span>
      </button>
    </div>
  );
}
