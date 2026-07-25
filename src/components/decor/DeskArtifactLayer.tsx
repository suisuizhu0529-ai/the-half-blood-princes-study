import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import SnapePresence from "@/components/decor/SnapePresence";
import { useStudyAtmosphere } from "@/hooks/useStudyAtmosphere";
import { loadRelationshipMemory } from "@/store/relationshipMemory";
import type { EntranceStage } from "@/hooks/useEntranceAnimation";
import { stageOpacity } from "@/hooks/useEntranceAnimation";

/**
 * 桌面物件层（Phase 17.1-D 场景版）。
 *
 * 变化：
 *   - SnapePresence 视觉质量不足（方块人感），暂时隐藏
 *   - 后续 Phase 17.2 将用高清素材重新设计 Snape 氛围
 *   - 不删除代码，通过 feature flag 控制
 */

/** Phase 17.1-D：暂时关闭 SnapePresence，后续高清素材替换后开启 */
const SHOW_SNAPE_PRESENCE = false;

export default function DeskArtifactLayer({
  className,
  entered,
  stage,
  shouldAnimate,
}: {
  className?: string;
  entered: boolean;
  stage?: EntranceStage;
  shouldAnimate?: boolean;
}) {
  const { atmosphere } = useStudyAtmosphere();
  void atmosphere;

  const memory = loadRelationshipMemory();
  const trust = memory?.relationship.trust ?? 0;

  const shadowOpacity = stage
    ? stageOpacity(stage, "fireplace", shouldAnimate ?? true)
    : 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: entered ? shadowOpacity : 0 }}
      transition={{ duration: 1.5 }}
      className={cn(className)}
    >
      {SHOW_SNAPE_PRESENCE && <SnapePresence trust={trust} />}
    </motion.div>
  );
}
