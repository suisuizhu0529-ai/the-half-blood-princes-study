/**
 * ParticleField（Phase 18.2 · 粒子系统）。
 *
 * 定位：Lumos Scene 前景/背景粒子层。
 *
 * 视觉目标：
 *   Dark Academia 魔法研究室，微弱漂浮尘埃。
 *   - 极低 opacity（0.15-0.4）
 *   - 缓慢上升 + 微小横向漂移
 *   - 随机闪烁（呼吸感）
 *   - 暖色调（金/琥珀/灰白）
 *
 * 技术选型：
 *   Canvas + RAF（不用第三方库）
 *   - 性能优于 DOM 粒子
 *   - 单 RAF 循环，粒子数可控
 *
 * 不做：
 *   - 不实现"火星汇聚"等强魔法效果（由后续 CandleRitual 专用粒子处理）
 *   - 不响应鼠标（纯氛围粒子）
 *   - 不引入物理引擎
 */

import { useEffect, useRef } from "react";

export interface ParticleFieldProps {
  /** 粒子数量，默认 30 */
  count?: number;
  /** 整体透明度倍率，默认 1 */
  opacity?: number;
  /** 粒子色调，默认 "warm"（暖色），可选 "cool"（冷色月光） */
  tone?: "warm" | "cool";
  /** 是否启用（false 时不渲染 canvas），默认 true */
  enabled?: boolean;
  /** 自定义 className */
  className?: string;
  /** 自定义 z-index，默认 50。在 Lumos 全屏场景（z=999）内使用时建议设为 40-60 */
  zIndex?: number;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseOpacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

/** 暖色粒子色板（金 / 琥珀 / 灰白） */
const WARM_COLORS = ["#c9a227", "#d4a017", "#8a7020", "#e8d8b5"];
/** 冷色粒子色板（月光银 / 淡蓝 / 灰白） */
const COOL_COLORS = ["#b8c5d6", "#d6dce4", "#8a96a8", "#e8ecf2"];

const TWINKLE_MIN = 0.15;
const TWINKLE_MAX = 0.4;

/**
 * 漂浮尘埃粒子层（Canvas）。
 *
 * 粒子运动模型：
 *   - 缓慢上升（vy = -0.05 ~ -0.15 px/frame）
 *   - 微小横向漂移（vx = -0.05 ~ 0.05 px/frame）
 *   - 闪烁：sin(phase) 调制 opacity
 *   - 越界回收：从底部重新生成
 */
export default function ParticleField({
  count = 30,
  opacity = 1,
  tone = "warm",
  enabled = true,
  className,
  zIndex = 50,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<DustParticle[]>([]);
  const rafRef = useRef<number | null>(null);
  // Phase 19.1 验收修复：用 ref 保存 opacity，避免 opacity 变化时 useEffect 重跑
  //   原 bug：AwakeningSequence 每 100ms 更新 elapsed → re-render → particleOpacity 变化
  //          → useEffect deps 含 opacity → 重跑 → 重新初始化所有粒子 → 粒子位置瞬移闪烁
  //   修复：opacity 通过 ref 传递给 render 函数，不进入 useEffect deps
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 颜色色板
    const colors = tone === "warm" ? WARM_COLORS : COOL_COLORS;

    // 初始化粒子
    const initParticle = (w: number, h: number): DustParticle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -(0.05 + Math.random() * 0.1),
      radius: 0.5 + Math.random() * 1.2,
      baseOpacity: TWINKLE_MIN + Math.random() * (TWINKLE_MAX - TWINKLE_MIN),
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.005 + Math.random() * 0.01,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      // 重新初始化粒子（尺寸变化时）
      particlesRef.current = Array.from({ length: count }, () =>
        initParticle(window.innerWidth, window.innerHeight),
      );
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // 从 ref 读取最新 opacity（不触发 useEffect 重跑）
      const currentOpacity = opacityRef.current;

      particlesRef.current.forEach((p, i) => {
        // 更新位置
        p.x += p.vx;
        p.y += p.vy;
        p.twinklePhase += p.twinkleSpeed;

        // 越界回收：从底部重新生成
        if (p.y < -10) {
          particlesRef.current[i] = initParticle(w, h);
          particlesRef.current[i].y = h + 10;
          return;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // 闪烁后的透明度
        const twinkle = (Math.sin(p.twinklePhase) + 1) / 2; // 0-1
        const finalOpacity = p.baseOpacity * (0.4 + twinkle * 0.6) * currentOpacity;

        // 绘制（带微弱光晕）
        const color = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = finalOpacity;
        ctx.fill();

        // 微弱光晕（半径稍大，透明度更低）
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = finalOpacity * 0.2;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [count, tone, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex,
        mixBlendMode: "screen",
      }}
    />
  );
}
