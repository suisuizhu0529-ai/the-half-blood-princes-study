/**
 * assetManifest（Phase 18 · 资产注册表）。
 *
 * 定位：Lumos Scene 唯一资产注册入口。
 *   未在此注册的素材不得直接在 Lumos 场景中引用。
 *
 * 注册原则（来自用户硬约束）：
 *   1. 不允许根据文件名猜测素材用途。
 *   2. 所有图片资产必须先通过实际视觉确认，再写入本文件。
 *   3. 未注册素材保持闲置，不强行赋予角色。
 *
 * 视觉确认记录（基于实际查看 + sips 元数据）：
 *   - 书本素材.jpeg：1248×832，魔法书本置于书桌中央，偏 AI 生成插画，
 *     含少量装饰元素 → 适合作为 Spell Book 主图（Layer 2）。
 *   - 环境素材4.jpeg：3000×2000，室内场景，无文字/UI → 适合作为背景氛围
 *     纹理（Layer 0，极低 opacity + blur）。
 *
 * 闲置资产（已确认但不注册）：
 *   - magic book.jpeg：1280×720，打开的书本内页，含文字与 UI 装饰元素，
 *     与 React 文字层会冲突 → 暂不注册。
 *   - gras.jpeg：1920×1080，疑似游戏界面截图，含 UI 与文字 → 不注册。
 *   - 环境素材1/2/3/5/6/7/8.jpeg：尺寸/构图待进一步确认，第一轮保守不注册。
 *   - archive/_tmp_magic 下所有 cell 切片 png（15 个）：307×307~367 网格切片，
 *     尺寸过小且为局部切片，不适合作为独立 Lore Object → 全部闲置，
 *     不强行赋予 Owl/Castle/Quill 等角色。
 *   - archive/professor 下所有 png、archive/snape-character-sheet.png：人物立绘，
 *     Lumos 仪式无人物 → 不注册。
 *   - archive/library 下所有 webp：档案条目图，场景不匹配 → 不注册。
 *
 * 后续扩展：
 *   如需引入 Owl/Quill/Cauldron 等装饰物件，必须：
 *     1. 实际查看候选图片视觉内容
 *     2. 确认无文字/UI、尺寸足够、构图适合
 *     3. 在本文件 LORE_OBJECTS 中注册
 *     4. 注明视觉确认日期与确认人
 */

/** 资产层级（与 SceneLayers 对应） */
export type AssetLayer =
  | "background" // L0 氛围
  | "lore" // L1 装饰物件
  | "hero" // L2 主物件
  | "ritual" // L3 仪式（蜡烛等，无图片）
  | "effect" // L4 粒子/光效
  | "interaction"; // L5 交互（魔杖等，无图片）

/** 资产注册项 */
export interface AssetEntry {
  /** 唯一 id */
  id: string;
  /** 图片路径（相对项目根，以 / 开头供 Vite 引用） */
  src: string;
  /** 所属层级 */
  layer: AssetLayer;
  /** 视觉确认日期（YYYY-MM-DD） */
  confirmedAt: string;
  /** 用途说明 */
  description: string;
  /** 原始尺寸（px） */
  dimensions: { width: number; height: number };
  /** 是否含文字/UI（含则不可用作无文字底图） */
  hasTextOrUI: boolean;
}

/**
 * 已注册资产列表。
 *
 * 第一轮（Phase 18.1）保守注册：
 *   仅注册两张已视觉确认的素材：
 *     1. 书本素材 → Spell Book 主图（Layer 2）
 *     2. 环境素材4 → 背景氛围纹理（Layer 0）
 *
 * 其他素材保持闲置，待后续人工确认后再注册。
 */
export const ASSET_MANIFEST: readonly AssetEntry[] = [
  {
    id: "spell-book-main",
    src: "/images/书本素材.jpeg",
    layer: "hero",
    confirmedAt: "2026-07-26",
    description:
      "Spell Book 主图。魔法书本置于书桌中央，作为 Lumos 仪式核心视觉资产。React 文字层叠加其上。",
    dimensions: { width: 1248, height: 832 },
    hasTextOrUI: true, // 含少量装饰元素，需 React 文字层避开
  },
  {
    id: "background-study-room",
    src: "/images/环境素材4.jpeg",
    layer: "background",
    confirmedAt: "2026-07-26",
    description:
      "背景氛围纹理。室内场景，作为 Layer 0 氛围层，极低 opacity (0.15-0.25) + blur(8px) + gradient 蒙版。不作为主视觉。",
    dimensions: { width: 3000, height: 2000 },
    hasTextOrUI: false,
  },
] as const;

/**
 * 按 id 查询资产。
 */
export function getAsset(id: string): AssetEntry | undefined {
  return ASSET_MANIFEST.find((a) => a.id === id);
}

/**
 * 按层级筛选资产。
 */
export function getAssetsByLayer(layer: AssetLayer): readonly AssetEntry[] {
  return ASSET_MANIFEST.filter((a) => a.layer === layer);
}
