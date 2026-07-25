/**
 * MagicInteractionLayer（Phase 17.1-G v2 · 虚拟手持物架构）。
 *
 * 架构升级：
 *   从"鼠标替身"升级为"虚拟手持物"。
 *
 *   InputProvider (mousemove / 未来摄像头)
 *        ↓
 *   MagicController (position, velocity, gesturePath, handPose)
 *        ↓
 *   ┌────────────┴────────────┐
 *   WandRenderer              MagicTrail
 *   (自主决定握持角度)         (极低调残影)
 *        ↓
 *   magicEvents (LUMOS_CAST, MAGIC_DISMISS)
 *        ↓
 *   Scene components
 *
 * 第一阶段实现：
 *   ✅ WandRenderer — 固定 -35deg + 手腕惯性 ±8deg
 *   ✅ Mouse tracking — 鼠标跟随
 *   ✅ Trail effect — 极低调黑金残影
 *   ✅ Magic event system — 事件总线
 *   ✅ 水平方向检测 — 用于手腕惯性
 *
 * 第一阶段不实现：
 *   ❌ 具体魔法效果
 *   ❌ 手势识别（仅接口）
 *   ❌ 摄像头输入（架构预留 handPose）
 */

import { useEffect, useRef, useState } from "react";
import { magicController, type TrailPoint } from "./MagicController";
import WandRenderer from "./WandRenderer";
import MagicTrail from "./MagicTrail";
import { findInteractiveTipTarget } from "./WandPointer";

interface MagicInteractionLayerProps {
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 整体强度（0-1），可由场景阶段控制 */
  intensity?: number;
}

/**
 * 全局魔法交互层（虚拟手持物架构）。
 *
 * 不再保存或传递 rotation angle。
 * WandRenderer 自主决定如何握持魔杖。
 */
export default function MagicInteractionLayer({
  enabled = true,
  intensity = 1,
}: MagicInteractionLayerProps) {
  const [handX, setHandX] = useState(-1000);
  const [handY, setHandY] = useState(-1000);
  const [velocity, setVelocity] = useState(0);
  const [horizontalDirection, setHorizontalDirection] = useState(0);
  const [gesturePath, setGesturePath] = useState<TrailPoint[]>([]);

  // 用于计算水平方向（鼠标移动方向）
  const lastXRef = useRef(-1000);
  const lastMoveTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // 订阅控制器状态变化
    const unsub = magicController.subscribe((state) => {
      setHandX(state.x);
      setHandY(state.y);
      setVelocity(state.velocity);
      setGesturePath([...state.gesturePath]);
    });

    // 鼠标输入
    const handleMove = (e: MouseEvent) => {
      const now = performance.now();

      // 计算水平方向（用于手腕惯性）
      if (lastXRef.current > -500 && now - lastMoveTimeRef.current < 200) {
        const dx = e.clientX - lastXRef.current;
        if (Math.abs(dx) > 1) {
          setHorizontalDirection(dx > 0 ? 1 : -1);
        }
      }

      lastXRef.current = e.clientX;
      lastMoveTimeRef.current = now;

      // 更新控制器（控制器只保存位置/速度/路径，不保存角度）
      magicController.updatePosition(e.clientX, e.clientY);
    };

    // 静止检测：超过 200ms 无移动则 horizontalDirection 归零
    const stillnessCheck = setInterval(() => {
      if (performance.now() - lastMoveTimeRef.current > 200) {
        setHorizontalDirection(0);
      }
    }, 100);

    // 页面隐藏时重置
    const handleVisibility = () => {
      if (document.hidden) {
        magicController.reset();
        setHorizontalDirection(0);
      }
    };

    window.addEventListener("mousemove", handleMove);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsub();
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(stillnessCheck);
    };
  }, [enabled]);

  // Phase 17.2.3：Wand Tip Interaction Layer（仅桌面端启用）。
  //   手的位置只控制魔杖姿态，hover/click 发生在杖尖坐标。
  //   - hover：订阅 controller 更新 → 计算杖尖 → findInteractiveTipTarget
  //            → 合成 mouseover/mouseout（React onMouseEnter/Leave 由此合成）
  //   - click：捕获阶段拦截 → 重定向到杖尖目标 → 合成 click
  //   不渲染任何额外视觉（无光标、无圆圈、无准星）。
  useEffect(() => {
    if (!enabled) return;
    // 仅桌面端启用（与 WandRenderer 的 hidden md:block 对齐）
    const mq = window.matchMedia("(min-width: 768px)");
    if (!mq.matches) return;

    let lastHovered: Element | null = null;

    const clearHover = () => {
      if (!lastHovered) return;
      lastHovered.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, relatedTarget: null }),
      );
      lastHovered.removeAttribute("data-magic-hover");
      lastHovered = null;
    };

    const updateHover = () => {
      const target = findInteractiveTipTarget();
      if (target === lastHovered) return;

      // 离开旧元素
      if (lastHovered) {
        lastHovered.dispatchEvent(
          new MouseEvent("mouseout", {
            bubbles: true,
            relatedTarget: target,
          }),
        );
        lastHovered.removeAttribute("data-magic-hover");
      }

      // 进入新元素
      if (target) {
        target.setAttribute("data-magic-hover", "true");
        target.dispatchEvent(
          new MouseEvent("mouseover", {
            bubbles: true,
            relatedTarget: lastHovered,
          }),
        );
      }

      lastHovered = target;
    };

    // 订阅 controller 状态变化 → 更新 hover
    const unsub = magicController.subscribe(() => {
      updateHover();
    });

    // 捕获阶段拦截 click → 重定向到杖尖目标
    const handleClickCapture = (e: MouseEvent) => {
      const tipTarget = findInteractiveTipTarget();
      if (!tipTarget) return;

      // 真实点击的交互祖先
      const realTarget = e.target instanceof Element
        ? e.target.closest('button, a, [role="button"], [data-magic-target]')
        : null;

      // 杖尖目标 === 真实目标 → 不拦截（让原生 click 通过）
      if (realTarget && realTarget === tipTarget) return;

      // 杖尖在另一个可交互元素上 → 拦截真实 click，合成 click 到杖尖目标
      e.preventDefault();
      e.stopPropagation();
      tipTarget.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
        }),
      );
    };

    document.addEventListener("click", handleClickCapture, { capture: true });

    return () => {
      unsub();
      document.removeEventListener("click", handleClickCapture, { capture: true });
      clearHover();
    };
  }, [enabled]);

  // Phase 17.2.3：页面卸载/失焦时清理 hover 状态
  useEffect(() => {
    if (!enabled) return;
    const handleBlur = () => {
      document
        .querySelectorAll("[data-magic-hover]")
        .forEach((el) => el.removeAttribute("data-magic-hover"));
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* 极低调残影（魔杖下方） */}
      <MagicTrail points={gesturePath} opacity={intensity * 0.8} />

      {/* 虚拟手持魔杖（桌面端显示，移动端隐藏） */}
      <div className="hidden md:block">
        <WandRenderer
          x={handX}
          y={handY}
          velocity={velocity}
          horizontalDirection={horizontalDirection}
          opacity={intensity * 0.95}
        />
      </div>
    </>
  );
}
