import { cn } from "@/lib/utils";

interface FeatherProps {
  className?: string;
  /** 角度（deg） */
  rotate?: number;
}

/**
 * 羽毛笔装饰 SVG。斜放在笔记角落。
 */
export default function Feather({ className, rotate = -28 }: FeatherProps) {
  return (
    <svg
      viewBox="0 0 120 220"
      className={cn("block", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="feather-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0e0c0" />
          <stop offset="0.5" stopColor="#c9b68e" />
          <stop offset="1" stopColor="#8a6e4a" />
        </linearGradient>
        <linearGradient id="quill-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8c7a5" />
          <stop offset="1" stopColor="#6a5238" />
        </linearGradient>
      </defs>
      {/* 羽毛主干 */}
      <path
        d="M 60 20 Q 55 60 58 110 Q 60 140 64 160"
        stroke="url(#feather-grad)"
        strokeWidth="2"
        fill="none"
      />
      {/* 羽毛叶片（左） */}
      <path
        d="M 60 30 Q 30 50 22 90 Q 25 110 40 100 Q 50 80 58 50 Z"
        fill="url(#feather-grad)"
        opacity="0.85"
      />
      {/* 羽毛叶片（右） */}
      <path
        d="M 60 35 Q 88 55 95 95 Q 92 115 78 105 Q 68 85 60 55 Z"
        fill="url(#feather-grad)"
        opacity="0.7"
      />
      {/* 羽枝细线 */}
      {Array.from({ length: 9 }).map((_, i) => {
        const y = 35 + i * 12;
        return (
          <g key={i} stroke="#6a5238" strokeWidth="0.4" opacity="0.5">
            <line x1="60" y1={y} x2={28 + i * 1.5} y2={y + 14} />
            <line x1="60" y1={y} x2={92 - i * 1.5} y2={y + 14} />
          </g>
        );
      })}
      {/* 笔杆 */}
      <path
        d="M 64 160 L 78 215 L 82 215 L 68 158 Z"
        fill="url(#quill-grad)"
      />
      {/* 笔尖 */}
      <path d="M 78 215 L 84 222 L 82 213 Z" fill="#1a1410" />
    </svg>
  );
}
