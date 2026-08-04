"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "@/components/Shell";
import BoxBack from "@/components/BoxBack";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";
import type { DreamAnalysis, DreamMode } from "@/lib/types";

// 梦的解析专用深色文字（米色/浅色背景上保证可读）
const TXT = { strong: "#2A322C", mid: "#3F4A43", soft: "#4E5A53" };

const EMOTIONS = ["平静", "好奇", "快乐", "焦虑", "恐惧", "悲伤", "愤怒", "羞愧", "惊讶", "委屈"];
const TAG_CHIPS = ["学校", "家庭", "旅行", "考试", "海边", "城市", "动物", "森林", "亲人", "朋友", "陌生人", "飞行"];

export default function DreamInput() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<DreamMode>("psych");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [customEmotions, setCustomEmotions] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [clarity, setClarity] = useState(6);
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [err, setErr] = useState<string | null>(null);
  // 自定义输入状态
  const [showEmoInput, setShowEmoInput] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [emoText, setEmoText] = useState("");
  const [tagText, setTagText] = useState("");
  const [emoErr, setEmoErr] = useState("");
  const [tagErr, setTagErr] = useState("");

  const allEmotions = [...EMOTIONS, ...customEmotions];
  const allTags = [...TAG_CHIPS, ...customTags];

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  // 添加自定义标签（情绪 / 场景通用）：空值校验 + 去重（含预设）
  const addCustom = (kind: "emotion" | "tag") => {
    const textVal = (kind === "emotion" ? emoText : tagText).trim();
    const setTextVal = kind === "emotion" ? setEmoText : setTagText;
    const setErrVal = kind === "emotion" ? setEmoErr : setTagErr;
    const setCustom = kind === "emotion" ? setCustomEmotions : setCustomTags;
    const setSel = kind === "emotion" ? setEmotions : setTags;
    const existing = kind === "emotion" ? allEmotions : allTags;
    if (!textVal) { setErrVal("不能为空"); return; }
    if (existing.includes(textVal)) { setErrVal("已存在这个标签"); return; }
    setCustom((p) => [...p, textVal]);
    setSel((p) => [...p, textVal]); // 添加后自动选中
    setTextVal("");
    setErrVal("");
    if (kind === "emotion") setShowEmoInput(false); else setShowTagInput(false);
  };

  // 删除自定义标签（同时取消选中）
  const removeCustom = (kind: "emotion" | "tag", v: string) => {
    if (kind === "emotion") {
      setCustomEmotions((p) => p.filter((x) => x !== v));
      setEmotions((p) => p.filter((x) => x !== v));
    } else {
      setCustomTags((p) => p.filter((x) => x !== v));
      setTags((p) => p.filter((x) => x !== v));
    }
  };

  const submit = async () => {
    const v = text.trim();
    if (!v || submitting) return;
    setSubmitting(true);
    setStreamed("");
    setErr(null);
    try {
      const res = await fetch("/api/dream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: v, mode }),
      });
      if (!res.ok || !res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamed(acc);
      }
      const analysis = parseAnalysis(acc, mode);
      try { sessionStorage.setItem("psy_pending_analysis", JSON.stringify({ text: v, mode, emotions, clarity, tags, analysis })); } catch {}
      router.push("/box/dream/result");
    } catch (e) {
      setErr("解析服务暂时不稳定，请稍后再试。");
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <BoxBack />
      <h1 style={{ ...t.h1, color: TXT.strong, marginBottom: "var(--sp-1)" }}>梦的解析</h1>
      <p style={{ ...t.body, color: TXT.mid, marginBottom: "var(--sp-5)" }}>
        把梦写下来，让它映照一下最近的心情。不诊断、不算命，只是一面安静的镜子。
      </p>

      {/* 模式切换 */}
      <div
        className="flex"
        style={{ gap: 6, padding: 4, borderRadius: 999, background: "#F5EFE6", maxWidth: 360 }}
      >
        {(["psych", "zhougong"] as DreamMode[]).map((m) => {
          const on = mode === m;
          const label = m === "psych" ? "现代心理学" : "周公解梦";
          const sub = m === "psych" ? "弗洛伊德 / 荣格" : "传统寓意";
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: on ? "#FFFFFF" : "transparent",
                color: on ? TXT.strong : TXT.mid,
                fontSize: "var(--fs-caption)",
                boxShadow: on ? "0 2px 8px rgba(0,0,0,.06)" : "none",
                transition: "all var(--dur-fast)",
              }}
            >
              <div style={{ fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 11, opacity: .92, marginTop: 2 }}>{sub}</div>
            </button>
          );
        })}
      </div>

      {/* 文本输入 */}
      <Card style={{ marginTop: "var(--sp-5)", background: "#FFFFFF" }}>
        <div className="flex items-center" style={{ gap: 6, color: TXT.soft, marginBottom: "var(--sp-2)" }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--care-500)" }} />
          <span style={{ ...t.caption, color: TXT.soft }}>把梦写下来（越具体越好）</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          maxLength={1500}
          placeholder="比如：梦里我站在一栋楼的高处，往下看的时候脚一滑就掉了下去，空中一直抓不到东西，醒来心还在跳……"
          className="content-serif w-full"
          style={{
            background: "#FFFFFF",
            border: "1.5px solid var(--forest-300)",
            borderRadius: "var(--r-md)",
            padding: "var(--sp-4)",
            fontSize: "var(--fs-body-lg)",
            lineHeight: 1.9,
            color: TXT.strong,
            resize: "none",
            outline: "none",
          }}
        />
        <div className="text-right" style={{ ...t.caption, color: TXT.soft, marginTop: 4 }}>
          {text.length} / 1500
        </div>
      </Card>

      {/* 梦伴随的情绪（预设 + 自定义） */}
      <div style={{ marginTop: "var(--sp-5)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-2)" }}>
          <span style={{ ...t.body, color: TXT.mid }}>梦里伴随的情绪（可多选）</span>
          <span style={{ ...t.caption, color: TXT.soft }}>{emotions.length} / 10+</span>
        </div>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {allEmotions.map((emo) => {
            const on = emotions.includes(emo);
            const custom = customEmotions.includes(emo);
            return (
              <span key={emo} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                <button
                  onClick={() => setEmotions((p) => toggle(p, emo))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: on ? "1.5px solid #A8D5BC" : "1px solid var(--hairline)",
                    background: on ? "#EAF6EF" : "#FFFFFF",
                    color: on ? "#2A5C44" : TXT.mid,
                    fontSize: "var(--fs-caption)",
                    cursor: "pointer",
                  }}
                >
                  {emo}
                </button>
                {custom && (
                  <button
                    onClick={() => removeCustom("emotion", emo)}
                    aria-label={`删除情绪 ${emo}`}
                    title="删除这个自定义情绪"
                    style={{ padding: "2px 4px", color: "var(--care-600)", fontSize: 12, cursor: "pointer", background: "none", border: "none" }}
                  >×</button>
                )}
              </span>
            );
          })}
        </div>
        {showEmoInput ? (
          <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
            <input
              autoFocus
              value={emoText}
              onChange={(e) => { setEmoText(e.target.value); setEmoErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom("emotion"); } }}
              placeholder="输入一个情绪词…"
              maxLength={8}
              style={{
                flex: 1, height: 34, padding: "0 12px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--forest-300)", background: "#FFFFFF",
                color: TXT.strong, fontSize: "var(--fs-caption)", outline: "none",
              }}
            />
            <Btn variant="secondary" size="sm" onClick={() => addCustom("emotion")}>添加</Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setShowEmoInput(false); setEmoText(""); setEmoErr(""); }}>取消</Btn>
          </div>
        ) : (
          <button
            onClick={() => setShowEmoInput(true)}
            style={{ marginTop: 10, color: "var(--forest-700)", fontSize: "var(--fs-caption)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            ＋ 自定义添加
          </button>
        )}
        {emoErr && <p style={{ ...t.caption, color: "var(--care-600)", marginTop: 6 }}>{emoErr}</p>}
      </div>

      {/* 清晰度 */}
      <div style={{ marginTop: "var(--sp-5)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-2)" }}>
          <span style={{ ...t.body, color: TXT.mid }}>梦境清晰度</span>
          <span style={{ ...t.caption, color: "var(--care-600)", fontWeight: 600 }}>{clarity} / 10</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={clarity}
          onChange={(e) => setClarity(Number(e.target.value))}
          className="w-full"
          style={{
            height: 8, borderRadius: 999,
            background: "linear-gradient(90deg, #E8D9FF 0%, #FFE5B4 50%, #B7E4C7 100%)",
            appearance: "none",
          }}
        />
        <div className="flex justify-between" style={{ ...t.caption, color: TXT.soft, marginTop: 4 }}>
          <span>模糊</span><span>很清晰</span>
        </div>
      </div>

      {/* 场景 / 标签（预设 + 自定义） */}
      <div style={{ marginTop: "var(--sp-5)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-2)" }}>
          <span style={{ ...t.body, color: TXT.mid }}>场景 / 标签</span>
          <span style={{ ...t.caption, color: TXT.soft }}>{tags.length}</span>
        </div>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {allTags.map((tag) => {
            const on = tags.includes(tag);
            const custom = customTags.includes(tag);
            return (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                <button
                  onClick={() => setTags((p) => toggle(p, tag))}
                  style={{
                    padding: "6px 12px", borderRadius: 999,
                    border: on ? "1.5px solid #B5A8FF" : "1px solid var(--hairline)",
                    background: on ? "#F0EBFF" : "#FFFFFF",
                    color: on ? "#5B49D9" : TXT.mid,
                    fontSize: "var(--fs-caption)", cursor: "pointer",
                  }}
                >
                  {tag}
                </button>
                {custom && (
                  <button
                    onClick={() => removeCustom("tag", tag)}
                    aria-label={`删除标签 ${tag}`}
                    title="删除这个自定义标签"
                    style={{ padding: "2px 4px", color: "var(--care-600)", fontSize: 12, cursor: "pointer", background: "none", border: "none" }}
                  >×</button>
                )}
              </span>
            );
          })}
        </div>
        {showTagInput ? (
          <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
            <input
              autoFocus
              value={tagText}
              onChange={(e) => { setTagText(e.target.value); setTagErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom("tag"); } }}
              placeholder="输入一个标签…"
              maxLength={10}
              style={{
                flex: 1, height: 34, padding: "0 12px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--forest-300)", background: "#FFFFFF",
                color: TXT.strong, fontSize: "var(--fs-caption)", outline: "none",
              }}
            />
            <Btn variant="secondary" size="sm" onClick={() => addCustom("tag")}>添加</Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setShowTagInput(false); setTagText(""); setTagErr(""); }}>取消</Btn>
          </div>
        ) : (
          <button
            onClick={() => setShowTagInput(true)}
            style={{ marginTop: 10, color: "var(--forest-700)", fontSize: "var(--fs-caption)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            ＋ 自定义添加
          </button>
        )}
        {tagErr && <p style={{ ...t.caption, color: "var(--care-600)", marginTop: 6 }}>{tagErr}</p>}
      </div>

      {/* 提交 */}
      <div style={{ marginTop: "var(--sp-6)" }}>
        <Btn size="lg" full disabled={!text.trim() || submitting} onClick={submit}>
          {submitting ? "正在翻阅这个梦…" : "解析梦境 →"}
        </Btn>
        {streamed && (
          <pre
            className="fade-up"
            style={{
              marginTop: "var(--sp-3)", padding: "var(--sp-3)",
              background: "#FFFFFF", border: "1px solid var(--hairline)", borderRadius: "var(--r-md)",
              fontSize: "var(--fs-caption)", color: TXT.mid, whiteSpace: "pre-wrap", fontFamily: "inherit",
              maxHeight: 200, overflow: "auto",
            }}
          >{streamed}</pre>
        )}
        {err && <p className="text-center fade-up" style={{ ...t.caption, color: "var(--care-600)", marginTop: "var(--sp-2)" }}>{err}</p>}
      </div>

      <p className="text-center" style={{ ...t.caption, color: TXT.soft, marginTop: "var(--gap-section)" }}>
        解析结果会保存在本机，所有内容只有你能看见。
      </p>
      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}

// ---------- 解析 AI 返回的纯文本 ----------
function parseAnalysis(raw: string, mode: DreamMode): DreamAnalysis {
  const lines = raw.split(/\n+/).map((l) => l.replace(/^[\s\d\.、\)\(\【\】•\-:：]+/, "").trim()).filter(Boolean);
  const expectElements = mode === "psych" ? 5 : 3;
  const expectEmotions = 4;
  const expectSuggestions = 3;

  const elementLines = lines.filter((l) => l.includes("=") && !/^\d/.test(l)).slice(0, expectElements + 4);
  const elements: DreamAnalysis["elements"] = [];
  for (const l of elementLines) {
    const parts = l.split("=").map((s) => s.trim());
    if (parts.length >= 2 && parts[0]) {
      const element = parts[0];
      const symbol = parts[1] ?? "";
      const emotion = parts.slice(2).join("=") || symbol;
      if (!/[%]/.test(element) && element.length <= 12 && !/^\d+$/.test(element)) {
        elements.push({ element, symbol, emotion });
      }
    }
    if (elements.length >= expectElements) break;
  }

  const emotionLines = lines.filter((l) => /%|\d{2,3}/.test(l) && l.includes("=")).slice(0, expectEmotions + 4);
  const emotions: DreamAnalysis["emotions"] = [];
  for (const l of emotionLines) {
    const parts = l.split("=").map((s) => s.trim());
    if (parts.length >= 3) {
      const name = parts[0];
      const num = Number(parts[1].replace("%", ""));
      const desc = parts.slice(2).join("=");
      if (name && Number.isFinite(num)) {
        emotions.push({ name, percent: Math.max(5, Math.min(99, Math.round(num))), desc });
      }
    }
    if (emotions.length >= expectEmotions) break;
  }
  if (emotions.length === 0 && elements.length > 0) {
    emotions.push(
      { name: "平静", percent: 40, desc: "梦境里有等待被看见的情绪。" },
      { name: "好奇", percent: 30, desc: "你在梦里也带着探索的态度。" },
      { name: "焦虑", percent: 20, desc: "有一点没说完的事在心里徘徊。" },
      { name: "期待", percent: 10, desc: "醒来后还带着梦里的余味。" },
    );
  }

  const used = new Set<string>();
  [...elementLines, ...emotionLines].forEach((l) => used.add(l));
  const suggestionLines = lines.filter((l) => !used.has(l) && !/^[\d%=\.\s]+$/.test(l) && l.length >= 4 && l.length <= 40).slice(0, expectSuggestions + 4);
  const suggestions: string[] = [];
  for (const l of suggestionLines) {
    if (suggestions.length >= expectSuggestions) break;
    if (l.length >= 6 && l.length <= 36) suggestions.push(l);
  }
  while (suggestions.length < expectSuggestions) {
    suggestions.push(["试着给梦里的情绪取个名字，写下来。", "把这个梦讲给信任的人听，让它被回应。", "白天给自己 5 分钟静默，给潜意识的回响留时间。"][suggestions.length]);
  }

  const summary = lines[0] ?? "这个梦，是一封还没读完的信。";

  return {
    mode,
    elements: elements.slice(0, expectElements).length ? elements.slice(0, expectElements) : [
      { element: "梦", symbol: "潜意识给你的回信", emotion: "好奇" },
    ],
    emotions: emotions.slice(0, expectEmotions),
    suggestions: suggestions.slice(0, expectSuggestions),
    summary,
  };
}