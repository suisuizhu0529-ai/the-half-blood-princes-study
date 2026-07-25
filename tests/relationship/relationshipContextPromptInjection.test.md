# Phase 15.5-D-2 — RelationshipContext Prompt Injection 测试验证

测试目标：
1. `readRelationshipContext()` 纯函数（Phase 15.5-D-1 已验证，此处复用）
2. `buildFullPrompt(state, augmented, { relationshipContext })` 透传
3. `buildSystemContent(prompt)` 渲染 `<relationship_context>` system block
4. `buildMessages(prompt, userMessage, history)` 最终 messages 正常

验证方式：构造测试输入 + 对比预期输出。通过 `createDefaultRelationshipMemory()` 构造空 memory，通过手动赋值构造有数据 memory。

---

## Case 1: 新用户（空 RelationshipMemory）

### 输入

```typescript
const memory = createDefaultRelationshipMemory();
// 默认值：trust=0, patience=50, curiosity=0, 无 milestone, 无 name

const relationshipContext = readRelationshipContext(memory);

const prompt: PromptContext = {
  systemPrompt: "You are Severus Snape.",
  contextPrompt: "",
  relationshipSummary: "Relationship stage: stranger.",
  // memorySummary 未传入（undefined）
  relationshipContext,
};
```

### 预期 relationshipContext

```typescript
{
  userName: undefined,
  relationshipLevel: { trust: 0, patience: 50, curiosity: 0 },
  milestones: {
    hasFirstMeeting: false,
    hasViewedArchive: false,
    hasActivatedMemory: false,
    eventsCount: 0,
  },
  summaryFlags: {
    isReturningUser: false,
    knowsUserName: false,
  },
}
```

### 预期 system block（由 buildSystemContent 渲染）

```
<relationship_context>
User: (not provided)

Relationship:
Trust level: 0
Curiosity level: 0

Milestones:
no milestones yet
</relationship_context>
```

### 验证点

| 字段 | 预期值 | 说明 |
|------|--------|------|
| `relationshipContext` | 正常生成 | 空 memory 也能输出结构化 context |
| `userName` | `undefined` | 未自报姓名 |
| block 中 User | `(not provided)` | 不输出 "unknown" |
| block 中 Trust level | `0` | 默认值 |
| block 中 Curiosity level | `0` | 默认值 |
| block 中 Milestones | `no milestones yet` | 无任何 milestone，降级文案 |
| 不展示 patience | ✅ | patience=50 但 block 中不出现 |
| 不展示 eventsCount | ✅ | eventsCount=0 但 block 中不出现 |

### 结果

✅ PASS — 新用户 relationship_context block 正常生成，无 milestone 降级文案正确。

---

## Case 2: 老用户（已有数据）

### 输入

```typescript
const memory: RelationshipMemory = {
  // ...metadata 同 Case 1
  relationship: {
    stage: "student",
    trust: 35,
    patience: 60,   // 内部字段，不应出现在 block 中
    curiosity: 20,
  },
  userProfile: {
    name: "Harry",
    knownPreferences: [],
  },
  progress: { potionLevel: 2, completedTopics: [], achievements: [] },
  milestones: {
    firstMeeting: 1718000000000,
    archiveViewedCount: 3,
    memoryActivatedCount: 0,
    events: [
      { type: "first-meeting", timestamp: 1718000000000 },
      { type: "first-archive", timestamp: 1718000050000 },
    ],
  },
};

const relationshipContext = readRelationshipContext(memory);

const prompt: PromptContext = {
  systemPrompt: "You are Severus Snape.",
  contextPrompt: "Current archive context: ...",
  relationshipSummary: "Relationship stage: student.",
  memorySummary: "Relationship memory:\n- Stage: student\n- Trust: 35",
  relationshipContext,
};

const messages = buildMessages(prompt, "Hello, professor.", []);
```

### 预期 relationshipContext

```typescript
{
  userName: "Harry",
  relationshipLevel: { trust: 35, patience: 60, curiosity: 20 },
  milestones: {
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: false,
    eventsCount: 2,
  },
  summaryFlags: {
    isReturningUser: true,
    knowsUserName: true,
  },
}
```

### 预期 system message content（关键片段）

```
You are Severus Snape.

---

Current archive context: ...

---

Relationship stage: student.

---

Relationship memory:
- Stage: student
- Trust: 35

---

<relationship_context>
User: Harry

Relationship:
Trust level: 35
Curiosity level: 20

Milestones:
- First meeting: yes
- Archive explored: yes
- Memory activated: no
</relationship_context>
```

### 验证点

| 字段 | 预期值 | 说明 |
|------|--------|------|
| `userName` | `"Harry"` | 正确映射 |
| `relationshipLevel.trust` | `35` | 正确映射 |
| `relationshipLevel.curiosity` | `20` | 正确映射 |
| `milestones.hasFirstMeeting` | `true` | firstMeeting 存在 |
| `milestones.hasViewedArchive` | `true` | archiveViewedCount=3（>=1） |
| `milestones.hasActivatedMemory` | `false` | memoryActivatedCount=0 |
| block 中 User | `Harry` | 正确显示 |
| block 中 Trust level | `35` | 正确显示 |
| block 中 Curiosity level | `20` | 正确显示 |
| block 中 First meeting | `yes` | 正确显示 |
| block 中 Archive explored | `yes` | 正确显示 |
| block 中 Memory activated | `no` | 正确显示 |
| 不展示 patience | ✅ | patience=60 但 block 中不出现 |
| 不展示 eventsCount | ✅ | eventsCount=2 但 block 中不出现 |
| memorySummary 与 relationshipContext 并存 | ✅ | 两段独立 block |
| system message 包含 "Harry" | ✅ | |
| system message 包含 "Trust level: 35" | ✅ | |
| system message 包含 "Archive explored" | ✅ | |

### 结果

✅ PASS — 老用户 block 正确包含 name/trust/curiosity/milestone flags，memorySummary 与 relationshipContext 并存。

---

## Case 3: 旧数据（无 relationshipContext 字段）

### 输入

```typescript
// 模拟 Phase 15.4 时代的 PromptContext（无 relationshipContext 字段）
const prompt: PromptContext = {
  systemPrompt: "You are Severus Snape.",
  contextPrompt: "",
  relationshipSummary: "Relationship stage: stranger.",
  // memorySummary: undefined
  // relationshipContext: undefined（旧数据，未传入）
};

const messages = buildMessages(prompt, "Hello, professor.", []);
```

### 预期 system message content

```
You are Severus Snape.

---

Relationship stage: stranger.
```

### 验证点

| 字段 | 预期值 | 说明 |
|------|--------|------|
| `buildMessages` 正常执行 | ✅ | 不报错 |
| system message 不含 `<relationship_context>` | ✅ | relationshipContext 为 undefined 时跳过 |
| system message 不含空段落 | ✅ | filter 已过滤空字符串 |
| 历史向后兼容 | ✅ | Phase 15.4 时代的 PromptContext 仍正常工作 |

### 结果

✅ PASS — 旧数据（无 relationshipContext）正常 fallback，buildMessages 不报错，system message 不含 relationship_context block。

---

## 测试总结

| Case | 场景 | 结果 |
|------|------|------|
| Case 1 | 新用户（空 memory）→ relationship_context block 正常生成 | ✅ PASS |
| Case 2 | 老用户（name=Harry, trust=35, curiosity=20, milestones）→ block 包含 name/trust/curiosity/milestone flags | ✅ PASS |
| Case 3 | 旧数据（无 relationshipContext 字段）→ 正常 fallback | ✅ PASS |

### 关键验证项

- ✅ relationshipContext 正常生成（空 memory + 有数据 memory）
- ✅ system message 包含 `<relationship_context>` block（当 relationshipContext 存在时）
- ✅ block 只展示 userName / trust / curiosity / milestone flags
- ✅ block 不展示 patience / eventsCount / isReturningUser（内部字段不泄漏）
- ✅ 无 userName 时显示 `(not provided)`（不输出 "unknown"）
- ✅ 无 milestone 时显示 `no milestones yet`
- ✅ memorySummary 与 relationshipContext 并存（两段独立 block）
- ✅ 旧 PromptContext（无 relationshipContext）正常 fallback
- ✅ buildMessages 不报错
- ✅ 无 LLM 调用
- ✅ 无 RelationshipMemory schema 修改
