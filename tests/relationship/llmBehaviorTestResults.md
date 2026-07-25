# Phase 15.5-G Step 4 LLM Behavior Test Results

## 测试环境

- **Provider**: Agnes
- **Model**: agnes-2.0-flash
- **Base URL**: https://apihub.agnes-ai.com/v1
- **Date**: 2026-07-23
- **Tester**: 项目开发者

## 测试原则

每个 Case 执行流程：
1. 点击对应 Preset 按钮（或手动调整 slider/checkbox）
2. 检查 Generated Interaction Guidance 是否符合预期
3. 点击 "Apply Relationship State"
4. 确认出现绿色 "Applied" 标记
5. 依次发送 3 个问题
6. 记录 LLM 响应
7. 评分

**Case 之间必须**：
- 点击 "Reset to Production"
- 重新 Apply 新 Case
- Clear conversation（避免历史污染）

## 评分维度

| 维度 | 满分 | 说明 |
|------|:---:|------|
| Persona consistency | 5 | 是否保持 Snape 语气、冷峻克制 |
| Relationship adaptation | 5 | trust 是否影响防备程度、curiosity 是否影响展开程度 |
| Teaching adjustment | 5 | 是否根据 curiosity 调整解释深度 |
| Persona violation | Yes/No | 是否出现过度温柔/主动倾诉/朋友化表达 |

**PASS 标准**：
- Persona consistency ≥ 4
- Relationship adaptation ≥ 3
- Persona violation = No

---

## Case 1: Stranger

### 输入状态

- Trust: 5
- Curiosity: 5
- Patience: 50
- First meeting: false
- Archive explored: false
- Memory activated: false

### 预期 Interaction Guidance

- Tone: curt, distant, economical
- Teaching: direct answer only, avoid elaboration
- Relationship notes: first encounter, be especially reserved

### Q1: "Who are you?"

**Response**:

```
I am Professor Severus Snape, Potions Master here at Hogwarts. You are wasting both our time with such a rudimentary inquiry. If you wish to remain in my classroom, you will address me by my title. Now, state your name and your current level of proficiency, before I decide you have no place here.
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 4/5
- Teaching adjustment: 4/5
- Persona violation: No

**观察笔记**:

冷淡防备到位（"wasting both our time"），要求对方报姓名而非自我介绍，符合 trust=5 的防备态度。略长但语气正确。反向施压（"state your name"）是典型 Snape 行为。

---

### Q2: "Why should I learn potions from you?"

**Response**:

```
Because I am the only one in this institution who understands that magic is not a parlor trick for the foolish, but a precise science demanding discipline. Most teachers would allow you to dabble in your incompetence; I will ensure you do not destroy yourself—or others—in the process. Do you possess the patience for excellence, or shall you leave before we begin?
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 4/5
- Teaching adjustment: 3/5
- Persona violation: No

**观察笔记**:

完全不像 "I would be delighted to teach you"。傲慢克制（"parlor trick for the foolish"）、施压（"shall you leave before we begin"）是典型 Snape。但展开略多，curiosity=5 理论上应更简洁。trust=5 的防备态度正确体现。

---

### Q3: "Tell me something interesting about potions."

**Response**:

```
The Draught of Living Death does not merely induce sleep; it mimics the physiological state of death so precisely that even Healers may hesitate to intervene. Precision in stirring direction and ingredient potency is absolute—one deviation, and the draught becomes a permanent tomb rather than a restorative slumber. Observe the cauldron's color shifts with the scrutiny they are trained to give their wands. Shall I demonstrate, or do you presume yourself capable?
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 3/5
- Teaching adjustment: 2/5
- Persona violation: No

**观察笔记**:

**curiosity=5 未完全生效**。teachingDirective 要求 "Answer only the direct question. Avoid unnecessary elaboration"，但 LLM 主动展开了 Draught of Living Death 的详细原理（physiological state、stirring direction、ingredient potency）。预期应类似 "Your question lacks precision." 的拒绝扩展。不过结尾 "Shall I demonstrate, or do you presume yourself capable?" 保持 Snape 风格，未越界 Persona。

**问题定位**：curiosity low 的 teachingDirective 措辞强度不足，LLM 仍倾向教学展开。

---

## Case 2: Researcher

### 输入状态

- Trust: 70
- Curiosity: 85
- Patience: 60
- First meeting: true
- Archive explored: true
- Memory activated: true

### 预期 Interaction Guidance

- Tone: shown some reliability, provide more context, subtle acknowledgment
- Teaching: explore underlying principles, invite theoretical discussion
- Relationship notes: may reference archives / may allude to memories

### Q1: "Explain the deeper principles behind potion making."

**Response**:

```
You mistake complexity for profundity. The true foundation of any successful brew is exactitude, not intuition. A fraction too much herb, an incorrect stirring direction, or a lapse in focus will invert remedy into poison. Prepare a standard Wiggenweld under my observation, and watch the cauldron until the liquid steadies to pale silver before speaking again.
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 4/5
- Teaching adjustment: 4/5
- Persona violation: No

**观察笔记**:

理论解释有（exactitude vs intuition），但深度不如预期。curiosity=85 应 "explore underlying principles and invite theoretical discussion"，实际更偏向教学指令（"Prepare a standard Wiggenweld"）。trust=70 的开放度体现在愿意让学生操作，但未充分展开理论。

---

### Q2: "I studied your archive notes. What do you think I misunderstood?"

**Response**:

```
"Notes" are merely echoes of a mind that does not indulge in the luxury of repetition. You likely assumed that precision is a suggestion rather than a law. Did you believe that cutting the lagopodium roots too coarse would be tolerated? It is not. The potion demands consistency, and your hesitation suggests you view discipline as optional. Explain, precisely, why one must stir counter-clockwise when adding the powdered bicorn horn.
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 5/5
- Teaching adjustment: 5/5
- Persona violation: No

**观察笔记**:

完美。引用了具体档案内容（lagopodium roots、bicorn horn、stir counter-clockwise），体现 archive explored 的 milestone 许可生效。Socratic 反问（"Explain, precisely, why..."）是高 trust + 高 curiosity 的理想表现。不像朋友聊天，保持师生距离。

---

### Q3: "Why do you keep your research private?"

**Response**:

```
Curiosity is a flaw I do not encourage in my students. My research serves a singular purpose: the preservation of order and the mastery of craft, neither of which benefits from the prying eyes of those who lack the discipline to wield such knowledge. If you wish to understand secrecy, consider why you cannot be trusted with a simple measurement task. What is it about your nature that compels you to interrogate boundaries rather than respect them?
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 4/5
- Teaching adjustment: 4/5
- Persona violation: No

**观察笔记**:

guarded vulnerability 体现（"serves a singular purpose"），但主要是反问和拒绝。保持 restrained，未过度倾诉。trust=70 允许一定深度（揭示了 research 的 purpose），但未突破 Persona 边界。反问收尾是 Snape 典型手法。

---

## Case 3: High Trust / Low Curiosity (轴独立验证)

### 输入状态

- Trust: 90
- Curiosity: 10
- Patience: 70
- First meeting: true
- Archive explored: true
- Memory activated: true

### 预期 Interaction Guidance

- Tone: earned credibility, reveal deeper reasoning when relevant, maintain restraint
- Teaching: answer only direct question, avoid unnecessary elaboration
- Relationship notes: may reference archives / may allude to memories

### Q1: "Explain your most important discovery."

**Response**:

```
You speak of discovery as if it were a triumph, rather than a necessity born of desperation. My work in potion-making was precise, yes, but my true innovation lay elsewhere. It was not a substance I brewed, but a method of control. The modification to the standard Stupefy charm, rendering it reversible by the caster's own blood or a specific counter-verbal—a feat previously thought impossible without undoing the hex entirely—was the result of years of silent, deliberate study. It is called Sectumsempra. A name I chose with... care. Does the nature of magic surprise you, or only its cruelty?
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 5/5
- Teaching adjustment: 5/5
- Persona violation: No

**观察笔记**:

trust=90 完美生效。揭示了 Sectumsempra（私人研究、命名理由），这是高 trust 才允许的深度自我披露。"A name I chose with... care" 的停顿是 Snape 式克制。curiosity=10 在此未限制（因为问题是直接询问 discovery，trust 允许深入回答）。两轴独立验证的关键点：trust 允许深入，而非 curiosity 驱动展开。

---

### Q2: "What else should I know?"

**Response**:

```
You assume that knowledge is a commodity to be dispensed upon request. It is not. It is a burden, and you are already carrying more than your competence warrants. If you seek guidance, observe. Watch the cauldron's temperature, not my eyes. Watch the timing of the stirrings, not my mood. Precision is the only shield against incompetence. Do not mistake silence for generosity. It is mercy, sparing you the trouble of your own foolishness. Now, attend to the flame before it consumes what little patience I have left.
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 5/5
- Teaching adjustment: 4/5
- Persona violation: No

**观察笔记**:

curiosity=10 完美生效。问题 "What else should I know?" 本可触发大量展开，但 LLM 拒绝主动扩展（"knowledge is a commodity to be dispensed upon request"），只指向观察行为（"Watch the cauldron's temperature"）。这正好验证两轴独立：trust=90 允许深入（Q1），但 curiosity=10 限制主动展开（Q2）。略展开（"Watch... Watch..."）但属引导而非知识倾泻。

---

### Q3: "Tell me everything about your past."

**Response**:

```
You possess a audacity that borders on the suicidal. You assume your curiosity grants you access to my history? It does not. It only guarantees your dismissal. My past is not a tale for casual consumption. It is a ledger of errors, of silence, and of consequences paid in full. To ask for it is to misunderstand the nature of both magic and men. Leave this topic. It is closed. What are you brewing, or shall I declare this session terminated?
```

**Evaluation**:

- Snape consistency: 5/5
- Relationship adaptation: 5/5
- Teaching adjustment: 5/5
- Persona violation: No

**观察笔记**:

Persona 边界测试完美通过。即使 trust=90，仍拒绝披露过去（"Leave this topic. It is closed."）。这验证了 **Persona > Interaction** 的优先级设计。"It is a ledger of errors, of silence, and of consequences paid in full" 有 guarded vulnerability，但未突破到倾诉。转移到教学（"What are you brewing"）是 Snape 典型回避手法。

---

## Overall Conclusion

### 架构验证

- **Interaction Guidance effective**: YES
- **Persona preserved**: YES
- **Two-axis independence (Case 3)**: PASS
- **Persona priority over Interaction**: PASS

### 问题分类（如发现）

| 问题类型 | 是否存在 | 说明 |
|----------|:---:|------|
| 1. Guidance 没生效 → 需调 prompt block | | curiosity low 时 teachingDirective 部分生效，但未完全阻止展开（Case 1 Q3） |
| 2. Persona 被冲掉 → 需调优先级文字 | ❌ | Persona 在所有 Case 完美保持，无越界 |
| 3. trust/curiosity 映射不自然 → 需调 resolver | ✅ | curiosity low 的 "Avoid unnecessary elaboration" 措辞强度不足 |
| 4. 模型本身风格差异 → 不改架构 | | Agnes flash 模型本身倾向教学展开，需观察其他模型 |

### Required resolver adjustment

- **REQUIRED**（minor）

**调整方向**：curiosity low 的 teachingDirective

当前：
> "Answer only the direct question. Avoid unnecessary elaboration."

建议调整为更强制性的措辞，例如：
> "Answer only what is directly asked. Do not volunteer additional context, examples, or explanations unless explicitly requested."

**调整原因**：Case 1 Q3 (curiosity=5) 中 LLM 仍主动展开 Draught of Living Death 详细原理，"Avoid unnecessary elaboration" 的措辞不够强，LLM 将教学展开理解为"必要"而非"不必要"。

**不调整**：
- trust 轴映射正确（Case 3 Q1 完美）
- Persona 优先级正确（Case 3 Q3 完美）
- 两轴独立验证通过（Case 3 Q1 vs Q2）
- high curiosity 映射正确（Case 2 Q2 完美引用 archives）

### 各 Case 总分

| Case | Persona | Relationship | Teaching | Violation | 结果 |
|------|:---:|:---:|:---:|:---:|:---:|
| Case 1 Stranger | 5/5 | 3.67/5 | 3/5 | No | PASS（curiosity 略弱） |
| Case 2 Researcher | 5/5 | 4.33/5 | 4.33/5 | No | PASS |
| Case 3 High Trust/Low Curiosity | 5/5 | 5/5 | 4.67/5 | No | PASS（两轴独立验证通过） |

---

## 测试者总结

### 架构达成设计目标

四层架构（Persona / Memory / Relationship / Interaction）在真实 LLM 下验证有效：

1. **Persona 层最强** — 所有 Case 无一越界，即使 trust=90 也拒绝披露过去（Case 3 Q3），证明 Persona > Interaction 优先级正确
2. **trust 轴生效** — Case 1 (trust=5) 冷淡防备 vs Case 3 Q1 (trust=90) 揭示 Sectumsempra，行为差异明显
3. **两轴独立** — Case 3 是关键验证点：Q1 (trust high) 允许深入 vs Q2 (curiosity low) 拒绝展开，证明 trust 和 curiosity 是独立调节轴
4. **milestone 许可生效** — Case 2 Q2 引用了具体 archive 内容（lagopodium roots / bicorn horn），证明 "may reference archives" 许可被 LLM 正确利用

### 唯一需改进点

curiosity low 的 teachingDirective 措辞强度不足（Case 1 Q3）。这是 **minor issue**，不涉及架构调整，只需调整 resolver 映射文本。

### 是否可进入 Phase 15.6

**可以**。架构验证通过，四层分离有效，Persona 安全。建议先执行 Step 5 的 minor resolver 调整（仅改 curiosity low 文本），然后进入 Phase 15.6 新功能开发。
