"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import BoxBack from "@/components/BoxBack";
import PrivacyBadge from "@/components/PrivacyBadge";
import { t } from "@/components/ui";
import {
  MIND_PRACTICES,
  SCENE_THEMES,
  timeOfDayNow,
  TIME_GREETING_LABEL,
} from "@/lib/mind-data";
import { getMindSessions } from "@/lib/db";
import { MIND_AUDIO_LABEL } from "@/lib/types";

export default function MindLobby() {
  const router = useRouter();
  const [todayCount, setTodayCount] = useState<number>(0);
  const [todayMin, setTodayMin] = useState<number>(0);
  const tod = timeOfDayNow();
  const theme = SCENE_THEMES[tod];

  useEffect(() => {
    (async () => {
      try {
        const list = await getMindSessions();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todays = list.filter((s) => s.createdAt >= startOfDay.getTime());
        setTodayCount(todays.length);
        setTodayMin(Math.round(todays.reduce((sum, s) => sum + s.durationMin, 0)));
      } catch {}
    })();
  }, []);

  return (
    <Shell>
      <BoxBack />

      {/* 顶部：场景 + 标题 */}
      <div
        className="fade-up"
        style={{
          marginBottom: "var(--sp-4)",
          padding: "var(--sp-5) var(--sp-4)",
          borderRadius: "var(--r-xl)",
          background: `linear-gradient(135deg, ${theme.sky[0]}, ${theme.sky[1]})`,
          color: theme.warmth < 0.6 ? "#F2EBD7" : "#3F4A43",
          boxShadow: "0 4px 16px rgba(0,0,0,.06)",
        }}
      >
        <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>🌿</span>
          <h1 style={{ ...t.h1, margin: 0 }}>正念放映室</h1>
          <span style={{ fontSize: 20 }}>🌿</span>
        </div>
        <p style={{ ...t.body, opacity: 0.85, marginTop: 4 }}>
          {TIME_GREETING_LABEL[tod]}，愿此刻安然。
        </p>
        <div
          className="flex items-center"
          style={{ marginTop: 12, gap: 12, fontSize: "var(--fs-caption)", opacity: 0.9 }}
        >
          <span>📿 今日 {todayCount} 次 · {todayMin} 分钟</span>
          <span>·</span>
          <Link
            href="/box/mind/records"
            className="no-underline"
            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            查看记录 →
          </Link>
        </div>
      </div>

      {/* 练习卡片列表 */}
      <h2
        className="fade-up"
        style={{
          ...t.h3,
          color: "var(--forest-900)",
          margin: "var(--sp-4) 0 var(--sp-3)",
        }}
      >
        选择一场练习
      </h2>

      <div className="flex flex-col" style={{ gap: "var(--gap-section)" }}>
        {MIND_PRACTICES.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/box/mind/practice/${p.id}`)}
            className="fade-up text-left"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--r-xl)",
              padding: "var(--sp-4)",
              display: "flex",
              gap: "var(--sp-4)",
              alignItems: "center",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,.03)",
              transition: "transform .15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* 左侧图标块 */}
            <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 80,
                height: 80,
                borderRadius: "var(--r-lg)",
                background: p.iconBg,
                fontSize: 36,
              }}
            >
              {p.iconEmoji}
            </div>

            {/* 右侧内容 */}
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
                {p.companion && (
                  <span
                    title="有陪伴"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "var(--forest-50)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                    }}
                  >
                    🔒
                  </span>
                )}
                <h3 style={{ ...t.h3, color: "var(--forest-900)", margin: 0 }}>{p.name}</h3>
              </div>
              <p
                style={{
                  ...t.body,
                  color: "var(--text-secondary)",
                  fontSize: "var(--fs-caption)",
                  lineHeight: 1.55,
                  marginBottom: 8,
                }}
              >
                {p.desc}
              </p>
              <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "#EAF6EF",
                    color: "#2A5C44",
                    fontSize: "var(--fs-caption)",
                    fontWeight: 600,
                  }}
                >
                  🌬 {p.tag}
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-caption)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  ⏱ {p.durationMin[0]}–{p.durationMin[1]} 分钟
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-caption)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  · {MIND_AUDIO_LABEL[p.audio]}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}