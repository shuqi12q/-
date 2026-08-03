"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ExplainCard from "@/components/ExplainCard";
import RoleTile from "@/components/RoleTile";
import Shell from "@/components/Shell";
import { Btn, Card, HelpFooter, Overline, t } from "@/components/ui";
import { computeProfile, recommendRole, type Recommendation } from "@/lib/recommend";
import { STORY } from "@/lib/story";

export default function StoryHome() {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { getEntries } = await import("@/lib/db");
      const list = await getEntries();
      setRec(recommendRole(computeProfile(list), STORY.characters));
    })()
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const others = STORY.characters.filter((c) => c.id !== rec?.character.id);

  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)" }}>《{STORY.title}》</h1>
      <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-secondary)", marginTop: "var(--sp-2)" }}>
        一个关于{STORY.theme}的四幕故事
      </p>
      <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--gap-section)" }}>
        4 幕 · 可随时退出 · 没有正确答案
      </p>

      <Card style={{ borderRadius: "var(--r-xl)", padding: 0, overflow: "hidden", marginBottom: "var(--gap-section)" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,var(--wood-500),var(--forest-500))" }} />
        <div style={{ padding: "var(--sp-6)" }}>
          <Overline>另一种走法</Overline>
          <h2 className="content-serif" style={{ ...t.h3, color: "var(--forest-900)", margin: "var(--sp-2) 0" }}>
            《这一年的路》
          </h2>
          <p style={{ ...t.body, color: "var(--text-secondary)" }}>
            12 格 · 桌游式 · 回头看看这一年。没有分数，没有对错，也没有人会看到。
          </p>
          <div style={{ marginTop: "var(--sp-4)" }}>
            <Link href="/story/path" className="no-underline block">
              <Btn size="lg" full>走这一年的路</Btn>
            </Link>
          </div>
        </div>
      </Card>

      <h2 style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-4)" }}>
        你想用谁的眼睛看这件事？
      </h2>

      {loaded && rec && (
        <Card style={{ borderRadius: "var(--r-xl)", padding: 0, overflow: "hidden", marginBottom: "var(--gap-card-stack)" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg,var(--forest-500),var(--wood-500))" }} />
          <div style={{ padding: "var(--sp-6)" }}>
            <div className="flex items-center" style={{ gap: "var(--sp-4)" }}>
              <RoleTile color={rec.character.color} symbol={rec.character.symbol} />
              <div>
                <div style={{ ...t.overline, color: "var(--wood-700)" }}>✦ 推荐给你</div>
                <div style={{ ...t.h3, color: "var(--forest-900)", marginTop: 2 }}>{rec.character.name}</div>
                <div style={{ ...t.caption, color: "var(--text-secondary)" }}>{rec.character.blurb}</div>
              </div>
            </div>
            <div style={{ marginTop: "var(--sp-4)" }}>
              <ExplainCard reason={rec.reason} />
            </div>
            <div style={{ marginTop: "var(--sp-4)" }}>
              <Link href={`/story/play?role=${rec.character.id}`} className="no-underline block">
                <Btn size="lg" full>用 TA 的视角开始</Btn>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {loaded && !rec && (
        <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-4)" }}>
          还不太了解你，随便选一个都可以。
        </p>
      )}

      {rec && <div style={{ marginBottom: "var(--sp-3)" }}><Overline>其他视角</Overline></div>}

      <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
        {(rec ? others : STORY.characters).map((c, i) => (
          <Link key={c.id} href={`/story/play?role=${c.id}`} className="no-underline">
            <Card className="fade-up" style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}>
              <div className="flex items-center" style={{ gap: "var(--sp-4)" }}>
                <RoleTile color={c.color} symbol={c.symbol} size={56} />
                <div className="flex-1">
                  <div style={{ ...t.h3, color: "var(--forest-900)" }}>{c.name}</div>
                  <div style={{ ...t.caption, color: "var(--text-secondary)" }}>{c.blurb}</div>
                </div>
                <span style={{ color: "var(--forest-700)" }}>→</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--gap-section)" }}>
        这不是测评，只是换一种眼睛看同一件事
      </p>
      <HelpFooter />
    </Shell>
  );
}
