"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, HelpFooter, MOOD_LABEL, MOOD_VAR, Overline, t } from "@/components/ui";
import type { JournalEntry } from "@/lib/types";

const WEEK_HEAD = ["日", "一", "二", "三", "四", "五", "六"];

function fmtDay(ts: number) {
  const d = new Date(ts);
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${w}`;
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtShort(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function relativeLabel(dayTs: number, todayStart: number): string {
  const diff = Math.round((todayStart - dayTs) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff === 2) return "前天";
  if (diff < 7) return `${diff} 天前`;
  if (diff < 30) return `${Math.round(diff / 7)} 周前`;
  return `${Math.round(diff / 30)} 个月前`;
}

export default function JournalList() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // 今日 0 点作为"今天"基准
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  // 视图月份（默认当前月）
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(todayStart);
  // 回复输入框内容（按 entryId 存）
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { getEntries } = await import("@/lib/db");
    setEntries(await getEntries());
  }, []);
  useEffect(() => {
    load().catch(() => setEntries([]));
  }, [load]);

  const remove = async (id: string) => {
    const { deleteEntry } = await import("@/lib/db");
    await deleteEntry(id);
    setConfirmId(null);
    load();
  };

  // 给某条记录回一句（写给过去的自己）
  const sendReply = async (entryId: string, text: string) => {
    const v = text.trim();
    if (!v) return;
    const { addReplyToEntry } = await import("@/lib/db");
    await addReplyToEntry(entryId, { id: crypto.randomUUID(), text: v, createdAt: Date.now() });
    setReplyInput((p) => ({ ...p, [entryId]: "" }));
    load();
  };

  // 标准月历网格：本月 1 日前的空位 + 1..天数
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const lead = first.getDay(); // 0=周日
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= daysInMonth; i++) arr.push(new Date(viewYear, viewMonth, i).getTime());
    return arr;
  }, [viewYear, viewMonth]);

  // 按天分组（保留每天所有 entry）
  const byDay = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of entries ?? []) {
      const k = dayKey(e.createdAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return m;
  }, [entries]);

  // 每格"当天最后一条"的心情（用于着色）
  const dayMood = useMemo(() => {
    const m = new Map<string, number>();
    byDay.forEach((list, k) => {
      const last = [...list].sort((a, b) => b.createdAt - a.createdAt)[0];
      m.set(k, last.quick);
    });
    return m;
  }, [byDay]);

  // 选中那天的 entries（按时间倒序）
  const selectedDayEntries = useMemo(() => {
    const list = byDay.get(dayKey(selectedDay)) ?? [];
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [byDay, selectedDay]);

  const monthLabel = `${viewYear} 年 ${viewMonth + 1} 月`;
  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };
  const goToday = () => {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    setSelectedDay(todayStart);
  };

  return (
    <Shell>
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--gap-section)" }}>
        <h1 style={{ ...t.h1, color: "var(--forest-900)" }}>记录</h1>
        <Link href={`/journal/new?date=${selectedDay}`} className="no-underline">
          <Btn size="sm">写一篇</Btn>
        </Link>
      </div>

      {/* 标准月历 */}
      <Card style={{ padding: "var(--sp-5)" }}>
        {/* 月份切换 */}
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="flex items-center" style={{ gap: "var(--gap-inline)" }}>
            <button
              onClick={goPrev}
              aria-label="上个月"
              className="flex items-center justify-center"
              style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid var(--hairline)", background: "var(--bg-elevated)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <span style={{ ...t.h3, color: "var(--forest-900)", minWidth: 108, textAlign: "center" }}>{monthLabel}</span>
            <button
              onClick={goNext}
              aria-label="下个月"
              className="flex items-center justify-center"
              style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid var(--hairline)", background: "var(--bg-elevated)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
          <Btn variant="ghost" size="sm" onClick={goToday}>今天</Btn>
        </div>

        {/* 周表头 */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
          {WEEK_HEAD.map((w, i) => (
            <div key={w} className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", paddingBottom: 2 }}>
              {w}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {cells.map((dayTs, idx) => {
            if (dayTs === null) return <div key={`x${idx}`} />;
            const isToday = dayTs === todayStart;
            const isSelected = dayTs === selectedDay;
            const k = dayKey(dayTs);
            const q = dayMood.get(k);
            const dayDate = new Date(dayTs);
            const hasEntry = q !== undefined;
            const moodVar = hasEntry ? MOOD_VAR[q as 0 | 1 | 2 | 3 | 4] : null;
            return (
              <button
                key={dayTs}
                onClick={() => setSelectedDay(dayTs)}
                aria-label={`${dayDate.getMonth() + 1} 月 ${dayDate.getDate()} 日${hasEntry ? `，心情 ${MOOD_LABEL[q as 0 | 1 | 2 | 3 | 4]}` : ""}${isToday ? "（今天）" : ""}`}
                className="flex items-center justify-center"
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 8,
                  border: isSelected ? "2px solid var(--forest-700)" : isToday ? "1.5px solid var(--forest-500)" : "1px solid var(--hairline)",
                  background: hasEntry ? `var(${moodVar})` : "var(--bg-elevated)",
                  color: hasEntry ? "#FFFFFF" : "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "var(--fs-caption)",
                  fontWeight: isToday || isSelected ? 600 : 400,
                  transitionDuration: "var(--dur-fast)",
                }}
              >
                {dayDate.getDate()}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 选中日期标题 + 写一篇 */}
      <div className="flex items-end justify-between" style={{ marginTop: "var(--gap-section)" }}>
        <div>
          <h2 style={{ ...t.h2, color: "var(--forest-900)" }}>{fmtDay(selectedDay)}</h2>
          <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: 4 }}>
            {relativeLabel(selectedDay, todayStart)} · {selectedDayEntries.length > 0 ? `共 ${selectedDayEntries.length} 篇` : "无记录"}
          </p>
        </div>
        <Link href={`/journal/new?date=${selectedDay}`} className="no-underline">
          <Btn variant="secondary" size="sm">{selectedDayEntries.length > 0 ? "再写一篇" : "写一篇"}</Btn>
        </Link>
      </div>

      {/* 选中日期的记录列表 */}
      {entries === null ? (
        <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-4)" }}>正在读取这台设备上的记录…</p>
      ) : selectedDayEntries.length === 0 ? (
        <div className="text-center" style={{ padding: "var(--sp-12) 0", color: "var(--text-tertiary)" }}>
          <p style={{ ...t.body }}>这天还没有记录。</p>
          <p style={{ ...t.caption, marginTop: "var(--sp-2)" }}>想写的时候再写，不写也没关系。</p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)", marginTop: "var(--sp-4)" }}>
          {selectedDayEntries.map((e, i) => (
            <Card key={e.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: "var(--gap-inline)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: `var(${MOOD_VAR[e.quick]})` }} />
                  <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{fmtTime(e.createdAt)}</span>
                  <span style={{ ...t.caption, color: "var(--text-secondary)" }}>{MOOD_LABEL[e.quick]}</span>
                </div>
                <div className="flex items-center" style={{ gap: "var(--gap-inline)" }}>
                  <Link href={`/journal/new?edit=${e.id}`} className="no-underline" style={{ ...t.caption, color: "var(--forest-700)", minHeight: 32, padding: "0 4px", display: "inline-flex", alignItems: "center" }}>
                    编辑
                  </Link>
                  <button
                    onClick={() => setConfirmId(e.id)}
                    aria-label="删除这一篇"
                    style={{ ...t.caption, color: "var(--text-tertiary)", minHeight: 32, padding: "0 4px" }}
                  >
                    删除
                  </button>
                </div>
              </div>

              {e.light && (
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", marginTop: "var(--sp-3)" }}>{e.light}</p>
              )}
              {e.shadow && (
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-secondary)", marginTop: "var(--sp-2)" }}>{e.shadow}</p>
              )}

              {(e.tags.length > 0 || e.emotions.length > 0) && (
                <div className="flex flex-wrap" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-4)" }}>
                  {e.emotions.map((x) => (
                    <span key={x} style={{ ...t.caption, background: "var(--forest-100)", color: "var(--forest-900)", borderRadius: "var(--r-xs)", padding: "3px 10px" }}>{x}</span>
                  ))}
                  {e.tags.map((x) => (
                    <span key={x} style={{ ...t.caption, background: "var(--bg-tint)", color: "var(--text-secondary)", borderRadius: "var(--r-xs)", padding: "3px 10px" }}>#{x}</span>
                  ))}
                </div>
              )}

              {/* 回复过去的自己 */}
              {(e.replies ?? []).length > 0 && (
                <div className="flex flex-col" style={{ gap: 6, marginTop: "var(--sp-4)" }}>
                  {(e.replies ?? []).map((r) => (
                    <div key={r.id} style={{ background: "var(--bg-tint)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>
                      <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>{fmtShort(r.createdAt)} · 我</div>
                      <p style={{ ...t.body, color: "var(--text-primary)", marginTop: 2 }}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-3)" }}>
                <input
                  value={replyInput[e.id] ?? ""}
                  onChange={(ev) => setReplyInput((p) => ({ ...p, [e.id]: ev.target.value }))}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" && !ev.shiftKey) {
                      ev.preventDefault();
                      sendReply(e.id, replyInput[e.id] ?? "");
                    }
                  }}
                  placeholder="回头看看，想对那天的自己说点什么…"
                  className="flex-1"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--forest-300)",
                    borderRadius: "var(--r-sm)",
                    padding: "0 12px",
                    height: 34,
                    fontSize: "var(--fs-caption)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
                <Btn variant="secondary" size="sm" onClick={() => sendReply(e.id, replyInput[e.id] ?? "")}>回一句</Btn>
              </div>

              {confirmId === e.id && (
                <div className="flex items-center justify-between" style={{ marginTop: "var(--sp-4)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--divider)" }}>
                  <span style={{ ...t.caption, color: "var(--text-secondary)" }}>删掉这一篇？不可恢复。</span>
                  <div className="flex" style={{ gap: "var(--gap-inline)" }}>
                    <Btn variant="ghost" size="sm" onClick={() => setConfirmId(null)}>再想想</Btn>
                    {/* DESIGN §1.1.6：破坏性操作 = Secondary + care-700 文字色 */}
                    <Btn variant="secondary" size="sm" onClick={() => remove(e.id)} style={{ color: "var(--care-700)", borderColor: "var(--care-700)" }}>删除</Btn>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 图例 */}
      <div style={{ marginTop: "var(--gap-section)" }}>
        <Overline>色块 = 当天心情</Overline>
        <div className="flex items-center" style={{ gap: 6, marginTop: "var(--sp-3)" }}>
          <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>很糟</span>
          {MOOD_VAR.map((v) => (
            <span key={v} style={{ width: 12, height: 12, borderRadius: 4, background: `var(${v})` }} />
          ))}
          <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>很好</span>
        </div>
      </div>

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
      <HelpFooter />
    </Shell>
  );
}