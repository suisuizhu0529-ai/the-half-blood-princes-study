/**
 * WandRenderer（Phase 17.2.4 · 平滑跟随 + Snape 三节式）。
 *
 * 架构升级：
 *   - 位置平滑跟随（lerp, smoothing=0.15）
 *     鼠标移动距离 ≠ 魔杖移动距离，虚拟手持物有重量感。
 *   - 直接 DOM 操作（ref + RAF），避免 React 重新渲染干扰平滑动画。
 *   - Snape 黑色三节式魔杖（viewBox 48×110，缩短 25% / 加宽 30%）。
 *
 * 握持逻辑（保持不变）：
 *   - 基础角度：-35deg（人手腕自然握持角度）
 *   - 手腕惯性：移动时 ±8deg 微调（基于水平移动方向）
 *   - 停止恢复：400ms 延迟 + 350ms ease-out 回正
 *   - 杖柄靠近鼠标（手的位置），杖尖朝左上方
 *
 * 不再接收 angle prop。
 * 渲染器自主计算握持姿态。
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { BASE_WAND_ANGLE } from "./wandGeometry";

interface WandRendererProps {
  /** 手的水平位置（鼠标 X，px）—— 目标位置，非渲染位置 */
  x: number;
  /** 手的垂直位置（鼠标 Y，px）—— 目标位置，非渲染位置 */
  y: number;
  /** 移动速度（px/s），用于惯性强度 */
  velocity: number;
  /** 水平移动方向（-1 = 左, 0 = 静止, 1 = 右），用于手腕惯性方向 */
  horizontalDirection: number;
  /** 整体透明度（0-1） */
  opacity?: number;
}

const SMOOTHING = 0.15; // 位置平滑系数（desktop: 0.12 ~ 0.18）
const MAX_INERTIA = 8; // 最大手腕惯性 ±8deg
const RECOVERY_DELAY = 400; // 停止后恢复时间 ms
const RECOVERY_DURATION = 350; // 恢复动画时长 ms

/**
 * Snape 风格黑檀木魔杖（虚拟手持物 · 平滑跟随）。
 *
 * 坐标系：
 *   viewBox 48×110
 *   杖柄在底部中心 (24, 108) — 对齐鼠标（手的位置）
 *   杖尖在顶部中心 (24, 2)
 *   旋转中心：杖柄 (24, 108)
 *
 * 三节式结构（从顶到底）：
 *   y=2-35   第一节：细长杖尖（直径 ~4px）
 *   y=35-72  第二节：中等连接处（直径 ~5px）
 *   y=72-108 第三节：握持区域（直径 ~9px，带刻纹）
 */
export default function WandRenderer({
  x,
  y,
  velocity,
  horizontalDirection,
  opacity = 1,
}: WandRendererProps) {
  const wandRef = useRef<HTMLDivElement>(null);

  // === 平滑位置（refs，避免 React 重新渲染干扰 RAF 动画） ===
  const renderXRef = useRef(x);
  const renderYRef = useRef(y);
  const targetXRef = useRef(x);
  const targetYRef = useRef(y);

  // === 角度（refs） ===
  const angleRef = useRef(BASE_WAND_ANGLE);
  const lastMoveTimeRef = useRef(0);
  const recoveryStartRef = useRef<number | null>(null);
  const recoveryFromAngleRef = useRef(BASE_WAND_ANGLE);

  // 更新目标位置（props 变化时）
  useEffect(() => {
    const wasOffScreen = targetXRef.current < -500;
    const isOnScreen = x > -500;

    // 首次进入页面：snap 到位置（避免从屏幕外飞入）
    if (wasOffScreen && isOnScreen) {
      renderXRef.current = x;
      renderYRef.current = y;
    }

    targetXRef.current = x;
    targetYRef.current = y;
  }, [x, y]);

  // 更新角度目标（移动时设惯性，停止时启动恢复）
  useEffect(() => {
    if (velocity > 30) {
      lastMoveTimeRef.current = performance.now();
      recoveryStartRef.current = null; // 取消恢复

      const inertiaStrength = Math.min(1, velocity / 2000);
      const inertia = horizontalDirection * MAX_INERTIA * inertiaStrength;
      angleRef.current = BASE_WAND_ANGLE + inertia;
    } else if (
      angleRef.current !== BASE_WAND_ANGLE &&
      recoveryStartRef.current === null
    ) {
      // 静止：延迟后恢复到 BASE_WAND_ANGLE
      recoveryStartRef.current = lastMoveTimeRef.current + RECOVERY_DELAY;
      recoveryFromAngleRef.current = angleRef.current;
    }
  }, [velocity, horizontalDirection]);

  // 初始 transform（在 paint 前设置，避免 (0,0) 闪烁）
  useLayoutEffect(() => {
    if (wandRef.current) {
      wandRef.current.style.transform = `translate(${renderXRef.current - 24}px, ${renderYRef.current - 108}px) rotate(${angleRef.current}deg)`;
    }
  }, []);

  // RAF 循环：位置平滑 + 角度恢复 + DOM 更新
  useEffect(() => {
    let rafId: number;

    const animate = () => {
      const now = performance.now();

      // === 位置平滑（lerp） ===
      const targetX = targetXRef.current;
      const targetY = targetYRef.current;

      if (targetX > -500) {
        const dx = targetX - renderXRef.current;
        const dy = targetY - renderYRef.current;

        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          renderXRef.current += dx * SMOOTHING;
          renderYRef.current += dy * SMOOTHING;
        } else {
          renderXRef.current = targetX;
          renderYRef.current = targetY;
        }
      }

      // === 角度恢复（ease-out） ===
      if (
        recoveryStartRef.current !== null &&
        now >= recoveryStartRef.current
      ) {
        const elapsed = now - recoveryStartRef.current;
        const progress = Math.min(1, elapsed / RECOVERY_DURATION);
        const eased = 1 - Math.pow(1 - progress, 3);
        const fromAngle = recoveryFromAngleRef.current;
        angleRef.current =
          fromAngle + (BASE_WAND_ANGLE - fromAngle) * eased;

        if (progress >= 1) {
          recoveryStartRef.current = null;
          angleRef.current = BASE_WAND_ANGLE;
        }
      }

      // === 更新 DOM（直接操作，不触发 React 重新渲染） ===
      if (wandRef.current) {
        wandRef.current.style.transform = `translate(${renderXRef.current - 24}px, ${renderYRef.current - 108}px) rotate(${angleRef.current}deg)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 速度仍用于 drop-shadow 强度（让魔杖在深色背景下保持可辨识）
  const shadowIntensity = Math.min(0.6, 0.25 + velocity / 6000);

  return (
    <div
      ref={wandRef}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 48,
        height: 110,
        pointerEvents: "none",
        opacity,
        willChange: "transform",
        transformOrigin: "24px 108px",
        zIndex: 60,
        // transform 由 RAF 循环直接控制，不放入 style（避免 re-render 覆盖平滑值）
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 110"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.5)) drop-shadow(0 0 4px rgba(58,40,24,${shadowIntensity}))`,
        }}
      >
        <defs>
          {/* === 杖身：黑檀木带灰调（左暗 → 中亮 → 右暗，模拟侧光） === */}
          <linearGradient id="wandBodyV4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0e0b08" />
            <stop offset="35%" stopColor="#1c1714" />
            <stop offset="50%" stopColor="#2a221c" />
            <stop offset="65%" stopColor="#1c1714" />
            <stop offset="100%" stopColor="#0e0b08" />
          </linearGradient>

          {/* === 暗银色高光脊（中央极细线，模拟金属/木纹反光） === */}
          <linearGradient id="wandSpineV4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a4438" stopOpacity="0" />
            <stop offset="50%" stopColor="#4a4438" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#4a4438" stopOpacity="0" />
          </linearGradient>

          {/* === 边缘 rim light（极弱暖色，让魔杖从背景分离） === */}
          <linearGradient id="wandRimV4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a2818" stopOpacity="0.55" />
            <stop offset="15%" stopColor="#3a2818" stopOpacity="0" />
            <stop offset="85%" stopColor="#3a2818" stopOpacity="0" />
            <stop offset="100%" stopColor="#3a2818" stopOpacity="0.55" />
          </linearGradient>

          {/* === 暗银色节环（连接处装饰） === */}
          <linearGradient id="silverBandV4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a1814" />
            <stop offset="50%" stopColor="#4a4438" />
            <stop offset="100%" stopColor="#1a1814" />
          </linearGradient>
        </defs>

        {/* === 杖身主体（三节式轮廓） ===
         *  结构（从顶到底）：
         *    y=2-10    杖尖（尖锐）
         *    y=10-35   第一节：细长黑檀木杆（直径 ~4px）
         *    y=35-72   第二节：中等连接处（直径 ~5px）
         *    y=72-108  第三节：握持区域（直径 ~9px）
         */}
        <path
          d="M 24 2
             L 25.5 10
             L 26 35
             L 26.5 72
             L 28 78
             L 28.5 108
             L 19.5 108
             L 20 78
             L 21.5 72
             L 22 35
             L 22.5 10
             Z"
          fill="url(#wandBodyV4)"
        />

        {/* rim light 覆盖（边缘暖光，从深色背景分离） */}
        <path
          d="M 24 2
             L 25.5 10
             L 26 35
             L 26.5 72
             L 28 78
             L 28.5 108
             L 19.5 108
             L 20 78
             L 21.5 72
             L 22 35
             L 22.5 10
             Z"
          fill="url(#wandRimV4)"
        />

        {/* === 中央高光脊（贯穿全杖，暗银色） === */}
        <line
          x1="24"
          y1="10"
          x2="24"
          y2="108"
          stroke="url(#wandSpineV4)"
          strokeWidth="0.7"
          opacity="0.7"
        />

        {/* === 第一节 → 第二节 连接暗银环（y≈35） === */}
        <rect x="21.5" y="34" width="5" height="1.2" fill="url(#silverBandV4)" opacity="0.7" />

        {/* === 第二节 → 第三节 连接暗银环（y≈72） === */}
        <rect x="20" y="71" width="8" height="1.4" fill="url(#silverBandV4)" opacity="0.75" />

        {/* === 第三节握把刻纹（低调横线，防滑木纹） === */}
        <g opacity="0.4" stroke="#0a0806" strokeWidth="0.4">
          <line x1="20" y1="84" x2="28" y2="84" />
          <line x1="20" y1="92" x2="28" y2="92" />
          <line x1="20" y1="100" x2="28" y2="100" />
        </g>

        {/* === 杖尖（极弱定义点，不发光） === */}
        <circle cx="24" cy="3" r="0.6" fill="#3a3028" opacity="0.7" />
      </svg>
    </div>
  );
}
