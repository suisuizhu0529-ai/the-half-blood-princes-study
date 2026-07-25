/**
 * Conversation Engine（Phase 9.2 → Phase 10 真实 LLM 接入）。
 *
 * 定位：串联 Persona / Memory / Archive / Context / Prompt / LLM / State 的运行时。
 *
 * 完整流程（Phase 10）：
 *   用户输入
 *     ↓
 *   读取 ConversationState
 *     ↓
 *   根据 archiveId / memoryId 构建 SnapeContext
 *     ↓
 *   buildFullPrompt() 生成三段式 prompt
 *     ↓
 *   buildMessages() 把 PromptContext + history 组装为 LLMMessage[]
 *     ↓
 *   if (llmClient) llmClient.chat(messages) else responseSimulator
 *     ↓
 *   构造 CharacterResponse
 *     ↓
 *   追加 history（用于下一轮多轮对话）
 *     ↓
 *   更新 ConversationState（markArchiveViewed / activateMemory / updateRelationshipStage）
 *
 * 设计原则：
 *   - 不直接依赖具体模型，只依赖 LLMClient interface
 *   - 状态不可变更新（每次 converse 返回新 state）
 *   - LLM 失败静默回退到 responseSimulator（Offline Mode 保留）
 *   - 不修改 Library / Memory / Persona / Prompt Builder / UI
 *   - 对话历史由 Engine 内部维护，不写入 ConversationState
 *   - 类型安全，无 any
 *
 * Phase 10 变化：
 *   - 集成 MessageBuilder，把 PromptContext 转为 LLMMessage[]
 *   - LLMClient 调用从 generate(s, c, u) 改为 chat(messages)
 *   - Engine 内部维护对话历史（ConversationTurn[]），支持多轮上下文
 *   - Simulator 完整保留，作为 Offline Mode
 */

import type { LLMClient, LLMMessage } from "@/services/llm/types";
import type { SnapeContext } from "@/types/context";
import type { ConversationState } from "@/types/conversation";
import type { PromptContext } from "@/types/prompt";
import type { CharacterResponse, ContextUsed } from "@/types/response";
import type { RelationshipStage } from "@/types/persona";
import {
  buildBaseContext,
  buildArchiveContext,
  buildMemoryContext,
} from "@/utils/contextBuilder";
import { buildFullPrompt } from "@/utils/promptBuilder";
import { simulateResponse } from "@/utils/responseSimulator";
import {
  createInitialState,
  markArchiveViewed,
  activateMemory,
  updateRelationshipStage,
  updateLastContext,
} from "@/utils/conversationState";
import {
  buildMessages,
  type ConversationTurn,
} from "@/utils/messageBuilder";
import { createRuntimeLLMClient } from "@/config/llm";
import {
  createSessionMemory,
  updateSessionMemory,
} from "@/utils/sessionMemoryManager";
import {
  initializeRelationshipMemory,
  updateRelationshipMemory,
} from "@/utils/relationshipMemoryManager";
import { resolveRelationshipSignals } from "@/utils/relationshipSignalResolver";
import { checkMilestones } from "@/utils/relationshipMilestoneManager";
import { readRelationshipContext } from "@/utils/relationshipMemoryReader";
import { resolveBehaviorGuidance } from "@/utils/relationshipBehaviorResolver";
import {
  captureSharedHistoryEvents,
  mergeSharedHistoryEvents,
} from "@/utils/sharedHistoryCapture";
import { readSharedHistory } from "@/utils/sharedHistoryReader";
import { saveRelationshipMemory } from "@/store/relationshipMemory";
import { augmentContext } from "@/utils/memoryAugmentor";
import type { SessionMemory } from "@/types/sessionMemory";
import type { RelationshipMemory } from "@/types/relationshipMemory";
import type { RelationshipContext } from "@/types/relationshipContext";
import type { SharedHistoryContext } from "@/types/sharedHistoryContext";
import type {
  ConversationRequest,
  ConversationResult,
  ConversationEngineOptions,
} from "./types";

/**
 * 关系阶段优先级（用于比较，仅升不降）。
 */
const STAGE_RANK: Record<RelationshipStage, number> = {
  stranger: 0,
  student: 1,
  "trusted-researcher": 2,
  confidant: 3,
};

/**
 * 根据已查看档案数与已激活记忆数推断应有的关系阶段。
 *
 * 阈值设计：
 *   - 1+ archive            → student
 *   - 3+ archive & 1+ memory → trusted-researcher
 *   - 5+ archive & 3+ memory → confidant
 */
function inferStage(
  viewedCount: number,
  memoryCount: number,
): RelationshipStage {
  if (viewedCount >= 5 && memoryCount >= 3) return "confidant";
  if (viewedCount >= 3 && memoryCount >= 1) return "trusted-researcher";
  if (viewedCount >= 1) return "student";
  return "stranger";
}

/**
 * 从 SnapeContext 构建精确的 ContextUsed（基于 id，非文本提取）。
 */
function buildContextUsed(context: SnapeContext): ContextUsed {
  return {
    archives: context.archive ? [context.archive.id] : [],
    memories: context.memories?.map((m) => m.id) ?? [],
  };
}

/**
 * Snape 对话引擎。
 *
 * 用法（Phase 12 自动接入）：
 *   const engine = new ConversationEngine();
 *   const result = await engine.converse({ userMessage: "..." });
 *
 * 构造时自动从运行时配置读取 LLM 配置（优先级：localStorage > env）：
 *   - 配置完整 → 创建真实 LLM Client（OpenRouter / Agnes / Anthropic 等）
 *   - 配置缺失 → llmClient = undefined，使用本地 responseSimulator（不报错）
 *   - LLM 调用失败 → console.error + 静默回退到 responseSimulator
 *
 * 调用方也可显式传入 llmClient 覆盖自动初始化：
 *   const engine = new ConversationEngine({ llmClient: customClient });
 *
 * UI 不需要知道当前是真 LLM 还是 Simulator，接口完全一致。
 * ConversationEngine 不感知配置来源（localStorage / env / 未来其他）。
 */
export class ConversationEngine {
  private state: ConversationState;
  private readonly llmClient?: LLMClient;
  /**
   * 对话历史（仅 user/assistant 轮次，不含 system）。
   *
   * Phase 10 新增：用于构建多轮 LLMMessage[]。
   * - 不写入 ConversationState（保持状态结构不变）
   * - 不持久化（页面刷新即丢失，Phase 15 长期记忆再考虑）
   * - LLM 调用失败回退到 Simulator 时，仍会追加历史，保持上下文连贯
   */
  private readonly history: ConversationTurn[] = [];

  /**
   * 会话内记忆（Phase 15.2 新增）。
   *
   * 作为 history 的观察层与增强层，不替换 history：
   *   - history 仍用于 buildMessages()（原始 ConversationTurn[]）
   *   - SessionMemory 追加结构化元数据（topic / intent / timestamp / index）
   *   - 不持久化（页面刷新即丢失，与 history 生命周期一致）
   *   - 仅用于增强未来 prompt 与 debug 展示
   */
  private sessionMemory: SessionMemory;

  /**
   * 跨会话关系记忆（Phase 15.5-A 新增）。
   *
   * 描述"Snape 如何认识这个学生"，持久化到 localStorage：
   *   - relationship.stage / trust / patience / curiosity
   *   - userProfile（name / preferences / learningStyle）
   *   - progress（potionLevel / completedTopics / achievements）
   *   - milestones（archiveViewedCount / memoryActivatedCount）
   *
   * Phase 15.5-A 范围（Read Path）：
   *   - 构造时通过 initializeRelationshipMemory() 加载或创建
   *   - converse() 中通过 augmentContext() 注入 prompt
   *   - 不更新数值（trust / patience / curiosity 不变）
   *   - 不保存（不调用 saveRelationshipMemory）
   *   - Memory 更新逻辑留待 Phase 15.5-B
   */
  private relationshipMemory: RelationshipMemory;

  /**
   * RelationshipContext 覆盖（Phase 15.5-G 测试注入）。
   *
   * - 非空 → converse() 跳过 readRelationshipContext()，直接使用此值
   * - undefined → 走 production 路径（readRelationshipMemory → readRelationshipContext）
   *
   * 仅用于 PersonaTest Debug Panel，production 不传入此字段。
   */
  private readonly relationshipContextOverride?: RelationshipContext;

  /**
   * 跳过持久化（Phase 15.5-G 测试隔离）。
   *
   * - true → converse() 不调用 saveRelationshipMemory()，不污染 localStorage
   * - false → 走 production 路径（正常持久化）
   */
  private readonly skipPersistence: boolean;

  constructor(options: ConversationEngineOptions = {}) {
    this.state = options.initialState ?? createInitialState();
    // Phase 12：优先使用调用方传入的 client，否则自动从 runtime config 创建
    // 优先级：localStorage（Settings 页面保存）> env（VITE_LLM_*）
    // 配置缺失时 createRuntimeLLMClient() 返回 null → llmClient = undefined → 用 Simulator
    // 配置缺失属于正常情况，不 console.error
    this.llmClient = options.llmClient ?? createRuntimeLLMClient() ?? undefined;
    // Phase 15.2：初始化 SessionMemory，与 ConversationState.sessionId 对齐
    this.sessionMemory = createSessionMemory(this.state.sessionId);
    // Phase 15.5-A：初始化 RelationshipMemory（localStorage 存在则加载，不存在则创建默认）
    // initializeRelationshipMemory() 内部已处理 localStorage 不可用 / 解析失败等异常
    this.relationshipMemory = initializeRelationshipMemory();
    // Phase 15.5-G：测试注入字段
    // override 直接覆盖 RelationshipContext，不经过 RelationshipMemoryReader
    // skipPersistence 避免测试污染 localStorage
    this.relationshipContextOverride = options.relationshipContextOverride;
    this.skipPersistence = options.skipPersistence ?? false;
  }

  /** 获取当前状态快照（只读） */
  getState(): ConversationState {
    return this.state;
  }

  /**
   * 获取当前会话记忆快照（只读）。
   *
   * Phase 15.2 新增：供 UI debug 展示与未来 prompt 增强使用。
   * 返回的是内部对象的引用，调用方不应修改。
   */
  getSessionMemory(): SessionMemory {
    return this.sessionMemory;
  }

  /**
   * 获取当前关系记忆快照（只读）。
   *
   * Phase 15.5-A 新增：供 PersonaTest debug 展示使用。
   * 返回的是内部对象的引用，调用方不应修改。
   */
  getRelationshipMemory(): RelationshipMemory {
    return this.relationshipMemory;
  }

  /**
   * 获取当前关系记忆的只读视图模型（Phase 15.5-D-1）。
   *
   * 通过 readRelationshipContext() 将 RelationshipMemory 转换为
   * 简洁的 RelationshipContext 结构，面向未来 Prompt 注入与 UI 展示。
   *
   * 行为：
   *   - 纯读取，不修改 RelationshipMemory
   *   - 不注入 prompt / 不修改 messages / 不调用 LLM
   *   - 每次调用返回全新对象（基于当前 relationshipMemory 快照）
   *
   * Phase 15.5-D-1 范围：
   *   - 仅提供读取入口
   *   - Prompt 注入留待 Phase 15.5-D-2
   *
   * @returns RelationshipContext 视图模型
   */
  getRelationshipContext(): RelationshipContext {
    return readRelationshipContext(this.relationshipMemory);
  }

  /**
   * 执行一轮对话。
   *
   * 完整流程：
   *   1. 构建 SnapeContext（archiveId/memoryId/base）
   *   2. 生成三段式 PromptContext
   *   3. 把 PromptContext + history 组装为 LLMMessage[]
   *   4. 调用 LLMClient.chat(messages)（或回退到 responseSimulator）
   *   5. 追加本轮到 history
   *   6. 更新 ConversationState
   *
   * UI 调用方不需要感知是真 LLM 还是 Simulator。
   */
  async converse(request: ConversationRequest): Promise<ConversationResult> {
    // 1. 构建 SnapeContext
    const context = this.buildContext(request);

    // 2. Memory 增强（Phase 15.5-A）
    //    将 SnapeContext + SessionMemory + RelationshipMemory 组合为 MemoryAugmentedContext
    //    生成 memorySummary 文本（关系记忆摘要 + 会话内上下文摘要）
    //    Read Path：仅读取 Memory，不更新
    //    注意（Phase 15.5-D-2）：RelationshipContext 不在 augmentContext 中读取，
    //    由 Engine 直接调用 readRelationshipContext() 保持三层分离
    //    (Read Adapter / Augmentor / Write Path)
    const augmented = augmentContext(
      context,
      this.sessionMemory,
      this.relationshipMemory,
    );

    // 2.5 结构化关系上下文 + 行为指引（Phase 15.5-D-2 + 15.5-F + 15.5-G）
    //     纯函数读取 RelationshipMemory → RelationshipContext 视图模型
    //     纯函数解析 RelationshipContext → InteractionGuidance 行为指引
    //     不修改 RelationshipMemory / 不调用 LLM / 不经过 memoryAugmentor
    //     透传给 buildFullPrompt，最终由 MessageBuilder 渲染为 system block
    //
    //     Phase 15.5-G：测试注入支持
    //     - relationshipContextOverride 非空 → 直接使用，跳过 readRelationshipContext()
    //     - relationshipContextOverride 为空 → 走 production 路径（readRelationshipMemory → reader）
    //     - override 不经过 RelationshipMemoryReader，直接覆盖 RelationshipContext
    const relationshipContext: RelationshipContext =
      this.relationshipContextOverride ??
      readRelationshipContext(this.relationshipMemory);
    const interactionGuidance = resolveBehaviorGuidance(relationshipContext);

    // 2.7 SharedHistory recall context（Phase 15.6-A Step 7）
    //     纯函数读取 RelationshipMemory.sharedHistory → SharedHistoryContext 视图模型
    //     trust 控制 recall 深度（不隐藏 memory）：
    //       - trust 0-19  → "fact"（只引用事实 type + subject）
    //       - trust 20-59 → "experience"（+ count + detail）
    //       - trust 60+   → "personal"（+ narrative framing）
    //     不修改 RelationshipMemory / 不调用 LLM / 不经过 memoryAugmentor
    //     透传给 buildFullPrompt，由 MessageBuilder 渲染为 <shared_history> block
    //
    //     重要：sharedHistory 永远读取真实 RelationshipMemory，不受 relationshipContextOverride 影响。
    //     原因：PersonaTest 可以模拟 trust / stage（影响 RelationshipContext），
    //     但 SharedHistory 是历史事实，不应该被 UI override 篡改。
    //     trust 数值仍从 this.relationshipMemory 读取（即 override 只覆盖 RelationshipContext 视图，
    //     不覆盖 trust 数值本身 —— trust 数值在 memory 中，override 只改变其呈现方式）。
    //
    //     注意：此处在 converse 早期（Step 2.7）读取，使用的是"本轮开始时的 memory 快照"，
    //     不包含本轮 Step 12.5 capture 产生的新事件。
    //     这是正确行为：当前轮 prompt 应基于历史记忆，本轮新事件从下一轮开始才可见。
    const sharedHistoryContext: SharedHistoryContext = readSharedHistory(
      this.relationshipMemory,
    );

    // 3. 生成三段式 + Memory 增强 + 结构化关系上下文 + 共同经历 + 行为指引 prompt
    //    走 buildFullPrompt 的 MemoryAugmentedContext + options 重载
    //    （Phase 15.5-D-2 + 15.5-F + 15.6-A Step 6）
    //    memorySummary 注入 PromptContext.memorySummary（可能为 undefined）
    //    relationshipContext 注入 PromptContext.relationshipContext
    //    sharedHistoryContext 注入 PromptContext.sharedHistoryContext
    //    interactionGuidance 注入 PromptContext.interactionGuidance
    const prompt = buildFullPrompt(this.state, augmented, {
      relationshipContext,
      sharedHistoryContext,
      interactionGuidance,
    });

    // 4. 构建 LLM messages（含多轮历史）
    //    messageBuilder 会把 memorySummary 追加到 system 消息末尾
    const messages = buildMessages(prompt, request.userMessage, this.history);

    // 5. 获取响应（LLM 或本地模拟）
    const response = await this.generateResponse(
      prompt,
      messages,
      request.userMessage,
      context,
    );

    // 6. 追加历史（无论 LLM 还是 Simulator，都记录以保持多轮上下文）
    this.history.push({
      user: request.userMessage,
      assistant: response.content,
    });

    // 7. 保存更新前的 state（Phase 15.5-B2-A，用于信号解析）
    //    previousState 用于检测 viewedArchives / activatedMemories 数量变化
    const previousState = this.state;

    // 8. 更新状态
    this.state = this.applyStateUpdates(request, context);

    // 9. 解析关系信号（Phase 15.5-B2-A，确定性规则，无 LLM）
    //    基于 previousState → newState 的变化 + 用户消息关键词生成信号
    //    信号类型：archive-viewed / memory-activated / user-question / polite-interaction
    const signals = resolveRelationshipSignals(
      request,
      previousState,
      this.state,
      this.sessionMemory,
    );

    // 10. 更新会话内记忆（Phase 15.2，观察层，不替换 history）
    //     使用更新后的 relationshipStage 记录该轮（更准确反映当前关系）
    this.sessionMemory = updateSessionMemory(
      this.sessionMemory,
      request.userMessage,
      response.content,
      this.state.relationshipStage,
    );

    // 11. 更新关系记忆（Phase 15.5-B1 + 15.5-B2-A）
    //     Phase 15.5-B1：明确数据（updatedAt / firstMeeting / milestones / name）
    //     Phase 15.5-B2-A：确定性关系信号（trust / patience / curiosity 数值演进）
    //     严格不实现：
    //     - relationship stage 自动升级
    //     - interactionHistory / mistake system / LLM extraction
    this.relationshipMemory = updateRelationshipMemory(
      this.relationshipMemory,
      request,
      this.state,
      signals,
    );

    // 12. 检测关系里程碑（Phase 15.5-C）
    //     基于 updateRelationshipMemory 的结果检测首次达成的关键节点
    //     已存在的 milestone 不重复添加（checkMilestones 内部去重）
    //     纯函数，无 LLM / 无 Persona 修改 / 无 ConversationState schema 修改
    this.relationshipMemory = checkMilestones(this.relationshipMemory);

    // 12.5 捕获并合并 SharedHistory 事件（Phase 15.6-A Step 4）
    //      确定性捕获：从本轮对话上下文提取高价值 SharedHistoryEvent
    //      4 种事件：knowledge-gap / achievement / archive-explored / topic-discussed
    //      主体过滤：knowledge-gap / achievement 必须第一人称（避免 "Harry failed" 污染学生记忆）
    //      去重合并：type + subject 匹配则 count 累计，不重复 append
    //      不可变更新：返回全新 RelationshipMemory 对象
    //      不修改 Persona / 不注入 Prompt（Step 6 才注入）/ 不调用 LLM
    //      测试模式（skipPersistence）也执行 capture，仅跳过 save，便于验证捕获逻辑
    const capturedEvents = captureSharedHistoryEvents({
      userMessage: request.userMessage,
      context,
      previousState,
      newState: this.state,
      sessionMemory: this.sessionMemory,
    });
    if (capturedEvents.length > 0) {
      this.relationshipMemory = {
        ...this.relationshipMemory,
        sharedHistory: mergeSharedHistoryEvents(
          this.relationshipMemory.sharedHistory,
          capturedEvents,
        ),
      };
    }

    // 13. 持久化关系记忆（Phase 15.5-G：测试模式跳过，不污染 localStorage）
    if (!this.skipPersistence) {
      saveRelationshipMemory(this.relationshipMemory);
    }

    return {
      response,
      state: this.state,
      prompt,
    };
  }

  /**
   * 根据 request 构建 SnapeContext。
   *
   * 优先级：archiveId > memoryId > base
   * archiveId / memoryId 不存在时回退到 base context。
   */
  private buildContext(request: ConversationRequest): SnapeContext {
    if (request.archiveId) {
      const ctx = buildArchiveContext(request.archiveId);
      if (ctx) return ctx;
    }
    if (request.memoryId) {
      const ctx = buildMemoryContext(request.memoryId);
      if (ctx) return ctx;
    }
    return buildBaseContext();
  }

  /**
   * 调用 LLM 或本地模拟器生成响应。
   *
   * Phase 10 调整：
   *   - 改用 llmClient.chat(messages) 而非 generate(s, c, u)
   *   - messages 由 MessageBuilder 预构建（含多轮历史）
   *   - LLM 失败静默回退到 Simulator（Offline Mode）
   */
  private async generateResponse(
    prompt: PromptContext,
    messages: LLMMessage[],
    userMessage: string,
    context: SnapeContext,
  ): Promise<CharacterResponse> {
    const contextUsed = buildContextUsed(context);

    // 优先使用 LLM Client（真实 API）
    if (this.llmClient) {
      try {
        const content = await this.llmClient.chat(messages);
        return {
          role: "snape",
          content,
          contextUsed,
        };
      } catch (err) {
        // Phase 9.7：LLM 调用失败 → 记录日志 + 静默回退到本地模拟（不中断对话）
        console.error(
          `[ConversationEngine] LLM call failed, falling back to simulator:`,
          err,
        );
      }
    }

    // 本地模拟：使用 responseSimulator，但覆盖 contextUsed 为精确 id
    const simulated = simulateResponse(prompt, userMessage);
    return {
      ...simulated,
      contextUsed,
    };
  }

  /**
   * 应用状态更新（不可变）。
   *
   * - archiveId 存在 → markArchiveViewed
   * - 关联 memory → activateMemory（从 context.memories 提取）
   * - 关系阶段满足 → updateRelationshipStage（仅升不降）
   * - 更新 lastContext
   */
  private applyStateUpdates(
    request: ConversationRequest,
    context: SnapeContext,
  ): ConversationState {
    let next = this.state;

    // 标记 archive 已查看
    if (request.archiveId) {
      next = markArchiveViewed(next, request.archiveId);
    }

    // 激活关联记忆
    if (context.memories) {
      for (const memory of context.memories) {
        next = activateMemory(next, memory.id);
      }
    }
    // 若 request 直接指定 memoryId，也激活
    if (request.memoryId) {
      next = activateMemory(next, request.memoryId);
    }

    // 关系阶段自动晋升（仅升不降）
    const targetStage = inferStage(
      next.viewedArchives.length,
      next.activatedMemories.length,
    );
    if (STAGE_RANK[targetStage] > STAGE_RANK[next.relationshipStage]) {
      next = updateRelationshipStage(next, targetStage);
    }

    // 更新最近上下文
    next = updateLastContext(next, context);

    return next;
  }
}
