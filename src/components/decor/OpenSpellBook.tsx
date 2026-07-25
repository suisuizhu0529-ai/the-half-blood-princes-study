import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OpenSpellBookProps {
  /** 信任度 0-100，控制书本打开程度 */
  trust: number;
  /** 最近一条 sharedHistory 事件的 subject（显示在书页上） */
  lastMemorySubject?: string;
  className?: string;
}

/**
 * 摊开的魔法书（Phase 16.2-A）。
 *
 * 视觉：
 *   - 深棕色皮革封面 + 金色书脊装饰
 *   - 羊皮纸书页 + 古老文字纹理
 *   - 书本以书脊为轴打开（rotateY 3D 透视）
 *
 * trust 映射：
 *   - 0-19：闭合（rotateY 0°）
 *   - 20-60：半开 30°
 *   - 60+：全开 90°（可见书页内容）
 *
 * 书页内容：
 *   - trust ≥ 60 时显示最近一条 sharedHistory 的 subject
 *   - trust < 60 时显示古老符文纹理（不可读）
 */
export default function OpenSpellBook({
  trust,
  lastMemorySubject,
  className,
}: OpenSpellBookProps) {
  // trust → 打开角度
  const openAngle =
    trust < 20 ? 0 : trust < 60 ? -30 : -90;

  const isOpen = openAngle !== 0;
  const isFullyOpen = trust >= 60;

  return (
    <div
      className={cn("relative", className)}
      style={{ perspective: "800px" }}
      aria-hidden
    >
      <motion.div
        initial={{ rotateY: 0, opacity: 0 }}
        animate={{ rotateY: openAngle, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
      >
        <svg viewBox="0 0 280 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* 封面皮革 */}
            <linearGradient id="bookCover" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3a2418" />
              <stop offset="0.5" stopColor="#2a1810" />
              <stop offset="1" stopColor="#1a0e08" />
            </linearGradient>
            {/* 书页羊皮纸 */}
            <linearGradient id="bookPage" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#d8c7a5" />
              <stop offset="0.5" stopColor="#c8b790" />
              <stop offset="1" stopColor="#b8a780" />
            </linearGradient>
            {/* 金色装饰 */}
            <linearGradient id="goldDeco" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9a227" />
              <stop offset="1" stopColor="#8a7020" />
            </linearGradient>
          </defs>

          {/* 书本阴影（桌面投影） */}
          <ellipse cx="140" cy="195" rx="130" ry="8" fill="#000" opacity="0.4" />

          {/* 左页（固定） */}
          <g>
            <rect x="20" y="20" width="120" height="160" rx="2" fill="url(#bookPage)" />
            {/* 页面边缘磨损 */}
            <rect x="20" y="20" width="120" height="160" rx="2" fill="none" stroke="#8a7050" strokeWidth="0.5" opacity="0.4" />
          </g>

          {/* 右页（可翻转） */}
          <motion.g
            animate={{ rotateY: openAngle }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "140px 100px", transformStyle: "preserve-3d" }}
          >
            <rect x="140" y="20" width="120" height="160" rx="2" fill="url(#bookCover)" />
            {/* 金色书脊装饰 */}
            <rect x="138" y="20" width="4" height="160" fill="url(#goldDeco)" opacity="0.6" />
            {/* 封面纹饰 */}
            {isOpen && (
              <g opacity={isFullyOpen ? 0 : 1}>
                <circle cx="200" cy="100" r="30" fill="none" stroke="url(#goldDeco)" strokeWidth="1" opacity="0.5" />
                <path d="M 185 100 L 215 100 M 200 85 L 200 115" stroke="url(#goldDeco)" strokeWidth="0.8" opacity="0.4" />
              </g>
            )}
          </motion.g>

          {/* 书页内容（仅完全打开时可见） */}
          {isFullyOpen && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              {/* 左页：古老符文纹理 */}
              <g opacity="0.3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`rune-${i}`}
                    x1="35"
                    y1={40 + i * 22}
                    x2="125"
                    y2={40 + i * 22}
                    stroke="#5a4030"
                    strokeWidth="0.8"
                    strokeDasharray="4 3 2 3"
                  />
                ))}
              </g>
              {/* 右页：最近记忆 */}
              {lastMemorySubject && (
                <g>
                  <text
                    x="200"
                    y="70"
                    textAnchor="middle"
                    fill="#3a2418"
                    fontSize="7"
                    fontFamily="Cormorant Garamond, serif"
                    fontStyle="italic"
                    opacity="0.7"
                  >
                    Latest Memory
                  </text>
                  <text
                    x="200"
                    y="100"
                    textAnchor="middle"
                    fill="#2a1810"
                    fontSize="9"
                    fontFamily="Cormorant Garamond, serif"
                    fontWeight="600"
                  >
                    {lastMemorySubject.length > 20
                      ? lastMemorySubject.slice(0, 20) + "…"
                      : lastMemorySubject}
                  </text>
                  <line x1="160" y1="115" x2="240" y2="115" stroke="#8a7020" strokeWidth="0.5" opacity="0.4" />
                </g>
              )}
            </motion.g>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
