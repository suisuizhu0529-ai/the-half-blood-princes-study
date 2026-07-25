import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Feather } from "lucide-react";
import Flourish from "@/components/decor/Flourish";
import { useEntered } from "@/hooks/useEntered";

interface PlaceholderPageProps {
  /** 英文标题 */
  title: string;
  /** 中文副标题（带空格的"私人 笔 记"风格） */
  titleZh: string;
  /** 阶段标识，如 "Phase 4 · Forthcoming" */
  phase: string;
  /** 诗意描述 */
  description: string;
}

/**
 * Phase 1 占位页面。
 *
 * 用于 Notebook / Library / Settings 三个尚未开发的路由。
 * 保持 Dark Academia 风格统一：羊皮纸金色边框、Cinzel 标题、
 * 羽毛笔装饰、返回书房链接。
 *
 * 仅视觉，不含任何数据逻辑。
 */
export default function PlaceholderPage({
  title,
  titleZh,
  phase,
  description,
}: PlaceholderPageProps) {
  const { entered } = useEntered();

  return (
    <section className="container flex min-h-screen flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
        className="relative w-full max-w-[560px]"
      >
        {/* 羊皮纸卡片 */}
        <div className="parchment-surface relative rounded-sm px-8 py-14 shadow-parchment-deep sm:px-12 sm:py-16">
          {/* 双层金色边框 */}
          <div className="pointer-events-none absolute inset-[6px] rounded-sm border border-gold/55" />
          <div className="pointer-events-none absolute inset-[10px] rounded-sm border border-gold/25" />

          {/* 顶部羽毛笔 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
            animate={
              entered
                ? { opacity: 0.85, scale: 1, rotate: 0 }
                : { opacity: 0, scale: 0.7, rotate: -8 }
            }
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
            className="mx-auto mb-6 w-fit"
          >
            <Feather
              size={26}
              strokeWidth={1.3}
              className="text-[#7a5a12] drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
            />
          </motion.div>

          {/* 阶段 */}
          <p className="font-ui text-[10px] uppercase tracking-widest3 text-ink/55">
            {phase}
          </p>

          {/* 英文标题 */}
          <h1 className="mt-4 font-display text-3xl tracking-widest2 text-ink/85 sm:text-4xl">
            {title}
          </h1>

          {/* 中文副标题 */}
          <p className="mt-3 font-zh text-xs tracking-[0.4em] text-ink/55 sm:text-sm">
            {titleZh}
          </p>

          <Flourish className="mx-auto mt-7 h-3 w-52" variant="center" />

          {/* 诗意描述 */}
          <p className="mt-8 font-serif text-lg italic leading-relaxed text-ink/70">
            {description}
          </p>

          {/* 返回书房 */}
          <Link
            to="/"
            className="mt-12 inline-flex items-center gap-2 font-ui text-[11px] uppercase tracking-widest2 text-ink/55 transition-colors hover:text-ink"
          >
            <span className="h-px w-6 bg-ink/40" />
            <ArrowLeft size={13} strokeWidth={1.6} />
            <span>Return to Study</span>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
