/**
 * GestureDetector（Phase 17.2 · 手势识别器）。
 *
 * 定位：
 *   纯逻辑模块，无 React 依赖。
 *   接收 gesturePath，输出识别到的手势类型。
 *
 * 架构：
 *   InputProvider → MagicController → GestureDetector → MagicEvents → Scene
 *
 * 识别的手势：
 *   1. MAGIC_SWEEP              快速挥动（速度超阈值 + 距离够长）
 *   2. MAGIC_CIRCLE             圆形轨迹（闭合 + 近似圆）
 *   3. DEATHLY_HALLOWS_GESTURE  三角轨迹（3 个明显方向转折点）
 *
 * 算法说明：
 *   - SWEEP：检查最近 N 个点的总距离 + 平均速度
 *   - CIRCLE：检查首尾点距离 < 阈值 + 所有点到质心距离方差小
 *   - TRIANGLE：检测 3 个方向突变点，形成 3 条边
 *
 * 不做：
 *   - 不渲染 UI
 *   - 不直接发射事件（由 MagicController 调用后决定是否发射）
 *   - 不保存状态（纯函数）
 */

import type { TrailPoint } from "./MagicController";
import type { MagicEventType } from "./MagicEvents";

/** 手势识别结果 */
export interface GestureResult {
  type: MagicEventType;
  /** 手势轨迹（供场景绘制残留墨迹） */
  path: { x: number; y: number }[];
  /** 识别置信度 0-1 */
  confidence: number;
}

/** 快速挥动阈值 */
const SWEEP_MIN_DISTANCE = 250; // 总距离 px
const SWEEP_MIN_VELOCITY = 800; // 平均速度 px/s
const SWEEP_WINDOW_MS = 500; // 时间窗口

/** 圆形检测阈值 */
const CIRCLE_MAX_CLOSE_DISTANCE = 80; // 首尾闭合距离
const CIRCLE_MIN_POINTS = 12; // 最少点数
const CIRCLE_MAX_VARIANCE_RATIO = 0.4; // 距离方差 / 平均距离

/** 三角检测阈值 */
const TRIANGLE_MIN_POINTS = 10;
const TRIANGLE_ANGLE_THRESHOLD = 60; // 方向突变角度（度）
const TRIANGLE_REQUIRED_CORNERS = 3;

/**
 * 分析手势路径，识别手势类型。
 *
 * 输入：gesturePath（从新到旧）
 * 输出：识别到的手势，或 null
 */
export function detectGesture(points: TrailPoint[]): GestureResult | null {
  if (points.length < 5) return null;

  const now = performance.now();
  // 只分析 800ms 内的点
  const recent = points.filter((p) => now - p.timestamp < 800);

  if (recent.length < 5) return null;

  // 从旧到新排序，便于轨迹分析
  const path = [...recent].reverse();
  const pathXY = path.map((p) => ({ x: p.x, y: p.y }));

  // 1. 检测三角（死亡圣器手势）— 优先级最高
  const triangle = detectTriangle(path, pathXY);
  if (triangle) return triangle;

  // 2. 检测圆形
  const circle = detectCircle(path, pathXY);
  if (circle) return circle;

  // 3. 检测快速挥动
  const sweep = detectSweep(path, pathXY, now);
  if (sweep) return sweep;

  return null;
}

/**
 * 检测快速挥动。
 */
function detectSweep(
  path: TrailPoint[],
  pathXY: { x: number; y: number }[],
  now: number,
): GestureResult | null {
  // 时间窗口内的点
  const windowPoints = path.filter((p) => now - p.timestamp < SWEEP_WINDOW_MS);
  if (windowPoints.length < 3) return null;

  // 总距离
  let totalDistance = 0;
  for (let i = 1; i < windowPoints.length; i++) {
    const dx = windowPoints[i].x - windowPoints[i - 1].x;
    const dy = windowPoints[i].y - windowPoints[i - 1].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  if (totalDistance < SWEEP_MIN_DISTANCE) return null;

  // 平均速度
  const timeSpan = Math.max(
    1,
    windowPoints[0].timestamp - windowPoints[windowPoints.length - 1].timestamp,
  );
  const avgVelocity = (totalDistance / timeSpan) * 1000;

  if (avgVelocity < SWEEP_MIN_VELOCITY) return null;

  return {
    type: "magic:sweep" as MagicEventType,
    path: pathXY,
    confidence: Math.min(1, totalDistance / (SWEEP_MIN_DISTANCE * 2)),
  };
}

/**
 * 检测圆形轨迹。
 */
function detectCircle(
  path: TrailPoint[],
  pathXY: { x: number; y: number }[],
): GestureResult | null {
  if (path.length < CIRCLE_MIN_POINTS) return null;

  // 首尾闭合距离
  const first = pathXY[0];
  const last = pathXY[pathXY.length - 1];
  const closeDistance = Math.sqrt(
    (last.x - first.x) ** 2 + (last.y - first.y) ** 2,
  );

  if (closeDistance > CIRCLE_MAX_CLOSE_DISTANCE) return null;

  // 计算质心
  const cx = pathXY.reduce((sum, p) => sum + p.x, 0) / pathXY.length;
  const cy = pathXY.reduce((sum, p) => sum + p.y, 0) / pathXY.length;

  // 计算到质心的距离
  const distances = pathXY.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  const avgDist = distances.reduce((sum, d) => sum + d, 0) / distances.length;

  // 方差比
  const variance =
    distances.reduce((sum, d) => sum + (d - avgDist) ** 2, 0) / distances.length;
  const varianceRatio = Math.sqrt(variance) / avgDist;

  if (varianceRatio > CIRCLE_MAX_VARIANCE_RATIO) return null;

  // 半径不能太小
  if (avgDist < 40) return null;

  return {
    type: "magic:circle" as MagicEventType,
    path: pathXY,
    confidence: Math.max(0, 1 - varianceRatio),
  };
}

/**
 * 检测三角轨迹（死亡圣器手势）。
 *
 * 算法：计算相邻点方向向量，检测 3 个明显方向突变点。
 */
function detectTriangle(
  path: TrailPoint[],
  pathXY: { x: number; y: number }[],
): GestureResult | null {
  if (path.length < TRIANGLE_MIN_POINTS) return null;

  // 计算方向向量序列
  const directions: { angle: number; index: number }[] = [];
  const step = Math.max(1, Math.floor(path.length / 15)); // 采样步长

  for (let i = step; i < path.length; i += step) {
    const dx = pathXY[i].x - pathXY[i - step].x;
    const dy = pathXY[i].y - pathXY[i - step].y;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;
    directions.push({
      angle: Math.atan2(dy, dx) * (180 / Math.PI),
      index: i,
    });
  }

  if (directions.length < 4) return null;

  // 检测方向突变点
  let corners = 0;
  for (let i = 1; i < directions.length; i++) {
    let diff = Math.abs(directions[i].angle - directions[i - 1].angle);
    if (diff > 180) diff = 360 - diff;
    if (diff > TRIANGLE_ANGLE_THRESHOLD) {
      corners++;
    }
  }

  if (corners < TRIANGLE_REQUIRED_CORNERS) return null;

  // 首尾不需要闭合（三角形是开放的笔迹）
  return {
    type: "magic:deathly-hallows" as MagicEventType,
    path: pathXY,
    confidence: Math.min(1, corners / 4),
  };
}
