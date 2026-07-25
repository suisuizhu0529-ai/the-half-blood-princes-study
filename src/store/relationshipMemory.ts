/**
 * Relationship Memory Storage（Phase 15.3）。
 *
 * 定位：RelationshipMemory 的 localStorage 持久化层。
 *   - 与 useSettings（语音/阅读/视觉偏好）分离，独立 key 管理
 *   - 与 llmConfig store（prince-llm-config）并列，使用独立 key
 *
 * 设计原则：
 *   - 纯函数，无副作用（除 localStorage 读写）
 *   - 不依赖任何 Manager / ConversationEngine / PromptBuilder
 *   - 类型安全，无 any
 *   - 所有 JSON.parse 安全处理，异常返回 null（不影响应用运行）
 *   - 不修改 src/types/relationshipMemory.ts（数据结构层）
 *
 * localStorage key：prince-memory-v1（遵循项目 prince- 前缀惯例）
 *
 * Phase 15.3 范围：
 *   - 仅持久化基础设施
 *   - 不接入 ConversationEngine
 *   - 不实现事件提取 / 自动关系升级
 */

import type { RelationshipMemory } from "@/types/relationshipMemory";
import { RELATIONSHIP_MEMORY_VERSION } from "@/types/relationshipMemory";

/** localStorage key（含版本号，便于未来 schema 迁移） */
const STORAGE_KEY = "prince-memory-v1";

/**
 * 生成匿名用户 ID。
 *
 * 格式：`user-{timestamp-base36}-{random8}`
 * 不依赖 uuid 库，保持零新增依赖。
 * 不收集 PII，仅用于跨会话标识同一用户。
 */
function generateUserId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `user-${ts}-${rand}`;
}

/**
 * 创建默认 RelationshipMemory。
 *
 * 用于首次访问（localStorage 无记录）时初始化。
 *
 * 默认值：
 *   - metadata.version = 1
 *   - metadata.userId = 新生成的匿名 ID
 *   - metadata.createdAt / updatedAt = 当前时间
 *   - relationship.stage = "stranger"
 *   - relationship.trust = 0（初始无信任）
 *   - relationship.patience = 50（中性耐心，Snape 默认对陌生人有一定容忍）
 *   - relationship.curiosity = 0（初始无好奇）
 *   - userProfile：全空（name 未知 / preferences 空 / learningStyle 未定义）
 *   - progress.potionLevel = 1（初始等级 1）
 *   - progress.completedTopics / achievements：空数组
 *   - milestones：全 0 / 未定义
 */
export function createDefaultRelationshipMemory(): RelationshipMemory {
  const now = Date.now();
  return {
    metadata: {
      version: RELATIONSHIP_MEMORY_VERSION,
      userId: generateUserId(),
      createdAt: now,
      updatedAt: now,
    },
    relationship: {
      stage: "stranger",
      trust: 0,
      patience: 50,
      curiosity: 0,
    },
    userProfile: {
      knownPreferences: [],
    },
    progress: {
      potionLevel: 1,
      completedTopics: [],
      achievements: [],
    },
    milestones: {
      archiveViewedCount: 0,
      memoryActivatedCount: 0,
    },
  };
}

/**
 * 从 localStorage 读取 RelationshipMemory。
 *
 * 流程：
 *   1. 读取 localStorage（失败返回 null）
 *   2. JSON.parse（失败返回 null）
 *   3. 版本检查（版本不匹配返回 null，调用方可决定是否重建）
 *   4. 基本字段完整性检查（缺失关键字段返回 null）
 *
 * 异常处理：
 *   - localStorage 不可用（如隐私模式）：返回 null，不 throw
 *   - JSON 解析失败：返回 null，不 throw
 *   - 版本不匹配：返回 null（未来可在此处实现迁移逻辑）
 *
 * @returns RelationshipMemory 或 null（未配置 / 解析失败 / 版本不匹配）
 */
export function loadRelationshipMemory(): RelationshipMemory | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RelationshipMemory>;

    // 版本检查：版本缺失或不匹配则视为无效
    if (
      !parsed.metadata ||
      typeof parsed.metadata.version !== "number" ||
      parsed.metadata.version !== RELATIONSHIP_MEMORY_VERSION
    ) {
      return null;
    }

    // 基本字段完整性检查
    if (
      !parsed.relationship ||
      !parsed.userProfile ||
      !parsed.progress ||
      !parsed.milestones
    ) {
      return null;
    }

    // 返回规范化后的对象（确保数组字段存在）
    return {
      metadata: {
        version: parsed.metadata.version,
        userId: parsed.metadata.userId,
        createdAt: parsed.metadata.createdAt,
        updatedAt: parsed.metadata.updatedAt,
      },
      relationship: {
        stage: parsed.relationship.stage,
        trust: parsed.relationship.trust,
        patience: parsed.relationship.patience,
        curiosity: parsed.relationship.curiosity,
      },
      userProfile: {
        name: parsed.userProfile.name,
        knownPreferences: parsed.userProfile.knownPreferences ?? [],
        learningStyle: parsed.userProfile.learningStyle,
        preferredLanguage: parsed.userProfile.preferredLanguage,
      },
      progress: {
        potionLevel: parsed.progress.potionLevel,
        completedTopics: parsed.progress.completedTopics ?? [],
        achievements: parsed.progress.achievements ?? [],
      },
      milestones: {
        firstMeeting: parsed.milestones.firstMeeting,
        archiveViewedCount: parsed.milestones.archiveViewedCount,
        memoryActivatedCount: parsed.milestones.memoryActivatedCount,
        // Phase 15.5-C：保留 milestone 事件列表（向后兼容，旧数据无此字段则为 undefined）
        // 若不保留，跨会话加载会丢失已记录的 milestone，导致 checkMilestones 重复触发
        events: parsed.milestones.events,
      },
      // Phase 15.6-A：保留共同经历事件列表（向后兼容，旧数据无此字段则为 undefined）
      // 若不保留，跨会话加载会丢失已记录的 sharedHistory，导致 Snape "失忆"
      // Step 2 仅扩展 schema + 持久化兼容，不接入 capture / read 逻辑
      sharedHistory: parsed.sharedHistory,
    };
  } catch {
    // localStorage 不可用 / JSON 解析失败 / 字段访问异常：静默返回 null
    return null;
  }
}

/**
 * 保存 RelationshipMemory 到 localStorage。
 *
 * 行为：
 *   - 更新 metadata.updatedAt 为当前时间
 *   - JSON.stringify 后写入 localStorage
 *   - 失败静默忽略（localStorage 满或不可用）
 *
 * 注意：本函数会修改传入对象的 metadata.updatedAt。
 *       若调用方需要保留原对象，应先深拷贝。
 *
 * @param memory 要保存的 RelationshipMemory
 */
export function saveRelationshipMemory(memory: RelationshipMemory): void {
  try {
    // 更新 updatedAt
    memory.metadata.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // localStorage 满 / 不可用：静默忽略
    // 不影响应用运行，下次访问时会重新创建
  }
}

/**
 * 清空 RelationshipMemory（移除 localStorage key）。
 *
 * 用于未来 Reset 按钮。
 * 不恢复任何默认值，仅删除 key。
 * 下次 loadRelationshipMemory() 将返回 null，调用方可决定是否重建。
 */
export function clearRelationshipMemory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage 不可用：静默忽略
  }
}
