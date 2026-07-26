import { motion, useTransform } from "framer-motion";
import Candle from "@/components/decor/Candle";
import { cn } from "@/lib/utils";
import type { StudyAtmosphere } from "@/types/studyAtmosphere";
import { DEFAULT_ATMOSPHERE } from "@/types/studyAtmosphere";
import { useDeskParallax } from "@/hooks/useDeskParallax";

/**
 * 书房氛围背景层（Phase 16.1-A 升级：状态驱动；Phase 19.2：微视差）。
 *
 * 层级（从底到顶）：
 *  1. 石墙渐变（增强纵深，最远，无视差）
 *  2. 拱形夜窗（右上，星空 + 玻璃雨丝 + 雾气响应 trust） — background 视差
 *  3. 壁炉暖光（右下，呼吸 + 上升火星响应 curiosity） — background 视差
 *  4. 书架剪影（左侧，深色书脊 + 金色高光响应 milestones） — background 视差
 *  5. 桌面边缘（底部，深木渐变） — midground 视差
 *  6. 蜡烛群（数量响应 milestones，摇曳速度响应 trust） — midground 视差
 *  7. 雨丝（CSS 平移，移动端隐藏，无视差）
 *  8. 颗粒 noise 叠层（无视差）
 *  9. 暗角 vignette（无视差）
 *
 * Phase 16.1-A 变化：
 *   - 新增 atmosphere?: StudyAtmosphere prop
 *   - NightWindow / FireplaceGlow / Candle / Bookshelf 接收 atmosphere 字段
 *   - 蜡烛数量动态化（1-5 根）
 *   - 雾气 / 月光 / 火焰强度 / 书架高光 响应 Memory
 *   - 未传入 atmosphere 时使用 DEFAULT_ATMOSPHERE（向后兼容）
 *
 * Phase 19.2 变化（空间感升级，回应 Claude "像博客页面"）：
 *   - 接入 useDeskParallax，背景层与中景层各自应用极小偏移
 *   - background（夜窗/壁炉/书架）：1-3px
 *   - midground（桌面/蜡烛）：3-6px
 *   - prefers-reduced-motion 时 hook 自动禁用（保持 0.5 = 不偏移）
 *   - 不改变内容结构，仅添加 motion.div 包装层
 *
 * 全部 fixed inset-0，pointer-events-none，仅作视觉氛围。
 */
interface AmbientLayerProps {
  className?: string;
  /** Phase 16.1-A：书房氛围状态，驱动各子组件响应 Memory */
  atmosphere?: StudyAtmosphere;
}

/** 蜡烛位置模板（最多 5 根，按 candleCount 取前 N 个） */
const CANDLE_POSITIONS = [
  { scale: 0.85, delay: 0, duration: 3.4, className: "absolute left-[8%] bottom-[14vh] hidden sm:block" },
  { scale: 1.1, delay: 1.2, duration: 3.8, className: "absolute left-[18%] bottom-[12vh] hidden md:block" },
  { scale: 0.7, delay: 0.6, duration: 2.9, className: "absolute right-[14%] bottom-[15vh] hidden sm:block" },
  { scale: 0.9, delay: 0.3, duration: 3.2, className: "absolute left-[28%] bottom-[16vh] hidden lg:block" },
  { scale: 0.75, delay: 0.9, duration: 3.5, className: "absolute right-[24%] bottom-[13vh] hidden md:block" },
] as const;

export default function AmbientLayer({
  className,
  atmosphere = DEFAULT_ATMOSPHERE,
}: AmbientLayerProps) {
  const {
    fogDensity,
    moonBrightness,
    fireplaceIntensity,
    magicParticleCount,
    candleCount,
    bookshelfGlow,
  } = atmosphere;

  // trust 越高，蜡烛火焰越稳定（duration 越长）
  // base duration × (1 + trust_factor)，trust_factor 从 atmosphere 推断
  // fogDensity 0.6→0.15 对应 trust 0→100，反推 trustFactor
  const trustFactor = (0.6 - fogDensity) / 0.45; // 0-1
  const candleDurationMultiplier = 1 + trustFactor * 0.5; // 1x → 1.5x

  // Phase 19.2：微视差（mouseX/mouseY 0-1，0.5 = 中心）
  //   - background（夜窗/壁炉/书架）：±3px / ±2px
  //   - midground（桌面/蜡烛）：±6px / ±4px
  //   - prefers-reduced-motion 时 hook 保持 0.5，输出 0 偏移
  const { mouseX, mouseY } = useDeskParallax();
  const bgX = useTransform(mouseX, [0, 1], [3, -3]);
  const bgY = useTransform(mouseY, [0, 1], [2, -2]);
  const mgX = useTransform(mouseX, [0, 1], [6, -6]);
  const mgY = useTransform(mouseY, [0, 1], [4, -4]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      {/* 1. 石墙渐变纵深增强（最远层，不应用视差） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 18% 22%, rgba(60, 35, 75, 0.45) 0%, transparent 55%), radial-gradient(ellipse at 82% 78%, rgba(80, 35, 30, 0.35) 0%, transparent 55%), linear-gradient(160deg, #0B0B0F 0%, #150b1f 45%, #0B0B0F 100%)",
        }}
      />

      {/* === Phase 19.2: Background 视差组（夜窗/壁炉/书架，1-3px） === */}
      <motion.div className="absolute inset-0" style={{ x: bgX, y: bgY }}>
        {/* 2. 拱形夜窗（右上） — 雾气 + 月光响应 trust */}
        <NightWindow
          fogDensity={fogDensity}
          moonBrightness={moonBrightness}
          className="absolute right-[6%] top-[8%] hidden md:block"
        />

        {/* 3. 壁炉暖光（右下） — 火焰强度 + 火星数量响应 curiosity */}
        <FireplaceGlow
          intensity={fireplaceIntensity}
          emberCount={magicParticleCount}
          className="absolute -right-32 bottom-[-10%] h-[80vh] w-[60vw]"
        />

        {/* 4. 书架剪影（左侧） — 金色高光响应 memoryActivatedCount */}
        <BookshelfSilhouette
          glow={bookshelfGlow}
          className="absolute left-0 top-[15%] hidden lg:block"
        />
      </motion.div>

      {/* === Phase 19.2: Midground 视差组（桌面/蜡烛，3-6px） === */}
      <motion.div className="absolute inset-0" style={{ x: mgX, y: mgY }}>
        {/* 5. 桌面边缘（底部深木） */}
        <div
          className="absolute inset-x-0 bottom-0 h-[18vh]"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(20, 12, 8, 0.55) 40%, rgba(10, 6, 4, 0.92) 100%)",
          }}
        />

        {/* 6. 蜡烛群 — 数量响应 milestones，摇曳速度响应 trust */}
        {CANDLE_POSITIONS.slice(0, candleCount).map((pos, i) => (
          <Candle
            key={i}
            scale={pos.scale}
            delay={pos.delay}
            duration={pos.duration * candleDurationMultiplier}
            className={pos.className}
          />
        ))}
      </motion.div>

      {/* 7. 雨丝（移动端隐藏，无视差，覆盖全屏） */}
      <RainStreaks className="absolute inset-0 hidden md:block" />

      {/* 8. 颗粒 noise */}
      <div className="noise-layer absolute inset-0 animate-drift" />

      {/* 9. 暗角 vignette */}
      <div className="vignette absolute inset-0" />
    </div>
  );
}

/* ---------------- 子组件 ---------------- */

interface NightWindowProps {
  /** 雾气浓度 0-1（trust 越低雾越浓） */
  fogDensity: number;
  /** 月光亮度 0-1（trust 越高月越亮） */
  moonBrightness: number;
  className?: string;
}

function NightWindow({ fogDensity, moonBrightness, className }: NightWindowProps) {
  return (
    <div className={cn("h-[260px] w-[180px]", className)}>
      <svg viewBox="0 0 180 260" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a0820" />
            <stop offset="0.6" stopColor="#15102e" />
            <stop offset="1" stopColor="#24152f" />
          </linearGradient>
          <radialGradient id="moon" cx="0.7" cy="0.25" r="0.4">
            <stop offset="0" stopColor="#e8e0c8" stopOpacity={0.85 * moonBrightness} />
            <stop offset="0.3" stopColor="#9a8a6a" stopOpacity={0.3 * moonBrightness} />
            <stop offset="1" stopColor="#9a8a6a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="frame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1f1a" />
            <stop offset="1" stopColor="#0a0604" />
          </linearGradient>
          {/* 雾气渐变（覆盖在玻璃上，trust 越低雾越浓） */}
          <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9a9ab4" stopOpacity={fogDensity * 0.5} />
            <stop offset="0.5" stopColor="#8a8aa0" stopOpacity={fogDensity * 0.35} />
            <stop offset="1" stopColor="#7a7a90" stopOpacity={fogDensity * 0.2} />
          </linearGradient>
        </defs>

        {/* 窗框外圈 */}
        <path
          d="M 10 250 L 10 60 Q 10 10 90 10 Q 170 10 170 60 L 170 250 Z"
          fill="url(#frame)"
        />
        {/* 玻璃区 */}
        <path
          d="M 22 248 L 22 62 Q 22 22 90 22 Q 158 22 158 62 L 158 248 Z"
          fill="url(#sky)"
        />
        {/* 月光晕 */}
        <ellipse cx="120" cy="60" rx="60" ry="50" fill="url(#moon)" />
        {/* 星星 */}
        {[
          [40, 50, 0.9],
          [70, 80, 0.6],
          [55, 110, 0.8],
          [100, 130, 0.5],
          [130, 100, 0.7],
          [85, 160, 0.4],
          [45, 180, 0.6],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff8e0" opacity={0.7 * (1 - fogDensity * 0.6)} />
        ))}
        {/* 雾气叠加层 */}
        <path
          d="M 22 248 L 22 62 Q 22 22 90 22 Q 158 22 158 62 L 158 248 Z"
          fill="url(#fog)"
        />
        {/* 窗格十字 */}
        <line x1="90" y1="22" x2="90" y2="248" stroke="#1a1208" strokeWidth="3" opacity="0.85" />
        <line x1="22" y1="135" x2="158" y2="135" stroke="#1a1208" strokeWidth="3" opacity="0.85" />
        {/* 玻璃上的雨水流痕 */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`rain-${i}`}
            x1={30 + i * 22}
            y1="30"
            x2={28 + i * 22}
            y2="240"
            stroke="#9ab4d8"
            strokeWidth="0.5"
            opacity="0.18"
          />
        ))}
      </svg>
    </div>
  );
}

interface FireplaceGlowProps {
  /** 火焰强度 0-1（curiosity 越高火越旺） */
  intensity: number;
  /** 火星数量 0-25 */
  emberCount: number;
  className?: string;
}

function FireplaceGlow({ intensity, emberCount, className }: FireplaceGlowProps) {
  // 生成火星（数量响应 curiosity）
  const embers = Array.from({ length: Math.min(emberCount, 25) }).map((_, i) => ({
    left: `${60 + (i % 5) * 3}%`,
    bottom: `${68 + (i % 4) * 2}%`,
    delay: (i * 0.7) % 6,
    drift: `${(i % 2 === 0 ? 1 : -1) * (3 + (i % 4))}px`,
  }));

  return (
    <div className={cn("", className)}>
      {/* 主光晕（呼吸）— 强度响应 curiosity */}
      <div
        className="absolute inset-0 animate-breathe"
        style={{
          background:
            "radial-gradient(ellipse at 70% 80%, rgba(224, 130, 60, 0.42) 0%, rgba(180, 70, 30, 0.22) 30%, transparent 65%)",
          opacity: intensity,
        }}
      />
      {/* 内核更亮 */}
      <div
        className="absolute inset-0 animate-breathe"
        style={{
          background:
            "radial-gradient(ellipse at 72% 82%, rgba(255, 200, 120, 0.55) 0%, transparent 25%)",
          animationDelay: "0.7s",
          opacity: intensity,
        }}
      />
      {/* 上升的火星（数量响应 curiosity） */}
      {embers.map((e, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{
            left: e.left,
            bottom: e.bottom,
            background: "#ffc878",
            boxShadow: "0 0 6px 1px rgba(255, 180, 80, 0.8)",
            // @ts-expect-error custom property
            "--drift": e.drift,
            animation: `ember-rise ${5 + i * 0.6}s ease-in ${e.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface BookshelfSilhouetteProps {
  /** 金色高光强度 0-1（memoryActivatedCount 越高越亮） */
  glow: number;
  className?: string;
}

function BookshelfSilhouette({ glow, className }: BookshelfSilhouetteProps) {
  const books = [
    { h: 110, c: "#2a1f3a", w: 14 },
    { h: 95, c: "#3a2230", w: 12 },
    { h: 120, c: "#1f1a2a", w: 16 },
    { h: 88, c: "#2e1f24", w: 13 },
    { h: 105, c: "#241a30", w: 15 },
    { h: 100, c: "#332238", w: 12 },
    { h: 92, c: "#1e1828", w: 14 },
  ];
  return (
    <div className={cn("relative flex h-[180px] items-end gap-1 opacity-50", className)}>
      {books.map((b, i) => (
        <div
          key={i}
          className="relative rounded-t-sm shadow-lg"
          style={{ height: b.h, width: b.w, background: b.c }}
        >
          {/* 金色高光（memoryActivatedCount 响应） */}
          {glow > 0 && (
            <div
              className="absolute inset-0 rounded-t-sm"
              style={{
                background:
                  "linear-gradient(180deg, rgba(201, 162, 39, 0.4) 0%, transparent 60%)",
                opacity: glow,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function RainStreaks({ className }: { className?: string }) {
  const streaks = Array.from({ length: 18 });
  return (
    <div className={cn("overflow-hidden", className)}>
      {streaks.map((_, i) => {
        const left = (i * 5.5 + (i % 3) * 2) % 100;
        const delay = (i * 0.13) % 1.2;
        const duration = 0.5 + (i % 4) * 0.15;
        const height = 60 + (i % 5) * 18;
        const opacity = 0.06 + (i % 3) * 0.04;
        return (
          <span
            key={i}
            className="absolute top-0 block w-px"
            style={{
              left: `${left}%`,
              height: `${height}px`,
              background:
                "linear-gradient(180deg, transparent 0%, rgba(180, 200, 230, 0.6) 50%, transparent 100%)",
              opacity,
              animation: `rain-fall ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
