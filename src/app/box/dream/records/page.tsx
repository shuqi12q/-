"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import BoxBack from "@/components/BoxBack";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";
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

function fmt(ts: number) {
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

export default function DreamRecords() {
  const [records, setRecords] = useState<DreamRecord[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [keyword, setKeyword] = useState("");
  const [loaded, setLoaded] = useState(false);

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
  };

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
        你的心灵旅程记录 · 共 <b>{records.length}</b> 条
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
            const summary = (r.analysis.summary || r.text.slice(0, 50) + (r.text.length > 50 ? "…" : ""));
            const modeLabel = r.mode === "zhougong" ? "周公解梦" : "AI";
            return (
              <div
                key={r.id}
                className="fade-up flex flex-col"
                style={{
                  background: "#FFFFFF",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--sp-4)",
                  boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                  border: "1px solid var(--hairline)",
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: "var(--fs-caption)", fontWeight: 600 }}>{dreamType === "nightmare" ? "噩梦" : dreamType === "good" ? "美梦" : "日常梦"}</span>
                  <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{fmt(r.createdAt)}</span>
                </div>
                <p style={{ ...t.body, color: "var(--text-primary)", fontWeight: 600, marginBottom: 6 }}>
                  「{r.analysis.elements[0]?.element ?? "梦"}」
                </p>
                <p style={{ ...t.body, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 10 }}>
                  {summary}
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
                    {modeLabel}
                  </span>
                  <button
                    onClick={() => { if (confirm("删掉这条梦境？")) remove(r.id); }}
                    style={{ ...t.caption, color: "var(--text-tertiary)" }}
                  >删除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}