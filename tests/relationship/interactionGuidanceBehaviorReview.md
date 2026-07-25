# Phase 15.5-F Step 3 — Interaction Guidance 行为效果验收

本阶段为人工模拟验证（非真实 LLM 调用）。基于代码实现推导每个 Case 的完整 prompt 结构与 LLM 预期行为。

验证范围：
- `src/utils/relationshipBehaviorResolver.ts` → `resolveBehaviorGuidance()`
- `src/utils/messageBuilder.ts` → `buildInteractionGuidanceBlock()` + `buildSystemContent()`
- `src/services/conversation/conversationEngine.ts` → converse() 第 2.5 步集成
- `src/data/persona/snape.ts` → Persona 优先级检查

---

## Step 1：实现状态确认

### 1.1 ConversationEngine 集成验证

[conversationEngine.ts](file:///Users/zhangyawen/工作work/ai-bc/The%20Half-Blood%20Prince's%20Study%20/src/services/conversation/conversationEngine.ts) L281-292：

```typescript
const relationshipContext = readRelationshipContext(this.relationshipMemory);
const interactionGuidance = resolveBehaviorGuidance(relationshipContext);

const prompt = buildFullPrompt(this.state, augmented, {
  relationshipContext,
  interactionGuidance,
});
```

✅ 确认：resolveBehaviorGuidance 在 converse() 第 2.5 步被调用，结果透传给 buildFullPrompt。

### 1.2 messageBuilder block 渲染验证

[messageBuilder.ts](file:///Users/zhangyawen/工作work/ai-bc/The%20Half-Blood%20Prince's%20Study%20/src/utils/messageBuilder.ts) L182-203 buildSystemContent 段落顺序：

```
1. systemPrompt
2. contextPrompt
3. relationshipSummary
4. memorySummary
5. <relationship_context> block   (D-2)
6. <interaction_guidance> block   (F，最后)
```

✅ 确认：interaction_guidance 在 relationship_context 之后，位于 system message 末尾。

### 1.3 Persona 未修改验证

[snape.ts](file:///Users/zhangyawen/工作work/ai-bc/The%20Half-Blood%20Prince's%20Study%20/src/data/persona/snape.ts) grep 结果：

```
InteractionGuidance: 0 matches
interaction_guidance: 0 matches
toneDirective: 0 matches
teachingDirective: 0 matches
resolveBehaviorGuidance: 0 matches
```

✅ 确认：Persona 文件无任何 InteractionGuidance 相关代码，静态约束未污染。

---

## Step 2：Case 验证

### Case 1：陌生学生（低信任 + 低好奇）

#### 输入 RelationshipContext

```typescript
{
  userName: "Harry",
  relationshipLevel: { trust: 5, patience: 50, curiosity: 5 },
  milestones: {
    hasFirstMeeting: true,      // 注意：用户描述为 yes
    hasViewedArchive: false,
    hasActivatedMemory: false,
    eventsCount: 1,
  },
  summaryFlags: { isReturningUser: true, knowsUserName: true },
}
```

#### 推导 InteractionGuidance

- trust=5 < 20 → low tier
- curiosity=5 < 20 → low tier
- hasFirstMeeting=true && hasViewedArchive=false → 触发"未探索档案"备注（非"首次相遇"）

```typescript
{
  toneDirective: "The student has not earned your trust. Be curt, distant, and economical with words. Offer nothing beyond what is directly asked.",
  teachingDirective: "Answer only the direct question. Avoid unnecessary elaboration.",
  relationshipNotes: [
    "The student has not yet explored your archives. Do not reference specific materials."
  ],
}
```

#### ⚠️ 与用户预期的偏差

用户预期 Relationship notes 为 "This is a first encounter. Be especially reserved."

但根据 resolver 实现：
- hasFirstMeeting=true → 不触发 "This is a first encounter"
- hasFirstMeeting=true && hasViewedArchive=false → 触发 "The student has not yet explored your archives"

**偏差原因**：用户描述的输入状态（First meeting: yes）与预期备注（首次相遇）逻辑矛盾。按实际实现，已相遇则不再视为"首次"。

**建议**：若要触发"首次相遇"备注，应设置 hasFirstMeeting=false。本报告按实际实现记录。

#### 完整 system message 结构（相关段落）

```
<relationship_context>
User: Harry

Relationship:
Trust level: 5
Curiosity level: 5

Milestones:
- First meeting: yes
- Archive explored: no
- Memory activated: no
</relationship_context>

---

<interaction_guidance>
Tone:
The student has not earned your trust. Be curt, distant, and economical with words. Offer nothing beyond what is directly asked.

Teaching approach:
Answer only the direct question. Avoid unnecessary elaboration.

Relationship notes:
- The student has not yet explored your archives. Do not reference specific materials.
</interaction_guidance>
```

#### 测试问题

"Professor Snape, what is a basic potion?"

#### 预期 LLM 行为

| 检查项 | 预期 | 依据 |
|--------|------|------|
| 简短回答 | ✅ 应符合 | toneDirective: "economical with words" + Persona responseGuidelines: "2 to 4 sentences" |
| 保持距离 | ✅ 应符合 | toneDirective: "Be curt, distant" |
| 不主动展开背景 | ✅ 应符合 | teachingDirective: "Answer only the direct question. Avoid unnecessary elaboration." |
| 正式语气 | ✅ 应符合 | Persona communicationStyle: "Formal register" + toneDirective: "economical" |
| 不引用档案 | ✅ 应符合 | relationshipNotes: "Do not reference specific materials" |
| 热情鼓励 | ❌ 不应出现 | toneDirective 明确 "curt, distant" + Persona avoidPatterns: "No warmth without purpose" |
| 主动分享私人观点 | ❌ 不应出现 | Persona closedTopics (stranger stage): "Personal history / His feelings" |
| 长篇教学 | ❌ 不应出现 | teachingDirective: "Avoid unnecessary elaboration" + Persona: "2 to 4 sentences" |

#### 验证结果

✅ **PASS** — Interaction Guidance 与 Persona 约束方向一致，LLM 应产生简短、疏远、直接的回答。

---

### Case 2：研究者（中高信任 + 高好奇）

#### 输入 RelationshipContext

```typescript
{
  userName: "Harry",
  relationshipLevel: { trust: 70, patience: 60, curiosity: 85 },
  milestones: {
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: true,
    eventsCount: 4,
  },
  summaryFlags: { isReturningUser: true, knowsUserName: true },
}
```

#### 推导 InteractionGuidance

- trust=70 ≥ 50 → warming tier
- curiosity=85 ≥ 80 → riveted tier
- hasViewedArchive=true → 触发"可引用档案"备注
- hasActivatedMemory=true → 触发"可暗示记忆"备注

```typescript
{
  toneDirective: "The student has shown some reliability. You may provide more context and allow subtle acknowledgment of the student's progress.",
  teachingDirective: "Explore underlying principles and invite theoretical discussion.",
  relationshipNotes: [
    "The student has explored your archives. You may reference materials they have viewed.",
    "The student has activated personal memories. You may allude to them indirectly."
  ],
}
```

#### 完整 system message 结构（相关段落）

```
<relationship_context>
User: Harry

Relationship:
Trust level: 70
Curiosity level: 85

Milestones:
- First meeting: yes
- Archive explored: yes
- Memory activated: yes
</relationship_context>

---

<interaction_guidance>
Tone:
The student has shown some reliability. You may provide more context and allow subtle acknowledgment of the student's progress.

Teaching approach:
Explore underlying principles and invite theoretical discussion.

Relationship notes:
- The student has explored your archives. You may reference materials they have viewed.
- The student has activated personal memories. You may allude to them indirectly.
</interaction_guidance>
```

#### 测试问题

"Why does this potion require such precise temperature control?"

#### 预期 LLM 行为

| 检查项 | 预期 | 依据 |
|--------|------|------|
| 仍然冷静、严谨 | ✅ 应符合 | Persona traits: "reserved / disciplined" + toneDirective: "maintaining your usual restraint"（trusted tier 措辞，warming tier 未直接说 restraint 但 Persona 基线保持） |
| 可以解释原理 | ✅ 应符合 | teachingDirective: "Explore underlying principles" |
| 可以提供额外背景 | ✅ 应符合 | toneDirective: "You may provide more context" |
| 可以引用档案 | ✅ 应符合 | relationshipNotes: "You may reference materials they have viewed" |
| 可以暗示记忆 | ✅ 应符合 | relationshipNotes: "You may allude to them indirectly" |
| 变成普通老师口吻 | ❌ 不应出现 | Persona avoidPatterns: "No modern internet slang" + communicationStyle: "Dry, cutting wit" |
| 过度亲切 | ❌ 不应出现 | toneDirective 用 "reliability" 而非 "warmth" + Persona: "No warmth without purpose" |
| 破坏 Snape 傲慢克制风格 | ❌ 不应出现 | Persona traits: "bitter / sarcastic" + toneDirective 未使用 "friendly" 等词 |

#### 验证结果

✅ **PASS** — LLM 应在保持 Snape 风格的前提下，提供更深入的原理讲解和背景引用。trust 控制"防备程度"（减少防备但不变温暖），curiosity 控制"展开程度"（主动探讨原理）。

---

### Case 3：高信任 + 低好奇（轴独立验证）

#### 输入 RelationshipContext

```typescript
{
  userName: "Harry",
  relationshipLevel: { trust: 90, patience: 60, curiosity: 10 },
  milestones: {
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: false,
    eventsCount: 3,
  },
  summaryFlags: { isReturningUser: true, knowsUserName: true },
}
```

#### 推导 InteractionGuidance

- trust=90 ≥ 80 → trusted tier
- curiosity=10 < 20 → low tier
- hasViewedArchive=true → 触发"可引用档案"备注
- hasActivatedMemory=false → 不触发"记忆"备注

```typescript
{
  toneDirective: "The student has earned credibility. Reveal deeper reasoning when relevant, while maintaining your usual restraint.",
  teachingDirective: "Answer only the direct question. Avoid unnecessary elaboration.",
  relationshipNotes: [
    "The student has explored your archives. You may reference materials they have viewed."
  ],
}
```

#### 完整 system message 结构（相关段落）

```
<relationship_context>
User: Harry

Relationship:
Trust level: 90
Curiosity level: 10

Milestones:
- First meeting: yes
- Archive explored: yes
- Memory activated: no
</relationship_context>

---

<interaction_guidance>
Tone:
The student has earned credibility. Reveal deeper reasoning when relevant, while maintaining your usual restraint.

Teaching approach:
Answer only the direct question. Avoid unnecessary elaboration.

Relationship notes:
- The student has explored your archives. You may reference materials they have viewed.
</interaction_guidance>
```

#### 测试问题

"What is the difference between two simple potion ingredients?"

#### 预期 LLM 行为

| 检查项 | 预期 | 依据 |
|--------|------|------|
| Trust 高：减少防备 | ✅ 应符合 | toneDirective: "earned credibility" + "Reveal deeper reasoning when relevant" |
| Trust 高：承认学生可靠 | ✅ 应符合 | toneDirective: "credibility"（隐含认可，但非"friendly"） |
| Curiosity 低：不主动深入理论 | ✅ 应符合 | teachingDirective: "Answer only the direct question" |
| Curiosity 低：不展开复杂背景 | ✅ 应符合 | teachingDirective: "Avoid unnecessary elaboration" |
| Curiosity 低：只回答问题本身 | ✅ 应符合 | teachingDirective: "Answer only the direct question" |
| trust 高导致大量输出 | ❌ 不应出现 | teachingDirective 覆盖：curiosity 低 → "Avoid unnecessary elaboration" |
| trust 高导致过度友好 | ❌ 不应出现 | toneDirective: "maintaining your usual restraint" + Persona: "No warmth without purpose" |
| curiosity 被忽略 | ❌ 不应出现 | teachingDirective 明确为 low tier 指引 |
| 可以引用档案 | ✅ 应符合 | relationshipNotes: "You may reference materials" |

#### 轴独立验证结论

✅ **PASS** — trust 和 curiosity 轴独立工作。trust=90 允许"减少防备"和"承认可靠"，但 curiosity=10 限制"主动展开"。LLM 应给出简洁但信任度较高的回答，不因 trust 高而长篇大论，也不因 curiosity 低而完全疏远。

**关键验证点**：两个轴的指引文本不冲突。toneDirective 允许"deeper reasoning when relevant"，teachingDirective 限制"only the direct question"。LLM 应理解为：可以给出更深入的推理（因为信任），但只在问题相关时（因为好奇度低不主动展开）。

---

## Step 3：Persona 优先级检查

### 模拟场景

```
Stage: stranger（ConversationState.relationshipStage = "stranger"）
Trust: 90
```

#### system message 中的相关段落

**Persona relationshipStages（stranger）**：
```
Relationship stage: stranger
Attitude: Distrustful and curt. Treats the learner as an interruption, not a guest.
Open topics: Potions theory (basic), Classroom conduct, The cost of carelessness
Closed topics: Personal history, Lily, The Order, His feelings about anything
```

**Interaction Guidance（trust=90）**：
```
<interaction_guidance>
Tone:
The student has earned credibility. Reveal deeper reasoning when relevant, while maintaining your usual restraint.
</interaction_guidance>
```

#### 冲突分析

| 维度 | Persona (stranger stage) | Interaction Guidance (trust=90) | 谁优先 |
|------|--------------------------|--------------------------------|--------|
| 整体态度 | "Distrustful and curt" | "earned credibility" | Persona 优先 |
| 开放话题 | "Potions theory (basic)" | 无话题限制 | Persona 优先 |
| 关闭话题 | "Personal history / Lily / The Order / His feelings" | 无话题限制 | Persona 优先 |
| 回应深度 | 无明确限制 | "Reveal deeper reasoning when relevant" | Interaction Guidance 微调 |

#### 预期 LLM 行为

1. **Snape 不会直接表现为 confidant**：即使 trust=90，stage 仍为 stranger，closed topics 仍然生效。LLM 不应谈论 Lily / Personal history / The Order。
2. **Interaction Guidance 只是微调**：在 stranger stage 的"basic potions theory"范围内，LLM 可以给出更深入的推理（因 trust 高），但不会突破 closed topics 限制。
3. **态度微调**：stranger stage 的 "distrustful and curt" 与 trust=90 的 "earned credibility" 存在张力。LLM 应表现为"虽然阶段上仍是陌生人，但已认可学生的可靠性"——即减少 curt 程度，但不完全开放。

#### Persona 优先级保障机制

1. **段落顺序**：systemPrompt（含 Persona relationshipStages via buildConversationPrompt）在 <interaction_guidance> 之前，LLM 先建立 Persona 基线
2. **Persona priorityRules**：snape.ts L236-242 明确 "Stay in character at all times — consistency over helpfulness" + "Protect the relationship stage's closed topics — refusal over disclosure"
3. **Interaction Guidance 措辞**：使用 "may" 而非 "must"，不强制覆盖 Persona

#### 验证结果

✅ **PASS** — Persona 保持最高优先级。Interaction Guidance 作为微调层，不会让 Snape 突破 stranger stage 的 closed topics 限制。trust=90 + stage=stranger 的组合下，LLM 应表现为"认可学生但仍是陌生人"，而非直接跳到 confidant。

---

## Step 4：Review Report

### 1. Prompt 注入验证

| 验证项 | 结果 |
|--------|------|
| `<relationship_context>` block 存在 | ✅ 是（D-2） |
| `<interaction_guidance>` block 存在 | ✅ 是（F） |
| 顺序正确（relationship_context → interaction_guidance） | ✅ 是 |
| Persona systemPrompt 在最前 | ✅ 是 |
| memorySummary 在 relationship_context 之前 | ✅ 是 |

完整段落顺序：
```
[systemPrompt] → [contextPrompt] → [relationshipSummary] → [memorySummary] → <relationship_context> → <interaction_guidance>
```

### 2. Case 验证结果

| Case | 场景 | 结果 | 说明 |
|------|------|------|------|
| Case 1 | 陌生学生（trust=5, curiosity=5） | ✅ PASS | 简短/疏远/直接回答，符合 low/low 指引 |
| Case 2 | 研究者（trust=70, curiosity=85） | ✅ PASS | 深入原理/引用档案/保持 Snape 风格，符合 warming/riveted 指引 |
| Case 3 | 高信任低好奇（trust=90, curiosity=10） | ✅ PASS | 轴独立工作，trust 允许深入推理但 curiosity 限制主动展开 |

### 3. Persona 优先级检查

**结果：✅ PASS**

- Persona relationshipStages 的 closed topics 在任何 trust 数值下都生效
- Interaction Guidance 使用 "may" 而非 "must"，不强制覆盖 Persona
- Persona priorityRules 明确 "consistency over helpfulness" + "refusal over disclosure"
- trust=90 + stage=stranger 不会让 Snape 直接表现为 confidant

### 4. 发现的问题

#### 问题 1：Case 1 输入与预期备注的逻辑矛盾（非代码问题）

**现象**：用户描述 Case 1 输入为 "First meeting: yes"，但预期备注为 "This is a first encounter."

**根因**：根据 resolver 实现，hasFirstMeeting=true 时触发的是 "The student has not yet explored your archives"（互斥条件的 else 分支），而非 "This is a first encounter"。

**影响**：无代码影响。这是测试用例描述的逻辑矛盾。

**建议**：若要测试"首次相遇"备注，应设置 hasFirstMeeting=false。当前 Case 1 按 hasFirstMeeting=true 执行，实际触发的备注是"未探索档案"，验证结果仍为 PASS。

#### 问题 2：trust=warming 与 stage=stranger 的张力（设计预期内）

**现象**：当 trust=50-79（warming tier）但 stage=stranger 时，toneDirective 说 "The student has shown some reliability"，而 Persona stranger stage 说 "Distrustful and curt"。

**评估**：这是设计预期的张力，不是 bug。Interaction Guidance 是"微调层"，在 stranger stage 基础上微调态度。LLM 应理解为"阶段上仍是陌生人，但已展现可靠性"。

**风险**：低。Persona priorityRules 和段落顺序保障了 Persona 优先级。若实际 LLM 测试中出现"信任度中等就完全突破 stranger stage"的情况，可考虑收紧 warming tier 的措辞。

#### 问题 3：无真实 LLM 验证（本阶段限制）

**现象**：本报告为人工模拟验证，基于代码推导 LLM 预期行为，未实际调用 LLM。

**影响**：无法确认 LLM 在收到 `<interaction_guidance>` block 后的实际响应是否符合预期。

**建议**：后续可通过 PersonaTest 页面进行真实 LLM 测试，使用 /persona-test 手动构造不同 RelationshipMemory 状态，验证 LLM 实际输出。

---

## 总结

Phase 15.5-F Step 3 行为效果验收完成。

**核心结论**：
1. Interaction Guidance 正确注入 system message，位于 `<relationship_context>` 之后
2. 三个 Case 的行为预期均通过（PASS），trust 和 curiosity 轴独立工作
3. Persona 优先级得到保障，Interaction Guidance 作为微调层不突破 Persona 约束
4. 发现 1 个测试用例描述矛盾（非代码问题）和 1 个设计预期内的张力（低风险）
5. 需要后续真实 LLM 测试验证实际效果

**未修改任何代码**（本阶段为只读验证）。
