import React from "react";

// 排版 token（全部取自 design-tokens.css，禁止在页面里硬编码字号）
export const t = {
  h1: { fontSize: "var(--fs-h1)", lineHeight: "var(--lh-h1)", fontWeight: 600 },
  h2: { fontSize: "var(--fs-h2)", lineHeight: "var(--lh-h2)", fontWeight: 600 },
  h3: { fontSize: "var(--fs-h3)", lineHeight: "var(--lh-h3)", fontWeight: 600 },
  bodyLg: { fontSize: "var(--fs-body-lg)", lineHeight: "var(--lh-body-lg)" },
  body: { fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)" },
  caption: { fontSize: "var(--fs-caption)", lineHeight: "var(--lh-caption)" },
  overline: {
    fontSize: "var(--fs-overline)",
    letterSpacing: "var(--ls-overline)",
    fontWeight: 500,
  },
} satisfies Record<string, React.CSSProperties>;

export function Card({
  children,
  className = "",
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-bg-elevated rounded-lg shadow-sm ${className}`}
      style={{
        padding: "var(--gap-card-inner)",
        border: "1px solid var(--hairline)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// 引用型卡片（ExplainCard 基座）：左侧 3px 竖条 + 浅染底
export function CitedCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-bg-tint rounded-lg ${className}`}
      style={{
        padding: "var(--gap-card-inner)",
        borderLeft: "3px solid var(--forest-500)",
      }}
    >
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "care" | "quiet";

const BTN_STYLE: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: "var(--forest-700)", color: "var(--text-inverse)", boxShadow: "var(--shadow-sm)" },
  secondary: { background: "transparent", color: "var(--forest-700)", border: "1px solid var(--forest-300)" },
  ghost: { background: "transparent", color: "var(--forest-700)" },
  // care 文字色必须走 --care-on：深色下 --care-700 变浅肤色，需要深色字才够对比度
  care: { background: "var(--care-700)", color: "var(--care-on)", boxShadow: "var(--shadow-sm)" },
  quiet: { background: "var(--bg-tint)", color: "var(--text-secondary)" },
};

export function Btn({
  children,
  variant = "primary",
  size = "md",
  full,
  disabled,
  onClick,
  type = "button",
  className = "",
  style,
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  style?: React.CSSProperties;
}) {
  const h = size === "sm" ? 36 : size === "lg" ? 52 : 44;
  const px = size === "sm" ? 16 : size === "lg" ? 28 : 20;
  const fs = size === "sm" ? 14 : size === "lg" ? 16 : 15;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full inline-flex items-center justify-center transition-colors ${full ? "w-full" : ""} ${className}`}
      style={{
        height: h,
        padding: `0 ${px}px`,
        fontSize: fs,
        fontWeight: 500,
        letterSpacing: "var(--ls-cjk)",
        transitionDuration: "var(--dur-fast)",
        ...(disabled
          ? { background: "var(--bg-sunken)", color: "var(--text-disabled)", cursor: "default" }
          : BTN_STYLE[variant]),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Overline({ children, care }: { children: React.ReactNode; care?: boolean }) {
  return (
    <div style={{ ...t.overline, color: care ? "var(--care-700)" : "var(--forest-700)" }}>
      {children}
    </div>
  );
}

// 页脚常驻专业帮助入口
export function HelpFooter() {
  return (
    <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
      <a
        href="/me/help"
        className="underline"
        style={{ ...t.caption, color: "var(--text-tertiary)", textUnderlineOffset: 3 }}
      >
        需要专业帮助？
      </a>
    </div>
  );
}

// 5 态情绪曲线（纯 SVG，不用 emoji）；index 0 很糟 → 4 很好
const MOOD_PATHS = [
  "M6 20 Q 16 10 26 20", // 很糟（下垂）
  "M6 18 Q 16 13 26 18",
  "M6 16 H 26",
  "M6 14 Q 16 19 26 14",
  "M6 12 Q 16 22 26 12", // 很好（上扬）
];

export const MOOD_LABEL = ["很糟", "不太好", "一般", "还行", "很好"];
export const MOOD_VAR = ["--v-neg2", "--v-neg1", "--v-zero", "--v-pos1", "--v-pos2"];

export function MoodGlyph({ level, size = 32 }: { level: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path
        d={MOOD_PATHS[level]}
        fill="none"
        stroke="var(--forest-700)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
