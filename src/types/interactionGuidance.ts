/**
 * Interaction Guidance 数据模型（Phase 15.5-F）。
 *
 * 定位：RelationshipContext 的行为解释层。
 *   - 由 RelationshipContext 通过确定性映射规则生成
 *   - 将"关系数值"翻译为"行为指引文本"
 *   - 作为运行时动态指令注入 prompt，与 Persona 静态约束互补
 *
 * 与现有模块的关系：
 *   - Persona（snape.ts）：定义"Snape 本质上是什么样的人"（静态，不可修改）
 *   - RelationshipContext：描述"当前关系是什么状态"（事实数据）
 *   - InteractionGuidance：解释"状态意味着什么行为"（动态指令）
 *
 * 设计原则：
 *   - 纯数据结构，不包含方法
 *   - 不暴露内部分级（tier 是 resolver 实现细节，不写入此类型）
 *   - 不依赖 React / LLM / localStorage
 *   - 类型安全，无 any
 *
 * Phase 15.5-F 范围：
 *   - 仅定义数据结构
 *   - resolver 纯函数在 relationshipBehaviorResolver.ts
 *
 * 不实现（留待后续 Phase）：
 *   - debug 信息输出（如需可单独提供 resolveBehaviorDebugInfo()）
 *   - LLM extraction
 *   - Persona 修改
 */

/**
 * 交互行为指引（运行时动态指令）。
 *
 * 由 resolveBehaviorGuidance() 从 RelationshipContext 生成。
 * 注入 prompt 后渲染为 <interaction_guidance> system block。
 *
 * 字段说明：
 *   - toneDirective:         基于 trust 的语气/防备程度指引
 *   - teachingDirective:     基于 curiosity 的主动展开程度指引
 *   - relationshipNotes:     基于 milestone 的交互备注列表
 */
export interface InteractionGuidance {
  /** 基于 trust 的语气指引（控制防备程度，不是温暖程度） */
  toneDirective: string;
  /** 基于 curiosity 的教学展开指引（控制主动补充程度，不是知识难度） */
  teachingDirective: string;
  /** 基于 milestone 的交互备注（累积列表，可能为空数组） */
  relationshipNotes: string[];
}
