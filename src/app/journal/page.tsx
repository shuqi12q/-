"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, HelpFooter, MOOD_LABEL, MOOD_VAR, Overline, t } from "@/components/ui";
import type { JournalEntry } from "@/lib/types";

const DAYS = 35;

function fmt(ts: number) {
  const d = new Date(ts);
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${w} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function JournalList() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

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

  // 最近 35 天热力图：每天取当天最后一条的 quick
  const byDay = new Map<string, number>();
  for (const e of entries ?? []) if (!byDay.has(dayKey(e.createdAt))) byDay.set(dayKey(e.createdAt), e.quick);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today.getTime() - (DAYS - 1 - i) * 86400000);
    const q = byDay.get(dayKey(d.getTime()));
    return { d, q };
  });

  return (
    <Shell>
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--gap-section)" }}>
        <h1 style={{ ...t.h1, color: "var(--forest-900)" }}>记录</h1>
        <Link href="/journal/new" className="no-underline">
          <Btn size="sm">写一篇</Btn>
        </Link>
      </div>

      {entries === null ? (
        <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>正在读取这台设备上的记录…</p>
      ) : entries.length === 0 ? (
        <div className="text-center" style={{ padding: "var(--sp-12) 0" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--forest-300)" strokeWidth="1.5" strokeLinecap="round" className="mx-auto" aria-hidden>
            <path d="M12 6.5C10 5 7 4.7 4 5.2V18.2c3-.5 6-.2 8 1.3M12 6.5c2-1.5 5-1.8 8-1.3V18.2c-3-.5-6-.2-8 1.3" />
          </svg>
          <p style={{ ...t.body, color: "var(--text-tertiary)", marginTop: "var(--sp-4)" }}>
            还没有记录。想写的时候再写，不写也没关系。
          </p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
          {entries.map((e, i) => (
            <Card key={e.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: "var(--gap-inline)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: `var(${MOOD_VAR[e.quick]})` }} />
                  <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{fmt(e.createdAt)}</span>
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
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", marginTop: "var(--sp-3)" }}>
                  {e.light}
                </p>
              )}
              {e.shadow && (
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-secondary)", marginTop: "var(--sp-2)" }}>
                  {e.shadow}
                </p>
              )}

              {(e.tags.length > 0 || e.emotions.length > 0) && (
                <div className="flex flex-wrap" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-4)" }}>
                  {e.emotions.map((x) => (
                    <span key={x} style={{ ...t.caption, background: "var(--forest-100)", color: "var(--forest-900)", borderRadius: "var(--r-xs)", padding: "3px 10px" }}>
                      {x}
                    </span>
                  ))}
                  {e.tags.map((x) => (
                    <span key={x} style={{ ...t.caption, background: "var(--bg-tint)", color: "var(--text-secondary)", borderRadius: "var(--r-xs)", padding: "3px 10px" }}>
                      #{x}
                    </span>
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

      {/* 日历热力图 */}
      <div style={{ marginTop: "var(--gap-section)" }}>
        <Overline>最近 35 天</Overline>
        <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: "var(--sp-3)" }}>
          {cells.map(({ d, q }) => (
            <div
              key={d.getTime()}
              title={`${d.getMonth() + 1}/${d.getDate()}`}
              style={{
                paddingTop: "100%",
                borderRadius: 6,
                background: q === undefined ? "var(--v-none)" : `var(${MOOD_VAR[q]})`,
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-end" style={{ gap: 6, marginTop: "var(--sp-3)" }}>
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
