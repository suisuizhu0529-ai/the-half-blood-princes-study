/**
 * wandGeometry（Phase 17.2.1 · 杖尖几何）。
 *
 * 定位：纯几何计算工具，无 React 依赖。
 *   - WandRenderer 用此公式确定杖尖位置（渲染光点）
 *   - MagicTrail 用此公式将手部路径锚定到杖尖
 *
 * 抽出独立文件的原因：
 *   react-refresh/only-export-components 规则要求
 *   组件文件只导出组件。共享常量/函数应放独立模块。
 */

/** 基础握持角度（人手腕自然握持角度） */
export const BASE_WAND_ANGLE = -35;

/** 杖长（SVG 单位：手柄 y=108 → 杖尖 y=2） */
export const WAND_LENGTH = 106;

/**
 * 计算魔杖杖尖在屏幕坐标系中的位置。
 *
 * 基于：手柄位置 + 握持角度 + 杖长。
 *
 * 坐标推导：
 *   杖尖在 SVG 中相对手柄为 (0, -WAND_LENGTH)（正上方）。
 *   旋转 θ 度后（CSS 顺时针为正）：
 *     dx = WAND_LENGTH * sin(θ)
 *     dy = -WAND_LENGTH * cos(θ)
 *   屏幕坐标 tip = (handleX + dx, handleY + dy)
 *
 * @param handleX 手柄 X（鼠标 X / 手的位置 X）
 * @param handleY 手柄 Y（鼠标 Y / 手的位置 Y）
 * @param angleDeg 握持角度，默认 BASE_WAND_ANGLE (-35deg)
 */
export function computeWandTip(
  handleX: number,
  handleY: number,
  angleDeg: number = BASE_WAND_ANGLE,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = WAND_LENGTH * Math.sin(rad);
  const dy = -WAND_LENGTH * Math.cos(rad);
  return { x: handleX + dx, y: handleY + dy };
}
