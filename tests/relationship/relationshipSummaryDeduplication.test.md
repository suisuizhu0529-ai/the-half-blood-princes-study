# Phase 15.5-E Step 3 — memorySummary 与 relationshipContext 去重测试

测试目标：验证 `getRelationshipSummary()` 精简后：
1. memorySummary 不再输出与 relationshipContext 重复的字段
2. relationshipContext 保持不变（D-2 设计保持）
3. 旧数据兼容性

验证范围：
- `src/utils/relationshipMemoryManager.ts` → `getRelationshipSummary()`
- `src/utils/relationshipMemoryReader.ts` → `readRelationshipContext()`（保持不变，验证未受影响）
- `src/utils/messageBuilder.ts` → `buildSystemContent()`（保持不变，验证整体 prompt 结构）

---

## Case 1: 旧用户完整数据

### 输入

```typescript
const memory: RelationshipMemory = {
  metadata: { version: 1, userId: "user-001", createdAt: 1718000000000, updatedAt: 1718000100000 },
  relationship: {
    stage: "student",
    trust: 35,
    patience: 60,
    curiosity: 20,
  },
  userProfile: {
    name: "Harry",
    knownPreferences: [],
    learningStyle: "analytical",
    preferredLanguage: "en",
  },
  progress: {
    potionLevel: 2,
    completedTopics: ["wiggenweld-potion", "draught-of-living-death", "felix-felicis"],
    achievements: ["first-lesson"],
  },
  milestones: {
    firstMeeting: 1718000000000,
    archiveViewedCount: 3,
    memoryActivatedCount: 1,
    events: [
      { type: "first-meeting", timestamp: 1718000000000 },
      { type: "first-archive", timestamp: 1718000050000 },
    ],
  },
};

const memorySummary = getRelationshipSummary(memory);
const relationshipContext = readRelationshipContext(memory);
```

### 预期 memorySummary

```
Relationship memory:
- Stage: student
- Learning style: analytical
- Preferred language: en
- Potion level: 2
- Completed topics: 3
- Achievements: 1
```

### 预期 relationshipContext（保持不变）

```
<relationship_context>
User: Harry

Relationship:
Trust level: 35
Curiosity level: 20

Milestones:
- First meeting: yes
- Archive explored: yes
- Memory activated: yes
</relationship_context>
```

### 验证点

#### memorySummary 应包含

| 字段 | 预期值 | 说明 |
|------|--------|------|
| Stage | `student` | 关系阶段标签（relationshipContext 未展示） |
| Learning style | `analytical` | 用户背景 |
| Preferred language | `en` | 用户背景 |
| Potion level | `2` | 学习进度 |
| Completed topics | `3` | 学习进度（数量） |
| Achievements | `1` | 学习进度（数量） |

#### memorySummary 不应包含

| 字段 | 原因 |
|------|------|
| Trust | 已由 relationshipContext 的 "Trust level: 35" 提供 |
| Patience | D-2 已决定不暴露给 LLM |
| Curiosity | 已由 relationshipContext 的 "Curiosity level: 20" 提供 |
| User name | relationshipContext 的 "User: Harry" 保留用于行为条件判断 |
| Archives viewed | relationshipContext 的 "Archive explored: yes" 已覆盖 |
| Memories activated | relationshipContext 的 "Memory activated: yes" 已覆盖 |

#### relationshipContext 仍包含

| 字段 | 预期值 | 说明 |
|------|--------|------|
| User | `Harry` | 保持不变 |
| Trust level | `35` | 保持不变 |
| Curiosity level | `20` | 保持不变 |
| First meeting | `yes` | 保持不变 |
| Archive explored | `yes` | 保持不变 |
| Memory activated | `yes` | 保持不变 |

### 结果

✅ PASS — memorySummary 移除 6 个重复字段，保留 Stage / Learning style / Preferred language / Potion level / Completed topics / Achievements。relationshipContext 保持不变。

---

## Case 2: 新用户空 memory

### 输入

```typescript
const memory = createDefaultRelationshipMemory();
// 默认值：trust=0, patience=50, curiosity=0, stage="stranger"
// userProfile: { knownPreferences: [] }（无 name / learningStyle / preferredLanguage）
// progress: { potionLevel: 1, completedTopics: [], achievements: [] }
// milestones: { archiveViewedCount: 0, memoryActivatedCount: 0 }（无 firstMeeting / events）

const memorySummary = getRelationshipSummary(memory);
const relationshipContext = readRelationshipContext(memory);
```

### 预期 memorySummary

```
Relationship memory:
- Stage: stranger
- Potion level: 1
```

（Learning style / Preferred language / Completed topics / Achievements 均不输出，因为字段为空）

### 预期 relationshipContext

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

| 验证项 | 预期 | 说明 |
|--------|------|------|
| memorySummary 不输出空字段 | ✅ | Learning style / Preferred language / Completed topics / Achievements 均不出现 |
| memorySummary 包含 Stage | `stranger` | 默认值 |
| memorySummary 包含 Potion level | `1` | 默认值 |
| relationshipContext 包含 Trust level | `0` | 默认值 |
| relationshipContext 包含 Curiosity level | `0` | 默认值 |
| relationshipContext User | `(not provided)` | 无 name |
| relationshipContext Milestones | `no milestones yet` | 无任何 milestone |

### 结果

✅ PASS — 空 memory 时 memorySummary 不输出空字段，relationshipContext 正常显示默认值。

---

## Case 3: 兼容旧数据（无 relationshipContext 字段）

### 输入

模拟 Phase 15.4 时代的 PromptContext（无 relationshipContext 字段）。

```typescript
const memory = createDefaultRelationshipMemory();
const memorySummary = getRelationshipSummary(memory);

// 模拟旧 PromptContext（无 relationshipContext 字段）
const prompt: PromptContext = {
  systemPrompt: "You are Severus Snape.",
  contextPrompt: "",
  relationshipSummary: "Relationship stage: stranger.",
  memorySummary,
  // relationshipContext: undefined（旧数据，未传入）
};

const messages = buildMessages(prompt, "Hello, professor.", []);
```

### 预期 system message content

```
You are Severus Snape.

---

Relationship stage: stranger.

---

Relationship memory:
- Stage: stranger
- Potion level: 1
```

### 验证点

| 验证项 | 预期 | 说明 |
|--------|------|------|
| memorySummary 正常生成 | ✅ | 输出精简后的字段（Stage / Potion level） |
| buildMessages 不报错 | ✅ | relationshipContext 为 undefined 时不报错 |
| system message 不含 `<relationship_context>` | ✅ | relationshipContext 为 undefined 时跳过 block |
| system message 不含空段落 | ✅ | filter 已过滤空字符串 |
| Prompt 结构保持兼容 | ✅ | systemPrompt → contextPrompt → relationshipSummary → memorySummary |
| 历史向后兼容 | ✅ | Phase 15.4 时代的调用方式仍正常工作 |

### 结果

✅ PASS — 旧数据（无 relationshipContext）正常 fallback，buildMessages 不报错，Prompt 结构保持兼容。

---

## 测试总结

| Case | 场景 | 结果 |
|------|------|------|
| Case 1 | 旧用户完整数据 → memorySummary 移除 6 重复字段，relationshipContext 保持不变 | ✅ PASS |
| Case 2 | 新用户空 memory → memorySummary 不输出空字段，relationshipContext 显示默认值 | ✅ PASS |
| Case 3 | 旧数据（无 relationshipContext） → 正常 fallback，Prompt 结构兼容 | ✅ PASS |

### 关键验证项

- ✅ memorySummary 移除 Trust / Patience / Curiosity / User name / Archives viewed / Memories activated
- ✅ memorySummary 保留 Stage / Learning style / Preferred language / Potion level / Completed topics / Achievements
- ✅ relationshipContext 保持不变（D-2 设计未受影响）
- ✅ 空 memory 时不输出空字段
- ✅ 旧数据兼容（无 relationshipContext 时 buildMessages 正常）
- ✅ Prompt 注入结构保持（systemPrompt → contextPrompt → relationshipSummary → memorySummary → relationshipContext）
- ✅ 无 LLM 调用
- ✅ 无 RelationshipMemory schema 修改
- ✅ 无 Write Path 修改
