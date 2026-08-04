"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";

// 参考主流「敲木鱼」应用：点击/自动敲击 + 木鱼晃动 + 涟漪光晕 + 「功德+1」飘字 + 功德弹跳动画
const GD_KEY = "psy_muyu_gongde";
const WISH_KEY = "psy_muyu_wishes";
const AUTO_MS = 950; // 自动敲击间隔（主流约 700-1000ms）

interface FloatText { id: number; dx: number; }
interface Ring { id: number; }
interface Wish { id: string; text: string; cost: number; createdAt: number; }

export default function MuyuPage() {
  const [gongde, setGongde] = useState(0);
  const [hit, setHit] = useState(false); // 敲击动画
  const [auto, setAuto] = useState(false);
  const [muted, setMuted] = useState(false);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [wishOpen, setWishOpen] = useState(false);
  const [wishText, setWishText] = useState("");
  const [wishCost, setWishCost] = useState(1);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idRef = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);

  // 恢复持久化 + 清理定时器
  useEffect(() => {
    try {
      const v = Number(window.localStorage.getItem(GD_KEY) || 0);
      if (Number.isFinite(v) && v >= 0) setGongde(v);
    } catch { /* ignore */ }
    try {
      const raw = window.localStorage.getItem(WISH_KEY);
      if (raw) setWishes(JSON.parse(raw) as Wish[]);
    } catch { /* ignore */ }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);
  useEffect(() => { try { window.localStorage.setItem(GD_KEY, String(gongde)); } catch { /* ignore */ } }, [gongde]);
  useEffect(() => { try { window.localStorage.setItem(WISH_KEY, JSON.stringify(wishes)); } catch { /* ignore */ } }, [wishes]);

  // Web Audio 合成木鱼"笃"声（主音 + 高频泛音，短促衰减）
  const playKnock = () => {
    if (muted) return;
    try {
      const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtx.current) audioCtx.current = new AC();
      const ctx = audioCtx.current;
      if (ctx.state === "suspended") void ctx.resume();
      const t0 = ctx.currentTime;
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = "sine";
      o1.frequency.setValueAtTime(880, t0);
      g1.gain.setValueAtTime(0.0001, t0);
      g1.gain.exponentialRampToValueAtTime(0.5, t0 + 0.006);
      g1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      o1.connect(g1).connect(ctx.destination);
      o1.start(t0); o1.stop(t0 + 0.16);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "triangle";
      o2.frequency.setValueAtTime(1560, t0);
      g2.gain.setValueAtTime(0.0001, t0);
      g2.gain.exponentialRampToValueAtTime(0.18, t0 + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      o2.connect(g2).connect(ctx.destination);
      o2.start(t0); o2.stop(t0 + 0.09);
    } catch { /* 无 AudioContext 时静默 */ }
  };

  // 敲一次：音效 + 功德+1 + 木鱼动画 + 涟漪 + 飘字
  const knock = () => {
    playKnock();
    setGongde((g) => g + 1);
    setHit(true);
    const id = ++idRef.current;
    setFloats((f) => [...f, { id, dx: Math.round(Math.random() * 60 - 30) }]);
    setRings((r) => [...r, { id }]);
    window.setTimeout(() => setHit(false), 200);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1400);
    window.setTimeout(() => setRings((r) => r.filter((x) => x.id !== id)), 700);
  };

  const toggleAuto = () => {
    if (auto) {
      if (timer.current) clearInterval(timer.current);
      setAuto(false);
    } else {
      knock();
      timer.current = setInterval(knock, AUTO_MS);
      setAuto(true);
    }
  };

  const submitWish = () => {
    const text = wishText.trim();
    const cost = Math.max(1, Math.floor(wishCost));
    if (!text || gongde < cost) return;
    setGongde((g) => g - cost);
    setWishes((w) => [{ id: crypto.randomUUID(), text, cost, createdAt: Date.now() }, ...w].slice(0, 30));
    setWishOpen(false);
    setWishText("");
    setWishCost(1);
  };

  const fmtWish = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <Shell>
      <style>{`
        @keyframes muyu-float-up { 0% { transform: translate(-50%,0) scale(.9); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(-50%,-76px) scale(1.05); opacity: 0; } }
        @keyframes muyu-ring { 0% { transform: translate(-50%,-50%) scale(.35); opacity: .65; } 100% { transform: translate(-50%,-50%) scale(1.45); opacity: 0; } }
        @keyframes muyu-num-pop { 0% { transform: scale(1.35); } 100% { transform: scale(1); } }
      `}</style>

      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>敲木鱼</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        心烦的时候，笃笃笃敲几声，让杂念随着木鱼声沉淀下去。
      </p>

      {/* 功德数 */}
      <div className="text-center" style={{ padding: "var(--sp-3) 0" }}>
        <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>当前功德</div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "var(--forest-900)", lineHeight: 1.15, marginTop: 4 }}>
          <span key={gongde} style={{ display: "inline-block", animation: gongde > 0 ? "muyu-num-pop 0.3s ease" : "none" }}>{gongde}</span>
        </div>
      </div>

      {/* 木鱼区 */}
      <div className="relative flex items-center justify-center" style={{ height: 210, margin: "var(--sp-2) 0" }}>
        {/* 涟漪 */}
        {rings.map((r) => (
          <div key={r.id} className="absolute" style={{ left: "50%", top: "52%", width: 150, height: 150, borderRadius: 999, border: "3px solid var(--wood-300)", animation: "muyu-ring 0.7s ease-out forwards", pointerEvents: "none" }} />
        ))}
        {/* 飘字 */}
        {floats.map((f) => (
          <div key={f.id} className="absolute content-serif" style={{ left: `calc(50% + ${f.dx}px)`, top: "34%", fontSize: 22, fontWeight: 600, color: "var(--care-600)", animation: "muyu-float-up 1.4s ease-out forwards", pointerEvents: "none", whiteSpace: "nowrap" }}>
            功德 +1
          </div>
        ))}
        {/* 木鱼（点击也可手动敲） */}
        <button onClick={knock} aria-label="敲木鱼" className="block" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <svg width="240" height="170" viewBox="0 0 200 150" role="img" aria-label="木鱼">
            {/* 敲击棒 */}
            <g style={{ transformOrigin: "150px 34px", transform: hit ? "rotate(-20deg)" : "rotate(0deg)", transition: "transform 130ms ease" }}>
              <rect x="118" y="16" width="9" height="40" rx="4.5" fill="#7c4f28" transform="rotate(32 122 36)" />
              <circle cx="160" cy="26" r="10" fill="#a06a3c" />
            </g>
            {/* 鱼身 + 支撑 */}
            <g style={{ transformOrigin: "100px 92px", transform: hit ? "translateY(2px) scale(.985)" : "translateY(0) scale(1)", transition: "transform 130ms ease" }}>
              <ellipse cx="100" cy="94" rx="60" ry="34" fill="#c08552" />
              <path d="M40 94 Q62 46 100 48 Q138 46 160 94 Z" fill="#d99a63" />
              <path d="M40 94 Q62 114 100 114 Q138 114 160 94 Z" fill="#b0774a" />
              <path d="M100 48 Q100 78 100 94" stroke="#8a5a32" strokeWidth="3" fill="none" opacity=".55" />
              <path d="M100 94 L100 128" stroke="#8a5a32" strokeWidth="4" />
              <rect x="86" y="124" width="28" height="8" rx="4" fill="#8a5a32" />
              <circle cx="104" cy="76" r="5" fill="#5d3a1e" />
              <path d="M50 90 Q63 85 71 90" stroke="#5d3a1e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
              <path d="M150 90 Q157 85 164 88" stroke="#5d3a1e" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
            </g>
          </svg>
        </button>
      </div>

      {/* 控制区 */}
      <div className="flex flex-col" style={{ gap: "var(--sp-3)", maxWidth: 360, margin: "0 auto" }}>
        <Btn size="lg" full onClick={toggleAuto}>
          {auto ? "暂停" : "开始"}
        </Btn>
        <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)" }}>
          {auto ? `自动敲击中（约每 ${Math.round(AUTO_MS / 100) / 10} 秒一次）` : "点击「开始」自动连续敲击；也可以直接点木鱼手动敲"}
        </p>
        <div className="flex" style={{ gap: "var(--gap-inline)" }}>
          <Btn variant="ghost" size="sm" onClick={() => setMuted((m) => !m)} className="flex-1">
            {muted ? "🔇 已静音" : "🔊 音效开"}
          </Btn>
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => { if (confirmReset) { setGongde(0); setConfirmReset(false); } else setConfirmReset(true); }}
            className="flex-1"
            style={confirmReset ? { color: "var(--care-700)", borderColor: "var(--care-700)" } : undefined}
          >
            {confirmReset ? "确认清零？" : "清零"}
          </Btn>
          <Btn variant="secondary" size="sm" onClick={() => setWishOpen(true)} className="flex-1">
            祈福
          </Btn>
        </div>
      </div>

      {/* 祈福记录 */}
      {wishes.length > 0 && (
        <div style={{ marginTop: "var(--gap-section)" }}>
          <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>我的祈福</div>
          <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
            {wishes.map((w) => (
              <Card key={w.id} className="fade-up">
                <div className="flex items-center justify-between">
                  <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{fmtWish(w.createdAt)}</span>
                  <span style={{ ...t.caption, color: "var(--care-600)" }}>耗功德 {w.cost}</span>
                </div>
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", marginTop: "var(--sp-2)" }}>{w.text}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--gap-section)" }}>
        敲木鱼只是给心情一个安静的出口——心里的结，还是可以和信任的人说，或找专业人士帮忙。
      </p>
      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>

      {/* 祈福弹窗 */}
      {wishOpen && (
        <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: "var(--z-sheet)", background: "var(--bg-scrim)" }}>
          <div className="w-full overflow-y-auto fade-up" style={{ maxWidth: 480, maxHeight: "82vh", background: "var(--bg-elevated)", borderRadius: "var(--r-xl) var(--r-xl) 0 0", padding: "var(--sp-6) var(--gap-page-x)" }}>
            <div className="mx-auto" style={{ width: 40, height: 4, borderRadius: 999, background: "var(--forest-300)" }} />
            <h2 style={{ ...t.h2, color: "var(--forest-900)", marginTop: "var(--sp-5)" }}>祈福</h2>
            <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: 4 }}>写下心愿，消耗一定功德。功德不抵现实，但愿你被温柔以待。</p>
            <textarea
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              rows={4}
              placeholder="写下一个心愿或祝福…"
              className="content-serif w-full"
              style={{
                background: "var(--bg-elevated)",
                border: "1.5px solid var(--forest-300)",
                borderRadius: "var(--r-lg)",
                boxShadow: "var(--shadow-paper-inset)",
                padding: "var(--sp-4)",
                fontSize: "var(--fs-body-lg)",
                lineHeight: 1.8,
                color: "var(--text-primary)",
                resize: "none",
                outline: "none",
                marginTop: "var(--sp-4)",
              }}
            />
            <div className="flex items-center" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-3)" }}>
              <span style={{ ...t.body, color: "var(--text-secondary)" }}>消耗功德</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, gongde)}
                value={wishCost}
                onChange={(e) => setWishCost(Number(e.target.value))}
                style={{
                  width: 88,
                  height: 40,
                  background: "var(--bg-elevated)",
                  border: "1.5px solid var(--forest-300)",
                  borderRadius: "var(--r-sm)",
                  textAlign: "center",
                  fontSize: "var(--fs-body)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>当前功德 {gongde}</span>
            </div>
            <div style={{ margin: "var(--sp-6) 0 var(--sp-6)" }}>
              <Btn size="lg" full disabled={!wishText.trim() || gongde < Math.max(1, Math.floor(wishCost))} onClick={submitWish}>
                祈愿（耗 {Math.max(1, Math.floor(wishCost))} 功德）
              </Btn>
            </div>
            <div className="text-center">
              <Btn variant="ghost" onClick={() => setWishOpen(false)}>先不祈</Btn>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}