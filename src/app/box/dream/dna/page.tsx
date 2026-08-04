"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import BoxBack from "@/components/BoxBack";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Card, t } from "@/components/ui";
import type { DreamRecord } from "@/lib/types";

const TOPIC_COLORS = [
  { bg: "#FFE5D9", fg: "#C8742B" },
  { bg: "#E0EBFF", fg: "#5B7FE0" },
  { bg: "#E5F7E8", fg: "#5BAA68" },
  { bg: "#F0E5FF", fg: "#8B5BE0" },
  { bg: "#FFF0E5", fg: "#D8755B" },
];

// 计算元素出现频次
function tallyElements(rs: DreamRecord[]) {
  const m = new Map<string, number>();
  rs.forEach((r) => r.analysis.elements.forEach((e) => m.set(e.element, (m.get(e.element) ?? 0) + 1)));
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}
function tallySymbols(rs: DreamRecord[]) {
  const m = new Map<string, number>();
  rs.forEach((r) => r.analysis.elements.forEach((e) => m.set(e.symbol, (m.get(e.symbol) ?? 0) + 1)));
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}
function tallyTags(rs: DreamRecord[]) {
  const m = new Map<string, number>();
  rs.forEach((r) => r.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}
function tallyPlaces(rs: DreamRecord[]) {
  const m = new Map<string, number>();
  rs.forEach((r) => { if (r.text) {
    // 简易：从梦境文本里抓典型地点词（不在 AI 元素里时也能用）
    const txt = r.text;
    const places = ["家", "学校", "海", "山里", "森林", "城市", "公司", "教室", "房间", "河边"];
    places.forEach((p) => { if (txt.includes(p)) m.set(p, (m.get(p) ?? 0) + 1); });
  }});
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
}
function avgEmotion(rs: DreamRecord[]) {
  if (rs.length === 0) return 0;
  const all = rs.flatMap((r) => r.analysis.emotions.map((e) => e.percent));
  return all.reduce((a, b) => a + b, 0) / all.length;
}
// DNA 4 维人格雷达（探索者 / 建设者 / 守望者 / 流浪者）：按元素类型/情绪分布/符号倾向粗估
function computeDNA(rs: DreamRecord[]) {
  const symbols = tallySymbols(rs).slice(0, 10).map((x) => x[0]).join(" ");
  const explore = /(自由|飞|探索|新|奇|找|寻|路)/.test(symbols) ? 0.32 : 0.18;
  const build = /(家|建|工|稳|安|扎实|责任)/.test(symbols) ? 0.28 : 0.20;
  const guard = /(守|陪|护|家人|朋友|爱|支持)/.test(symbols) ? 0.30 : 0.20;
  const drift = /(漂|逃|迷|失控|失|痛|压)/.test(symbols) ? 0.20 : 0.12;
  const total = explore + build + guard + drift;
  return { explore: explore / total, build: build / total, guard: guard / total, drift: drift / total };
}

export default function DreamDNA() {
  const [records, setRecords] = useState<DreamRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { getDreams } = await import("@/lib/db");
        setRecords(await getDreams());
      } finally { setLoaded(true); }
    })();
  }, []);

  const elements = useMemo(() => tallyElements(records), [records]);
  const symbols = useMemo(() => tallySymbols(records), [records]);
  const tags = useMemo(() => tallyTags(records), [records]);
  const places = useMemo(() => tallyPlaces(records), [records]);
  const dna = useMemo(() => computeDNA(records), [records]);

  const top = elements.slice(0, 4);
  const topTotal = elements.reduce((s, [, n]) => s + n, 0) || 1;
  const wordCloud = symbols.slice(0, 18);

  return (
    <Shell>
      <BoxBack />
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-2)" }}>
        <h1 style={{ ...t.h1, color: "var(--forest-900)" }}>梦境 DNA</h1>
        <Link href="/box/dream/records" className="no-underline" style={{ ...t.body, color: "var(--forest-700)" }}>
          梦境卡片 →
        </Link>
      </div>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-5)" }}>
        根据你记录的梦境，看见反复出现的主题与情绪。
      </p>

      {!loaded ? (
        <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>正在读取…</p>
      ) : records.length === 0 ? (
        <div className="text-center" style={{ padding: "var(--sp-12) 0", color: "var(--text-tertiary)" }}>
          <p style={{ ...t.body }}>需要先记录几个梦境，才能生成 DNA 哦。</p>
          <Link href="/box/dream" className="no-underline">
            <span style={{ display: "inline-block", marginTop: "var(--sp-3)", padding: "10px 16px", borderRadius: 999, background: "var(--forest-700)", color: "#FFF" }}>写第一个梦 →</span>
          </Link>
        </div>
      ) : (
        <>
          {/* 总览数字 */}
          <Card style={{ background: "#FAF7F2" }}>
            <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>你的梦境全景</div>
            <div style={{ marginTop: "var(--sp-3)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-3)" }}>
              <Stat label="梦境总数" value={`${records.length} 条`} />
              <Stat label="不同元素" value={`${elements.length}`} />
              <Stat label="平均情绪" value={`${avgEmotion(records).toFixed(1)}`} />
            </div>
          </Card>

          {/* 主题 TOP */}
          <div style={{ marginTop: "var(--sp-5)" }}>
            <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>热门主题</h3>
            <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: "var(--sp-3)" }}>
              {top.map(([name, count], i) => {
                const c = TOPIC_COLORS[i % TOPIC_COLORS.length];
                const pct = Math.round((count / topTotal) * 100);
                return (
                  <div key={name} style={{ background: c.bg, borderRadius: "var(--r-lg)", padding: "var(--sp-4)" }}>
                    <div style={{ ...t.h3, color: c.fg }}>「{name}」</div>
                    <div style={{ ...t.caption, color: "var(--text-secondary)", marginTop: 4 }}>出现 {count} 次 · 占比 {pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 词云（象征意义） */}
          <div style={{ marginTop: "var(--sp-5)" }}>
            <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>象征词云</h3>
            <Card style={{ background: "#FFFFFF", minHeight: 120 }}>
              <div className="flex flex-wrap items-center justify-center" style={{ gap: 8 }}>
                {wordCloud.length === 0 && (
                  <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>暂无象征数据</span>
                )}
                {wordCloud.map(([w, c], i) => {
                  const sizes = [22, 20, 18, 17, 16, 15];
                  const colors = ["#5B7FE0", "#5BAA68", "#C8742B", "#8B5BE0", "#D8755B", "#5B7FE0"];
                  const idx = Math.min(i, sizes.length - 1);
                  const fontSize = sizes[idx] - Math.max(0, 3 - Math.min(3, c));
                  return (
                    <span
                      key={w}
                      style={{
                        fontSize,
                        fontWeight: 500,
                        color: colors[idx % colors.length],
                        opacity: 0.55 + Math.min(0.45, c / 5),
                        padding: "2px 4px",
                      }}
                    >{w}</span>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* DNA 雷达图 */}
          <div style={{ marginTop: "var(--sp-5)" }}>
            <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>你的梦境人格</h3>
            <Card style={{ background: "#FFFFFF" }}>
              <div className="flex items-center justify-center" style={{ padding: "var(--sp-3) 0" }}>
                <RadarChart dna={dna} />
              </div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--sp-3)", marginTop: "var(--sp-3)" }}>
                <PersonaCard name="探索者" pct={dna.explore} color="#5B7FE0" desc="你常梦见自由与新路。" />
                <PersonaCard name="建设者" pct={dna.build} color="#5BAA68" desc="你常梦见安稳与责任。" />
                <PersonaCard name="守望者" pct={dna.guard} color="#C8742B" desc="你常梦见陪伴与爱。" />
                <PersonaCard name="流浪者" pct={dna.drift} color="#8B5BE0" desc="你常梦见迷失与放下。" />
              </div>
            </Card>
          </div>

          {/* 出现最多的地点 / 标签 */}
          {places.length > 0 && (
            <div style={{ marginTop: "var(--sp-5)" }}>
              <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>出现最多的地点</h3>
              <Card style={{ background: "#FFFFFF" }}>
                {places.map(([p, n]) => (
                  <div key={p} className="flex items-center" style={{ gap: "var(--sp-3)", padding: "6px 0" }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: "var(--forest-100)" }} />
                    <span style={{ flex: 1, ...t.body, color: "var(--text-primary)" }}>「{p}」</span>
                    <div style={{ flex: 2, height: 6, background: "var(--bg-tint)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, n * 20)}%`, height: "100%", background: "linear-gradient(90deg,#FFD8B5,#FFA8A8)" }} />
                    </div>
                    <span style={{ ...t.caption, color: "var(--text-tertiary)", width: 28, textAlign: "right" }}>{n}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {tags.length > 0 && (
            <div style={{ marginTop: "var(--sp-5)" }}>
              <h3 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>常用标签</h3>
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {tags.slice(0, 12).map(([tag, n]) => (
                  <span key={tag} style={{ padding: "6px 12px", borderRadius: 999, background: "#FFFFFF", border: "1px solid var(--hairline)", ...t.caption, color: "var(--text-secondary)" }}>
                    #{tag} <span style={{ color: "var(--care-600)" }}>× {n}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--gap-section)" }}>
        DNA 是基于你过去所有梦境的简单总结，不必对号入座。
      </p>
      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ ...t.h3, color: "var(--forest-900)" }}>{value}</div>
      <div style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function PersonaCard({ name, pct, color, desc }: { name: string; pct: number; color: string; desc: string }) {
  return (
    <div style={{ padding: "var(--sp-3)", borderRadius: "var(--r-md)", background: "#FAF7F2" }}>
      <div className="flex items-center justify-between">
        <span style={{ ...t.body, color: "var(--forest-900)", fontWeight: 600 }}>{name}</span>
        <span style={{ ...t.caption, color, fontWeight: 600 }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-tint)", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color }} />
      </div>
      <p style={{ ...t.caption, color: "var(--text-secondary)", marginTop: 6 }}>{desc}</p>
    </div>
  );
}

// 简易 SVG 雷达图（4 维：探索/建设/守望/流浪）
function RadarChart({ dna }: { dna: ReturnType<typeof computeDNA> }) {
  const cx = 110;
  const cy = 110;
  const R = 80;
  const axes: { name: string; angle: number; val: number; color: string }[] = [
    { name: "探索者", angle: -Math.PI / 2, val: dna.explore, color: "#5B7FE0" },
    { name: "建设者", angle: 0, val: dna.build, color: "#5BAA68" },
    { name: "守望者", angle: Math.PI / 2, val: dna.guard, color: "#C8742B" },
    { name: "流浪者", angle: Math.PI, val: dna.drift, color: "#8B5BE0" },
  ];
  // 网格（5 圈）
  const rings = [0.25, 0.5, 0.75, 1];
  // 多边形顶点
  const pt = (a: number, r: number) => [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r];
  const poly = axes.map((a) => pt(a.angle, Math.max(0, Math.min(1, a.val))).join(",")).join(" ");
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" aria-label="梦境人格雷达图">
      {rings.map((r, i) => {
        const pts = axes.map((a) => pt(a.angle, r).join(",")).join(" ");
        return <polygon key={i} points={pts} fill="none" stroke="var(--hairline)" strokeWidth="1" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(a.angle, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hairline)" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="rgba(184,168,255,.18)" stroke="#B5A8FF" strokeWidth="2" />
      {axes.map((a, i) => {
        const [x, y] = pt(a.angle, Math.max(0.1, Math.min(1, a.val)));
        return <circle key={i} cx={x} cy={y} r="5" fill={a.color} stroke="#FFFFFF" strokeWidth="2" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(a.angle, 1);
        const lx = pt(a.angle, 1.18)[0];
        const ly = pt(a.angle, 1.18)[1];
        return <text key={i} x={lx} y={ly} fontSize="11" fill="var(--text-secondary)" textAnchor="middle" dominantBaseline="middle">{a.name}</text>;
      })}
    </svg>
  );
}