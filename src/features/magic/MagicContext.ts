/**
 * MagicContext（Phase 17.2.2 · 场景交互状态）。
 *
 * 定位：维护当前活跃魔法场景，用于 MAGIC_SWEEP 事件消费方判断
 *   是否允许响应。
 *
 * 场景：
 *   - study：普通学习页（StudyRoom 首页 / 单词展示）→ 禁止响应 MAGIC_SWEEP
 *   - lumos：Lumos 入口（死亡圣器符号页）→ 允许 MAGIC_SWEEP 激活仪式
 *   - spellbook：魔法书打开状态 → 预留 MAGIC_SWEEP 翻页交互
 *
 * 架构：
 *   MagicContext（场景状态）
 *     ↓
 *   MagicEvent 消费方（LumosEntrance）查询 activeScene
 *     ↓
 *   仅允许场景消费事件
 *
 * 不做：
 *   - 不发射魔法事件（由 MagicController 负责）
 *   - 不渲染 UI
 *   - 不修改学习数据
 */

export type MagicScene = "study" | "lumos" | "spellbook";

type SceneListener = (scene: MagicScene) => void;

class MagicContextManager {
  private scene: MagicScene = "study";
  private listeners = new Set<SceneListener>();

  /** 当前活跃场景 */
  getActiveScene(): MagicScene {
    return this.scene;
  }

  /** 设置当前场景（由 Scene 组件根据自身阶段调用） */
  setActiveScene(scene: MagicScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    this.listeners.forEach((listener) => listener(scene));
  }

  /** 订阅场景变化 */
  subscribe(listener: SceneListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const magicContext = new MagicContextManager();
