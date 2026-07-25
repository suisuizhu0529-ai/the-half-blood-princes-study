import { useState } from "react";
import { Outlet } from "react-router-dom";
import AmbientLayer from "./AmbientLayer";
import NavBar from "./NavBar";
import Entrance from "../Entrance";
import MagicInteractionLayer from "@/features/magic/MagicInteractionLayer";
import { useStudyAtmosphere } from "@/hooks/useStudyAtmosphere";
import { useSettings } from "@/hooks/useSettings";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";

type LayoutContext = { entered: boolean };

/**
 * 全局布局：氛围背景层（始终在底）+ 顶部品牌条（入场后）+ 页面内容 + 入场覆盖层。
 *
 * Phase 17.1-D：全局氛围音乐挂载在此，贯穿所有页面。
 *   - 用户首次交互（点击 Entrance）后 AudioContext 自动 resume
 *   - musicEnabled/musicVolume 由 useSettings 控制
 *
 * Phase 17.1-G：全局魔法交互层，从鼠标皮肤升级为 Magic Interaction Layer。
 *   - 入场后（entered=true）才显示，桌面端 md+ 启用
 *   - 隐藏系统原生 cursor，整页用魔杖
 *   - 提供魔法事件总线（LUMOS_CAST, MAGIC_DISMISS）供场景组件订阅
 */
export default function AppLayout() {
  const [entered, setEntered] = useState(false);
  const { atmosphere } = useStudyAtmosphere();
  const { settings } = useSettings();

  // 全局氛围音乐
  useAmbientAudio({
    enabled: settings.musicEnabled,
    volume: settings.musicVolume,
  });

  return (
    <div
      className={`relative min-h-screen ${entered ? "md:cursor-none" : ""}`}
    >
      <AmbientLayer atmosphere={atmosphere} />

      {entered && <NavBar />}

      <main className="relative z-10">
        <Outlet context={{ entered } satisfies LayoutContext} />
      </main>

      {!entered && <Entrance onEntered={() => setEntered(true)} />}

      {/* 全局魔法交互层（入场后启用，桌面端） */}
      {entered && <MagicInteractionLayer />}
    </div>
  );
}
