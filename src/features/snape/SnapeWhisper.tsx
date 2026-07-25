/**
 * SnapeWhisper（Phase 17.1-C Step 2 + Visual Preview 接入）。
 *
 * 定位：Snape 低语呈现层（React feature）。
 *   - 接受 SnapeReaction 输入
 *   - 仅渲染斜体文字（羊皮纸色 + 微光）
 *   - 无头像、无聊天框、无交互
 *   - 纯氛围层
 *
 * Visual Preview 接入：
 *   - 在 LumosEntrance 中点击符文后显示 "Another late arrival."
 *   - 用 useState 在 mount 时固定选取的文案（避免重渲染闪烁）
 *   - 3.5s 后自动淡出
 *
 * 明确禁止（Step 2 + Visual Preview）：
 *   ❌ 不自动播放声音（useSpeech）
 *   ❌ 不创建对话框 / 头像
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SnapeReaction } from "@/core/snape/reactions";

interface SnapeWhisperProps {
  /** 当前要显示的反应（null 时不显示） */
  reaction?: SnapeReaction | null;
  /** 指定显示第几条文案（默认 mount 时随机选一条并固定） */
  lineIndex?: number;
  /** 自动淡出时长（ms），默认 3500，设为 0 时不自动淡出 */
  duration?: number;
  className?: string;
}

/**
 * Snape 低语呈现组件。
 *
 * 用法：
 *   const reaction = SNAPE_REACTIONS.find(r => r.moment === "ritual_enter");
 *   <SnapeWhisper reaction={reaction} duration={3500} />
 *
 * 文字会在 mount 时从 reaction.lines 中选一条（固定），3.5s 后自动淡出。
 */
export default function SnapeWhisper({
  reaction,
  lineIndex,
  duration = 3500,
  className,
}: SnapeWhisperProps) {
  // mount 时固定选取一条文案（避免重渲染重新随机导致闪烁）
  const [line, setLine] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!reaction || reaction.lines.length === 0) {
      setLine(null);
      setVisible(true);
      return;
    }

    const selected =
      lineIndex !== undefined
        ? reaction.lines[lineIndex] ?? reaction.lines[0]
        : reaction.lines.length === 1
          ? reaction.lines[0]
          : reaction.lines[Math.floor(Math.random() * reaction.lines.length)];

    setLine(selected ?? null);
    setVisible(true);

    // 自动淡出
    if (duration > 0) {
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [reaction, lineIndex, duration]);

  return (
    <AnimatePresence>
      {line && visible && (
        <motion.div
          key={line}
          className={cn(
            "pointer-events-none absolute left-1/2 top-8 z-30 -translate-x-1/2",
            "font-serif text-sm italic text-parchment/70",
            className,
          )}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          aria-live="polite"
          data-snape-moment={reaction?.moment}
          data-snape-tone={reaction?.tone}
        >
          {line}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
