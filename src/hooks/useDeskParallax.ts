/**
 * useDeskParallax（Phase 16.2-A）。
 *
 * 定位：鼠标位置 → 桌面物件视差偏移的 React hook。
 *   - 监听 window mousemove（节流到 rAF）
 *   - 输出 normalize 后的 -0.5 ~ 0.5 值
 *   - 移动端 / prefers-reduced-motion 自动禁用
 *
 * 使用方式：
 *   const { mouseX, mouseY } = useDeskParallax();
 *   <motion.div style={{ x: useTransform(mouseX, [-0.5, 0.5], [-10, 10]) }} />
 *
 * Phase 16.2-A 范围：
 *   - 仅输出 mouseX / mouseY 归一化值
 *   - 不处理触屏（触屏无 mousemove）
 *   - 不处理 scroll（scroll 视差留待后续 Phase）
 */

import { useEffect } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

/**
 * 鼠标视差 hook。
 *
 * 行为：
 *   - mount 时初始化 MotionValue（中心 0.5）
 *   - mousemove 节流到 rAF 更新
 *   - prefers-reduced-motion 时保持 0.5（不移动）
 *   - SSR 安全（window 不存在时不报错）
 *
 * @returns { mouseX, mouseY } MotionValue<number>，范围 0-1（0=左/上，1=右/下）
 */
export function useDeskParallax(): {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
} {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  useEffect(() => {
    // 检查 prefers-reduced-motion
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    let frame = 0;
    const handleMove = (e: MouseEvent) => {
      if (frame) return; // 节流：已有 rAF 在等待
      frame = requestAnimationFrame(() => {
        mouseX.set(e.clientX / window.innerWidth);
        mouseY.set(e.clientY / window.innerHeight);
        frame = 0;
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mouseX, mouseY]);

  return { mouseX, mouseY };
}
