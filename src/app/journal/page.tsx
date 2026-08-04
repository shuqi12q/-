"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, HelpFooter, MOOD_LABEL, MOOD_VAR, Overline, t } from "@/components/ui";
import type { JournalEntry } from "@/lib/types";

const DAYS = 35;
// 没记录的"今天"格子用浅棕色（参考用户截图），其他按心情色
const TODAY_BG = "#E8DCC6";

function fmtDay(ts: number) {
  const d = new Date(ts);
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${w}`;
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  const [selectedDay, setSelectedDay] = useState<number>(todayStart);

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

  // 35 天网格：最后一格 = 今天，向前倒数 35 天
  const cells = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => todayStart - (DAYS - 1 - i) * 86400000),
    [todayStart],
  );

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

  return (
    <Shell>
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--gap-section)" }}>
        <h1 style={{ ...t.h1, color: "var(--forest-900)" }}>记录</h1>
        <Link href={`/journal/new?date=${selectedDay}`} className="no-underline">
          <Btn size="sm">写一篇</Btn>
        </Link>
      </div>

      {/* 日历网格 */}
      <Overline>最近 35 天</Overline>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginTop: "var(--sp-3)" }}>
        {cells.map((dayTs) => {
          const isToday = dayTs === todayStart;
          const isSelected = dayTs === selectedDay;
          const k = dayKey(dayTs);
          const q = dayMood.get(k);
          const dayDate = new Date(dayTs);
          const dayNum = dayDate.getDate();
          const hasEntry = q !== undefined;
          const moodVar = hasEntry ? MOOD_VAR[q as 0 | 1 | 2 | 3 | 4] : null;
          const bg = isToday && !hasEntry
            ? TODAY_BG
            : hasEntry
              ? `var(${moodVar})`
              : "var(--bg-elevated)";
          const numColor = isToday && !hasEntry
            ? "var(--text-primary)"
            : hasEntry
              ? "#FFFFFF"
              : "var(--text-secondary)";
          return (
            <button
              key={dayTs}
              onClick={() => setSelectedDay(dayTs)}
              aria-label={`${dayDate.getMonth() + 1} 月 ${dayNum} 日${hasEntry ? `，心情 ${MOOD_LABEL[q as 0 | 1 | 2 | 3 | 4]}` : ""}${isToday ? "（今天）" : ""}`}
              className="flex items-center justify-center"
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 8,
                border: isSelected ? "2px solid var(--forest-700)" : "1px solid var(--hairline)",
                background: bg,
                cursor: "pointer",
                padding: 0,
                color: numColor,
                fontSize: "var(--fs-caption)",
                fontWeight: isSelected || isToday ? 600 : 400,
                boxShadow: isSelected ? "var(--shadow-xs)" : "none",
                transitionDuration: "var(--dur-fast)",
              }}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

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
                <button
                  onClick={() => setConfirmId(e.id)}
                  aria-label="删除这一篇"
                  style={{ ...t.caption, color: "var(--text-tertiary)", minHeight: 32, padding: "0 4px" }}
                >
                  删除
                </button>
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

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
      <HelpFooter />
    </Shell>
  );
}