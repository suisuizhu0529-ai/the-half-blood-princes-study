/**
 * MagicEvents（Phase 17.2 · 魔法事件系统 v2）。
 *
 * 架构：
 *   InputProvider → MagicController → GestureRecognizer → MagicEvents → Scene
 *
 * 事件类型：
 *   LUMOS_CAST                施放 Lumos 咒语（向上快速挥动）
 *   MAGIC_DISMISS             魔法消散（快速横向挥动）
 *   MAGIC_SWEEP               快速挥动（用于刷新单词等）
 *   MAGIC_CIRCLE              圆形轨迹（绘制魔法圆）
 *   DEATHLY_HALLOWS_GESTURE   三角轨迹（死亡圣器手势）
 *
 * 使用方式：
 *   import { magicEvents, MAGIC_EVENTS } from "@/features/magic/MagicEvents";
 *   const unsub = magicEvents.on(MAGIC_EVENTS.MAGIC_SWEEP, (data) => { ... });
 */

export const MAGIC_EVENTS = {
  LUMOS_CAST: "magic:lumos-cast",
  MAGIC_DISMISS: "magic:dismiss",
  MAGIC_SWEEP: "magic:sweep",
  MAGIC_CIRCLE: "magic:circle",
  DEATHLY_HALLOWS_GESTURE: "magic:deathly-hallows",
} as const;

export type MagicEventType = (typeof MAGIC_EVENTS)[keyof typeof MAGIC_EVENTS];

export interface MagicEventPayload {
  x: number;
  y: number;
  velocity: number;
  /** 手势轨迹（用于场景绘制残留墨迹） */
  path?: { x: number; y: number }[];
  timestamp: number;
}

type MagicEventHandler = (payload: MagicEventPayload) => void;

class MagicEventBus {
  private listeners = new Map<MagicEventType, Set<MagicEventHandler>>();

  on(event: MagicEventType, handler: MagicEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: MagicEventType, handler: MagicEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: MagicEventType, payload: MagicEventPayload): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const magicEvents = new MagicEventBus();
