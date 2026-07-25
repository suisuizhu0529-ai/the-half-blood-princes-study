/**
 * SceneObject（Phase 18.2 · 通用场景对象基类）。
 *
 * 定位：Lumos Scene 所有交互对象的基础渲染能力。
 *   - 不绑定任何具体素材
 *   - 不引用 assetManifest
 *   - 子组件（如 MagicObject）负责具体素材注入
 *
 * 能力：
 *   - position：百分比定位（相对父容器）
 *   - scale：整体缩放
 *   - opacity：透明度
 *   - hover state：鼠标悬停反馈（CSS class + callback）
 *   - click event：点击回调
 *   - animation class：外层传入的动画 class（不内置动画逻辑）
 *
 * 不做：
 *   - 不内建动画引擎（由 Framer Motion / CSS 在外层处理）
 *   - 不管理 z-index（由父容器 SceneLayer 控制）
 *   - 不加载图片（子组件负责 <img> 或背景图）
 */

import { useState, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface SceneObjectProps {
  /** 水平位置百分比（0-100），默认 50（居中） */
  positionX?: number;
  /** 垂直位置百分比（0-100），默认 50（居中） */
  positionY?: number;
  /** 是否填充父容器（true 时用 inset:0 代替 positionX/positionY），默认 false */
  fill?: boolean;
  /** 缩放倍率，默认 1 */
  scale?: number;
  /** 透明度 0-1，默认 1 */
  opacity?: number;
  /** 是否可交互（影响 cursor 与 pointer-events），默认 true */
  interactive?: boolean;
  /** hover 时附加的 className */
  hoverClassName?: string;
  /** 鼠标进入回调 */
  onHoverStart?: () => void;
  /** 鼠标离开回调 */
  onHoverEnd?: () => void;
  /** 点击回调 */
  onClick?: () => void;
  /** 外层 className（定位、动画等） */
  className?: string;
  /** 内联样式（用于无法用 class 表达的属性） */
  style?: CSSProperties;
  /** 子内容（由子组件注入 <img> / 文字层等） */
  children?: ReactNode;
  /** 无障碍标签 */
  ariaLabel?: string;
}

/**
 * 通用场景对象基类。
 *
 * 渲染结构：
 *   <div className={定位 + 缩放 + 透明度}>
 *     <div className={内容容器 + hover 状态}>
 *       {children}
 *     </div>
 *   </div>
 *
 * 外层负责位置/缩放/透明度，内层负责 hover 与 click。
 * 这样动画可以作用在内层而不影响定位。
 */
export default function SceneObject({
  positionX = 50,
  positionY = 50,
  fill = false,
  scale = 1,
  opacity = 1,
  interactive = true,
  hoverClassName,
  onHoverStart,
  onHoverEnd,
  onClick,
  className,
  style,
  children,
  ariaLabel,
}: SceneObjectProps) {
  const [hovered, setHovered] = useState(false);

  const handleHoverStart = () => {
    if (!interactive) return;
    setHovered(true);
    onHoverStart?.();
  };

  const handleHoverEnd = () => {
    if (!interactive) return;
    setHovered(false);
    onHoverEnd?.();
  };

  const handleClick = () => {
    if (!interactive) return;
    onClick?.();
  };

  // 外层：绝对定位 + 缩放 + 透明度
  // fill 模式：用 inset:0 填充父容器（用于场景纹理层）
  // 定位模式：用 positionX/positionY 百分比定位
  const outerStyle: CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        transform: `scale(${scale})`,
        opacity,
        pointerEvents: interactive ? "auto" : "none",
        ...style,
      }
    : {
        position: "absolute",
        left: `${positionX}%`,
        top: `${positionY}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        pointerEvents: interactive ? "auto" : "none",
        ...style,
      };

  return (
    <div
      className={cn("scene-object", className)}
      style={outerStyle}
      aria-label={ariaLabel}
      role={interactive && onClick ? "button" : undefined}
      tabIndex={interactive && onClick ? 0 : undefined}
      onClick={handleClick}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onKeyDown={
        interactive && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      <div className={cn("scene-object__inner", hovered && hoverClassName)}>
        {children}
      </div>
    </div>
  );
}
