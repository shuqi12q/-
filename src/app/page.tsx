"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ForestScene from "@/components/ForestScene";
import BreathingLeaf from "@/components/BreathingLeaf";
import ExplainCard from "@/components/ExplainCard";
import PrivacyBadge from "@/components/PrivacyBadge";
import RoleTile from "@/components/RoleTile";
import Shell from "@/components/Shell";
import { Btn, Card, HelpFooter, MOOD_LABEL, MOOD_VAR, MoodGlyph, Overline, t } from "@/components/ui";
import { FRIEND_NAME, buildOpener } from "@/lib/persona";
import { computeProfile, recommendRole, type Recommendation } from "@/lib/recommend";
import { STORY } from "@/lib/story";
import type { JournalEntry } from "@/lib/types";

function sceneVariant(h: number): "day" | "dusk" | "night" {
  if (h >= 20 || h < 5) return "night";
  if (h >= 17) return "dusk";
  return "day";
}

const AMBIENT_LINE: Record<string, string> = {
  day: "白天的林子，光从叶缝里落下来",
  dusk: "黄昏的林子，风慢下来了",
  night: "夜里的林子，很安静，你可以待一会儿",
};

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [variant, setVariant] = useState<"day" | "dusk" | "night">("day");
  const [rec, setRec] = useState<Recommendation | null>(null);

  useEffect(() => {
    setVariant(sceneVariant(new Date().getHours()));
    (async () => {
      const { getEntries } = await import("@/lib/db");
      const list = await getEntries();
      setEntries(list);
      setRec(recommendRole(computeProfile(list), STORY.characters));
    })().catch(() => setEntries([]));
  }, []);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todays = (entries ?? []).filter((e) => e.createdAt >= todayStart.getTime());
  const checkedInToday = todays.length > 0;
  const lastNegative = (entries ?? []).some((e) => e.quick <= 1);
  const opener = buildOpener({ checkedInToday, lastNegative });

  return (
    <Shell>
      <ForestScene variant={variant} />
      <div style={{ ...t.overline, color: "var(--forest-700)", opacity: 0.85, margin: "var(--sp-3) 0 var(--gap-section)" }}>
        {AMBIENT_LINE[variant]}
      </div>

      <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
        {/* 卡片 1 · AI 朋友问候 */}
        <Card className="fade-up">
          <div className="flex items-center" style={{ gap: "var(--sp-3)" }}>
            <BreathingLeaf size={44} />
            <div>
              <div style={{ ...t.h3, color: "var(--forest-900)" }}>{FRIEND_NAME}</div>
              <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>在</div>
            </div>
          </div>
          <p style={{ ...t.bodyLg, color: "var(--text-primary)", margin: "var(--sp-4) 0" }}>{opener}</p>
          <div className="flex justify-end">
            <Link href="/chat" className="no-underline">
              <Btn variant="ghost">聊聊 →</Btn>
            </Link>
          </div>
        </Card>

        {/* 卡片 2 · 今日情绪打卡 */}
        <Card
          className="fade-up"
          style={{
            animationDelay: "60ms",
            background: checkedInToday ? "var(--wood-100)" : "var(--bg-elevated)",
            border: checkedInToday ? "1px solid var(--hairline)" : "1px solid var(--forest-300)",
          }}
        >
          <div style={{ ...t.h3, color: "var(--forest-900)" }}>
            {checkedInToday ? "今天已经记录过了" : "今天还没记录"}
          </div>

          {checkedInToday ? (
            <div className="flex items-center" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-4)" }}>
              <span
                className="inline-block"
                style={{ width: 12, height: 12, borderRadius: 999, background: `var(${MOOD_VAR[todays[0].quick]})` }}
              />
              <span style={{ ...t.body, color: "var(--text-secondary)" }}>
                今天：{MOOD_LABEL[todays[0].quick]}
              </span>
            </div>
          ) : (
            <div className="flex justify-between" style={{ marginTop: "var(--sp-4)" }}>
              {[4, 3, 2, 1, 0].map((lv) => (
                <Link
                  key={lv}
                  href={`/journal/new?quick=${lv}`}
                  className="flex flex-col items-center no-underline"
                  style={{ gap: 6 }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 999,
                      background: `var(${MOOD_VAR[lv]})`,
                      opacity: 0.35,
                    }}
                  >
                    <MoodGlyph level={lv} />
                  </span>
                  <span style={{ ...t.caption, color: "var(--text-secondary)" }}>{MOOD_LABEL[lv]}</span>
                </Link>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--divider)", margin: "var(--sp-4) 0 var(--sp-3)" }} />
          <Link href="/journal/new" className="no-underline" style={{ ...t.body, color: "var(--forest-700)" }}>
            写完整记录 →
          </Link>
        </Card>

        {/* 卡片 3 · 今日推荐 */}
        <Card className="fade-up" style={{ animationDelay: "120ms", borderRadius: "var(--r-xl)", padding: 0, overflow: "hidden" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg,var(--forest-500),var(--wood-500))" }} />
          <div style={{ padding: "var(--sp-6)" }}>
            <Overline>今日推荐</Overline>
            <h2 style={{ ...t.h3, color: "var(--forest-900)", margin: "var(--sp-2) 0 var(--sp-4)" }}>
              《{STORY.title}》· 关于{STORY.theme}的四幕故事
            </h2>

            {entries === null ? (
              <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>正在读取这台设备上的记录…</div>
            ) : rec ? (
              <>
                <div className="flex items-center" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
                  <RoleTile color={rec.character.color} symbol={rec.character.symbol} size={56} />
                  <div>
                    <div style={{ ...t.body, color: "var(--forest-900)", fontWeight: 500 }}>
                      {rec.character.name}
                      <span style={{ color: "var(--wood-700)", marginLeft: 6 }}>✦ 推荐给你</span>
                    </div>
                    <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>{rec.character.blurb}</div>
                  </div>
                </div>
                <ExplainCard reason={rec.reason} />
                <div style={{ marginTop: "var(--sp-4)" }}>
                  <Link href={`/story?role=${rec.character.id}`} className="no-underline block">
                    <Btn size="lg" full>去看看</Btn>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>
                  还不太了解你，随便选一个都可以。
                </p>
                <div style={{ marginTop: "var(--sp-4)" }}>
                  <Link href="/story" className="no-underline block">
                    <Btn size="lg" full variant="secondary">去故事里看看</Btn>
                  </Link>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge text="你写下的内容从未离开这台设备" />
      </div>
      <HelpFooter />
    </Shell>
  );
}
