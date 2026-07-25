/**
 * MagicObject（Phase 18.2 · 魔法物件具体实现）。
 *
 * 定位：SceneObject 的具体实现，负责加载 assetManifest 中注册的素材。
 *
 * 第一版仅支持：
 *   - spell-book-main：居中展示 + 微弱浮动 + hover glow + 点击回调
 *
 * 架构关系：
 *   SceneObject（基类，纯交互能力）
 *     ↓
 *   MagicObject（注入素材 + 魔法专属视觉）
 *     ↓
 *   具体场景使用（如 AncientSpellBook 改造）
 *
 * 不做：
 *   - 不直接管理 Lumos 状态机（由父组件控制 open/closed）
 *   - 不内嵌文字层（由 AncientSpellBook 在 children 中注入）
 *   - 不引入新依赖
 */

import { useState, type ReactNode, type CSSProperties } from "react";
import { motion } from "framer-motion";
import SceneObject from "./SceneObject";
import { getAsset, type AssetEntry } from "./assetManifest";

/** 魔法物件的视觉预设 */
export type MagicObjectPreset = "spell-book";

export interface MagicObjectProps {
  /** 资产 id（必须在 assetManifest 中注册） */
  assetId: string;
  /** 视觉预设（决定浮动/glow 等魔法专属效果） */
  preset?: MagicObjectPreset;
  /** 水平位置百分比，默认 50 */
  positionX?: number;
  /** 垂直位置百分比，默认 50 */
  positionY?: number;
  /** 是否填充父容器（true 时作为场景纹理层铺满父容器），默认 false */
  fill?: boolean;
  /** 图片填充模式，默认 "contain"；fill=true 时建议 "cover" */
  objectFit?: CSSProperties["objectFit"];
  /** 图片对齐位置，默认 "center" */
  objectPosition?: CSSProperties["objectPosition"];
  /** 缩放倍率，默认 1 */
  scale?: number;
  /** 透明度，默认 1 */
  opacity?: number;
  /** 是否可交互，默认 true */
  interactive?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** hover 时是否增强 glow，默认 true */
  enableHoverGlow?: boolean;
  /** 子内容（文字层等） */
  children?: ReactNode;
  /** 无障碍标签 */
  ariaLabel?: string;
}

/** 浮动动画配置（按预设）。 */
function getFloatingAnimation(preset: MagicObjectPreset) {
  switch (preset) {
    case "spell-book":
      return {
        y: [0, -4, 0],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    default:
      return null;
  }
}

/** glow 样式（按预设 + hover 状态）。 */
function getGlowStyle(
  preset: MagicObjectPreset,
  hovered: boolean,
  enableHoverGlow: boolean,
): CSSProperties {
  if (preset !== "spell-book") return {};

  const baseGlow = "drop-shadow(0 8px 24px rgba(0,0,0,0.6))";
  const hoverGlow =
    enableHoverGlow && hovered
      ? " drop-shadow(0 0 32px rgba(201,162,39,0.4)) drop-shadow(0 0 12px rgba(250,76,20,0.2))"
      : " drop-shadow(0 0 16px rgba(201,162,39,0.15))";

  return { filter: baseGlow + hoverGlow };
}

/**
 * 魔法物件（SceneObject 的具体实现）。
 *
 * 渲染结构：
 *   <SceneObject 定位 + 交互>
 *     <motion.div 浮动动画>
 *       <img 素材 + glow>
 *       {children 文字层}
 *     </motion.div>
 *   </SceneObject>
 */
export default function MagicObject({
  assetId,
  preset = "spell-book",
  positionX = 50,
  positionY = 50,
  fill = false,
  objectFit = "contain",
  objectPosition = "center",
  scale = 1,
  opacity = 1,
  interactive = true,
  onClick,
  enableHoverGlow = true,
  children,
  ariaLabel,
}: MagicObjectProps) {
  const [hovered, setHovered] = useState(false);

  const asset: AssetEntry | undefined = getAsset(assetId);

  // 资产未注册 → 渲染空（避免直接引用未确认素材）
  if (!asset) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[MagicObject] Asset "${assetId}" not registered in assetManifest. Refusing to render.`,
      );
    }
    return null;
  }

  const floatingConfig = getFloatingAnimation(preset);
  const glowStyle = getGlowStyle(preset, hovered, enableHoverGlow);

  // fill 模式：motion.div 填满父容器，img 用 cover 铺满
  // 定位模式：motion.div 自适应内容，img 用 contain 保持完整
  const motionDivStyle: CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }
    : {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };

  const imgStyle: CSSProperties = fill
    ? {
        display: "block",
        width: "100%",
        height: "100%",
        objectFit,
        objectPosition,
        userSelect: "none",
        ...glowStyle,
      }
    : {
        display: "block",
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit,
        objectPosition,
        userSelect: "none",
        ...glowStyle,
      };

  return (
    <SceneObject
      positionX={positionX}
      positionY={positionY}
      fill={fill}
      scale={scale}
      opacity={opacity}
      interactive={interactive}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      hoverClassName="magic-object--hovered"
      className="magic-object"
      ariaLabel={ariaLabel}
    >
      <motion.div animate={floatingConfig ?? undefined} style={motionDivStyle}>
        {/* 物件图片（材质层 / 场景纹理层） */}
        <img
          src={asset.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={imgStyle}
        />

        {/* 子内容层（文字层 / 装饰层，绝对定位在图片上） */}
        {children && (
          <div
            className="magic-object__overlay"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            {children}
          </div>
        )}
      </motion.div>
    </SceneObject>
  );
}
