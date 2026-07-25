/**
 * Persona 数据模型（Phase 8.2）。
 *
 * Snape 角色人格数据层。
 *
 * 定位：Severus Snape 的人格画像。
 *   - 不是剧情，不是长文本
 *   - 是结构化角色约束，用于未来 AI Prompt Context
 *   - 让 AI 对话、TTS 语音、叙事生成都有统一的角色基准
 *
 * 设计原则：
 *   - 字段 camelCase，与 LibraryEntry / MemoryEntry 一致
 *   - 本地静态数据，未来可扩展为 API
 *   - 重点描述"如何表达"而非"发生了什么"
 *   - 提供约束（avoid patterns）而非开放描述
 *
 * Phase 8.2 仅建立数据层：
 *   - 不接 AI
 *   - 不修改 Conversation UI
 *   - 不实现关系阶段切换逻辑
 */

/**
 * 性格特征标签。
 *
 * 用于 UI 标签展示与 AI prompt 约束。
 * 字面量联合类型，保证类型安全。
 */
export type PersonaTrait =
  | "reserved"
  | "intelligent"
  | "sarcastic"
  | "protective"
  | "observant"
  | "disciplined"
  | "bitter"
  | "loyal";

/**
 * 关系阶段。
 *
 * 随学习者与 Snape 的互动深入，关系演进：
 *   - stranger             陌生人（初见，戒备）
 *   - student              学生（教学，严苛）
 *   - trusted-researcher   信任的研究者（平等探讨）
 *   - confidant            知己（揭示内心）
 *
 * 阶段影响：
 *   - Snape 的语气开放程度
 *   - 可触发的记忆深度
 *   - Library 档案解锁层级
 */
export type RelationshipStage =
  | "stranger"
  | "student"
  | "trusted-researcher"
  | "confidant";

/**
 * 情绪类型。
 *
 * 定义 Snape 如何表达这四种核心情绪。
 * 每种情绪配有表达规则（AI prompt 用）。
 */
export type EmotionType = "sadness" | "care" | "anger" | "regret";

/**
 * 情绪表达规则。
 *
 * 描述 Snape 对某种情绪的表达方式（而非情绪本身）。
 * 用于约束 AI 生成文本时的语气与措辞。
 */
export interface EmotionRule {
  /** 情绪类型 */
  emotion: EmotionType;
  /** 表达方式描述（简短，供 AI prompt） */
  expression: string;
  /** 语言特征（具体措辞倾向） */
  linguisticMarkers: string[];
}

/**
 * 语言风格约束。
 *
 * 定义 Snape 的说话方式：
 *   - preferredTone：偏好的语气
 *   - avoidPatterns：禁止的表达模式
 *
 * 用于 AI prompt 的 negative constraints。
 */
export interface CommunicationStyle {
  /** 偏好的语气（简短描述） */
  preferredTone: string[];
  /** 禁止的表达模式 */
  avoidPatterns: string[];
  /** 词汇偏好（偏好使用 / 偏好避免） */
  vocabularyPreferences?: {
    preferred?: string[];
    avoided?: string[];
  };
}

/**
 * 关系阶段描述。
 *
 * 每个阶段对应 Snape 不同的态度与开放程度。
 */
export interface RelationshipStageDescription {
  /** 关系阶段 */
  stage: RelationshipStage;
  /** 该阶段 Snape 的态度（简短） */
  attitude: string;
  /** 该阶段 Snape 愿意谈论的话题范围 */
  openTopics: string[];
  /** 该阶段 Snape 拒绝谈论的话题 */
  closedTopics: string[];
}

/**
 * 响应规则约束（Phase 14.1 新增）。
 *
 * 控制 AI 输出的格式、长度、语言等元属性。
 * 避免角色"长篇大论"破坏人设。
 */
export interface ResponseGuidelines {
  /** 最大响应长度提示（自然语言描述，如 "2-4 sentences"） */
  maxLength?: string;
  /** 响应语言（如 "English"、"Chinese"） */
  language?: string;
  /** 风格备注（具体写作约束） */
  styleNotes?: string[];
}

/**
 * 教学方式约束（Phase 14.1 新增）。
 *
 * 定义角色作为教师时的教学方法。
 * 让 AI 知道"如何教学"而非仅"如何说话"。
 */
export interface TeachingStyle {
  /** 教学方法概述（简短） */
  approach: string;
  /** 具体教学技巧 */
  techniques: string[];
}

/**
 * 知识边界约束（Phase 14.1 新增）。
 *
 * 声明角色"知道什么/不知道什么"。
 * 防止 AI 回答超出角色设定范围的内容。
 */
export interface KnowledgeBoundaries {
  /** 角色掌握的知识领域 */
  knows: string[];
  /** 角色不应涉及的知识领域 */
  avoids: string[];
}

/**
 * 优先级规则（Phase 14.1 新增）。
 *
 * 当多条约束冲突时，指导 AI 的行为优先级。
 * 例如：人设一致性 > 回答完整性。
 */
export interface PriorityRules {
  /** 优先级排序说明（从高到低） */
  priorities: string[];
}

/**
 * Persona 人格画像。
 *
 * 完整描述一个角色的人格约束。
 * 用于 AI Prompt Context、TTS 语气控制、叙事生成。
 *
 * Phase 14.1 新增可选字段：
 *   - responseGuidelines   响应格式约束
 *   - teachingStyle        教学方式
 *   - knowledgeBoundaries  知识边界
 *   - priorityRules        优先级规则
 *
 * 所有新字段均为 optional，保持向后兼容。
 */
export interface PersonaProfile {
  /** 唯一标识 */
  id: string;

  /** 角色名称 */
  name: string;

  /** 角色简短描述（1-2 句，非剧情） */
  description: string;

  /** 性格特征标签 */
  traits: PersonaTrait[];

  /** 语言风格约束 */
  communicationStyle: CommunicationStyle;

  /** 情绪表达规则 */
  emotionalRules: EmotionRule[];

  /** 关系阶段描述 */
  relationshipStages: RelationshipStageDescription[];

  /** 响应格式约束（可选，Phase 14.1） */
  responseGuidelines?: ResponseGuidelines;

  /** 教学方式（可选，Phase 14.1） */
  teachingStyle?: TeachingStyle;

  /** 知识边界（可选，Phase 14.1） */
  knowledgeBoundaries?: KnowledgeBoundaries;

  /** 优先级规则（可选，Phase 14.1） */
  priorityRules?: PriorityRules;
}
