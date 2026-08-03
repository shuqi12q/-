"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ForestScene from "@/components/ForestScene";
import { Btn, Card, t } from "@/components/ui";

const ITEMS = [
  {
    no: "01",
    title: "这里不是医院，我也不是医生",
    body: "这个产品不提供诊断和治疗。如果你正在经历持续的痛苦，请一定去看真正的专业人士。",
  },
  {
    no: "02",
    title: "和你说话的是 AI，不是人",
    body: "栖栖是一个程序。它会认真听，但它不会真的懂你，也不会永远在。你随时可以问它「你是 AI 吗」，它会告诉你实话。",
  },
  {
    no: "03",
    title: "你写的东西，留在你自己的设备里",
    body: "日记、对话、故事进度，全部存在这台设备的浏览器里。我们没有服务器保存它们，也不会用它们训练任何模型。代价是：清空浏览器数据会丢失，记得偶尔导出备份。",
  },
];

export default function Welcome() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  const enter = () => {
    window.localStorage.setItem("psy_accepted", "1");
    router.push("/");
  };

  return (
    <main className="app-main" style={{ paddingBottom: "var(--sp-8)" }}>
      <ForestScene />

      <h1 style={{ ...t.h1, color: "var(--forest-900)", margin: "var(--gap-section) 0 var(--sp-10)" }}>
        在开始之前，
        <br />
        有三件事想先告诉你
      </h1>

      <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
        {ITEMS.map((it, i) => (
          <Card key={it.no} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div style={{ ...t.overline, fontFamily: "var(--font-mono)", color: "var(--wood-700)" }}>
              {it.no}
            </div>
            <h2 style={{ ...t.h3, color: "var(--forest-900)", margin: "var(--sp-2) 0 var(--sp-3)" }}>
              {it.title}
            </h2>
            <p style={{ ...t.body, color: "var(--text-secondary)" }}>{it.body}</p>
          </Card>
        ))}
      </div>

      <button
        onClick={() => setAgreed((v) => !v)}
        className="w-full flex items-center text-left"
        style={{
          gap: "var(--sp-3)",
          marginTop: "var(--gap-section)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--r-lg)",
          padding: "var(--sp-4)",
          minHeight: 56,
        }}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--r-xs)",
            border: `1.5px solid ${agreed ? "var(--forest-700)" : "var(--forest-300)"}`,
            background: agreed ? "var(--forest-700)" : "transparent",
          }}
        >
          {agreed && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-inverse)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5 L10 17.5 L19 7" />
            </svg>
          )}
        </span>
        <span style={{ ...t.body, color: "var(--text-primary)" }}>
          我已满 18 岁，并已读完以上内容
        </span>
      </button>

      <div style={{ marginTop: "var(--sp-5)" }}>
        <Btn size="lg" full disabled={!agreed} onClick={enter}>
          我已知晓，进入森林
        </Btn>
      </div>

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-6)" }}>
        <a href="/me/help" className="underline" style={{ color: "var(--text-tertiary)", textUnderlineOffset: 3 }}>
          如果你现在正处在危险中，请先看这里 →
        </a>
      </p>
    </main>
  );
}
