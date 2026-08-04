"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, t } from "@/components/ui";
import type { DreamAnalysis, DreamRecord } from "@/lib/types";

interface PendingPayload {
  text: string;
  mode: DreamAnalysis["mode"];
  emotions: string[];
  clarity: number;
  tags: string[];
  analysis: DreamAnalysis;
}

const EMOTION_GRADIENTS: Record<string, string> = {
  害怕: "linear-gradient(90deg, #87E3D0, #87C5E3)",
  焦虑: "linear-gradient(90deg, #FFD8B5, #FFB5A8)",
  紧张: "linear-gradient(90deg, #D8B5FF, #FFB5D8)",
  委屈: "linear-gradient(90deg, #B7E4C7, #87E3D0)",
  悲伤: "linear-gradient(90deg, #A8C5FF, #87C5E3)",
  失望: "linear-gradient(90deg, #C5B5A8, #A89B8C)",
  愤怒: "linear-gradient(90deg, #FFA8A8, #FF7878)",
  愧疚: "linear-gradient(90deg, #B5D8FF, #87B5E3)",
  期待: "linear-gradient(90deg, #FFE5B4, #FFD87A)",
  平静: "linear-gradient(90deg, #C5E3C5, #87E3C5)",
  快乐: "linear-gradient(90deg, #FFE5B4, #FFD87A)",
  好奇: "linear-gradient(90deg, #D8B5FF, #B5A8FF)",
  惊吓: "linear-gradient(90deg, #A8C5FF, #FFA8A8)",
  释然: "linear-gradient(90deg, #B7E4C7, #A8E3B5)",
};
function gradient(name: string) {
  return EMOTION_GRADIENTS[name] ?? "linear-gradient(90deg, #87E3D0, #B5A8FF)";
}

export default function DreamResult() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingPayload | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("psy_pending_analysis");
      if (raw) setPending(JSON.parse(raw) as PendingPayload);
    } catch { /* ignore */ }
  }, []);

  const save = async () => {
    if (!pending || saved) return;
    const { addDream } = await import("@/lib/db");
    const record: DreamRecord = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      text: pending.text,
      mode: pending.mode,
      clarity: pending.clarity,
      tags: pending.tags,
      people: [],
      analysis: pending.analysis,
    };
    await addDream(record);
    try { sessionStorage.removeItem("psy_pending_analysis"); } catch {}
    setSaved(true);
    setTimeout(() => router.push("/box/dream/records"), 700);
  };

  if (!pending) {
    return (
      <Shell>
        <div className="text-center" style={{ padding: "var(--sp-12) 0" }}>
          <p style={{ ...t.body, color: "var(--text-secondary)" }}>没有待解析的梦境。</p>
          <Link href="/box/dream" className="no-underline">
            <Btn size="sm" style={{ marginTop: "var(--sp-3)" }}>去写一个梦 →</Btn>
          </Link>
        </div>
        <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
          <PrivacyBadge />
        </div>
      </Shell>
    );
  }

  const { analysis } = pending;
  const modeLabel = analysis.mode === "zhougong" ? "周公解梦" : "现代心理学";

  return (
    <Shell>
      {/* 顶部模式 + 一句话总结 */}
      <div style={{ background: "#FAF7F2", borderRadius: "var(--r-xl)", padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
        <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, background: "rgba(232,155,108,.15)", color: "#C8742B", fontSize: "var(--fs-caption)", fontWeight: 600 }}>{modeLabel}</span>
        <h2 style={{ ...t.h2, color: "var(--forest-900)", marginTop: "var(--sp-3)", lineHeight: 1.6 }}>「{analysis.summary}」</h2>
      </div>

      {/* 元素地图 */}
      <div style={{ marginBottom: "var(--sp-5)" }}>
        <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>梦境元素地图</h3>
        <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
          {analysis.elements.map((e, i) => {
            const tone = i % 3;
            const bg = ["#FFF6E8", "#F0EBFF", "#E8F4FF"][tone];
            const accent = ["#E89B6C", "#8B7AE8", "#5BA5E8"][tone];
            return (
              <div key={i} style={{ background: bg, borderRadius: "var(--r-lg)", padding: "var(--sp-4)" }}>
                <div className="flex items-center" style={{ gap: "var(--sp-3)", marginBottom: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 999, background: accent, color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-caption)", fontWeight: 600 }}>{i + 1}</span>
                  <span style={{ ...t.h3, color: "var(--forest-900)" }}>「{e.element}」</span>
                </div>
                <div style={{ ...t.body, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  <p><b style={{ color: "var(--text-primary)" }}>象征意义：</b>{e.symbol || "潜意识给你的回信。"}</p>
                  <p style={{ marginTop: 6 }}><b style={{ color: "var(--text-primary)" }}>可能情绪：</b>{e.emotion || "待觉察。"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 情绪 & 潜意识仪表盘 */}
      <div style={{ marginBottom: "var(--sp-5)" }}>
        <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>情绪 & 潜意识仪表盘</h3>
        <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
          {analysis.emotions.map((em, i) => (
            <div key={i} style={{ background: "#FFFFFF", borderRadius: "var(--r-lg)", padding: "var(--sp-4)", border: "1px solid var(--hairline)" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ ...t.body, color: "var(--forest-900)", fontWeight: 600 }}>{em.name}</span>
                <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{em.percent}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--bg-tint)", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${em.percent}%`, background: gradient(em.name), borderRadius: 999, transition: "width .6s ease" }} />
              </div>
              <p style={{ ...t.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{em.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 三点建议 */}
      <div style={{ marginBottom: "var(--sp-6)" }}>
        <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>接下来，你可以</h3>
        <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
          {analysis.suggestions.map((s, i) => (
            <div key={i} style={{ background: "#FFFFFF", borderRadius: "var(--r-lg)", padding: "var(--sp-4)", border: "1px solid var(--hairline)" }}>
              <div className="flex items-center" style={{ gap: "var(--sp-3)" }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, background: "#E89B6C", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-caption)", fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span>
                <p style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.7 }}>{s}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 保存 + 后续 */}
      <div className="flex" style={{ gap: "var(--gap-inline)" }}>
        <Btn onClick={save} disabled={saved} className="flex-1">{saved ? "已保存 ✓" : "保存到梦境记录"}</Btn>
        <Link href="/box/dream/records" className="no-underline">
          <Btn variant="secondary">看历史</Btn>
        </Link>
      </div>

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--gap-section)" }}>
        解梦没有标准答案，写下来本身就是一种看见。
      </p>
      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}