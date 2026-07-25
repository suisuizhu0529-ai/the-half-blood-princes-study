import { useOutletContext } from "react-router-dom";

type LayoutContext = { entered: boolean };

/** 子页面读取入场状态，用于触发翻开动画 */
export function useEntered(): LayoutContext {
  return useOutletContext<LayoutContext>();
}
