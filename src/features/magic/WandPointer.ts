/**
 * WandPointer（Phase 17.2.3 · 杖尖交互层）。
 *
 * 定位：将"魔杖杖尖"作为真实交互点。
 *   手的位置（鼠标）只负责控制魔杖姿态，
 *   hover / click 发生在杖尖坐标。
 *
 * 架构：
 *   MagicController (hand position)
 *     ↓
 *   WandPointer (compute tip + find target)
 *     ↓
 *   MagicInteractionLayer (dispatch synthetic events)
 *     ↓
 *   页面交互（hover / click）
 *
 * 不修改：
 *   - MagicController（仍只保存手的位置）
 *   - GestureDetector / MagicEvents
 *
 * 不做：
 *   - 不渲染 UI（无光标、无圆圈、无准星）
 *   - 不修改业务逻辑
 */

import { magicController } from "./MagicController";
import { computeWandTip, BASE_WAND_ANGLE } from "./wandGeometry";

export interface WandTipPosition {
  x: number;
  y: number;
}

/** 交互元素选择器（用于 hover/click 重定向） */
const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], [data-magic-target], input, select, textarea';

/**
 * 获取当前魔杖杖尖屏幕坐标。
 * @returns 杖尖坐标，或 null（手未进入页面）
 */
export function getWandTipPosition(): WandTipPosition | null {
  const state = magicController.getState();
  // MagicController 初始位置 (-1000, -1000)，表示手未进入页面
  if (state.x < -500) return null;
  return computeWandTip(state.x, state.y, BASE_WAND_ANGLE);
}

/** 杖尖交互半径（px）—— 杖尖附近 ±18px 内均可触发交互 */
const TIP_INTERACTION_RADIUS = 18;

/**
 * 查找杖尖坐标下的 DOM 元素。
 * 自动跳过 pointer-events:none 的元素（魔杖 SVG / 轨迹层）。
 */
export function findTipTarget(): Element | null {
  const tip = getWandTipPosition();
  if (!tip) return null;
  return document.elementFromPoint(tip.x, tip.y);
}

/**
 * 查找杖尖坐标下的可交互元素（向上查找最近的可交互祖先）。
 *
 * Phase 17.2.4：扩展交互范围。
 *   在杖尖 ±18px 范围内进行 3×3 网格探测，
 *   返回距离最近的可交互元素。
 *   效果：魔杖碰到按钮附近即可触发，无需精准对准。
 */
export function findInteractiveTipTarget(): Element | null {
  const tip = getWandTipPosition();
  if (!tip) return null;

  const offsets = [-TIP_INTERACTION_RADIUS, 0, TIP_INTERACTION_RADIUS];
  let bestTarget: Element | null = null;
  let bestDistance = Infinity;

  for (const dx of offsets) {
    for (const dy of offsets) {
      const el = document.elementFromPoint(tip.x + dx, tip.y + dy);
      if (!el) continue;
      const interactive = el.closest(INTERACTIVE_SELECTOR);
      if (!interactive) continue;
      // 同一可交互元素只记录最近距离
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestTarget = interactive;
      }
    }
  }

  return bestTarget;
}

/**
 * 判断元素是否可交互。
 */
export function isInteractiveElement(el: Element | null): boolean {
  if (!el) return false;
  return !!el.closest(INTERACTIVE_SELECTOR);
}
