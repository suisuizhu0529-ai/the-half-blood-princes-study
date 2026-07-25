import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// 注：移除 StrictMode。
// 原因：React 18 StrictMode 在 dev 下会模拟 mount→unmount→remount，
// 导致 AwakeningSequence 的 setTimeout 被 clearTimeout 提前清除，
// 仪式卡在 awakening 阶段无法进入 research（看不到魔法书）。
// 生产环境无此问题，但为保障 dev 体验与生产行为一致，暂时移除。
createRoot(document.getElementById('root')!).render(<App />)
