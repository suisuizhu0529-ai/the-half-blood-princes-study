import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeatherPenProps {
  /** 好奇度 0-100，控制羽毛笔动画强度 */
  curiosity: number;
  className?: string;
}

/**
 * 羽毛笔（Phase 16.2-A）。
 *
 * 视觉：
 *   - 斜置在书桌上的鹅毛笔
 *   - 墨金色羽毛 + 金色笔尖
 *   - 墨水瓶（固定）
 *
 * curiosity 映射：
 *   - 0-19：静止（仅微弱呼吸）
 *   - 20-59：轻微晃动（rotation ±1.5°，duration 4s）
 *   - 60+：活跃书写（rotation ±3°，duration 1.5s + 抖动）
 *
 * 隐喻：curiosity 越高，Snape 越愿意"记录"学生的问题。
 */
export default function FeatherPen({ curiosity, className }: FeatherPenProps) {
  // curiosity → 动画强度
  const isActive = curiosity >= 60;
  const isWobbling = curiosity >= 20;

  const rotationRange = isActive ? 3 : isWobbling ? 1.5 : 0.3;
  const duration = isActive ? 1.5 : isWobbling ? 4 : 6;

  return (
    <div className={cn("relative", className)} aria-hidden>
      <motion.div
        animate={{
          rotate: [-rotationRange, rotationRange, -rotationRange],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ transformOrigin: "bottom right" }}
      >
        <svg viewBox="0 0 120 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="feather" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1a1410" />
              <stop offset="0.3" stopColor="#3a2418" />
              <stop offset="0.6" stopColor="#2a1810" />
              <stop offset="1" stopColor="#1a0e08" />
            </linearGradient>
            <linearGradient id="featherRib" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c9a227" stopOpacity="0.4" />
              <stop offset="1" stopColor="#8a7020" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="inkwell" cx="0.5" cy="0.3" r="0.5">
              <stop offset="0" stopColor="#1a0e08" />
              <stop offset="0.6" stopColor="#0a0604" />
              <stop offset="1" stopColor="#000" />
            </radialGradient>
          </defs>

          {/* 墨水瓶 */}
          <ellipse cx="100" cy="148" rx="14" ry="4" fill="#000" opacity="0.4" />
          <path d="M 88 130 L 88 145 Q 88 150 100 150 Q 112 150 112 145 L 112 130 L 108 125 L 92 125 Z" fill="#2a1810" />
          <ellipse cx="100" cy="130" rx="10" ry="3" fill="url(#inkwell)" />
          <ellipse cx="100" cy="128" rx="6" ry="1.5" fill="#0a0604" />

          {/* 羽毛笔主体（斜置，从墨水瓶向左上延伸） */}
          <g transform="translate(100, 130) rotate(-55)">
            {/* 笔杆 */}
            <rect x="-2" y="0" width="4" height="20" fill="#4a3020" />
            {/* 金色笔尖 */}
            <path d="M -2 20 L 2 20 L 0 28 Z" fill="#c9a227" />
            <path d="M -1 22 L 1 22 L 0 26 Z" fill="#8a7020" />

            {/* 羽毛 */}
            <path
              d="M 0 0 Q -8 -20 -10 -50 Q -8 -80 0 -100 Q 8 -80 10 -50 Q 8 -20 0 0 Z"
              fill="url(#feather)"
            />
            {/* 羽毛中轴 */}
            <line x1="0" y1="0" x2="0" y2="-95" stroke="url(#featherRib)" strokeWidth="1" />

            {/* 羽毛分叉细节 */}
            {Array.from({ length: 8 }).map((_, i) => (
              <g key={i}>
                <line
                  x1="0" y1={-15 - i * 10}
                  x2={-4 - i * 0.5} y2={-20 - i * 10}
                  stroke="#1a0e08" strokeWidth="0.5" opacity="0.6"
                />
                <line
                  x1="0" y1={-15 - i * 10}
                  x2={4 + i * 0.5} y2={-20 - i * 10}
                  stroke="#1a0e08" strokeWidth="0.5" opacity="0.6"
                />
              </g>
            ))}
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
