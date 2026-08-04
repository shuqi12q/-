"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import CrisisLayer from "@/components/CrisisLayer";
import PrivacyBadge from "@/components/PrivacyBadge";
import Shell from "@/components/Shell";
import { Btn, Card, MOOD_LABEL, MOOD_VAR, MoodGlyph, t } from "@/components/ui";
import {
  armSafeMode,
  armSuppress,
  clearSuppress,
  detectCrisisDetail,
  hasNewSignal,
  readSuppress,
} from "@/lib/crisis";
import { EMO_12, TAG_PRESET, type QuickMood } from "@/lib/types";

function fmtDay(ts: number) {
  const d = new Date(ts);
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${w}`;
}

const PH_LIGHT = [
  "今天有什么让你稍微松了口气的瞬间吗？",
  "有没有什么小事，现在想起来还觉得不错？",
];
const PH_SHADOW = [
  "有什么一直压在心里、还没说出口的吗？",
  "今天哪一刻你觉得有点撑不住？",
];

interface Draft {
  quick: number | null;
  emotions: string[];
  intensity?: number;
  light: string;
  shadow: string;
  tags: string[];
}

const EMPTY: Draft = { quick: null, emotions: [], light: "", shadow: "", tags: [] };

function NewEntry() {
  const router = useRouter();
  const params = useSearchParams();
  const [d, setD] = useState<Draft>(EMPTY);
  const [customTag, setCustomTag] = useState("");
  const [sheet, setSheet] = useState(false);
  const [ph, setPh] = useState(0);
  const [saved, setSaved] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [pendingHits, setPendingHits] = useState<string[]>([]);
  const restored = useRef(false);

  // 补写过去某天：?date=<timestamp(ms)>，默认写入那一天的中午
  const targetTs = useMemo(() => {
    const p = params.get("date");
    if (!p) return null;
    const ts = Number(p);
    if (!Number.isFinite(ts) || Number.isNaN(new Date(ts).getTime())) return null;
    const d2 = new Date(ts);
    d2.setHours(12, 0, 0, 0);
    return d2.getTime();
  }, [params]);
  const todayStart = useMemo(() => {
    const d2 = new Date();
    d2.setHours(0, 0, 0, 0);
    return d2.getTime();
  }, []);
  const isBackdate = targetTs !== null && targetTs < todayStart;

  // 进入先恢复草稿；URL 上带 quick 时（首页一键打卡）优先用它
  useEffect(() => {
    const raw = window.localStorage.getItem("psy_draft");
    let next: Draft = EMPTY;
    if (raw) {
      try {
        next = { ...EMPTY, ...(JSON.parse(raw) as Draft) };
      } catch {
        next = EMPTY;
      }
    }
    const q = Number(params.get("quick"));
    if (params.get("quick") !== null && q >= 0 && q <= 4) next = { ...next, quick: q };
    setD(next);
    setPh(Math.random() < 0.5 ? 0 : 1);
    restored.current = true;
  }, [params]);

  // 边写边存本地草稿
  useEffect(() => {
    if (!restored.current) return;
    window.localStorage.setItem("psy_draft", JSON.stringify(d));
  }, [d]);

  const toggle = (key: "emotions" | "tags", v: string) =>
    setD((p) => ({
      ...p,
      [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v],
    }));

  const wordCount = d.light.length + d.shadow.length;
  const canSave = d.quick !== null;

  const save = async () => {
    if (d.quick === null) return;
    const { addEntry } = await import("@/lib/db");
    await addEntry({
      id: crypto.randomUUID(),
      createdAt: targetTs ?? Date.now(),
      quick: d.quick as QuickMood,
      emotions: d.emotions,
      intensity: d.intensity,
      light: d.light.trim(),
      shadow: d.shadow.trim(),
      tags: d.tags,
    });
    window.localStorage.removeItem("psy_draft");
    setSaved(true);

    // 顺序铁律：先落库、再检测。绝不能出现「因为触发了危机检测所以内容没存下来」；
    // 书写过程中（onChange）一律不检测、不打断。
    const { level, hits } = detectCrisisDetail(`${d.light}\n${d.shadow}`);
    const prev = readSuppress();
    if (level === 3 && (!prev || hasNewSignal(hits, prev))) {
      clearSuppress();
      setTimeout(() => {
        setPendingHits(hits);
        setCrisis(true);
      }, 200);
      return;
    }
    router.push("/journal");
  };

  const leaveJournal = () => {
    armSuppress(pendingHits);
    armSafeMode();
    router.push("/journal");
  };

  return (
    <Shell>
      <h1 className="text-center" style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--gap-section)" }}>
        {isBackdate && targetTs ? `${fmtDay(targetTs)}那天，整体感觉怎么样？` : "今天，整体感觉怎么样？"}
      </h1>

      {/* STEP 1 · 快速 5 态 */}
      <div className="flex justify-between" style={{ marginBottom: "var(--gap-section)" }}>
        {[4, 3, 2, 1, 0].map((lv) => {
          const on = d.quick === lv;
          return (
            <button
              key={lv}
              onClick={() => setD((p) => ({ ...p, quick: lv }))}
              className="flex flex-col items-center"
              style={{ gap: 6 }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 999,
                  background: `var(${MOOD_VAR[lv]})`,
                  opacity: on ? 1 : 0.35,
                  boxShadow: on ? "0 0 0 2px var(--bg-base), 0 0 0 4px var(--forest-700)" : "none",
                  transitionDuration: "var(--dur-base)",
                }}
              >
                <MoodGlyph level={lv} size={34} />
              </span>
              <span style={{ ...t.caption, color: on ? "var(--forest-900)" : "var(--text-secondary)" }}>
                {MOOD_LABEL[lv]}
              </span>
            </button>
          );
        })}
      </div>

      {d.quick !== null && (
        <div className="fade-up flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
          {/* 光 / 影 双栏，允许只填一栏 */}
          <Card>
            <div className="flex items-center" style={{ gap: 6 }}>
              <span style={{ ...t.h3, color: "var(--forest-900)" }}>今天的光</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wood-500)" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" />
              </svg>
            </div>
            <textarea
              value={d.light}
              onChange={(e) => setD((p) => ({ ...p, light: e.target.value }))}
              placeholder={PH_LIGHT[ph]}
              className="content-serif w-full mt-3"
              style={{
                minHeight: 96,
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
              }}
            />
          </Card>

          <Card>
            <div className="flex items-center" style={{ gap: 6 }}>
              <span style={{ ...t.h3, color: "var(--forest-900)" }}>今天的影</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest-500)" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M17 14.5A8 8 0 0 1 9.5 7a6.5 6.5 0 1 0 7.5 7.5Z" />
              </svg>
            </div>
            <textarea
              value={d.shadow}
              onChange={(e) => setD((p) => ({ ...p, shadow: e.target.value }))}
              placeholder={PH_SHADOW[ph]}
              className="content-serif w-full mt-3"
              style={{
                minHeight: 96,
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
              }}
            />
          </Card>

          <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)" }}>
            两栏都可以留空，写一栏也算数
          </p>

          {/* 标签 */}
          <div>
            <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>
              这件事和什么有关？
            </div>
            <div className="flex flex-wrap" style={{ gap: "var(--gap-inline)" }}>
              {[...TAG_PRESET, ...d.tags.filter((x) => !(TAG_PRESET as readonly string[]).includes(x))].map((tag) => {
                const on = d.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggle("tags", tag)}
                    style={{
                      background: on ? "var(--forest-100)" : "var(--bg-tint)",
                      color: on ? "var(--forest-900)" : "var(--text-secondary)",
                      borderRadius: "var(--r-xs)",
                      padding: "6px 12px",
                      minHeight: 32,
                      fontSize: "var(--fs-caption)",
                      transitionDuration: "var(--dur-fast)",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="flex" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-3)" }}>
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="自定义一个标签"
                className="flex-1"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--forest-300)",
                  borderRadius: "var(--r-sm)",
                  padding: "0 12px",
                  height: 36,
                  fontSize: "var(--fs-caption)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => {
                  const v = customTag.trim();
                  if (!v || d.tags.includes(v)) return;
                  setD((p) => ({ ...p, tags: [...p.tags, v] }));
                  setCustomTag("");
                }}
              >
                添加
              </Btn>
            </div>
          </div>

          <Btn variant="secondary" size="lg" full onClick={() => setSheet(true)}>
            想再说得具体一点吗？（可跳过）
          </Btn>
          <Btn size="lg" full disabled={!canSave} onClick={save}>
            保存这一天
          </Btn>

          {saved && (
            <p className="text-center fade-up" style={{ ...t.caption, color: "var(--forest-700)" }}>
              已保存
            </p>
          )}

          <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-4)" }}>
            <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{wordCount} 字 · 已自动保存</span>
            <PrivacyBadge text="仅存在这台设备" />
          </div>
        </div>
      )}

      {/* STEP 2 · 细化情绪（底部弹层，保持「还在写同一篇」的连续性） */}
      {sheet && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: "var(--z-sheet)", background: "var(--bg-scrim)" }}
        >
          <div
            className="w-full overflow-y-auto fade-up"
            style={{
              maxWidth: 480,
              maxHeight: "78vh",
              background: "var(--bg-elevated)",
              borderRadius: "var(--r-xl) var(--r-xl) 0 0",
              padding: "var(--sp-6) var(--gap-page-x)",
            }}
          >
            <div className="mx-auto" style={{ width: 40, height: 4, borderRadius: 999, background: "var(--forest-300)" }} />
            <h2 style={{ ...t.h2, color: "var(--forest-900)", marginTop: "var(--sp-5)" }}>
              更具体一点的话，是哪几种？
            </h2>
            <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-6)" }}>
              可以多选，也可以一个都不选
            </p>

            <div className="flex flex-wrap" style={{ gap: "var(--gap-inline)" }}>
              {EMO_12.map((emo, i) => {
                const on = d.emotions.includes(emo);
                const vv = MOOD_VAR[i < 4 ? 4 : i < 8 ? 1 : 0];
                return (
                  <button
                    key={emo}
                    onClick={() => toggle("emotions", emo)}
                    className="inline-flex items-center"
                    style={{
                      gap: 6,
                      background: on ? "var(--forest-100)" : "var(--bg-elevated)",
                      border: on ? "1.5px solid var(--forest-700)" : "1px solid var(--forest-300)",
                      color: on ? "var(--forest-900)" : "var(--text-secondary)",
                      fontWeight: on ? 500 : 400,
                      borderRadius: 999,
                      padding: "9px 14px",
                      minHeight: 40,
                      fontSize: "var(--fs-body)",
                      transitionDuration: "var(--dur-fast)",
                    }}
                  >
                    {on && <span style={{ width: 6, height: 6, borderRadius: 999, background: `var(${vv})` }} />}
                    {emo}
                  </button>
                );
              })}
            </div>

            {d.emotions.length > 0 && (
              <div style={{ marginTop: "var(--gap-section)" }}>
                <div style={{ ...t.body, color: "var(--text-primary)" }}>整体有多强烈？</div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={d.intensity ?? 3}
                  onChange={(e) => setD((p) => ({ ...p, intensity: Number(e.target.value) }))}
                  className="w-full"
                  style={{ accentColor: "var(--forest-700)", marginTop: "var(--sp-3)" }}
                />
                <div className="flex justify-between" style={{ ...t.caption, color: "var(--text-tertiary)" }}>
                  <span>有一点</span>
                  <span>明显</span>
                  <span>很强烈</span>
                </div>
              </div>
            )}

            <div style={{ margin: "var(--gap-section) 0 var(--sp-6)" }}>
              <Btn size="lg" full onClick={() => setSheet(false)}>完成</Btn>
            </div>
          </div>
        </div>
      )}

      {crisis && <CrisisLayer variant="journal" onClose={leaveJournal} onContinue={leaveJournal} />}
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewEntry />
    </Suspense>
  );
}
