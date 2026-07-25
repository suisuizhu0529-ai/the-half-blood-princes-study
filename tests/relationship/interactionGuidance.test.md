# Phase 15.5-F — Interaction Guidance 行为指引层测试

测试目标：验证 `resolveBehaviorGuidance()` 将 RelationshipContext 数值正确映射为行为指引文本，并渲染为 `<interaction_guidance>` system block。

验证范围：
- `src/utils/relationshipBehaviorResolver.ts` → `resolveBehaviorGuidance()`
- `src/utils/messageBuilder.ts` → `buildInteractionGuidanceBlock()`（通过 buildSystemContent 间接验证）

---

## Case 1: 新用户（低 trust / 低 curiosity / 无 milestone）

### 输入

```typescript
const ctx: RelationshipContext = {
  userName: undefined,
  relationshipLevel: { trust: 5, patience: 50, curiosity: 5 },
  milestones: {
    hasFirstMeeting: false,
    hasViewedArchive: false,
    hasActivatedMemory: false,
    eventsCount: 0,
  },
  summaryFlags: { isReturningUser: false, knowsUserName: false },
};

const guidance = resolveBehaviorGuidance(ctx);
```

### 预期 InteractionGuidance

```typescript
{
  toneDirective: "The student has not earned your trust. Be curt, distant, and economical with words. Offer nothing beyond what is directly asked.",
  teachingDirective: "Answer only the direct question. Avoid unnecessary elaboration.",
  relationshipNotes: ["This is a first encounter. Be especially reserved."],
}
```

### 预期 `<interaction_guidance>` block

```
<interaction_guidance>
Tone:
The student has not earned your trust. Be curt, distant, and economical with words. Offer nothing beyond what is directly asked.

Teaching approach:
Answer only the direct question. Avoid unnecessary elaboration.

Relationship notes:
- This is a first encounter. Be especially reserved.
</interaction_guidance>
```

### 验证点

| 验证项 | 预期 | 说明 |
|--------|------|------|
| toneDirective | "Be curt, distant" | trust=5 → low tier → 防备程度最高 |
| teachingDirective | "Answer only the direct question" | curiosity=5 → low tier → 不主动展开 |
| relationshipNotes | 1 条（首次相遇） | hasFirstMeeting=false |
| 不暴露 tier | ✅ | 输出中无 "low" / "guarded" 等内部分级名 |
| 不暴露数值 | ✅ | 输出中无 trust=5 / curiosity=5 |

### 结果

✅ PASS — 新用户生成 formal / reserved / direct answer 指引，符合预期。

---

## Case 2: 老用户（高 trust / 高 curiosity / 已探索档案 + 已激活记忆）

### 输入

```typescript
const ctx: RelationshipContext = {
  userName: "Harry",
  relationshipLevel: { trust: 70, patience: 60, curiosity: 80 },
  milestones: {
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: true,
    eventsCount: 4,
  },
  summaryFlags: { isReturningUser: true, knowsUserName: true },
};

const guidance = resolveBehaviorGuidance(ctx);
```

### 预期 InteractionGuidance

```typescript
{
  toneDirective: "The student has shown some reliability. You may provide more context and allow subtle acknowledgment of the student's progress.",
  teachingDirective: "Explore underlying principles and invite theoretical discussion.",
  relationshipNotes: [
    "The student has explored your archives. You may reference materials they have viewed.",
    "The student has activated personal memories. You may allude to them indirectly.",
  ],
}
```

### 预期 `<interaction_guidance>` block

```
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

### 验证点

| 验证项 | 预期 | 说明 |
|--------|------|------|
| toneDirective | "You may provide more context" | trust=70 → warming tier → 减少防备 |
| teachingDirective | "Explore underlying principles" | curiosity=80 → riveted tier → 主动展开 |
| relationshipNotes | 2 条（档案 + 记忆） | hasViewedArchive + hasActivatedMemory |
| 不含"首次相遇"备注 | ✅ | hasFirstMeeting=true → 不触发 |
| 不含"未探索档案"备注 | ✅ | hasViewedArchive=true → 不触发互斥条件 |
| 不暴露 tier | ✅ | 输出中无 "warming" / "riveted" |
| 不暴露 patience | ✅ | patience=60 不在任何输出中 |
| 不暴露 eventsCount | ✅ | eventsCount=4 不在任何输出中 |

### 结果

✅ PASS — 老用户生成 more context / deeper explanation / reference archives 指引，符合预期。

---

## Case 3: 中等数值（guarded / emerging / 首次相遇但未探索档案）

### 输入

```typescript
const ctx: RelationshipContext = {
  userName: "Hermione",
  relationshipLevel: { trust: 35, patience: 55, curiosity: 30 },
  milestones: {
    hasFirstMeeting: true,
    hasViewedArchive: false,
    hasActivatedMemory: false,
    eventsCount: 1,
  },
  summaryFlags: { isReturningUser: true, knowsUserName: true },
};

const guidance = resolveBehaviorGuidance(ctx);
```

### 预期 InteractionGuidance

```typescript
{
  toneDirective: "The student has shown glimpses of worth. Remain formal, but allow slight patience in explanation.",
  teachingDirective: "Provide brief additional context when it improves understanding.",
  relationshipNotes: ["The student has not yet explored your archives. Do not reference specific materials."],
}
```

### 预期 `<interaction_guidance>` block

```
<interaction_guidance>
Tone:
The student has shown glimpses of worth. Remain formal, but allow slight patience in explanation.

Teaching approach:
Provide brief additional context when it improves understanding.

Relationship notes:
- The student has not yet explored your archives. Do not reference specific materials.
</interaction_guidance>
```

### 验证点

| 验证项 | 预期 | 说明 |
|--------|------|------|
| toneDirective | "Remain formal, but allow slight patience" | trust=35 → guarded tier |
| teachingDirective | "Provide brief additional context" | curiosity=30 → emerging tier |
| relationshipNotes | 1 条（未探索档案） | hasFirstMeeting=true + hasViewedArchive=false → 互斥条件触发 |
| 阈值边界 | trust=35 ≥ 20, curiosity=30 ≥ 20 | 与 milestone 阈值对齐 |

### 结果

✅ PASS — 中等数值生成 guarded / emerging 指引，互斥条件正确触发。

---

## Case 4: 阈值边界验证

### 输入

```typescript
// trust=19（low 边界）
const ctx1 = { relationshipLevel: { trust: 19, patience: 50, curiosity: 0 }, ... };
// trust=20（guarded 起点，与 milestone 同步）
const ctx2 = { relationshipLevel: { trust: 20, patience: 50, curiosity: 0 }, ... };
// curiosity=19（low 边界）
const ctx3 = { relationshipLevel: { trust: 0, patience: 50, curiosity: 19 }, ... };
// curiosity=20（emerging 起点，与 milestone 同步）
const ctx4 = { relationshipLevel: { trust: 0, patience: 50, curiosity: 20 }, ... };
```

### 验证点

| 输入 | 预期 tier | 预期 toneDirective 关键词 | 预期 teachingDirective 关键词 |
|------|-----------|--------------------------|------------------------------|
| trust=19 | low | "Be curt, distant" | — |
| trust=20 | guarded | "glimpses of worth" | — |
| curiosity=19 | low | — | "Answer only the direct question" |
| curiosity=20 | emerging | — | "Provide brief additional context" |

### 结果

✅ PASS — 阈值边界正确，trust=20 / curiosity=20 与 milestone 系统同步触发分级变化。

---

## Case 5: Persona 未修改验证

### 验证方式

直接读取 `src/data/persona/snape.ts`，确认文件内容未包含 InteractionGuidance 相关代码。

### 验证点

| 验证项 | 预期 |
|--------|------|
| snape.ts 不包含 "InteractionGuidance" | ✅ |
| snape.ts 不包含 "toneDirective" | ✅ |
| snape.ts 不包含 "teachingDirective" | ✅ |
| snape.ts 不包含 "interaction_guidance" | ✅ |
| snape.ts 不包含 "resolveBehaviorGuidance" | ✅ |
| snape.ts 内容与 Phase 15.5-E 完全一致 | ✅ |

### 结果

✅ PASS — Persona 文件未修改，行为指引作为独立运行时层注入，不污染 Persona 静态约束。

---

## 测试总结

| Case | 场景 | 结果 |
|------|------|------|
| Case 1 | 新用户（低数值 + 无 milestone） | ✅ PASS |
| Case 2 | 老用户（高数值 + 档案 + 记忆） | ✅ PASS |
| Case 3 | 中等数值（guarded / emerging + 互斥条件） | ✅ PASS |
| Case 4 | 阈值边界（19/20 边界） | ✅ PASS |
| Case 5 | Persona 未修改验证 | ✅ PASS |

### 关键验证项

- ✅ trust 控制"防备程度"，不控制"温暖程度"（无 "warmth" / "friendly" / "openness" 等词）
- ✅ curiosity 控制"主动展开程度"，不控制"知识难度"（无 "advanced theory" / "deeper knowledge" 等词）
- ✅ milestone 生成交互备注，使用"may"而非"must"
- ✅ 内部分级（tier）不暴露到输出
- ✅ patience / eventsCount / isReturningUser 不暴露给 LLM
- ✅ 阈值与 milestone 系统对齐（trust/curiosity >= 20 同步触发分级变化）
- ✅ block 名称为 `<interaction_guidance>`，段落为 Tone / Teaching approach / Relationship notes
- ✅ Persona 文件未修改
- ✅ RelationshipMemory schema 未修改
- ✅ Write Path 未修改
