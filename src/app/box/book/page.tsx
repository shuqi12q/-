"use client";

import { useRef, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import BoxBack from "@/components/BoxBack";
import { Btn, Card, t } from "@/components/ui";
import { ANSWERS } from "@/lib/box-data";

export default function BookPage() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);
  const last = useRef<string | null>(null);

  const open = () => {
    // 避免刚翻过的答案立刻重复
    let pool = ANSWERS;
    if (last.current) pool = ANSWERS.filter((a) => a !== last.current);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    last.current = pick;
    setFlip(true);
    setAnswer(null);
    setTimeout(() => {
      setAnswer(pick);
      setFlip(false);
    }, 420);
  };

  return (
    <Shell>
      <BoxBack />
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>答案之书</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        先在心里默默问一个困扰你的小问题（最好是"是 / 否"类），然后翻开一页。
      </p>

      <div className="flex flex-col items-center" style={{ padding: "var(--sp-8) 0" }}>
        <button
          onClick={open}
          aria-label="翻开答案之书"
          className="flex items-center justify-center"
          style={{
            width: 220,
            height: 300,
            borderRadius: "var(--r-xl)",
            background: "var(--forest-700)",
            color: "var(--text-inverse)",
            cursor: "pointer",
            border: "none",
            boxShadow: "var(--shadow-md)",
            transitionDuration: "var(--dur-base)",
            transform: flip ? "rotateY(12deg) scale(.98)" : "rotateY(0deg)",
          }}
        >
          {answer === null ? (
            <span style={{ ...t.h3, lineHeight: 1.7, textAlign: "center", padding: "var(--sp-4)" }}>
              {flip ? "…" : "翻 开"}
            </span>
          ) : (
            <span className="content-serif" style={{ fontSize: "var(--fs-body-lg)", lineHeight: 1.9, textAlign: "center", padding: "var(--sp-5)" }}>
              {answer}
            </span>
          )}
        </button>

        {answer && (
          <div className="fade-up text-center" style={{ marginTop: "var(--sp-6)" }}>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)" }}>{answer}</p>
            <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-4)" }}>
              答案之书不替你做重大决定——它只在你左右为难时，帮你把心里的倾向轻轻推出来。
            </p>
          </div>
        )}

        {!answer && (
          <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-6)" }}>
            不用问大事，它只负责熨平那些小烦恼。
          </p>
        )}
      </div>

      <div className="text-center" style={{ marginTop: "var(--sp-2)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}