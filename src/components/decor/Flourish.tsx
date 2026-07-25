import { cn } from "@/lib/utils";

interface FlourishProps {
  className?: string;
  /** 是否居中对称样式 */
  variant?: "center" | "left";
}

/**
 * 金色装饰线条 / 卷曲花纹。
 * 用于标题分隔、卡片角落装饰。
 */
export default function Flourish({ className, variant = "center" }: FlourishProps) {
  if (variant === "left") {
    return (
      <svg
        viewBox="0 0 200 12"
        className={cn("block", className)}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <line x1="0" y1="6" x2="160" y2="6" stroke="#C9A227" strokeWidth="0.6" opacity="0.7" />
        <path
          d="M 160 6 Q 172 0 180 6 Q 184 9 188 6 Q 192 3 196 6"
          stroke="#C9A227"
          strokeWidth="0.8"
          fill="none"
          opacity="0.9"
        />
        <circle cx="198" cy="6" r="1.2" fill="#C9A227" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 240 14"
      className={cn("block", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1="20" y1="7" x2="100" y2="7" stroke="#C9A227" strokeWidth="0.6" opacity="0.7" />
      <path
        d="M 100 7 Q 108 1 116 7 Q 120 10 124 7 Q 128 4 132 7"
        stroke="#C9A227"
        strokeWidth="0.8"
        fill="none"
      />
      <circle cx="120" cy="7" r="1.6" fill="#C9A227" />
      <path
        d="M 140 7 Q 148 1 156 7 Q 160 10 164 7 Q 168 4 172 7"
        stroke="#C9A227"
        strokeWidth="0.8"
        fill="none"
      />
      <line x1="172" y1="7" x2="220" y2="7" stroke="#C9A227" strokeWidth="0.6" opacity="0.7" />
    </svg>
  );
}
