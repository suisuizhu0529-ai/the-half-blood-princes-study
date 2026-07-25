# The Half-Blood Prince's Study

> Dark Academia immersive magic study experience — an interactive digital experience inspired by Snape's private study, not a typical web app.

## Project Overview

**项目名称**: The Half-Blood Prince's Study

**项目定位**: Dark Academia immersive magic study experience. 目标是接近 interactive fiction / game intro scene / immersive digital experience，而非普通网页。

**技术栈**:
- React 18
- TypeScript 5.8
- Vite 6
- Framer Motion 11（动画）
- Canvas API（粒子系统）
- Tailwind CSS 3
- Zustand 5（状态管理）
- react-router-dom 7

## Quick Start

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run check

# 代码规范检查
npm run lint

# 构建
npm run build
```

环境变量参考 `.env.example`。所有 LLM / Azure Speech 配置均为可选——留空时自动回退到本地模拟器（ResponseSimulator / 浏览器 SpeechSynthesis）。

## 当前主要模块

### 1. Lumos Entrance
魔法仪式入口。用户在 StudyRoom 首页通过挥动魔杖触发 MAGIC_SWEEP 手势，进入 Lumos 仪式。

### 2. Awakening Ritual
环境苏醒序列（4 秒）。包含魔杖挥光弧、月光增强、三根蜡烛按中央→左→右顺序点燃（5 阶段：粒子汇聚 → 符文 → 火焰 → 光照扩散 → idle flicker）。

### 3. Spell Book (AncientSpellBook)
古老魔法书。基于真实图片素材 + React overlay 层（标题/符文/chapter/hint）。点击书本触发电影级转场进入 Today's Lesson。

### 4. Study Room
首页/主场景。包含 DailyQuote、LessonCard、ActionButtons 等学习交互元素。

### 5. Magic Interaction Layer
全局魔法交互层。将魔杖作为"虚拟手持物"而非鼠标皮肤：
- `InputProvider` → `MagicController` → `GestureDetector` → `MagicEvents` → Scene
- 支持三种手势：MAGIC_SWEEP（快速挥动）、MAGIC_CIRCLE（圆形轨迹）、DEATHLY_HALLOWS_GESTURE（三角轨迹）
- 魔杖尖端（WandPointer）作为真实交互点，而非鼠标位置
- 黑色三节式黑檀木魔杖，固定 -35° 握持角度

## 项目结构

```
src/
├── components/          # 通用组件（decor / layout / library / notebook / settings / study）
├── config/              # LLM 等运行时配置
├── core/snape/          # Snape 人格定义（persona / reactions / voice）
├── data/                # 静态数据（library / memory / persona / words / quotes）
├── features/
│   ├── lumos/           # Lumos 仪式
│   │   ├── hooks/       # useLumosRitual 状态机
│   │   ├── research/    # ResearchNotebook 课程内容
│   │   ├── ritual/      # AwakeningSequence / CandleRitual
│   │   ├── scene/       # SceneObject / MagicObject / ParticleField / assetManifest
│   │   └── spellbook/   # AncientSpellBook
│   ├── magic/           # Magic Interaction Layer（魔杖 / 手势 / 事件）
│   └── snape/           # SnapeWhisper 旁白
├── hooks/               # 通用 hooks（audio / parallax / settings / speech 等）
├── lib/utils.ts         # 通用工具
├── pages/               # 路由页面（StudyRoom / Library / Notebook / PersonaTest / Settings）
├── services/            # 业务服务（audio / conversation / llm）
├── store/               # Zustand 状态（llmConfig / relationshipMemory）
├── types/               # TypeScript 类型定义
└── utils/               # 业务工具（memory / context / prompt / storage 等）

public/
├── images/              # 场景素材（环境 / 书本 / archive）
└── audio/               # 背景音频
```

## 核心设计原则

1. **图片是场景资产，不是 UI**。图片只负责材质真实感，文字/交互/动画由 React 层负责。
2. **MagicObject 架构**。所有场景物件通过 `assetManifest.ts` 注册，未注册素材不得直接引用。
3. **场景状态隔离**。Lumos 场景与 StudyRoom 完全视觉隔离，不可同时可见。
4. **魔法事件总线**。Magic Layer 通过 `magicEvents.emit/on` 与 Scene 通信，不直接调用业务逻辑。
5. **状态机驱动**。Lumos 流程由 `useLumosRitual` 状态机管理：`idle → awakening → research → closed`。
6. **无硬编码密钥**。所有 LLM / Azure 配置通过 `.env.local` 运行时注入，不写入代码。

## 文档

- [AI 审查上下文](docs/AI_REVIEW_CONTEXT.md) — 给 AI 审查使用的项目背景、架构、已知问题
- [Phase 14 Snape Persona Audit](AGENTS.md) — Snape 人格一致性审计任务说明

## License

Private project. All rights reserved.
