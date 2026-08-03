"use client";

import { useEffect, useRef, useState } from "react";
import { CRISIS_HOTLINES, EMERGENCY, FOR_OTHERS, spell } from "@/lib/crisis";
import { Btn, t } from "./ui";

// L3 全屏干预层 —— 允许使用危机色的 3 处之一
// 伦理红线（复核报告 P0-1 / P0-3 / P0-5 / P1-1 / P1-2）：
// · 600ms 统一防抖：关闭按钮 / Esc / 所有按钮同一个 armed 状态，语义是「界面还在落定」，
//   不是「你被禁止操作」。绝不做「退出延迟、求助立即可用」的不对称摩擦。
// · 面板 = 可滚动内容区 + 固定底部操作区，保证任何屏幕下至少一个出口永远可见。
// · 全页面禁止 emoji，图标一律自绘 SVG。
const ARM_DELAY = 600;

export default function CrisisLayer({
  onClose,
  onContinue,
  variant = "chat",
}: {
  onClose: () => void;
  onContinue?: () => void;
  variant?: "chat" | "journal";
}) {
  const [armed, setArmed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), ARM_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // 焦点：挂载时记住来源元素并把焦点收进面板，卸载时归还
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, []);

  // Esc 与关闭按钮同权、同样 600ms 后生效；Tab 焦点陷阱锁在面板内
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (armed) {
          e.preventDefault();
          onClose();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>("a[href],button:not([disabled])")
      );
      if (!items.length) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [armed, onClose]);

  // 600ms 内：统一半透明 + 不可交互；600ms 后统一淡入
  const gate: React.CSSProperties = {
    opacity: armed ? 1 : 0.4,
    pointerEvents: armed ? "auto" : "none",
    transition: "opacity var(--dur-base)",
  };
  const holdLink = (e: React.MouseEvent) => {
    if (!armed) e.preventDefault();
  };

  const lede =
    variant === "journal"
      ? "你刚才写下的那些，我看到了。这样的感受一定很沉重，谢谢你愿意把它写下来。"
      : "我听到了你刚才说的话，我很在意。这样的感受一定很沉重，谢谢你愿意说出来。";
  const continueLabel = variant === "journal" ? "我想回去看看" : "我想继续聊聊";

  const [primary, secondary] = CRISIS_HOTLINES;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center fade-up"
      style={{
        zIndex: "var(--z-crisis)",
        background: "var(--bg-scrim)",
        backdropFilter: "blur(12px) saturate(0.8)",
        padding: "var(--gap-page-x)",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crisis-lede"
        tabIndex={-1}
        className="w-full flex flex-col"
        style={{
          maxWidth: 448,
          maxHeight: "88vh",
          background: "var(--care-100)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-ambient)",
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* 可滚动内容区 */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "var(--gap-card-inner)" }}>
          <div className="flex justify-end">
            <button
              onClick={armed ? onClose : undefined}
              aria-label="关闭"
              style={{
                width: 44,
                height: 44,
                color: "var(--care-700)",
                cursor: armed ? "pointer" : "default",
                ...gate,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="mx-auto" aria-hidden>
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            </button>
          </div>

          {/* 托举意象：下方一道弧线承托上方一个圆，无面孔 */}
          <div className="flex justify-center" style={{ marginBottom: "var(--sp-5)" }}>
            <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
              <circle cx="36" cy="36" r="34" fill="var(--bg-elevated)" opacity="0.6" />
              <circle cx="36" cy="30" r="9" fill="none" stroke="var(--care-700)" strokeWidth="2" />
              <path d="M18 44 Q 36 58 54 44" fill="none" stroke="var(--care-700)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ ...t.bodyLg, color: "var(--care-700)", lineHeight: 1.9 }}>
            <p id="crisis-lede">{lede}</p>
            <p style={{ marginTop: "var(--gap-para)" }}>
              我是一个 AI，我能陪你聊，但在这件事上我帮不了你足够多。有真正的人可以现在就接住你 ——
            </p>
          </div>

          <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-6)" }}>
            {/* 12356 —— 卡内全宽主按钮；底部操作区不再重复同一个拨打动作 */}
            <div
              style={{
                background: "var(--care-100)",
                border: "1.5px solid var(--care-700)",
                borderRadius: "var(--r-md)",
                padding: "var(--sp-4)",
              }}
            >
              <div style={{ ...t.body, color: "var(--text-secondary)" }}>{primary.name}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 28,
                  letterSpacing: "0.04em",
                  color: "var(--forest-900)",
                  margin: "4px 0",
                }}
              >
                {primary.tel}
              </div>
              <div style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-3)" }}>
                {primary.note}
              </div>
              <a
                href={`tel:${primary.tel}`}
                aria-label={spell(primary.tel)}
                onClick={holdLink}
                className="no-underline block"
                style={gate}
              >
                <Btn variant="care" size="lg" full>拨打</Btn>
              </a>
            </div>

            {/* 北京心理危机研究与干预中心 */}
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--r-md)",
                padding: "var(--sp-4)",
              }}
            >
              <div style={{ ...t.body, color: "var(--text-secondary)" }}>{secondary.name}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 24,
                  letterSpacing: "0.04em",
                  color: "var(--forest-900)",
                  margin: "4px 0",
                }}
              >
                {secondary.tel}
              </div>
              <div className="flex items-center justify-between">
                <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{secondary.note}</span>
                <a
                  href={`tel:${secondary.tel}`}
                  aria-label={spell(secondary.tel)}
                  onClick={holdLink}
                  className="no-underline"
                  style={gate}
                >
                  <Btn variant="care" size="sm">拨打</Btn>
                </a>
              </div>
            </div>

            {/* 120 独立卡 —— 纯文字标题，无图标 */}
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--r-md)",
                padding: "var(--sp-4)",
              }}
            >
              <div style={{ ...t.body, color: "var(--care-700)", fontWeight: 500 }}>{EMERGENCY.title}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 24,
                  letterSpacing: "0.04em",
                  color: "var(--forest-900)",
                  margin: "4px 0",
                }}
              >
                {EMERGENCY.tel}
              </div>
              <div className="flex items-center justify-between">
                <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{EMERGENCY.note}</span>
                <a
                  href={`tel:${EMERGENCY.tel}`}
                  aria-label={spell(EMERGENCY.tel)}
                  onClick={holdLink}
                  className="no-underline"
                  style={gate}
                >
                  <Btn variant="care" size="sm">拨打</Btn>
                </a>
              </div>
            </div>

            {/* 110 —— quiet 卡，重定位为「替他人求助」，无按钮 */}
            <div
              style={{
                background: "var(--bg-tint)",
                borderRadius: "var(--r-md)",
                padding: "var(--sp-4)",
              }}
            >
              <div style={{ ...t.body, color: "var(--text-secondary)" }}>{FOR_OTHERS.lead}</div>
              <div style={{ fontSize: 13, lineHeight: "var(--lh-caption)", color: "var(--text-tertiary)", marginTop: 4 }}>
                {FOR_OTHERS.note}
                <a
                  href={`tel:${FOR_OTHERS.tel}`}
                  aria-label={spell(FOR_OTHERS.tel)}
                  onClick={holdLink}
                  style={{ color: "var(--text-tertiary)", textUnderlineOffset: 3, marginLeft: 4, ...gate }}
                  className="underline"
                >
                  {FOR_OTHERS.tel}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 固定底部操作区：任何屏幕尺寸下至少一个出口永远可见 */}
        <div
          className="shrink-0 flex flex-col"
          style={{
            gap: "var(--sp-3)",
            position: "relative",
            borderTop: "1px solid var(--hairline)",
            background: "var(--bg-elevated)",
            borderRadius: "0 0 var(--r-xl) var(--r-xl)",
            padding: "var(--sp-4) var(--gap-card-inner) calc(var(--sp-4) + env(safe-area-inset-bottom))",
          }}
        >
          {/* 渐隐条：暗示上方还有内容 */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -24,
              left: 0,
              right: 0,
              height: 24,
              background: "linear-gradient(to top, var(--bg-elevated), transparent)",
              pointerEvents: "none",
            }}
          />
          <div style={gate}>
            <Btn variant="secondary" size="lg" full onClick={armed ? (onContinue ?? onClose) : undefined}>
              {continueLabel}
            </Btn>
          </div>
          <div style={gate}>
            <Btn variant="ghost" size="lg" full onClick={armed ? onClose : undefined}>
              我现在是安全的
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
