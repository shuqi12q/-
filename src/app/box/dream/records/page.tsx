"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import BoxBack from "@/components/BoxBack";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, t } from "@/components/ui";
import type { DreamRecord } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "全部梦境" },
  { key: "nightmare", label: "噩梦" },
  { key: "good", label: "美梦" },
  { key: "ordinary", label: "日常梦" },
] as const;

const TYPE_COLOR: Record<string, { bg: string; fg: string }> = {
  nightmare: { bg: "#FFE5E5", fg: "#C8595A" },
  good: { bg: "#E5F7E8", fg: "#5BAA68" },
  ordinary: { bg: "#E8F4FF", fg: "#5B8FE3" },
};

const EMOTION_GRADIENTS: Record<string, string> = {
  害怕: "linear-gradient(90deg, #87E3D0, #87C5E3)",
  焦虑: "linear-gradient(90deg, #FFD8B5, #FFB5A8)",
  紧张: "linear-gradient(90deg, #D8B5FF, #FFB5D8)",
  委屈: "linear-gradient(90deg, #B7E4C7, #87E3D0)",
  悲伤: "linear-gradient(90deg, #A8C5FF, #87C5E3)",
  愤怒: "linear-gradient(90deg, #FFA8A8, #FF7878)",
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

function fmt(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtShort(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}.${d.getDate()} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function inferType(text: string, tags: string[]): keyof typeof TYPE_COLOR {
  const t = text + " " + tags.join(" ");
  const neg = /(怕|恐惧|惊|跑不动|坠落|追|掉牙|血腥|死|累|压抑|难过|哭|恨)/;
  const pos = /(飞|拥抱|阳光|温柔|笑|愉快|朋友|家人|美好|和解|成功)/;
  if (neg.test(t)) return "nightmare";
  if (pos.test(t)) return "good";
  return "ordinary";
}
function typeLabel(t: string) {
  return t === "nightmare" ? "噩梦" : t === "good" ? "美梦" : "日常梦";
}

export default function DreamRecords() {
  const [records, setRecords] = useState<DreamRecord[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [keyword, setKeyword] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null); // 详情弹层

  const load = async () => {
    const { getDreams } = await import("@/lib/db");
    const list = await getDreams();
    setRecords(list);
    setLoaded(true);
  };
  useEffect(() => { load().catch(() => setLoaded(true)); }, []);

  const filtered = useMemo(() => {
    let arr = records;
    if (filter !== "all") {
      arr = arr.filter((r) => {
        const t = r.type ?? inferType(r.text, r.tags);
        return t === filter;
      });
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      arr = arr.filter((r) =>
        r.text.toLowerCase().includes(kw) ||
        r.tags.some((t) => t.toLowerCase().includes(kw)) ||
        r.analysis.elements.some((e) => e.element.includes(kw)),
      );
    }
    return arr;
  }, [records, filter, keyword]);

  const remove = async (id: string) => {
    const { deleteDream } = await import("@/lib/db");
    await deleteDream(id);
    setRecords((p) => p.filter((r) => r.id !== id));
    if (openId === id) setOpenId(null);
  };

  const open = records.find((r) => r.id === openId) ?? null;

  return (
    <Shell>
      <BoxBack />
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-4)" }}>
        <h1 style={{ ...t.h1, color: "var(--forest-900)" }}>梦境卡片</h1>
        <Link href="/box/dream" className="no-underline">
          <Btn size="sm">写一个梦</Btn>
        </Link>
      </div>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-4)" }}>
        你的心灵旅程记录 · 共 <b>{records.length}</b> 条 · 点卡片看完整梦境
      </p>

      {/* 搜索 + 筛选 */}
      <div
        className="flex items-center"
        style={{
          gap: "var(--gap-inline)",
          padding: "10px 14px",
          background: "#FFFFFF",
          border: "1px solid var(--hairline)",
          borderRadius: 999,
          marginBottom: "var(--sp-4)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索梦境、人物、地点……"
          className="flex-1"
          style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "var(--fs-body)" }}
        />
        <Link href="/box/dream/dna" className="no-underline" style={{ fontSize: "var(--fs-caption)", color: "var(--forest-700)" }}>
          🧬 DNA
        </Link>
      </div>

      {/* 筛选 chips */}
      <div className="flex flex-wrap" style={{ gap: 8, marginBottom: "var(--sp-5)" }}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: on ? "1.5px solid var(--forest-500)" : "1px solid var(--hairline)",
                background: on ? "var(--forest-100)" : "#FFFFFF",
                color: on ? "var(--forest-900)" : "var(--text-secondary)",
                fontSize: "var(--fs-caption)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 卡片网格 */}
      {!loaded ? (
        <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>正在读取你的梦境…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center" style={{ padding: "var(--sp-12) 0", color: "var(--text-tertiary)" }}>
          <p style={{ ...t.body }}>{records.length === 0 ? "还没有记录过一个梦。" : "没有匹配的梦境。"}</p>
          {records.length === 0 && (
            <Link href="/box/dream" className="no-underline">
              <Btn style={{ marginTop: "var(--sp-3)" }}>写第一个梦 →</Btn>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: "var(--sp-3)" }}>
          {filtered.map((r) => {
            const dreamType = r.type ?? inferType(r.text, r.tags);
            const tone = TYPE_COLOR[dreamType] ?? TYPE_COLOR.ordinary;
            const preview = r.text.length > 66 ? r.text.slice(0, 66) + "…" : r.text;
            const modeLabel = r.mode === "zhougong" ? "周公解梦" : "AI";
            return (
              <button
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="fade-up flex flex-col text-left no-underline"
                style={{
                  background: "#FFFFFF",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--sp-4)",
                  boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                  border: "1px solid var(--hairline)",
                  cursor: "pointer",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: "var(--fs-caption)", fontWeight: 600 }}>{typeLabel(dreamType)}</span>
                  <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{fmtShort(r.createdAt)}</span>
                </div>
                {/* 用户写的梦境原文 */}
                <p style={{ ...t.body, color: "var(--text-primary)", lineHeight: 1.8, marginBottom: 10, fontWeight: 500 }}>
                  {preview}
                </p>
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap" style={{ gap: 4, marginBottom: 8 }}>
                    {r.tags.slice(0, 3).map((tag) => (
                      <span key={tag} style={{ ...t.caption, color: "var(--text-tertiary)" }}>#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between" style={{ marginTop: "auto" }}>
                  <span style={{ display: "inline-flex", gap: 4, alignItems: "center", ...t.caption, color: "var(--text-tertiary)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--care-500)" }} />
                    {modeLabel} · 点击查看全文
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>

      {/* 梦境详情弹层 */}
      {open && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: "var(--z-sheet)", background: "var(--bg-scrim)" }}
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full overflow-y-auto fade-up"
            style={{ maxWidth: 520, maxHeight: "88vh", background: "#FAF7F2", borderRadius: "var(--r-xl) var(--r-xl) 0 0", padding: "var(--sp-6) var(--gap-page-x)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto" style={{ width: 40, height: 4, borderRadius: 999, background: "var(--forest-300)" }} />

            {/* 头部：日期 + 徽章 + 模式 */}
            <div className="flex items-center justify-between" style={{ marginTop: "var(--sp-4)" }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ padding: "3px 10px", borderRadius: 999, background: TYPE_COLOR[open.type ?? inferType(open.text, open.tags)]?.bg ?? "#E8F4FF", color: TYPE_COLOR[open.type ?? inferType(open.text, open.tags)]?.fg ?? "#5B8FE3", fontSize: "var(--fs-caption)", fontWeight: 600 }}>
                  {typeLabel(open.type ?? inferType(open.text, open.tags))}
                </span>
                <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{fmt(open.createdAt)}</span>
              </div>
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center", ...t.caption, color: "var(--text-tertiary)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--care-500)" }} />
                {open.mode === "zhougong" ? "周公解梦" : "现代心理学"} {open.clarity ? `· 清晰度 ${open.clarity}/10` : ""}
              </span>
            </div>

            {/* 你的梦境（原文） */}
            <div style={{ marginTop: "var(--sp-5)" }}>
              <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>你的梦境</h3>
              <div style={{ background: "#FFFFFF", borderRadius: "var(--r-lg)", padding: "var(--sp-4)", border: "1px solid var(--hairline)" }}>
                <p className="content-serif" style={{ ...t.bodyLg, color: "#2A322C", lineHeight: 2 }}>{open.text}</p>
              </div>
            </div>

            {/* 解析摘要 */}
            {open.analysis.summary && (
              <div style={{ marginTop: "var(--sp-4)" }}>
                <div style={{ background: "#FFF6E8", borderRadius: "var(--r-lg)", padding: "var(--sp-4)" }}>
                  <p className="content-serif" style={{ ...t.bodyLg, color: "#4A3B2A", lineHeight: 1.8 }}>「{open.analysis.summary}」</p>
                </div>
              </div>
            )}

            {/* 元素地图 */}
            {open.analysis.elements.length > 0 && (
              <div style={{ marginTop: "var(--sp-5)" }}>
                <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>元素地图</h3>
                <div className="flex flex-col" style={{ gap: 8 }}>
                  {open.analysis.elements.map((e, i) => (
                    <div key={i} style={{ background: "#FFFFFF", borderRadius: "var(--r-md)", padding: "10px 14px", border: "1px solid var(--hairline)" }}>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 999, background: ["#E89B6C", "#8B7AE8", "#5BA5E8", "#5BAA68", "#D8755B"][i % 5], color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ ...t.body, color: "#2A322C", fontWeight: 600 }}>「{e.element}」</span>
                      </div>
                      <p style={{ ...t.body, color: "#3F4A43", marginTop: 6, lineHeight: 1.7 }}>
                        <b style={{ color: "#2A322C" }}>象征：</b>{e.symbol}　<b style={{ color: "#2A322C" }}>情绪：</b>{e.emotion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 情绪仪表盘 */}
            {open.analysis.emotions.length > 0 && (
              <div style={{ marginTop: "var(--sp-5)" }}>
                <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>情绪仪表盘</h3>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {open.analysis.emotions.map((em, i) => (
                    <div key={i} style={{ background: "#FFFFFF", borderRadius: "var(--r-md)", padding: "10px 14px", border: "1px solid var(--hairline)" }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                        <span style={{ ...t.body, color: "#2A322C", fontWeight: 600 }}>{em.name}</span>
                        <span style={{ ...t.caption, color: "#4E5A53" }}>{em.percent}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: "var(--bg-tint)", overflow: "hidden", marginBottom: 6 }}>
                        <div style={{ height: "100%", width: `${em.percent}%`, background: gradient(em.name), borderRadius: 999 }} />
                      </div>
                      <p style={{ ...t.body, color: "#3F4A43", lineHeight: 1.6 }}>{em.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 建议 */}
            {open.analysis.suggestions.length > 0 && (
              <div style={{ marginTop: "var(--sp-5)" }}>
                <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>接下来，你可以</h3>
                <div className="flex flex-col" style={{ gap: 8 }}>
                  {open.analysis.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start" style={{ gap: 10, background: "#FFFFFF", borderRadius: "var(--r-md)", padding: "10px 14px", border: "1px solid var(--hairline)" }}>
                      <span style={{ width: 22, height: 22, borderRadius: 999, background: "#E89B6C", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                      <p style={{ ...t.bodyLg, color: "#2A322C", lineHeight: 1.7 }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作 */}
            <div className="flex" style={{ gap: "var(--gap-inline)", margin: "var(--sp-6) 0 var(--sp-6)" }}>
              <Btn variant="ghost" className="flex-1" onClick={() => setOpenId(null)}>关闭</Btn>
              <Btn
                variant="secondary"
                className="flex-1"
                style={{ color: "var(--care-700)", borderColor: "var(--care-700)" }}
                onClick={() => { if (confirm("删掉这条梦境？")) remove(open.id); }}
              >
                删除这条梦境
              </Btn>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}