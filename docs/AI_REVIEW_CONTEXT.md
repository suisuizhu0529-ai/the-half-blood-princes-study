# AI Review Context

> 本文档供后续 AI（Claude / GPT 等）审查使用，提供项目背景、架构、已知问题与审查方向。

## 1. 项目背景

**The Half-Blood Prince's Study** 是一个以 Harry Potter 中 Severus Snape 私人研究室为灵感的 Dark Academia 沉浸式魔法学习体验。

这不是一个普通网页，目标是接近：
- **interactive fiction**（互动小说）
- **game intro scene**（游戏开场镜头）
- **immersive digital experience**（沉浸式数字体验）

核心体验是：**"用户拿着 Snape 的魔杖，在书房里施法"**。

## 2. 产品目标

### 2.1 体验目标
- 让用户感觉自己在 Snape 的私人研究室中
- 通过魔杖手势触发魔法仪式
- 通过蜡烛点燃 / 魔法书出现 / 课程浮现等镜头语言建立沉浸感
- 每日学习一个英语词汇，通过魔法叙事包装

### 2.2 反目标（不希望成为的样子）
- ❌ 普通网页动画展示
- ❌ AI 生成图片堆叠
- ❌ 游戏化技能特效（粒子爆炸、彩色光效）
- ❌ 鼠标箭头替换为魔杖图片（cursor skin）

## 3. 当前用户体验流程

```
[StudyRoom 首页]
  ↓ 用户挥动魔杖（MAGIC_SWEEP 手势）
[Lumos 仪式启动]
  ↓ 4 秒 AwakeningSequence
    - 黑屏 → 月光 → 魔杖挥光弧
    - 三根蜡烛按中央→左→右顺序点燃
      （5 阶段：粒子汇聚 → 符文 → 火焰 → 光照扩散 → idle flicker）
    - 书本光晕浮现
  ↓ 进入 research 阶段
[AncientSpellBook 出现]
  ↓ 书本基于真实图片素材 + React overlay 层
    （标题 LIBER POTIONUM / 魔法符文 / chapter / hover 提示）
  ↓ 用户点击书本
[BookTransition 电影级转场]（规划中，尚未实现）
  ↓ 镜头推近 → 封面充满 → 翻页闪光 → 课程浮现
[StudyRoom 显示 Today's Lesson]
  ↓ LessonCard 显示当日词汇
  ↓ 用户可继续对话 / 查看 Memory / 进入 Library 等
```

## 4. 当前架构说明

### 4.1 Lumos 仪式状态机（`src/features/lumos/hooks/useLumosRitual.ts`）

```typescript
type LumosPhase =
  | "idle"        // 首页魔法阵等待
  | "awakening"   // 环境苏醒（4s 蜡烛点燃）
  | "research"    // 魔法书出现，等待点击
  | "verification"// （预留）
  | "closure"     // （预留）
  | "closed";     // 返回 StudyRoom，显示 Lesson
```

状态机不可修改，所有视觉升级在 hook 之外完成。

### 4.2 Magic Interaction Layer（`src/features/magic/`）

```
InputProvider（鼠标 / 未来摄像头）
  ↓
MagicController（position / velocity / gesturePath / handPose）
  ↓
GestureDetector（MAGIC_SWEEP / MAGIC_CIRCLE / DEATHLY_HALLOWS_GESTURE）
  ↓
MagicEvents（事件总线，emit / on）
  ↓
Scene（消费事件，执行场景逻辑）
```

关键约束：
- `MagicController` 不保存旋转角度（由 `WandRenderer` 独立决定握持角度）
- `MagicContext` 管理场景状态（study / lumos / spellbook），控制事件响应范围
- `WandPointer` 将魔杖尖端作为真实交互点（非鼠标位置），通过 `findInteractiveTipTarget` 检测 ±18px 范围

### 4.3 Scene 系统架构（`src/features/lumos/scene/`）

```
SceneObject（基类，位置/缩放/hover/click）
  ↓
MagicObject（注入 assetManifest 素材 + 浮动 + glow）
  ↓
AncientSpellBook（overlay 层：标题/符文/chapter/hint + 打开动画）
```

- `assetManifest.ts` 是唯一资产注册入口，未注册素材不得直接引用
- 图片只负责材质真实感，文字/符文/交互由 React overlay 层渲染
- `SceneObject` 支持 `fill` 模式（场景纹理层）和定位模式（独立物件）

### 4.4 蜡烛仪式（`src/features/lumos/ritual/CandleRitual.tsx`）

5 阶段魔法唤醒，由父组件通过 `stage` prop 控制（不内自治）：

| Stage | 视觉 |
|-------|------|
| 0 idle | 微弱轮廓 |
| 1 gathering | 金色火星向烛芯汇聚 |
| 2 rune | 烛台底部符文环淡入 |
| 3 ignition | 火焰点燃 + glow |
| 4 illumination | 桌面光池扩散 |
| 5 completed | 稳定 idle flicker |

点燃顺序：中央(0.8s) → 左(1.4s) → 右(2.0s)，总时长 4s。

### 4.5 LLM / 对话系统（`src/services/`）

- `conversationEngine.ts` — 对话编排
- `llm/client.ts` — LLM 客户端工厂（支持 openai-compatible / anthropic 协议）
- `promptBuilder.ts` — 构建 Persona + Memory + Context + User message
- `responseSimulator.ts` — 离线模式回退（LLM 不可用时）
- 所有 LLM 配置通过 `.env.local` 运行时注入，不硬编码

## 5. 当前已实现功能

### 5.1 核心流程
- ✅ StudyRoom 首页（DailyQuote / LessonCard / ActionButtons）
- ✅ Lumos 仪式完整流程（挥动魔杖 → 蜡烛点燃 → 书本出现 → 点击进入 Lesson）
- ✅ 魔法阵入口（死亡圣器符号，不旋转）
- ✅ 每日词汇学习（getDailyLesson）

### 5.2 Magic Interaction Layer
- ✅ 魔杖跟随鼠标（lerp 平滑，smoothing 0.15）
- ✅ 三节式黑檀木魔杖 SVG（固定 -35° 握持角度）
- ✅ 手势识别（MAGIC_SWEEP / MAGIC_CIRCLE / DEATHLY_HALLOWS_GESTURE）
- ✅ 杖尖交互（WandPointer，±18px 检测范围）
- ✅ 金色墨迹魔杖轨迹（MagicTrail，0.8s 淡出）

### 5.3 场景系统
- ✅ SceneObject / MagicObject / ParticleField 基础设施
- ✅ assetManifest 资产注册表（spell-book-main / background-study-room）
- ✅ CandleRitual 5 阶段蜡烛仪式
- ✅ AncientSpellBook 图片 + React overlay 架构

### 5.4 对话 / 人格
- ✅ Snape 人格定义（persona / voice / reactions）
- ✅ LLM 客户端（OpenAI 兼容 / Anthropic）
- ✅ ResponseSimulator 离线回退
- ✅ Memory 系统（relationshipMemory / sessionMemory / sharedHistory）
- ✅ Azure Neural TTS 集成（英式教授朗读）

### 5.5 其他页面
- ✅ Library（档案室，分类浏览）
- ✅ Notebook（记忆之书）
- ✅ PersonaTest（人格测试）
- ✅ Settings（LLM / 语音配置）

## 6. 已知问题

### 6.1 视觉品质（Phase 18 进行中）
- ⚠️ AncientSpellBook 图片裁剪/overlay 融合仍需调整（Step 4.1 进行中）
- ⚠️ BookTransition 电影级转场尚未实现（Step 5 规划中）
- ⚠️ 部分占位组件未实现：`OpenPages.tsx` / `PageTurn.tsx` / `BookCover.tsx` / `ResearchPage.tsx` / `ResearchIllustration.tsx` / `SpellVerification.tsx`

### 6.2 素材管理
- ⚠️ `public/images/archive/_tmp_magic/cell_*.png`（15 个网格切片）尺寸过小，未注册使用
- ⚠️ `环境素材1-8.jpeg` 中仅 1 张已注册，其余构图待确认
- ⚠️ 部分素材含文字/UI（`magic book.jpeg` / `gras.jpeg`），与 React 文字层冲突，未注册

### 6.3 性能
- ⚠️ ParticleField Canvas 粒子在低端设备可能掉帧（当前限制 30 颗，dpr 上限 2）
- ⚠️ 多个 motion.svg 同时动画可能影响性能

### 6.4 交互
- ⚠️ 移动端魔杖交互尚未适配（当前仅桌面 cursor-none）
- ⚠️ 摄像头手势输入预留接口（InputProvider → MagicController），但未实现

## 7. 希望 AI 审查方向

### 7.1 架构审查
- **Magic Interaction Layer** 的分层是否清晰？InputProvider → MagicController → GestureDetector → MagicEvents → Scene 的数据流是否合理？
- **Scene 系统**（SceneObject / MagicObject / assetManifest）是否具备良好的可扩展性？能否支持后续 Potion Lab / Library / Forbidden Forest 等场景？
- **Lumos 状态机** 与视觉组件的边界是否清晰？是否存在状态泄漏？

### 7.2 UI/UX 审查
- **Dark Academia 氛围** 是否足够？距离"interactive fiction / game intro scene"的目标还有多远？
- **蜡烛仪式** 的 5 阶段动画时序是否合理？是否有"Flash 小动画"感？
- **AncientSpellBook** 的图片 + React overlay 融合是否自然？标题/符文是否像 UI 卡片而非真实刻印？
- **魔杖交互** 是否有"虚拟手持物"的感觉？还是仍像鼠标皮肤？

### 7.3 代码质量
- **TypeScript 类型** 是否完整？是否有 `any` 滥用？
- **组件职责** 是否单一？是否存在过大的组件（如 AwakeningSequence 200+ 行）？
- **错误处理** 是否充分？LLM / Audio / Canvas 失败时是否有优雅降级？

### 7.4 后续规划建议
- **BookTransition** 电影级转场应该如何实现？4 阶段（镜头推近 → 封面充满 → 翻页闪光 → 课程浮现）的时序设计？
- **场景资产系统** 如何支持后续多个场景？是否需要引入 SceneLoader / SceneManager？
- **摄像头手势** 接入 MediaPipe Hand Tracking 的可行性？如何与现有 MagicController 对接？

## 8. 重要约束（不可违反）

以下约束来自项目演进过程中的硬性约定，AI 审查时请尊重：

1. **不修改业务逻辑**：`useLumosRitual` 状态机、Lesson 数据逻辑、Memory 系统不可修改
2. **不修改 Magic 架构**：MagicController / GestureDetector / MagicEvents / WandPointer 不可修改
3. **不新增依赖**：当前依赖栈已足够，不引入 Lottie / Rive / GSAP 等
4. **不硬编码密钥**：所有 LLM / Azure 配置通过 `.env.local` 运行时注入
5. **不直接引用未注册素材**：所有图片必须通过 `assetManifest.ts` 注册
6. **Snape 风格**：冷峻、克制、电影感，避免游戏化技能特效
7. **魔杖视觉**：黑色三节式黑檀木，固定 -35° 握持角度，不旋转跟随鼠标方向
8. **场景隔离**：Lumos 与 StudyRoom 完全视觉隔离，不可同时可见

---

**文档版本**: Phase 18 (2026-07-26)
**项目状态**: 视觉品质升级进行中（Step 4.1 完成，Step 5 规划中）
