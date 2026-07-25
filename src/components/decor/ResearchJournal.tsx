import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { loadRelationshipMemory } from "@/store/relationshipMemory";
import { readSharedHistory } from "@/utils/sharedHistoryReader";
import type { SharedHistoryRecallEvent } from "@/types/sharedHistoryContext";

interface ResearchJournalProps {
  /** 信任度 0-100，控制书本打开程度 */
  trust: number;
  className?: string;
}

/**
 * 研究日志（Phase 16.2-B）。
 *
 * 升级自 OpenSpellBook，关键变化：
 *   - 不再直接读 RelationshipMemory.sharedHistory
 *   - 通过 sharedHistoryReader 读取，遵循 trust 分层规则（fact/experience/personal）
 *   - 显示 framing（personal depth）或 subject+detail（experience depth）或 subject（fact depth）
 *
 * trust → 打开角度：
 *   - 0-19：闭合（0°）
 *   - 20-59：半开 30°（显示 subject + detail + count）
 *   - 60+：全开 90°（显示 personal framing）
 *
 * 数据流：
 *   loadRelationshipMemory → readSharedHistory → SharedHistoryContext
 *   不复制 memory 逻辑，只调用 Reader。
 */
export default function ResearchJournal({
  trust,
  className,
}: ResearchJournalProps) {
  const [hovered, setHovered] = useState(false);

  // 通过 Reader 读取，不直接操作 sharedHistory
  const memory = loadRelationshipMemory();
  const sharedContext = memory ? readSharedHistory(memory) : null;
  const latestEvent: SharedHistoryRecallEvent | undefined =
    sharedContext?.events[0]; // Reader 已按优先级排序

  const openAngle = trust < 20 ? 0 : trust < 60 ? -30 : -90;
  const isFullyOpen = trust >= 60;
  const isHalfOpen = trust >= 20 && trust < 60;
  const depth = sharedContext?.depth;

  return (
    <motion.div
      className={cn("relative", className)}
      style={{ perspective: "800px" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      aria-hidden
    >
      {/* hover 时的页面金光 */}
      <motion.div
        animate={{ opacity: hovered && isFullyOpen ? 0.4 : 0 }}
        transition={{ duration: 0.4 }}
        className="absolute -inset-4 rounded-full blur-2xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #c9a227 0%, transparent 70%)" }}
      />

      <motion.div
        initial={{ rotateY: 0, opacity: 0 }}
        animate={{ rotateY: openAngle, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
      >
        <svg viewBox="0 0 280 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rjCover" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3a2418" />
              <stop offset="0.5" stopColor="#2a1810" />
              <stop offset="1" stopColor="#1a0e08" />
            </linearGradient>
            <linearGradient id="rjPage" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#d8c7a5" />
              <stop offset="0.5" stopColor="#c8b790" />
              <stop offset="1" stopColor="#b8a780" />
            </linearGradient>
            <linearGradient id="rjGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9a227" />
              <stop offset="1" stopColor="#8a7020" />
            </linearGradient>
          </defs>

          {/* 桌面投影 */}
          <ellipse cx="140" cy="195" rx="130" ry="8" fill="#000" opacity="0.4" />

          {/* 左页 */}
          <rect x="20" y="20" width="120" height="160" rx="2" fill="url(#rjPage)" />
          <rect x="20" y="20" width="120" height="160" rx="2" fill="none" stroke="#8a7050" strokeWidth="0.5" opacity="0.4" />

          {/* 右页（翻转） */}
          <motion.g
            animate={{ rotateY: openAngle }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "140px 100px", transformStyle: "preserve-3d" }}
          >
            <rect x="140" y="20" width="120" height="160" rx="2" fill="url(#rjCover)" />
            <rect x="138" y="20" width="4" height="160" fill="url(#rjGold)" opacity="0.6" />
          </motion.g>

          {/* 书页内容 */}
          {isHalfOpen && latestEvent && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.8 }}
            >
              {/* experience depth：subject + detail + count */}
              <text x="200" y="65" textAnchor="middle" fill="#3a2418" fontSize="7"
                fontFamily="Cormorant Garamond, serif" fontStyle="italic" opacity="0.7">
                Record
              </text>
              <text x="200" y="90" textAnchor="middle" fill="#2a1810" fontSize="9"
                fontFamily="Cormorant Garamond, serif" fontWeight="600">
                {truncate(latestEvent.subject, 22)}
              </text>
              {latestEvent.detail && (
                <text x="200" y="108" textAnchor="middle" fill="#5a4030" fontSize="7"
                  fontFamily="Cormorant Garamond, serif" fontStyle="italic">
                  {truncate(latestEvent.detail, 24)}
                </text>
              )}
              {latestEvent.count && latestEvent.count > 1 && (
                <text x="200" y="128" textAnchor="middle" fill="#8a7020" fontSize="8"
                  fontFamily="Cinzel, serif" fontWeight="600">
                  ×{latestEvent.count}
                </text>
              )}
              <line x1="160" y1="140" x2="240" y2="140" stroke="#8a7020" strokeWidth="0.5" opacity="0.4" />
            </motion.g>
          )}

          {isFullyOpen && latestEvent && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              {/* personal depth：framing 句 */}
              {latestEvent.framing ? (
                <foreignObject x="35" y="40" width="210" height="120">
                  <div style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontStyle: "italic",
                    fontSize: "11px",
                    color: "#2a1810",
                    lineHeight: 1.5,
                    padding: "8px",
                  }}>
                    {latestEvent.framing}
                  </div>
                </foreignObject>
              ) : (
                <text x="200" y="100" textAnchor="middle" fill="#2a1810" fontSize="9"
                  fontFamily="Cormorant Garamond, serif">
                  {truncate(latestEvent.subject, 22)}
                </text>
              )}
              {/* 装饰金线 */}
              <line x1="80" y1="165" x2="200" y2="165" stroke="url(#rjGold)" strokeWidth="0.8" opacity="0.5" />
              <circle cx="140" cy="165" r="2" fill="#c9a227" opacity="0.6" />
            </motion.g>
          )}

          {/* 无记忆时的空状态（trust ≥ 20 但无事件） */}
          {(isHalfOpen || isFullyOpen) && !latestEvent && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <text x="140" y="100" textAnchor="middle" fill="#5a4030" fontSize="9"
                fontFamily="Cormorant Garamond, serif" fontStyle="italic">
                The pages await.
              </text>
            </motion.g>
          )}

          {/* 闭合时的封面纹饰 */}
          {openAngle === 0 && (
            <g opacity="0.4">
              <circle cx="200" cy="100" r="30" fill="none" stroke="url(#rjGold)" strokeWidth="1" />
              <path d="M 185 100 L 215 100 M 200 85 L 200 115" stroke="url(#rjGold)" strokeWidth="0.8" />
            </g>
          )}
        </svg>
      </motion.div>

      {/* depth 标签（hover 显示） */}
      {hovered && depth && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 -translate-x-1/2 -top-8 z-30 pointer-events-none"
        >
          <span className="font-serif text-[10px] uppercase tracking-widest text-gold/70 bg-stone-950/90 px-2 py-1 rounded">
            {depth} recall
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
