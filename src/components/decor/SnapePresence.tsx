import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SnapePresenceProps {
  /** 信任度 0-100，控制存在感强度 */
  trust: number;
  className?: string;
}

/**
 * Snape 存在感（Phase 17.1-C 重构版）。
 *
 * 替代旧 SnapeShadow（人物剪影质量不足）。
 *
 * 设计：
 *   不用人物模型，改用环境暗示：
 *   1. 黑袍局部：右侧边缘露出一截飘动的黑袍下摆
 *   2. 移动阴影：地面缓慢移动的椭圆阴影
 *   3. 环境暗示：右侧暖光（像有人站在烛光前挡住光）
 *
 * trust → 存在感：
 *   - 0：几乎无感（只有极淡阴影）
 *   - 50：可感知（黑袍边缘 + 阴影）
 *   - 80：强烈（黑袍 + 阴影 + 暖光遮挡）
 *
 * 隐喻：Snape 一直在书房观察，但你看不见他，只能感知他的存在。
 */
export default function SnapePresence({ trust, className }: SnapePresenceProps) {
  // trust → 存在感强度
  const intensity = Math.min(1, Math.max(0.1, trust / 100));

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[3] overflow-hidden", className)}
      aria-hidden
    >
      {/* 1. 移动阴影（地面缓慢移动的椭圆） */}
      <motion.div
        className="absolute bottom-[8%] right-[5%]"
        style={{
          width: 220,
          height: 40,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)",
          opacity: 0.3 + intensity * 0.4,
          filter: "blur(4px)",
        }}
        animate={{
          x: [0, -12, 8, 0],
          opacity: [0.3 + intensity * 0.4, 0.4 + intensity * 0.4, 0.3 + intensity * 0.4],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 2. 黑袍局部（右侧边缘飘动的下摆） */}
      <motion.svg
        viewBox="0 0 120 300"
        className="absolute right-0 top-[15%] h-[50vh] w-auto"
        style={{ opacity: 0.4 + intensity * 0.5 }}
        animate={{
          x: [0, 3, -2, 0],
          opacity: [0.4 + intensity * 0.5, 0.5 + intensity * 0.5, 0.4 + intensity * 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="robeFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.6" stopColor="#0a0604" stopOpacity="0.7" />
            <stop offset="1" stopColor="#000" stopOpacity="0.95" />
          </linearGradient>
          <filter id="robeBlur">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* 黑袍下摆（从右侧边缘飘入） */}
        <g filter="url(#robeBlur)" fill="url(#robeFade)">
          <path d="M 120 0
                   L 60 40
                   Q 45 80 50 140
                   L 40 220
                   Q 38 260 55 290
                   L 120 300
                   Z" />
          {/* 褶皱细节 */}
          <path d="M 70 60 L 60 200 L 68 200 L 75 60 Z" opacity="0.6" />
          <path d="M 85 50 L 78 240 L 86 240 L 92 50 Z" opacity="0.5" />
          <path d="M 100 40 L 95 260 L 103 260 L 108 40 Z" opacity="0.4" />
        </g>
      </motion.svg>

      {/* 3. 环境暗示（右侧暖光被遮挡，像有人站在烛光前） */}
      <motion.div
        className="absolute right-0 top-[20%] h-[60vh] w-[30vw]"
        style={{
          background:
            "linear-gradient(90deg, transparent 40%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.5) 100%)",
          opacity: 0.4 + intensity * 0.3,
          filter: "blur(8px)",
        }}
        animate={{ opacity: [0.4 + intensity * 0.3, 0.5 + intensity * 0.3, 0.4 + intensity * 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
