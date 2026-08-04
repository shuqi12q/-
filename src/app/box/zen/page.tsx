"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import BoxBack from "@/components/BoxBack";
import { Btn, Card, t } from "@/components/ui";
import { ZEN_SESSIONS, ZEN_QUOTES } from "@/lib/box-data";

export default function ZenPage() {
  const [sessionIdx, setSessionIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const session = ZEN_SESSIONS[sessionIdx];

  // 呼吸循环状态（由 elapsed 推导）：inhale -> hold -> exhale 循环
  const cycle = session.phase.reduce((s, p) => s + p.inhale + p.hold + p.exhale, 0);
  const tPos = elapsed % cycle;
  let phase = session.phase[0];
  let cursor = 0;
  for (const p of session.phase) {
    cursor += p.inhale;
    if (tPos < cursor) { phase = { ...p, label: p.label, inhale: p.inhale, hold: p.hold, exhale: p.exhale }; break; }
    cursor += p.hold;
    if (tPos < cursor) { phase = { ...p, label: "屏住……" }; break; }
    cursor += p.exhale;
    if (tPos < cursor) { phase = { ...p, label: p.label }; break; }
  }
  const inInhale = tPos % cycle < cycle; // 简化：用缩放过渡
  const ratio = (tPos % (phase.inhale + phase.hold + phase.exhale)) / (phase.inhale + phase.hold + phase.exhale || 1);
  const scale = 1 + 0.45 * Math.max(0, 1 - Math.abs(ratio * 2 - 1)); // 吸气大、呼气小

  const start = () => {
    setElapsed(0);
    setDone(false);
    setRunning(true);
    timer.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= session.seconds) {
          if (timer.current) clearInterval(timer.current);
          setRunning(false);
          setDone(true);
          return session.seconds;
        }
        return e + 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    setRunning(false);
    setDone(false);
    setElapsed(0);
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <Shell>
      <BoxBack />
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>松弛哲学</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        不用追求什么状态，只需要跟着圆一起呼吸。念头来了又走，你只是看着它们。
      </p>

      {!running && !done && (
        <div className="fade-up flex flex-col" style={{ gap: "var(--sp-3)" }}>
          {ZEN_SESSIONS.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setSessionIdx(i)}
              className="text-left"
              style={{
                background: sessionIdx === i ? "var(--forest-100)" : "var(--bg-elevated)",
                border: sessionIdx === i ? "1.5px solid var(--forest-500)" : "1px solid var(--hairline)",
                borderRadius: "var(--r-lg)",
                padding: "var(--sp-4)",
                cursor: "pointer",
              }}
            >
              <div style={{ ...t.h3, color: "var(--forest-900)" }}>{s.name}</div>
              <p style={{ ...t.caption, color: "var(--text-secondary)", marginTop: 2 }}>{s.desc}</p>
            </button>
          ))}
          <div style={{ marginTop: "var(--sp-2)" }}>
            <Btn size="lg" full onClick={start}>开始呼吸</Btn>
          </div>
        </div>
      )}

      {(running || done) && (
        <div className="fade-up flex flex-col items-center" style={{ padding: "var(--sp-8) 0" }}>
          <div className="flex items-center justify-center" style={{ width: 280, height: 280 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 160,
                height: 160,
                borderRadius: 999,
                background: "var(--forest-100)",
                color: "var(--forest-700)",
                boxShadow: "var(--shadow-md)",
                transition: "transform 1s ease, background 1s ease",
                transform: `scale(${running ? scale : 1})`,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: "var(--forest-300)",
                  transition: "transform 1s ease",
                  transform: `scale(${running ? scale * 0.6 : 1})`,
                }}
              />
            </div>
          </div>

          <p className="text-center" style={{ ...t.bodyLg, color: "var(--text-primary)", minHeight: 28 }}>
            {running ? phase.label : done ? "做得很好。" : ""}
          </p>
          <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-2)" }}>
            {running ? `${Math.min(elapsed + 1, session.seconds)} / ${session.seconds} 秒` : ""}
          </p>

          {done && (
            <div className="fade-up text-center" style={{ marginTop: "var(--sp-6)" }}>
              <Card style={{ maxWidth: 360 }}>
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9 }}>
                  {ZEN_QUOTES[Math.floor(Math.random() * ZEN_QUOTES.length)]}
                </p>
              </Card>
            </div>
          )}

          <div className="flex" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-6)" }}>
            {done && <Btn onClick={start}>再来一次</Btn>}
            <Btn variant="ghost" onClick={stop}>结束</Btn>
          </div>
        </div>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}