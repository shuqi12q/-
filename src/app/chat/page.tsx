"use client";

import { useEffect, useRef, useState } from "react";
import BreathingLeaf from "@/components/BreathingLeaf";
import CrisisLayer from "@/components/CrisisLayer";
import PrivacyBadge from "@/components/PrivacyBadge";
import Shell from "@/components/Shell";
import { HelpFooter, t } from "@/components/ui";
import {
  armSafeMode,
  armSuppress,
  clearSuppress,
  detectCrisisDetail,
  hasNewSignal,
  readSafeMode,
  readSuppress,
} from "@/lib/crisis";
import { COMPANIONS, getCompanion, recentOpeners, rememberOpener } from "@/lib/persona";
import {
  buildMemoryContext,
  openerContext,
  readMemory,
  touchSession,
  updateMemoryAfterMessage,
  writeMemory,
} from "@/lib/persona-memory";
import { CompanionAvatar, companionName } from "@/components/companion/CompanionAvatar";
import {
  CompanionSticker,
  STICKERS_BY_CHAR,
  type CompanionKey,
} from "@/components/companion/CompanionSticker";

// ---- types ----
interface Msg {
  role: "user" | "assistant";
  content: string;
  sticker?: { char: CompanionKey; key: string };
  topic?: boolean; // 新话题分隔标记（旧话题保留，下面开新话题）
}

const COMPANION_KEY = "psy_chat_companion";

// 角色选择列表（栖栖 + 3 个动物角色）
const CHAT_COMPANIONS = [
  { id: "chichi", key: null as CompanionKey | null, name: "栖栖", species: "森林里的朋友", tagline: "安静、温暖，什么都愿意听" },
  { id: "lili", key: "lili" as CompanionKey | null, name: "栗栗", species: "小松鼠", tagline: "元气满满，爱分享小确幸" },
  { id: "achi", key: "achi" as CompanionKey | null, name: "阿赤", species: "小狐狸", tagline: "话少留白，用山林故事陪你慢慢想" },
  { id: "tuan", key: "tuan" as CompanionKey | null, name: "团团", species: "小刺猬", tagline: "软乎乎的暖团子，永远先说「我在呢」" },
] as const;

const FALLBACK = "我在的。刚才那句我听着有点重，如果你愿意，再多说一点点也行。";

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [showResourceBar, setShowResourceBar] = useState(false);
  const [lastHits, setLastHits] = useState<string[]>([]);
  const [l2Card, setL2Card] = useState(false);
  const [l2Count, setL2Count] = useState(0);

  // 角色选择状态
  const [selectedId, setSelectedId] = useState<string | null>(null); // null = 未选择
  const [stickerOpen, setStickerOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const ready = useRef(false);
  // 表情包节奏：每 3-5 轮助手回复附带一个（前端强制节奏 + 模型挑 key）
  const stickerTurnRef = useRef(0);
  const stickerEveryRef = useRef(3 + Math.floor(Math.random() * 3));

  // 进入时优先使用 URL ?p= 指定角色（来自 /chat/pals 的选择），
  // 否则恢复上次选中的角色；都没有则进入选择页。
  // 修复：此前忽略 ?p=，直接用 localStorage 残留角色，导致从 pals 点角色却落到上一个角色（如点栖栖出团团）。
  useEffect(() => {
    let target: string | null = null;
    try {
      const p = new URLSearchParams(window.location.search).get("p");
      if (p && COMPANIONS.find((c) => c.id === p)) target = p;
    } catch {
      /* 解析失败则回退到 localStorage */
    }
    if (!target) {
      const saved = window.localStorage.getItem(COMPANION_KEY);
      if (saved && COMPANIONS.find((c) => c.id === saved)) target = saved;
    }
    if (target) {
      setSelectedId(target);
      window.localStorage.setItem(COMPANION_KEY, target);
    }
  }, []);

  // 加载/重建当前角色会话：有历史则恢复，无历史则生成随机开场白（冷启动）
  const loadConversation = async (id: string) => {
    const companion = getCompanion(id);
    const storeKey = `psy_chat_${id}`;
    touchSession(id);

    const raw = window.localStorage.getItem(storeKey);
    if (raw) {
      try {
        const list = JSON.parse(raw) as Msg[];
        if (list.length) {
          setMsgs(list);
          ready.current = true;
          return;
        }
      } catch {
        /* 忽略损坏的本地记录 */
      }
    }
    // 冷启动开场白（随机变体）
    let checkedInToday = false;
    let lastNegative = false;
    try {
      const { getEntries } = await import("@/lib/db");
      const entries = await getEntries();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      checkedInToday = entries.some((e) => e.createdAt >= start.getTime());
      lastNegative = entries.some((e) => e.quick <= 1);
    } catch {
      /* 本地库不可用时按冷启动处理 */
    }
    // 从记忆中取未完成话题 / 跨角色情绪线索；开场白随机且避开最近用过的
    const memCtx = openerContext(id);
    const recents = recentOpeners(id);
    const opener = companion.buildOpener(
      {
        checkedInToday,
        lastNegative: lastNegative || memCtx.lastNegative,
        unfinishedTopic: memCtx.unfinishedTopic,
      },
      recents,
    );
    rememberOpener(id, opener);
    setMsgs([{ role: "assistant", content: opener }]);
    ready.current = true;
  };

  // 选中角色后加载会话
  useEffect(() => {
    if (!selectedId) return;
    loadConversation(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // 开启新话题：旧话题保留在下方继续追加，只重置未完成话题（记忆事实保留供跨角色串联）
  const startNewTopic = async () => {
    if (!selectedId || pending) return;
    // 未完成话题归零（新话题不再接旧话题），共享记忆事实保留
    const mem = readMemory(selectedId);
    writeMemory(selectedId, { ...mem, unfinished: null });
    touchSession(selectedId);
    // 新话题当作"今天第一次来"，走首次开场白池（随机 + 避开最近用过的）
    const recents = recentOpeners(selectedId);
    const opener = getCompanion(selectedId).buildOpener({ checkedInToday: false }, recents);
    rememberOpener(selectedId, opener);
    setMsgs((prev) => [
      ...prev,
      { role: "assistant", content: "", topic: true },
      { role: "assistant", content: opener },
    ]);
    bottom.current?.scrollIntoView({ block: "end" });
  };

  // 持久化消息
  useEffect(() => {
    if (!selectedId || !ready.current) return;
    window.localStorage.setItem(`psy_chat_${selectedId}`, JSON.stringify(msgs));
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs, pending, selectedId]);

  const curKey: CompanionKey | null = (() => {
    const c = CHAT_COMPANIONS.find((x) => x.id === selectedId);
    return c?.key ?? null;
  })();
  const companion = getCompanion(selectedId);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending || !selectedId) return;
    setInput("");

    const { level, hits } = detectCrisisDetail(trimmed);
    const next: Msg[] = [...msgs, { role: "user", content: trimmed }];
    setMsgs(next);

    if (level === 3) {
      setShowResourceBar(true);
      const prev = readSuppress();
      if (!prev || hasNewSignal(hits, prev)) {
        clearSuppress();
        setLastHits(hits);
        setCrisis(true);
        return;
      }
      if (l2Count < 1) {
        setL2Card(true);
        setL2Count(1);
      }
    }
    if (level === 2) setShowResourceBar(true);

    // 更新记忆
    updateMemoryAfterMessage(selectedId, trimmed);
    let memCtx = buildMemoryContext(selectedId);

    // 表情包节奏：每 3-5 轮助手回复附带一个；本轮若到节奏点，给模型加一条强提示
    const nextIsStickerTurn = curKey !== null && stickerTurnRef.current + 1 >= stickerEveryRef.current && !readSafeMode();
    const stickerHint = nextIsStickerTurn
      ? "\n\n【本轮你需要附带一个表情包】请在你回复正文的最后输出隐藏标记 ::sticker::<char>,<key>::（<char> 是 lili/achi/tuan 你自己，<key> 从你专属列表里选最贴切当前内容的一个；只输出一次，不解释、不提及）。"
      : "";

    setPending(true);
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          safeMode: readSafeMode(),
          persona: selectedId,
          memoryContext: memCtx + stickerHint,
        }),
      });
      if (!res.ok || !res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setMsgs([...next, { role: "assistant", content: "" }]);
      setPending(false);
      setStreaming(true);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: FALLBACK }]);
    } finally {
      setPending(false);
      setStreaming(false);

      // 解析助手回复末尾的 ::sticker::<char>,<key>:: 标记，剥离后附加到消息
      let sticker: { char: CompanionKey; key: string } | null = null;
      let finalContent = acc;
      if (curKey) {
        const m = acc.match(/::sticker::(lili|achi|tuan),([\w-]+)::/);
        if (m) {
          const char = m[1] as CompanionKey;
          const key = m[2];
          if (char === curKey && STICKERS_BY_CHAR[char]?.some((s) => s.key === key)) {
            sticker = { char, key };
          }
          finalContent = acc.replace(/::sticker::[^\n]*::/, "").trim();
        }
      }
      // 模型没出 marker 但本轮本该发 → 兜底随机挑一个（保证节奏稳定）
      if (nextIsStickerTurn && !sticker && curKey) {
        const list = STICKERS_BY_CHAR[curKey];
        const r = list && list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
        if (r) sticker = { char: curKey, key: r.key };
      }
      // 节奏计数：发出 sticker 重置 + 重新随机下一间隔；否则递增
      if (sticker) {
        stickerTurnRef.current = 0;
        stickerEveryRef.current = 3 + Math.floor(Math.random() * 3);
      } else {
        stickerTurnRef.current += 1;
      }
      setMsgs([...next, { role: "assistant", content: finalContent, sticker: sticker ?? undefined }]);

      if (!acc.trim()) {
        setMsgs((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content.trim()) {
            return [...prev.slice(0, -1), { role: "assistant", content: FALLBACK }];
          }
          return prev;
        });
      }
    }
  };

  const sendSticker = (stickerKey: string) => {
    if (!curKey || !selectedId) return;
    const sticker = { char: curKey, key: stickerKey };
    const next = [...msgs, { role: "user" as const, content: "", sticker }];
    setMsgs(next);
    setStickerOpen(false);
    // 表情包不触发 AI 回复（用户只是发了个表情）
    window.localStorage.setItem(`psy_chat_${selectedId}`, JSON.stringify(next));
  };

  const switchCompanion = () => {
    setSelectedId(null);
    ready.current = false;
    setMsgs([]);
    // 清除 URL 上的 ?p=，避免刷新选择页后又被带回到上一个角色
    try {
      if (window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      /* 忽略历史操作异常 */
    }
  };

  // ---- 角色选择页 ----
  if (!selectedId) {
    return (
      <Shell>
        <div style={{ marginBottom: "var(--sp-5)" }}>
          <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>
            想和谁聊聊？
          </h1>
          <p style={{ ...t.bodyLg, color: "var(--text-secondary)" }}>
            每个人都不一样，随时可以换。
          </p>
        </div>
        <div className="flex flex-col" style={{ gap: "var(--sp-4)" }}>
          {CHAT_COMPANIONS.map((c) => {
            const isAnimal = c.key !== null;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  window.localStorage.setItem(COMPANION_KEY, c.id);
                }}
                className="flex items-center no-underline"
                style={{
                  gap: "var(--sp-4)",
                  padding: "var(--sp-4)",
                  borderRadius: "var(--r-lg)",
                  border: "1px solid var(--hairline)",
                  background: "var(--bg-elevated)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease",
                }}
              >
                {/* 头像 */}
                {isAnimal ? (
                  <CompanionAvatar char={c.key!} size={64} />
                ) : (
                  <div style={{ width: 64, height: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BreathingLeaf size={56} />
                  </div>
                )}
                {/* 信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...t.h3, color: "var(--forest-900)" }}>
                    {c.name}
                    <span style={{ ...t.caption, color: "var(--text-tertiary)", marginLeft: "var(--sp-2)" }}>
                      · {c.species}
                    </span>
                  </div>
                  <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: 4 }}>
                    {c.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <HelpFooter />
      </Shell>
    );
  }

  // ---- 聊天页 ----
  const typingText = `${companion.name}正在听`;

  return (
    <Shell>
      {/* 头部 */}
      <div className="flex items-center" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
        {curKey ? (
          <CompanionAvatar char={curKey} size={40} />
        ) : (
          <BreathingLeaf size={40} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...t.h3, color: "var(--forest-900)" }}>{companion.name}</div>
          <PrivacyBadge text="这段对话不会被保存到服务器" />
        </div>
        <button
          onClick={switchCompanion}
          aria-label="换一只"
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "1px solid var(--hairline)",
            background: "var(--bg-elevated)",
            color: "var(--text-tertiary)",
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
          </svg>
        </button>
      </div>

      {showResourceBar && (
        <a
          href="/me/help"
          className="block no-underline"
          style={{
            background: "var(--bg-tint)",
            color: "var(--care-700)",
            borderRadius: "var(--r-sm)",
            padding: "10px 12px",
            marginBottom: "var(--sp-4)",
            ...t.caption,
          }}
        >
          如果需要，这里有可以聊聊的人 →
        </a>
      )}

      {/* 消息区 */}
      <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
        {msgs.map((m, i) => {
          // 新话题分隔条（旧话题保留在上方）
          if (m.topic) {
            return (
              <div key={i} className="flex justify-center fade-up" style={{ margin: "var(--sp-3) 0" }}>
                <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>✦ 新话题 ✦</span>
              </div>
            );
          }
          // 用户发的表情包消息（助手发的在下方助手分支里，文字 + sticker 一起渲染）
          if (m.sticker && m.role === "user") {
          return (
            <div key={i} className="flex fade-up justify-end" style={{ gap: "var(--gap-inline)" }}>
              <div style={{ maxWidth: "78%" }}>
                <CompanionSticker char={m.sticker.char} sticker={m.sticker.key} size={168} />
              </div>
            </div>
          );
        }
          // 文字消息
          return m.role === "assistant" ? (
            <div key={i} className="flex fade-up" style={{ gap: "var(--gap-inline)", maxWidth: "88%" }}>
              <div className="shrink-0" style={{ paddingTop: 2 }}>
                {curKey ? <CompanionAvatar char={curKey} size={28} /> : <BreathingLeaf size={28} still />}
              </div>
              <div className="flex flex-col" style={{ gap: 6, minWidth: 0 }}>
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    borderRadius: "20px 20px 20px 6px",
                    boxShadow: "var(--shadow-xs)",
                    padding: "12px 16px",
                    ...t.bodyLg,
                  }}
                >
                  {m.content || (streaming && i === msgs.length - 1 ? "正在想…" : "")}
                  {streaming && i === msgs.length - 1 && m.content && <i className="caret" />}
                </div>
                {m.sticker && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      background: "var(--bg-elevated)",
                      borderRadius: "16px 16px 16px 6px",
                      boxShadow: "var(--shadow-xs)",
                      padding: 6,
                      display: "inline-block",
                    }}
                  >
                    <CompanionSticker char={m.sticker.char} sticker={m.sticker.key} size={132} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end fade-up">
              <div
                className="content-serif"
                style={{
                  maxWidth: "78%",
                  background: "var(--forest-100)",
                  color: "var(--forest-900)",
                  borderRadius: "20px 20px 6px 20px",
                  padding: "12px 16px",
                  ...t.bodyLg,
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {pending && (
          <div className="flex" style={{ gap: "var(--gap-inline)" }}>
            {curKey ? <CompanionAvatar char={curKey} size={28} /> : <BreathingLeaf size={28} still />}
            <div
              className="typing flex items-center"
              style={{
                background: "var(--bg-elevated)",
                borderRadius: "20px 20px 20px 6px",
                boxShadow: "var(--shadow-xs)",
                padding: "12px 16px",
                ...t.bodyLg,
                color: "var(--text-tertiary)",
              }}
            >
              <span style={{ marginRight: 6 }}>{typingText}</span>
              <i /><i /><i />
            </div>
          </div>
        )}
        {l2Card && (
          <div
            className="fade-up"
            style={{
              background: "var(--bg-tint)",
              borderRadius: "var(--r-sm)",
              padding: "12px 14px",
              ...t.caption,
              color: "var(--care-700)",
            }}
          >
            <div>刚才那句我记着，没有当作没听见。</div>
            <a
              href="/me/help"
              className="no-underline"
              style={{ color: "var(--care-700)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              需要的话，这里有可以打的电话 →
            </a>
          </div>
        )}

        <div ref={bottom} />
      </div>

      {/* 表情包面板 */}
      {stickerOpen && curKey && (
        <div
          className="fade-up"
          style={{
            background: "var(--sticker-panel-bg, var(--bg-elevated))",
            borderRadius: "var(--sticker-panel-r, var(--r-lg))",
            padding: "var(--sticker-panel-pad, var(--sp-3))",
            marginBottom: "var(--sp-3)",
            boxShadow: "var(--shadow-sm)",
            overflowX: "auto",
          }}
        >
          <div className="flex" style={{ gap: "var(--sticker-grid-gap, var(--sp-3))" }}>
            {STICKERS_BY_CHAR[curKey].map((s) => (
              <button
                key={s.key}
                onClick={() => sendSticker(s.key)}
                aria-label={s.label}
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--sticker-item-r, var(--r-md))",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "background var(--dur-fast) ease",
                }}
              >
                <CompanionSticker char={curKey} sticker={s.key} size={48} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div
        className="sticky bottom-0"
        style={{
          marginTop: "var(--sp-6)",
          paddingTop: "var(--sp-3)",
          background: "var(--bg-base)",
          zIndex: "var(--z-sticky)",
        }}
      >
        <div className="flex items-end" style={{ gap: "var(--gap-inline)" }}>
          {/* 表情包按钮（仅动物角色显示） */}
          {curKey && (
            <button
              onClick={() => setStickerOpen((v) => !v)}
              aria-label="打开表情包"
              aria-expanded={stickerOpen}
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                border: "1px solid var(--hairline)",
                background: stickerOpen ? "var(--forest-100)" : "var(--bg-elevated)",
                color: "var(--forest-700)",
                cursor: "pointer",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={`想聊点什么都行，不用组织语言`}
            className="flex-1"
            style={{
              background: "var(--bg-elevated)",
              border: "1.5px solid var(--forest-300)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-paper-inset)",
              padding: "12px 16px",
              minHeight: 48,
              maxHeight: 120,
              fontSize: "var(--fs-body)",
              lineHeight: "var(--lh-body)",
              color: "var(--text-primary)",
              resize: "none",
              outline: "none",
            }}
          />
          <button
            onClick={() => send(input)}
            aria-label="发送"
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: "var(--forest-700)",
              color: "var(--text-inverse)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        </div>
        <div className="flex items-center" style={{ padding: "var(--sp-2) 0", gap: "var(--sp-3)" }}>
          <button
            onClick={startNewTopic}
            disabled={pending}
            aria-label="开启新话题"
            title="结束本次聊天，开启新话题"
            className="shrink-0 flex items-center no-underline"
            style={{
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid var(--hairline)",
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              fontSize: "var(--fs-caption)",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
            </svg>
            <span>新话题</span>
          </button>
          <div className="flex-1 text-center">
            <PrivacyBadge text="你的内容只存在这台设备上" />
          </div>
        </div>
      </div>

      <HelpFooter />

      {crisis && (
        <CrisisLayer
          variant="chat"
          onClose={() => {
            armSuppress(lastHits);
            armSafeMode();
            setCrisis(false);
          }}
          onContinue={() => {
            armSuppress(lastHits);
            armSafeMode();
            setCrisis(false);
          }}
        />
      )}
    </Shell>
  );
}
