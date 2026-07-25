/**
 * MagicController（Phase 17.2 · 虚拟手持物 + 手势识别）。
 *
 * 架构：
 *   InputProvider → MagicController → GestureDetector → MagicEvents → Scene
 *
 * 职责（仅保存输入状态）：
 *   - position: 手的位置（鼠标 / 摄像头手部）
 *   - velocity: 移动速度
 *   - gesturePath: 手势路径（用于手势识别 + 墨迹渲染）
 *   - handPose: 手部姿态（预留，未来摄像头输入）
 *
 * 手势识别：
 *   每次位置更新后，调用 GestureDetector 分析 gesturePath。
 *   识别到手势 → 发射 MagicEvent。
 *   带冷却期（800ms），防止同一次挥动重复触发。
 *
 * 不保存：
 *   - ❌ rotation angle（由 WandRenderer 决定如何握持）
 */

import { magicEvents, MAGIC_EVENTS, type MagicEventPayload, type MagicEventType } from "./MagicEvents";
import { detectGesture } from "./GestureDetector";

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  opacity: number;
}

export interface HandPose {
  palmOrientation: number | null;
  gripStrength: number | null;
  fingerExtension: number | null;
}

export interface MagicControllerState {
  x: number;
  y: number;
  velocity: number;
  gesturePath: TrailPoint[];
  handPose: HandPose;
}

const MAX_GESTURE_POINTS = 60;
const GESTURE_LIFETIME_MS = 800; // 0.8s 消失
const GESTURE_COOLDOWN_MS = 800; // 手势冷却，防止重复触发
const EMPTY_HAND_POSE: HandPose = {
  palmOrientation: null,
  gripStrength: null,
  fingerExtension: null,
};

class MagicController {
  private state: MagicControllerState = {
    x: -1000,
    y: -1000,
    velocity: 0,
    gesturePath: [],
    handPose: { ...EMPTY_HAND_POSE },
  };

  private lastX = -1000;
  private lastY = -1000;
  private lastTime = 0;
  private lastGestureTime = 0; // 上次手势触发时间
  private listeners = new Set<(state: MagicControllerState) => void>();

  subscribe(listener: (state: MagicControllerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * 位置更新（由 InputProvider 调用）。
   */
  updatePosition(x: number, y: number): void {
    const now = performance.now();

    if (this.lastTime > 0 && this.lastX > -500) {
      const dt = Math.max(now - this.lastTime, 1);
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const velocity = (distance / dt) * 1000;

      this.state.velocity = velocity;
      this.addGesturePoint(x, y, velocity, now);
    }

    this.state.x = x;
    this.state.y = y;
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;

    this.cleanupGesture(now);

    // 手势识别（带冷却）
    this.tryDetectGesture(now);

    this.notify();
  }

  updateHandPose(pose: Partial<HandPose>): void {
    this.state.handPose = { ...this.state.handPose, ...pose };
    this.notify();
  }

  private addGesturePoint(
    x: number,
    y: number,
    velocity: number,
    timestamp: number,
  ): void {
    this.state.gesturePath.unshift({ x, y, timestamp, velocity, opacity: 1 });

    if (this.state.gesturePath.length > MAX_GESTURE_POINTS) {
      this.state.gesturePath.pop();
    }
  }

  private cleanupGesture(now: number): void {
    this.state.gesturePath = this.state.gesturePath.filter((p) => {
      const age = now - p.timestamp;
      p.opacity = Math.max(0, 1 - age / GESTURE_LIFETIME_MS);
      return age < GESTURE_LIFETIME_MS;
    });
  }

  /**
   * 手势识别（带冷却期）。
   */
  private tryDetectGesture(now: number): void {
    // 冷却期内不识别
    if (now - this.lastGestureTime < GESTURE_COOLDOWN_MS) return;

    const result = detectGesture(this.state.gesturePath);
    if (!result) return;

    // 识别到手势，发射事件
    this.lastGestureTime = now;
    this.emit(result.type, {
      path: result.path,
    });
  }

  getState(): MagicControllerState {
    return { ...this.state, gesturePath: [...this.state.gesturePath] };
  }

  /**
   * 手势检测接口（同步，供外部查询）。
   */
  detectGesture(): MagicEventType | null {
    const result = detectGesture(this.state.gesturePath);
    return result?.type ?? null;
  }

  emit(event: MagicEventType, partial: Partial<MagicEventPayload> = {}): void {
    const payload: MagicEventPayload = {
      x: this.state.x,
      y: this.state.y,
      velocity: this.state.velocity,
      timestamp: performance.now(),
      ...partial,
    };
    magicEvents.emit(event, payload);
  }

  castLumos(): void {
    this.emit(MAGIC_EVENTS.LUMOS_CAST);
  }

  dismiss(): void {
    this.emit(MAGIC_EVENTS.MAGIC_DISMISS);
  }

  reset(): void {
    this.state = {
      x: -1000,
      y: -1000,
      velocity: 0,
      gesturePath: [],
      handPose: { ...EMPTY_HAND_POSE },
    };
    this.lastX = -1000;
    this.lastY = -1000;
    this.lastTime = 0;
    this.lastGestureTime = 0;
    this.notify();
  }
}

export const magicController = new MagicController();
