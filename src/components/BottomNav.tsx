"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 6 项等权，中间不做凸起 FAB（强推 AI 会冲突「用户主导书写」主张）
const ITEMS = [
  { href: "/", label: "营地", icon: "camp" },
  { href: "/journal", label: "记录", icon: "book" },
  { href: "/chat/pals", label: "聊聊", icon: "leaf" },
  { href: "/story", label: "故事", icon: "story" },
  { href: "/box", label: "百宝箱", icon: "box" },
  { href: "/me", label: "我的", icon: "circles" },
] as const;

function Icon({ name, active }: { name: string; active: boolean }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const fill = active ? "currentColor" : "none";
  switch (name) {
    case "camp": // 帐篷 + 一点篝火
      return (
        <svg {...common} aria-hidden>
          <path d="M12 4 L20 19 H4 Z" fill={fill} fillOpacity={active ? 0.18 : 0} />
          <path d="M12 4 V19" />
          <path d="M9.5 21.5 h5" />
        </svg>
      );
    case "book": // 翻开的本子
      return (
        <svg {...common} aria-hidden>
          <path d="M12 6.5 C10 5 7 4.7 4 5.2 V18.2 C7 17.7 10 18 12 19.5" fill={fill} fillOpacity={active ? 0.18 : 0} />
          <path d="M12 6.5 C14 5 17 4.7 20 5.2 V18.2 C17 17.7 14 18 12 19.5" fill={fill} fillOpacity={active ? 0.18 : 0} />
        </svg>
      );
    case "leaf": // 叶片形对话气泡
      return (
        <svg {...common} aria-hidden>
          <path d="M20 4 C11 4 4 8.5 4 14.5 C4 17 5 18.8 6.3 20 L4.6 22 H12 C17.5 22 20 16.5 20 11 Z" fill={fill} fillOpacity={active ? 0.18 : 0} />
          <path d="M8 18 C10.5 13.5 14.5 9.5 18.5 7.5" />
        </svg>
      );
    case "story": // 展开的书页 / 半张面具
      return (
        <svg {...common} aria-hidden>
          <path d="M4 6 h6 a2 2 0 0 1 2 2 v11 a2 2 0 0 0 -2 -2 H4 Z" fill={fill} fillOpacity={active ? 0.18 : 0} />
          <path d="M20 6 h-6 a2 2 0 0 0 -2 2 v11 a2 2 0 0 1 2 -2 h6 Z" fill={fill} fillOpacity={active ? 0.18 : 0} />
        </svg>
      );
    case "box": // 百宝箱：宝箱 + 锁扣
      return (
        <svg {...common} aria-hidden>
          <path d="M4 10 L12 6 L20 10 V19 H4 Z" fill={fill} fillOpacity={active ? 0.18 : 0} />
          <path d="M4 10 h16" />
          <path d="M12 10 v4" />
          <circle cx="12" cy="14.5" r="1.2" fill="currentColor" />
        </svg>
      );
    default: // 同心圆（匿名，不用人形）
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.5" fill={fill} fillOpacity={active ? 0.6 : 0} />
        </svg>
      );
  }
}

export default function BottomNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="bottom-nav" style={{ zIndex: "var(--z-nav)" }}>
      {ITEMS.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] no-underline"
            style={{
              minHeight: 44,
              color: active ? "var(--forest-700)" : "var(--text-tertiary)",
              fontWeight: active ? 500 : 400,
              transitionDuration: "var(--dur-fast)",
            }}
          >
            <Icon name={it.icon} active={active} />
            <span style={{ fontSize: "var(--fs-nav)", lineHeight: 1.2 }}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
