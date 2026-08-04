"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import BoxBack from "@/components/BoxBack";
import { Btn, Card, t } from "@/components/ui";

const CLEAR_KEY = "psy_box_cleared_today";

export default function ClearPage() {
  const [input, setInput] = useState("");
  const [worries, setWorries] = useState<string[]>([]);
  const [clearedToday, setClearedToday] = useState(0);

  useEffect(() => {
    const raw = window.localStorage.getItem(CLEAR_KEY);
    if (raw) {
      try {
        const { date, n } = JSON.parse(raw) as { date: string; n: number };
        const today = new Date().toDateString();
        setClearedToday(date === today ? n : 0);
      } catch {
        setClearedToday(0);
      }
    }
  }, []);

  const add = () => {
    const v = input.trim();
    if (!v) return;
    setWorries((p) => [...p, v]);
    setInput("");
  };

  const clearOne = (worry: string) => {
    setWorries((p) => p.filter((w) => w !== worry));
    const n = clearedToday + 1;
    setClearedToday(n);
    window.localStorage.setItem(CLEAR_KEY, JSON.stringify({ date: new Date().toDateString(), n }));
  };

  return (
    <Shell>
      <BoxBack />
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>烦恼消消</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        把堵在心口的烦恼一个个写出来，再一个个消掉——写下来本身，就会轻一点。
      </p>

      <div className="flex" style={{ gap: "var(--gap-inline)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="写一个正在烦你的念头…"
          className="flex-1"
          style={{
            background: "var(--bg-elevated)",
            border: "1.5px solid var(--forest-300)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-paper-inset)",
            padding: "0 14px",
            height: 46,
            fontSize: "var(--fs-body)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <Btn onClick={add} disabled={!input.trim()}>放进来</Btn>
      </div>

      <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-6)" }}>
        {worries.length === 0 ? (
          <div className="text-center" style={{ padding: "var(--sp-10) 0", color: "var(--text-tertiary)" }}>
            <p style={{ ...t.body }}>{clearedToday > 0 ? "今天的烦恼都消完啦 🎈" : "这里空空的。有想消掉的烦恼吗？"}</p>
            <p style={{ ...t.caption, marginTop: "var(--sp-2)" }}>今天已消掉 {clearedToday} 个烦恼</p>
          </div>
        ) : (
          worries.map((w, i) => (
            <div key={i} className="flex items-center fade-up" style={{ gap: "var(--gap-inline)" }}>
              <div
                className="flex-1"
                style={{
                  background: "var(--bg-tint)",
                  borderRadius: "var(--r-md)",
                  padding: "12px 16px",
                  ...t.body,
                  color: "var(--text-primary)",
                }}
              >
                {w}
              </div>
              <Btn variant="secondary" size="sm" onClick={() => clearOne(w)} style={{ flexShrink: 0 }}>消掉</Btn>
            </div>
          ))
        )}
      </div>

      {clearedToday > 0 && worries.length === 0 && (
        <p className="text-center fade-up" style={{ ...t.caption, color: "var(--forest-700)", marginTop: "var(--sp-4)" }}>
          消掉一个不是假装它不存在——是允许自己先放下它，回头有力气了再处理。
        </p>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}