"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import BoxBack from "@/components/BoxBack";
import PrivacyBadge from "@/components/PrivacyBadge";
import { t } from "@/components/ui";
import {
  deleteMindSession,
  getMindSessions,
  updateMindSession,
} from "@/lib/db";
import { MOOD_EMOJIS } from "@/lib/mind-data";
import type { MindSessionRecord } from "@/lib/types";

export default function MindRecords() {
  const [records, setRecords] = useState<MindSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MindSessionRecord | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getMindSessions();
      setRecords(list);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = records.length;
    const totalMin = Math.round(records.reduce((s, r) => s + r.durationMin, 0));
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todays = records.filter((r) => r.createdAt >= startOfDay.getTime());
    return {
      total,
      totalMin,
      todayCount: todays.length,
      todayMin: Math.round(todays.reduce((s, r) => s + r.durationMin, 0)),
    };
  }, [records]);

  // 按呼吸法分组统计（4 种固定顺序 + 其他）
  const perPractice = useMemo(() => {
    const m = new Map<string, { name: string; min: number; count: number }>();
    for (const r of records) {
      const cur = m.get(r.practiceId) ?? { name: r.practiceName, min: 0, count: 0 };
      cur.min += r.durationMin;
      cur.count += 1;
      m.set(r.practiceId, cur);
    }
    const order = ["belly", "box", "sleep478", "resonance"];
    const rows = order
      .filter((id) => m.has(id))
      .map((id) => ({ id, ...m.get(id)! }));
    const others = Array.from(m.entries()).filter(([id]) => !order.includes(id));
    return { rows, others };
  }, [records]);

  // 按日期分组
  const groups = useMemo(() => {
    const m = new Map<string, MindSessionRecord[]>();
    for (const r of records) {
      const d = new Date(r.createdAt);
      const k = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries()); // 已经是按 createdAt 倒序
  }, [records]);

  const onDelete = async (id: string) => {
    await deleteMindSession(id);
    setConfirmDel(null);
    load();
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    await updateMindSession(editing);
    setEditing(null);
    load();
  };

  return (
    <Shell>
      <BoxBack />
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>
        🪷 正念记录
      </h1>

      {/* 顶部统计卡（参考图4 风格） */}
      <div
        className="fade-up"
        style={{
          background: "linear-gradient(135deg, #3E5B4A, #2F4238)",
          color: "#F2EBD7",
          borderRadius: "var(--r-xl)",
          padding: "var(--sp-5) var(--sp-4)",
          marginBottom: "var(--sp-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 6px 18px rgba(46, 60, 50, 0.15)",
        }}
      >
        <div>
          <p style={{ ...t.body, opacity: 0.9, marginBottom: 8 }}>
            你已冥想 <strong style={{ fontSize: 22 }}>{stats.total}</strong> 次
          </p>
          <p style={{ ...t.bodyLg, fontSize: 32, fontWeight: 700, margin: 0 }}>
            {stats.totalMin}
            <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4, opacity: 0.85 }}>
              分钟
            </span>
          </p>
          <div className="flex items-center" style={{ gap: 10, marginTop: 10 }}>
            <span style={{ ...t.caption, opacity: 0.85 }}>今天</span>
            <span
              style={{
                ...t.caption,
                background: "rgba(255,255,255,0.18)",
                padding: "4px 10px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              +{stats.todayMin} 分钟 ✨
            </span>
          </div>
        </div>
        <div style={{ fontSize: 72 }}>🕯️</div>
      </div>

      {/* 分呼吸法统计（4 种） */}
      {!loading && perPractice.rows.length > 0 && (
        <div className="fade-up" style={{ marginTop: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {perPractice.rows.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--r-lg)",
                  padding: "12px 14px",
                  boxShadow: "0 1px 3px rgba(0,0,0,.03)",
                }}
              >
                <div style={{ ...t.caption, color: "var(--text-secondary)", marginBottom: 4 }}>
                  {p.name}
                </div>
                <div
                  style={{
                    ...t.bodyLg,
                    fontWeight: 700,
                    color: "var(--forest-900)",
                    fontSize: 22,
                  }}
                >
                  {p.min}
                  <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3, color: "var(--text-tertiary)" }}>
                    分钟
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 6 }}>
                    {p.count} 次
                  </span>
                </div>
              </div>
            ))}
          </div>
          {perPractice.others.length > 0 && (
            <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: 8 }}>
              其他练习：{perPractice.others.map(([id, v]) => `${v.name} ${v.min} 分钟`).join("、")}
            </p>
          )}
        </div>
      )}

      {/* 历史列表 */}
      <h2
        style={{
          ...t.h3,
          color: "var(--forest-900)",
          margin: "var(--sp-4) 0 var(--sp-3)",
        }}
      >
        💗 历史记录
      </h2>

      {loading && (
        <p style={{ ...t.body, color: "var(--text-secondary)" }}>加载中…</p>
      )}

      {!loading && records.length === 0 && (
        <div
          className="text-center fade-up"
          style={{
            background: "#FFFFFF",
            border: "1px dashed var(--hairline)",
            borderRadius: "var(--r-xl)",
            padding: "var(--sp-6) var(--sp-4)",
            marginTop: "var(--sp-3)",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 12 }}>🪷</div>
          <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: 12 }}>
            还没有记录。第一次坐下来呼吸的那一刻，就是开始。
          </p>
          <Link
            href="/box/mind"
            className="no-underline"
            style={{
              display: "inline-block",
              padding: "8px 18px",
              borderRadius: 999,
              background: "var(--forest-700)",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            去看一场练习 →
          </Link>
        </div>
      )}

      {!loading &&
        groups.map(([dateKey, list]) => (
          <div key={dateKey} style={{ marginBottom: "var(--gap-section)" }}>
            <div
              className="flex items-center"
              style={{ gap: 8, marginBottom: 10, color: "var(--text-tertiary)" }}
            >
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: "var(--forest-50)",
                  fontSize: "var(--fs-caption)",
                  fontWeight: 600,
                }}
              >
                {dateKey === todayKey() ? "今天" : "往日"}
              </span>
              <span style={{ fontSize: "var(--fs-caption)" }}>{formatDateLabel(dateKey)}</span>
            </div>
            <div className="flex flex-col" style={{ gap: 10 }}>
              {list.map((r: MindSessionRecord) => (
                <RecordCard
                  key={r.id}
                  r={r}
                  onEdit={() => setEditing(r)}
                  onDelete={() => setConfirmDel(r.id)}
                />
              ))}
            </div>
          </div>
        ))}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge text="你的练习记录只存在这台设备上" />
      </div>

      {/* 编辑弹层 */}
      {editing && (
        <div
          onClick={() => setEditing(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FAF7F2",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "20px 20px 28px",
              width: "100%",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <h3 style={{ ...t.h2, color: "var(--forest-900)", marginBottom: 12 }}>
              修改这条记录
            </h3>
            <div className="flex items-center" style={{ gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {MOOD_EMOJIS.map((m) => (
                <button
                  key={m.emoji}
                  onClick={() => setEditing({ ...editing, moodEmoji: m.emoji })}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background:
                      editing.moodEmoji === m.emoji ? "var(--forest-100)" : "#FFFFFF",
                    border:
                      editing.moodEmoji === m.emoji
                        ? "1.5px solid var(--forest-500)"
                        : "1px solid var(--hairline)",
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
            <input
              value={editing.moodText ?? ""}
              onChange={(e) => setEditing({ ...editing, moodText: e.target.value })}
              placeholder="心情几个字"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--hairline)",
                background: "#FFFFFF",
                fontSize: 14,
                marginBottom: 8,
              }}
            />
            <textarea
              value={editing.note ?? ""}
              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              placeholder="想法或感受…"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--hairline)",
                background: "#FFFFFF",
                fontSize: 14,
                marginBottom: 14,
                resize: "vertical",
              }}
            />
            <div className="flex" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "transparent",
                  border: "1px solid var(--hairline)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={onSaveEdit}
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "var(--forest-700)",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除二次确认 */}
      {confirmDel && (
        <div
          onClick={() => setConfirmDel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "20px 22px",
              maxWidth: 320,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🪷</div>
            <p style={{ ...t.body, color: "var(--text-primary)", marginBottom: 16 }}>
              确定要删除这条记录吗？
            </p>
            <div className="flex" style={{ gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "transparent",
                  border: "1px solid var(--hairline)",
                  cursor: "pointer",
                }}
              >
                再想想
              </button>
              <button
                onClick={() => onDelete(confirmDel)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "#C4543D",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function RecordCard({
  r,
  onEdit,
  onDelete,
}: {
  r: MindSessionRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const time = new Date(r.createdAt);
  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  return (
    <div
      className="fade-up"
      style={{
        background: "#FFFFFF",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--hairline)",
        padding: "14px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span
            style={{
              fontSize: 24,
              background: "var(--bg-base)",
              padding: "4px 8px",
              borderRadius: 999,
            }}
          >
            {r.moodEmoji || "🌿"}
          </span>
          <div>
            <div style={{ ...t.body, fontWeight: 600, color: "var(--forest-900)" }}>
              {r.practiceName}
            </div>
            <div style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: 2 }}>
              {hh}:{mm} · {r.durationMin} 分钟
            </div>
          </div>
        </div>
        <div className="flex" style={{ gap: 6 }}>
          <button
            onClick={onEdit}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "var(--forest-50)",
              color: "var(--forest-700)",
              border: "none",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "transparent",
              color: "var(--text-tertiary)",
              border: "1px solid var(--hairline)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            删除
          </button>
        </div>
      </div>
      {(r.moodText || r.note) && (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            background: "var(--bg-base)",
            color: "var(--text-secondary)",
            fontSize: "var(--fs-caption)",
            lineHeight: 1.7,
          }}
        >
          {r.moodText && (
            <p style={{ margin: 0, marginBottom: r.note ? 4 : 0, fontWeight: 600 }}>
              {r.moodText}
            </p>
          )}
          {r.note && <p style={{ margin: 0 }}>{r.note}</p>}
        </div>
      )}
    </div>
  );
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function formatDateLabel(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const wd = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  return `${y} 年 ${m} 月 ${d} 日 · 星期${wd}`;
}