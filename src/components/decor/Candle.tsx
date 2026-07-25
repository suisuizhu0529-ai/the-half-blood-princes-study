import { cn } from "@/lib/utils";

interface CandleProps {
  /** 火焰高度倍率，默认 1 */
  scale?: number;
  /** 火焰摇曳动画延迟（秒） */
  delay?: number;
  /** 摇曳速度（秒），默认 3.2s */
  duration?: number;
  className?: string;
}

/**
 * 一根燃烧的蜡烛 SVG。
 * 含蜡身、烛芯、火焰（带白核-黄-橙-透明渐变）与光晕。
 * 火焰使用 CSS flicker 动画摇曳。
 */
export default function Candle({
  scale = 1,
  delay = 0,
  duration = 3.2,
  className,
}: CandleProps) {
  return (
    <div
      className={cn("relative", className)}
      style={{ width: 80 * scale, height: 200 * scale }}
      aria-hidden
    >
      <svg
        viewBox="0 0 80 200"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 蜡身渐变 */}
          <linearGradient id={`wax-${scale}-${delay}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2d22" />
            <stop offset="0.35" stopColor="#6a5238" />
            <stop offset="0.55" stopColor="#8a6e4a" />
            <stop offset="0.8" stopColor="#4a3826" />
            <stop offset="1" stopColor="#2a1f16" />
          </linearGradient>
          {/* 蜡顶凹陷 */}
          <radialGradient id={`waxtop-${scale}-${delay}`} cx="0.5" cy="0.4" r="0.6">
            <stop offset="0" stopColor="#1a1208" />
            <stop offset="1" stopColor="#4a3826" />
          </radialGradient>
          {/* 火焰主体渐变 */}
          <radialGradient id={`flame-${scale}-${delay}`} cx="0.5" cy="0.7" r="0.6">
            <stop offset="0" stopColor="#fff8d8" />
            <stop offset="0.25" stopColor="#ffe08a" />
            <stop offset="0.55" stopColor="#e0a458" />
            <stop offset="0.85" stopColor="#a0481a" stopOpacity="0.8" />
            <stop offset="1" stopColor="#5a1f0a" stopOpacity="0" />
          </radialGradient>
          {/* 火焰外光晕 */}
          <radialGradient id={`halo-${scale}-${delay}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd88a" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#e0a458" stopOpacity="0.18" />
            <stop offset="1" stopColor="#e0a458" stopOpacity="0" />
          </radialGradient>
          {/* 桌面光池 */}
          <radialGradient id={`pool-${scale}-${delay}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#e0a458" stopOpacity="0.35" />
            <stop offset="1" stopColor="#e0a458" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 桌面光池（在蜡身下方铺开） */}
        <ellipse cx="40" cy="192" rx="60" ry="10" fill={`url(#pool-${scale}-${delay})`} />

        {/* 蜡身 */}
        <path
          d="M 22 60 Q 22 55 28 55 L 52 55 Q 58 55 58 60 L 58 185 Q 58 192 52 192 L 28 192 Q 22 192 22 185 Z"
          fill={`url(#wax-${scale}-${delay})`}
        />
        {/* 蜡身高光 */}
        <path
          d="M 30 58 L 33 58 L 33 188 L 30 188 Z"
          fill="#d8b878"
          opacity="0.25"
        />
        {/* 蜡顶椭圆凹陷 */}
        <ellipse cx="40" cy="56" rx="16" ry="5" fill={`url(#waxtop-${scale}-${delay})`} />
        {/* 蜡滴 */}
        <path
          d="M 26 62 Q 24 80 27 95 Q 25 110 28 130"
          stroke="#5a4228"
          strokeWidth="2"
          fill="none"
          opacity="0.55"
        />

        {/* 烛芯 */}
        <rect x="39" y="42" width="2" height="16" fill="#1a0f06" />

        {/* 火焰光晕（大） */}
        <circle cx="40" cy="36" r="32" fill={`url(#halo-${scale}-${delay})`} />

        {/* 火焰本体（应用 flicker 动画） */}
        <g
          style={{
            transformOrigin: "40px 56px",
            animation: `flicker ${duration}s ease-in-out ${delay}s infinite`,
          }}
        >
          {/* 外焰 */}
          <path
            d="M 40 18 Q 32 30 33 42 Q 34 54 40 56 Q 46 54 47 42 Q 48 30 40 18 Z"
            fill={`url(#flame-${scale}-${delay})`}
          />
          {/* 内焰白核 */}
          <ellipse cx="40" cy="44" rx="2.5" ry="6" fill="#fffaf0" opacity="0.85" />
        </g>
      </svg>
    </div>
  );
}
