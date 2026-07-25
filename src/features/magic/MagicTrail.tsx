/**
 * MagicTrail（Phase 17.2.1 · 杖尖锚定）。
 *
 * 视觉：
 *   像羊皮纸上的魔法笔迹，墨水残留。
 *
 *   - 金色墨迹（#d4a017 → #8a7020）
 *   - 0.8 秒淡出消失
 *   - 轻微模糊（墨水晕染感）
 *   - 单条平滑曲线
 *   - 极低调，无粒子，无爆炸
 *
 * 锚点（Phase 17.2.1 修正）：
 *   轨迹绑定 WandRenderer 杖尖坐标，而非手的位置。
 *   通过 computeWandTip(handleX, handleY) 将手部路径转换为杖尖路径。
 *   效果：魔法痕迹从杖尖产生，不是从手的位置产生。
 *
 * 风格：
 *   Snape — 冷峻、低调、高级
 *   不是 LOL 技能，不是烟花
 */

import type { TrailPoint } from "./MagicController";
import { computeWandTip } from "./wandGeometry";

interface MagicTrailProps {
  /** 手势路径点数组（从新到旧，基于手的位置） */
  points: TrailPoint[];
  /** 整体透明度 */
  opacity?: number;
}

/**
 * 金色墨迹轨迹（杖尖锚定）。
 *
 * 输入的 points 基于手的位置（MagicController 记录）。
 * 渲染前通过 computeWandTip 转换为杖尖坐标。
 * 透明度随点年龄衰减（0.8s 消失）。
 */
export default function MagicTrail({ points, opacity = 1 }: MagicTrailProps) {
  if (points.length < 2) return null;

  // 将手部路径转换为杖尖路径（基于固定握持角度 -35deg）
  const tipPoints = points.map((p) => {
    const tip = computeWandTip(p.x, p.y);
    return { ...p, x: tip.x, y: tip.y };
  });

  // 按时间从旧到新排序，绘制平滑曲线
  const sorted = [...tipPoints].reverse();
  const pathD = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // 整体透明度：取最近点的透明度
  const recentOpacity = tipPoints[0]?.opacity ?? 0;

  return (
    <svg
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 59,
        opacity: Math.min(0.3, opacity * recentOpacity),
        mixBlendMode: "screen",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 金色墨迹渐变 */}
        <linearGradient id="inkTrail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8a7020" stopOpacity="0" />
          <stop offset="40%" stopColor="#d4a017" stopOpacity="0.5" />
          <stop offset="80%" stopColor="#c9a227" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8a7020" stopOpacity="0" />
        </linearGradient>

        {/* 墨水晕染模糊 */}
        <filter id="inkBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* 金色墨迹曲线 */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#inkTrail)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#inkBlur)"
      />
    </svg>
  );
}
