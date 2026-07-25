# Phase 15.5-D-1 — RelationshipMemoryReader 测试验证

测试目标：`src/utils/relationshipMemoryReader.ts` 的 `readRelationshipContext()` 纯函数。

验证方式：纯函数，输入 `RelationshipMemory`，输出 `RelationshipContext`。
通过构造测试输入 + 对比预期输出验证正确性。

---

## Test 1: 空 RelationshipMemory（安全默认值）

### 输入

```typescript
const emptyMemory: RelationshipMemory = {
  metadata: {
    version: 1,
    userId: "user-test-001",
    createdAt: 1718000000000,
    updatedAt: 1718000000000,
  },
  relationship: {
    stage: "stranger",
    trust: 0,
    patience: 50,   // 注意：默认 patience 为 50，不是 0
    curiosity: 0,
  },
  userProfile: {
    knownPreferences: [],
    // name: undefined（未自报）
  },
  progress: {
    potionLevel: 1,
    completedTopics: [],
    achievements: [],
  },
  milestones: {
    // firstMeeting: undefined（首次 converse 之前）
    archiveViewedCount: 0,
    memoryActivatedCount: 0,
    // events: undefined（未触发 milestone）
  },
};
```

### 预期输出

```typescript
const expected: RelationshipContext = {
  userName: undefined,
  relationshipLevel: {
    trust: 0,
    patience: 50,
    curiosity: 0,
  },
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
};
```

### 验证点

| 字段 | 预期值 | 来源 |
|------|--------|------|
| `userName` | `undefined` | `userProfile.name` 未定义 |
| `relationshipLevel.trust` | `0` | `relationship.trust` 直接映射 |
| `relationshipLevel.patience` | `50` | `relationship.patience` 直接映射（非 0） |
| `relationshipLevel.curiosity` | `0` | `relationship.curiosity` 直接映射 |
| `milestones.hasFirstMeeting` | `false` | `firstMeeting === undefined` |
| `milestones.hasViewedArchive` | `false` | `archiveViewedCount === 0`（< 1） |
| `milestones.hasActivatedMemory` | `false` | `memoryActivatedCount === 0`（< 1） |
| `milestones.eventsCount` | `0` | `events` 为 undefined，`?? 0` |
| `summaryFlags.isReturningUser` | `false` | `firstMeeting === undefined`（近似判断） |
| `summaryFlags.knowsUserName` | `false` | `userName === undefined` |

### 结果

✅ PASS — 空 memory 输出安全默认值，patience 正确保留为 50。

---

## Test 2: 已有数据的 RelationshipMemory（正确映射）

### 输入

```typescript
const populatedMemory: RelationshipMemory = {
  metadata: {
    version: 1,
    userId: "user-test-002",
    createdAt: 1718000000000,
    updatedAt: 1718000100000,
  },
  relationship: {
    stage: "student",
    trust: 25,
    patience: 55,
    curiosity: 30,
  },
  userProfile: {
    name: "Harry",
    knownPreferences: ["prefers theoretical discussions"],
    learningStyle: "analytical",
    preferredLanguage: "en",
  },
  progress: {
    potionLevel: 2,
    completedTopics: ["wiggenweld-potion"],
    achievements: [],
  },
  milestones: {
    firstMeeting: 1718000000000,
    archiveViewedCount: 2,
    memoryActivatedCount: 1,
    events: [
      {
        type: "first-meeting",
        timestamp: 1718000000000,
      },
      {
        type: "first-archive",
        timestamp: 1718000050000,
        metadata: { count: 1 },
      },
    ],
  },
};
```

### 预期输出

```typescript
const expected: RelationshipContext = {
  userName: "Harry",
  relationshipLevel: {
    trust: 25,
    patience: 55,
    curiosity: 30,
  },
  milestones: {
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: true,
    eventsCount: 2,
  },
  summaryFlags: {
    isReturningUser: true,
    knowsUserName: true,
  },
};
```

### 验证点

| 字段 | 预期值 | 来源 |
|------|--------|------|
| `userName` | `"Harry"` | `userProfile.name` 直接映射 |
| `relationshipLevel.trust` | `25` | `relationship.trust` 直接映射 |
| `relationshipLevel.patience` | `55` | `relationship.patience` 直接映射 |
| `relationshipLevel.curiosity` | `30` | `relationship.curiosity` 直接映射 |
| `milestones.hasFirstMeeting` | `true` | `firstMeeting !== undefined` |
| `milestones.hasViewedArchive` | `true` | `archiveViewedCount === 2`（>= 1） |
| `milestones.hasActivatedMemory` | `true` | `memoryActivatedCount === 1`（>= 1） |
| `milestones.eventsCount` | `2` | `events.length === 2` |
| `summaryFlags.isReturningUser` | `true` | `firstMeeting !== undefined`（近似判断） |
| `summaryFlags.knowsUserName` | `true` | `userName === "Harry"`（非 undefined） |

### 结果

✅ PASS — 已有数据正确映射，userName/trust/hasFirstMeeting/hasViewedArchive 均符合预期。

---

## Test 3: 边界情况 — events 为 undefined 但 archiveViewedCount > 0

### 输入

```typescript
const partialMemory: RelationshipMemory = {
  // ...metadata 同 Test 1
  relationship: {
    stage: "student",
    trust: 5,
    patience: 51,
    curiosity: 3,
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
    firstMeeting: 1718000000000,
    archiveViewedCount: 1,
    memoryActivatedCount: 0,
    // events: undefined（旧数据，未经过 Phase 15.5-C checkMilestones）
  },
};
```

### 预期输出

```typescript
const expected: RelationshipContext = {
  userName: undefined,
  relationshipLevel: {
    trust: 5,
    patience: 51,
    curiosity: 3,
  },
  milestones: {
    hasFirstMeeting: true,
    hasViewedArchive: true,
    hasActivatedMemory: false,
    eventsCount: 0,   // events 为 undefined，安全降级为 0
  },
  summaryFlags: {
    isReturningUser: true,
    knowsUserName: false,
  },
};
```

### 验证点

| 字段 | 预期值 | 说明 |
|------|--------|------|
| `milestones.eventsCount` | `0` | `events` 为 undefined，`?? 0` 安全降级 |
| `milestones.hasFirstMeeting` | `true` | `firstMeeting` 存在，与 events 是否有记录无关 |
| `summaryFlags.isReturningUser` | `true` | 基于 `firstMeeting`，不依赖 events |

### 结果

✅ PASS — 旧数据（无 events 字段）安全降级，不报错，不丢失其他字段映射。

---

## 测试总结

| Test | 场景 | 结果 |
|------|------|------|
| Test 1 | 空 RelationshipMemory → 安全默认值 | ✅ PASS |
| Test 2 | 已有数据 → 正确映射（userName=Harry, trust=25, hasFirstMeeting=true, hasViewedArchive=true） | ✅ PASS |
| Test 3 | 边界：events 为 undefined 但 archiveViewedCount > 0 → 安全降级 | ✅ PASS |

### 关键验证项

- ✅ 空 memory 输出安全默认值（patience=50，非 0）
- ✅ userName 正确映射（"Harry"）
- ✅ trust 正确映射（25）
- ✅ hasFirstMeeting 正确映射（true）
- ✅ hasViewedArchive 正确映射（true）
- ✅ events 为 undefined 时 eventsCount 安全降级为 0
- ✅ isReturningUser 使用 firstMeeting 近似判断（TODO 已标记）
- ✅ 纯函数，不修改输入 memory
- ✅ 无 LLM 调用
- ✅ 无 store 读写
