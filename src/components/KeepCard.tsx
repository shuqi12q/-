"use client";

import { useEffect, useState } from "react";
import type { Keep } from "@/lib/types";

// 「在意」卡 —— 桌游套件 Board Game Kit v1.0
//
// 设计约束（boardgame-design-spec-2026-08-03 §3 / P3）：
// · 翻面用真实 3D rotateY（例外 E-3），由点击触发，绝不 hover 触发
// · reduced-motion 下退化为 opacity 交叉淡入（globals.css 已登记）
// · 卡面 5:7；顶部 4px 类型腰封；正/背面均不可承载正文以外的装饰噪音
// · 选中态用外环 + 卡缘加深表达，不靠颜色或放大

const W: Record<"sm" | "md" | "lg", number> = { sm: 96, md: 132, lg: 232 };

// 四类在意卡 → 腰封色（全部复用已验证 token，三重编码里的「色」）
const GROUP_BAR: Record<string, string> = {
  人: "var(--mist-600)",
  事: "var(--forest-700)",
  感觉: "var(--wood-700)",
  习惯: "var(--wood-500)",
};

function LeafBack({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ opacity: 0.9 }}>
      <path
        d="M24 10 C 33 15, 37 24, 24 38 C 11 24, 15 15, 24 10 Z"
        fill="none"
        stroke="var(--card-back-ink)"
        strokeWidth={1.4}
      />
      <path d="M24 14 V34" stroke="var(--card-back-ink)" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

export default function KeepCard({
  keep,
  size = "md",
  flipped = false,
  mode = "static",
  selected = false,
  onClick,
  ariaLabel,
}: {
  keep: Keep;
  size?: "sm" | "md" | "lg";
  flipped?: boolean;
  /** select=点选（pick / 放下时选一张）；flip=点击翻面；static=纯展示 */
  mode?: "select" | "flip" | "static";
  selected?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const w = W[size];
  const h = Math.round(w * 1.4);
  const [localFlip, setLocalFlip] = useState(flipped);

  useEffect(() => setLocalFlip(flipped), [flipped]);

  const isFlipped = mode === "select" ? flipped : mode === "flip" ? localFlip : flipped;
  const bar = keep.group ? GROUP_BAR[keep.group] ?? "var(--text-tertiary)" : "var(--text-tertiary)";

  const handleClick = () => {
    if (mode === "select") onClick?.();
    else if (mode === "flip") setLocalFlip((v) => !v);
  };

  const inner = (
    <div className="keepcard-inner">
      {/* 正面 */}
      <div
        className="keepcard-face keepcard-front"
        style={{
          background: "var(--card-face)",
          border: "1px solid var(--card-edge)",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: "var(--card-bar)", background: bar, flexShrink: 0 }} />
        <div style={{ padding: "var(--card-pad)", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: "var(--fs-overline)",
              letterSpacing: "var(--ls-overline)",
              fontWeight: 500,
              color: bar,
            }}
          >
            {keep.group ?? "空白卡"}
          </div>
          <p
            className="content-serif"
            style={{
              fontSize: size === "sm" ? 13 : size === "lg" ? 17 : 15,
              lineHeight: 1.7,
              color: "var(--text-primary)",
              margin: "var(--sp-2) 0 0",
              flex: 1,
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {keep.text}
          </p>
        </div>
      </div>

      {/* 背面：实木深绿 + 叶脉，无文字 */}
      <div
        className="keepcard-face keepcard-back"
        style={{
          background: "linear-gradient(160deg, var(--card-back-a), var(--card-back-b))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LeafBack size={Math.round(w * 0.42)} />
      </div>
    </div>
  );

  const cls = `keepcard ${selected ? "selected" : ""} ${isFlipped ? "flipped" : ""}`;

  if (mode === "static") {
    return (
      <div className={cls} style={{ width: w, height: h }} aria-label={ariaLabel ?? keep.text}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={handleClick}
      aria-pressed={mode === "select" ? selected : isFlipped}
      aria-label={ariaLabel ?? keep.text}
      style={{ width: w, height: h, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
    >
      {inner}
    </button>
  );
}
