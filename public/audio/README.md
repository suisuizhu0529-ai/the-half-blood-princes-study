# Audio Assets

本目录用于存放 Lumos 仪式的音频资产。

## 当前实现（Phase 19.1）

由于无法生成实际音频文件，当前音频层通过 **Web Audio API 合成器** 实现：
- 文件：`src/services/audio/sfxManager.ts`
- 不依赖外部音频文件
- 不引入第三方库
- 短促环境音，音量低，无游戏音效感

## 合成的音效类型

| 名称 | 触发时机 | 合成方式 |
|------|----------|----------|
| `wand_swish` | 魔杖快速挥动（MAGIC_SWEEP） | 白噪声 + bandpass + 快速衰减 |
| `candle_ignite` | 蜡烛点燃（stage 3） | 短促低频共鸣 + 微弱噼啪 |
| `book_open` | 打开 AncientSpellBook | 低频纸张摩擦 + 共鸣 |
| `page_turn` | 翻页（预留） | 短促摩擦噪声 |

## 未来扩展

如果需要真实音频资产替换合成音，建议：
1. 将 `.mp3` 或 `.webp` 音频文件放入本目录
2. 修改 `sfxManager.ts` 中的 `SFX_CONFIG`，将 `synth` 改为 `url` 模式
3. 保持音量低（0.1-0.2）和环境化

## 设计原则

- ❌ 不使用游戏音效（叮咚、爆炸、魔法释放）
- ❌ 不使用 UI 反馈音（按钮点击）
- ✅ 环境化、低音量、电影感
- ✅ Snape 风格：冷峻、克制、不喧宾夺主
