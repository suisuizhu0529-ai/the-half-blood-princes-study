import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Feather } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Study", end: true },
  { to: "/notebook", label: "Notebook", end: false },
  { to: "/library", label: "Archive", end: false },
  { to: "/settings", label: "Settings", end: false },
];

/**
 * 顶部极简导航。
 *
 * Dark Academia 风格：Cinzel 字体、金色细线、hover 下划线从中间展开、
 * active 时金色常驻 + 左侧小点。
 *
 * 仅路由入口，不含任何业务功能。
 * 入场（entered）后由父级条件渲染触发淡入。
 */
export default function NavBar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
      className="fixed inset-x-0 top-0 z-40"
    >
      <div className="bg-gradient-to-b from-stone/85 via-stone/55 to-transparent backdrop-blur-[2px]">
        <nav className="container flex items-center justify-between py-4">
          {/* 品牌标识 */}
          <NavLink to="/" className="group flex items-center gap-3">
            <Feather
              size={16}
              strokeWidth={1.4}
              className="text-gold/80 transition-transform duration-500 group-hover:rotate-[-18deg]"
            />
            <div className="flex flex-col leading-none">
              <span className="font-display text-[12px] tracking-widest2 text-parchment">
                THE HALF-BLOOD PRINCE
              </span>
              <span className="mt-1 font-zh text-[9px] tracking-[0.4em] text-gold/60">
                混 血 王 子 的 书 房
              </span>
            </div>
          </NavLink>

          {/* 路由入口 */}
          <ul className="flex items-center gap-1 sm:gap-2">
            {LINKS.map((link, idx) => (
              <li key={link.to} className="flex items-center">
                {idx > 0 && (
                  <span
                    aria-hidden
                    className="mx-2 hidden h-3 w-px bg-gold/30 sm:inline-block"
                  />
                )}
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={cn(
                    "group relative px-2 py-1.5 font-display text-[12px] tracking-widest2 transition-colors",
                    "text-parchment/55 hover:text-parchment",
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative z-10">{link.label}</span>
                      {/* 下划线：hover 从中间展开 / active 常驻 */}
                      <span
                        className={cn(
                          "absolute inset-x-1 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold to-transparent transition-transform duration-500",
                          isActive
                            ? "scale-x-100"
                            : "scale-x-0 group-hover:scale-x-100",
                        )}
                        style={{ transformOrigin: "center" }}
                      />
                      {/* active 时左侧金色小点 */}
                      {isActive && (
                        <span className="absolute -left-0.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_8px_rgba(201,162,39,0.7)]" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="gold-rule" />
      </div>
    </motion.header>
  );
}
