"use client";

import Link from "next/link";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Card, t } from "@/components/ui";

// 7 个小工具（本地、轻量、自我探索）
const TOOLS = [
  { href: "/box/dream", name: "梦的解析", desc: "周公 / 心理学双模式，AI 解读梦境元素", icon: "dream" },
  { href: "/box/dream/records", name: "梦境卡片", desc: "回看你记录的所有梦境 + DNA 报告", icon: "dream-card" },
  { href: "/box/reframe", name: "转念器", desc: "把烦心事换个角度重新看", icon: "reframe" },
  { href: "/box/coin", name: "决策币", desc: "抛一枚硬币，看清心里的倾向", icon: "coin" },
  { href: "/box/book", name: "答案之书", desc: "默念问题，翻开一页答案", icon: "book" },
  { href: "/box/clear", name: "烦恼消消", desc: "把烦恼写出来，一个个消掉", icon: "clear" },
  { href: "/box/mind", name: "正念放映室", desc: "8 场练习 + 实时背景 + 白噪音 + 呼吸引导", icon: "mind" },
  { href: "/box/muyu", name: "敲木鱼", desc: "笃笃笃，功德+1，给心留个安静的角落", icon: "muyu" },
  { href: "/box/firstaid", name: "情绪急救", desc: "现在很难受？先按步骤接住自己", icon: "firstaid" },
] as const;

function ToolIcon({ name }: { name: string }) {
  const c = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "dream": // 月亮 + 星
      return (<svg {...c} aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /><path d="M15 4v2M16 8h2" /></svg>);
    case "dream-card": // 卡片堆
      return (<svg {...c} aria-hidden><rect x="3" y="6" width="14" height="11" rx="2" /><path d="M7 6V4h12v11" opacity=".5" /></svg>);
    case "reframe": // 环形箭头
      return (<svg {...c} aria-hidden><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v4h-4" /></svg>);
    case "coin": // 硬币
      return (<svg {...c} aria-hidden><circle cx="12" cy="12" r="8" /><path d="M12 7.5v9M9.5 9.5h4a1.6 1.6 0 0 1 0 3.2h-2.6a1.6 1.6 0 0 0 0 3.2h4.6" /></svg>);
    case "book": // 翻开的书
      return (<svg {...c} aria-hidden><path d="M12 6.5C10 5 7 4.7 4 5.2V18.2c3-.5 6-.2 8 1.3M12 6.5c2-1.5 5-1.8 8-1.3V18.2c-3-.5-6-.2-8 1.3" /></svg>);
    case "clear": // 泡泡
      return (<svg {...c} aria-hidden><circle cx="9" cy="10" r="5.5" /><circle cx="17" cy="15" r="3.5" opacity=".6" /><path d="M5 21l14-8" opacity=".4" /></svg>);
    case "mind": // 莲花 + 呼吸圈
      return (
        <svg {...c} aria-hidden>
          <path d="M12 4c2.4 3 4 6 4 9a4 4 0 1 1-8 0c0-3 1.6-6 4-9Z" />
          <path d="M12 11v8M9 16h6" opacity=".5" />
        </svg>
      );
    case "muyu": // 木鱼 + 敲击棒
      return (
        <svg {...c} aria-hidden>
          <path d="M5 10a7 7 0 0 1 14 0v2H5z" />
          <path d="M5 10h14" opacity=".5" />
          <rect x="11" y="3.5" width="2.6" height="6" rx="1.3" transform="rotate(24 12 6.5)" />
          <circle cx="17" cy="4" r="1.8" />
        </svg>
      );
    default: // 十字急救
      return (<svg {...c} aria-hidden><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8.5v7M8.5 12h7" /></svg>);
  }
}

export default function BoxHome() {
  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>百宝箱</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        都是一些小小的自我探索工具——不诊断、不决定，只陪你把此刻的念头安放好。
      </p>

      <div className="flex flex-col" style={{ gap: "var(--sp-4)" }}>
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="no-underline">
            <Card
              className="flex items-center"
              style={{
                gap: "var(--sp-4)",
                padding: "var(--sp-4)",
                cursor: "pointer",
                transition: "border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease",
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "var(--forest-100)", color: "var(--forest-700)" }}
              >
                <ToolIcon name={tool.icon} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...t.h3, color: "var(--forest-900)" }}>{tool.name}</div>
                <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: 2 }}>{tool.desc}</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-8)" }}>
        百宝箱的工具是给日常情绪用的；如果心里真的很难受，先去「我的 → 心理援助」看看热线。
      </p>
      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}