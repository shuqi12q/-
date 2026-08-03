"use client";

import { useState } from "react";
import { CitedCard, Overline, t } from "./ui";

// 把理由里引用的用户原始数据（#标签 / 引号原话 / 【角色名】/ N 篇）高亮成 chip
const CITE = /(#[^\s，,。、（）]+|【[^】]+】|「[^」]+」|『[^』]+』|\d+\s*篇)/g;

function Highlighted({ text }: { text: string }) {
  const parts = text.split(CITE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            style={{
              background: "var(--forest-100)",
              color: "var(--forest-900)",
              borderRadius: "var(--r-xs)",
              padding: "1px 6px",
            }}
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function ExplainCard({
  reason,
  children,
}: {
  reason: string;
  children?: React.ReactNode;
}) {
  const [optedOut, setOptedOut] = useState(false);

  if (optedOut) {
    return (
      <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>
        好，那就不推荐了。随便选一个都可以。
      </div>
    );
  }

  return (
    <CitedCard>
      <Overline>为什么推荐 TA</Overline>
      <p style={{ ...t.body, color: "var(--text-primary)", marginTop: "var(--sp-2)" }}>
        <Highlighted text={reason} />
      </p>
      {children}
      <div style={{ borderTop: "1px solid var(--divider)", margin: "var(--sp-4) 0 var(--sp-3)" }} />
      <button
        onClick={() => setOptedOut(true)}
        style={{ ...t.caption, color: "var(--forest-700)", minHeight: 32 }}
      >
        我不想被推荐
      </button>
    </CitedCard>
  );
}
