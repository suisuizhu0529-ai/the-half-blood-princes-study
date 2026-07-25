/**
 * RuneInteraction（Phase 17.1-C Step 1 占位）。
 *
 * 定位：桌面中央魔法符文的点击交互。
 *   - 符文 SVG（暗淡，几乎不可见）
 *   - 鼠标接近 → 符文微亮（affordance）
 *   - 点击符文 → 触发 Lumos（idle → awakening）
 *
 * 设计原则（Step 3 实现）：
 *   - 不要求画圆手势（移动端不友好）
 *   - 符文本身是可见的交互对象
 *   - 点击后符文发光扩散，触发 AwakeningSequence
 *
 * Step 1 范围：占位，不渲染任何内容。
 */
export default function RuneInteraction() {
  // TODO Step 3: 实现符文 SVG + hover 发光 + click 触发 Lumos
  return null;
}
