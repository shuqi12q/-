"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import RoleTile from "@/components/RoleTile";
import Shell from "@/components/Shell";
import { Btn, Card, HelpFooter, Overline, t } from "@/components/ui";
import { ENDINGS, STORY } from "@/lib/story";
import { COPING_LABEL, type CopingStyle } from "@/lib/types";

interface Pick {
  act: number;
  label: string;
  coping: CopingStyle;
}

function Play() {
  const router = useRouter();
  const role = useSearchParams().get("role");
  const character = STORY.characters.find((c) => c.id === role) ?? STORY.characters[0];

  const [nodeId, setNodeId] = useState(STORY.start);
  const [picks, setPicks] = useState<Pick[]>([]);
  const done = nodeId === "end";
  const node = STORY.nodes[nodeId];

  // 走完一遍记一次（供「我的」页统计）
  useEffect(() => {
    if (!done) return;
    const n = Number(window.localStorage.getItem("psy_story_done") || 0);
    window.localStorage.setItem("psy_story_done", String(n + 1));
  }, [done]);

  const choose = (label: string, coping: CopingStyle, next: string) => {
    setPicks((p) => [...p, { act: node.act, label, coping }]);
    setNodeId(next);
  };

  // 结局屏
  if (done) {
    const ending = ENDINGS[character.coping];
    const count = picks.reduce<Record<string, number>>((acc, p) => {
      acc[p.coping] = (acc[p.coping] || 0) + 1;
      return acc;
    }, {});
    const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];

    return (
      <Shell>
        <div className="flex items-center" style={{ gap: "var(--sp-4)", marginBottom: "var(--gap-section)" }}>
          <RoleTile color={character.color} symbol={character.symbol} size={56} />
          <h1 style={{ ...t.h2, color: "var(--forest-900)" }}>你走完了 {character.name} 的这一遍</h1>
        </div>

        <Card style={{ marginBottom: "var(--gap-card-stack)" }}>
          <Overline>你的路径</Overline>
          <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-3)" }}>
            {picks.map((p, i) => (
              <div key={i} className="flex" style={{ gap: "var(--gap-inline)" }}>
                <span className="shrink-0" style={{ ...t.caption, color: "var(--text-tertiary)", width: 44 }}>
                  第{["一", "二", "三", "四"][p.act - 1]}幕
                </span>
                <span className="content-serif" style={{ ...t.body, color: "var(--text-primary)" }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
          {top && (
            <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: "var(--sp-4)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--divider)" }}>
              你这次更多偏向：
              <span style={{ color: "var(--forest-900)" }}>{COPING_LABEL[top[0] as CopingStyle]}</span>
              （4 次里有 {top[1]} 次）
            </p>
          )}
        </Card>

        <Card style={{ borderRadius: "var(--r-xl)", padding: 0, overflow: "hidden" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg,var(--forest-500),var(--wood-500))" }} />
          <div style={{ padding: "var(--sp-6)" }}>
            <Overline>这一遍你倾向于</Overline>
            <h2 className="content-serif" style={{ fontSize: 20, lineHeight: 1.7, color: "var(--forest-900)", margin: "var(--sp-3) 0" }}>
              {ending.title}
            </h2>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)" }}>{ending.body}</p>
            <div style={{ borderTop: "1px solid var(--divider)", margin: "var(--sp-4) 0" }} />
            <Overline>可以试一次的小事</Overline>
            <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: "var(--sp-2)" }}>{ending.action}</p>
          </div>
        </Card>

        <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--gap-section)" }}>
          <Btn size="lg" full onClick={() => router.push("/story")}>换一个角色再看一遍</Btn>
          <Link href="/journal/new" className="no-underline block">
            <Btn variant="secondary" size="lg" full>写进今天的记录</Btn>
          </Link>
          <Link href="/" className="no-underline block">
            <Btn variant="ghost" size="lg" full>回营地</Btn>
          </Link>
        </div>

        <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-5)" }}>
          这不是评估，只是一次练习
        </p>
        <HelpFooter />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* 进度：4 格，当前实心 */}
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-5)" }}>
        <div className="flex items-center" style={{ gap: "var(--gap-inline)" }}>
          <RoleTile color={character.color} symbol={character.symbol} size={32} />
          <span style={{ ...t.caption, color: "var(--text-secondary)" }}>{character.name} 的视角</span>
        </div>
        <div className="flex" style={{ gap: 4 }}>
          {[1, 2, 3, 4].map((a) => (
            <span
              key={a}
              style={{
                width: 18,
                height: 4,
                borderRadius: 999,
                background: a <= node.act ? "var(--forest-700)" : "var(--forest-100)",
              }}
            />
          ))}
        </div>
      </div>

      {/* 场景氛围条：每幕换色不换结构 */}
      <div
        style={{
          height: 96,
          borderRadius: "var(--r-lg)",
          background: `linear-gradient(160deg, ${character.color}33, var(--bg-tint))`,
          marginBottom: "var(--sp-6)",
        }}
      />

      <div className="fade-up" key={node.id}>
        <Overline>{node.speaker}</Overline>
        <p className="content-serif" style={{ ...t.bodyLg, lineHeight: 1.9, color: "var(--text-primary)", margin: "var(--sp-4) 0 var(--sp-10)" }}>
          {node.text}
        </p>

        <div style={{ ...t.body, color: "var(--text-tertiary)", marginBottom: "var(--sp-3)" }}>你会 ——</div>
        <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
          {node.choices?.map((c) => (
            <button key={c.label} onClick={() => choose(c.label, c.coping, c.next)} className="text-left">
              <Card style={{ transitionDuration: "var(--dur-base)" }}>
                <span style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-primary)" }}>{c.label}</span>
              </Card>
            </button>
          ))}
        </div>

        <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-5)" }}>
          没有正确答案，选你会做的
        </p>
      </div>
      <HelpFooter />
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Play />
    </Suspense>
  );
}
