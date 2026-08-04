"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";
import type { DreamAnalysis, DreamMode } from "@/lib/types";

const EMOTIONS = ["平静", "好奇", "快乐", "焦虑", "恐惧", "悲伤", "愤怒", "羞愧", "惊讶", "委屈"];
const TAG_CHIPS = ["学校", "家庭", "旅行", "考试", "海边", "城市", "动物", "森林", "亲人", "朋友", "陌生人", "飞行"];

export default function DreamInput() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<DreamMode>("psych");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [clarity, setClarity] = useState(6);
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

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
      // 跳结果页（用 location.href 带 state 不可靠，改用 sessionStorage 暂存）
      try { sessionStorage.setItem("psy_pending_analysis", JSON.stringify({ text: v, mode, emotions, clarity, tags, analysis })); } catch {}
      router.push("/box/dream/result");
    } catch (e) {
      setErr("解析服务暂时不稳定，请稍后再试。");
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-1)" }}>梦的解析</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-5)" }}>
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
                color: on ? "var(--forest-900)" : "var(--text-secondary)",
                fontSize: "var(--fs-caption)",
                boxShadow: on ? "0 2px 8px rgba(0,0,0,.06)" : "none",
                transition: "all var(--dur-fast)",
              }}
            >
              <div style={{ fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>{sub}</div>
            </button>
          );
        })}
      </div>

      {/* 文本输入 */}
      <Card style={{ marginTop: "var(--sp-5)", background: "#FFFFFF" }}>
        <div className="flex items-center" style={{ gap: 6, color: "var(--text-tertiary)", marginBottom: "var(--sp-2)" }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--care-500)" }} />
          <span style={{ ...t.caption }}>把梦写下来（越具体越好）</span>
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
            color: "var(--text-primary)",
            resize: "none",
            outline: "none",
          }}
        />
        <div className="text-right" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: 4 }}>
          {text.length} / 1500
        </div>
      </Card>

      {/* 情绪基词（标记最近的情绪） */}
      <div style={{ marginTop: "var(--sp-5)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-2)" }}>
          <span style={{ ...t.body, color: "var(--text-secondary)" }}>梦里伴随的情绪（可多选）</span>
          <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{emotions.length} / 10</span>
        </div>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {EMOTIONS.map((emo) => {
            const on = emotions.includes(emo);
            return (
              <button
                key={emo}
                onClick={() => setEmotions((p) => toggle(p, emo))}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: on ? "1.5px solid var(--forest-500)" : "1px solid var(--hairline)",
                  background: on ? "var(--forest-100)" : "#FFFFFF",
                  color: on ? "var(--forest-900)" : "var(--text-secondary)",
                  fontSize: "var(--fs-caption)",
                  cursor: "pointer",
                }}
              >
                {emo}
              </button>
            );
          })}
        </div>
      </div>

      {/* 清晰度 */}
      <div style={{ marginTop: "var(--sp-5)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-2)" }}>
          <span style={{ ...t.body, color: "var(--text-secondary)" }}>梦境清晰度</span>
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
            accentColor: "transparent",
            height: 8,
            borderRadius: 999,
            background: "linear-gradient(90deg, #E8D9FF 0%, #FFE5B4 50%, #B7E4C7 100%)",
            appearance: "none",
          }}
        />
        <div className="flex justify-between" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: 4 }}>
          <span>模糊</span><span>很清晰</span>
        </div>
      </div>

      {/* 标签 */}
      <div style={{ marginTop: "var(--sp-5)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-2)" }}>
          <span style={{ ...t.body, color: "var(--text-secondary)" }}>场景 / 标签</span>
          <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{tags.length}</span>
        </div>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {TAG_CHIPS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => setTags((p) => toggle(p, tag))}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: on ? "1.5px solid #B5A8FF" : "1px solid var(--hairline)",
                  background: on ? "#F0EBFF" : "#FFFFFF",
                  color: on ? "#5B49D9" : "var(--text-secondary)",
                  fontSize: "var(--fs-caption)",
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
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
              marginTop: "var(--sp-3)",
              padding: "var(--sp-3)",
              background: "#FFFFFF",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--r-md)",
              fontSize: "var(--fs-caption)",
              color: "var(--text-secondary)",
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              maxHeight: 200,
              overflow: "auto",
            }}
          >{streamed}</pre>
        )}
        {err && (
          <p className="text-center fade-up" style={{ ...t.caption, color: "var(--care-600)", marginTop: "var(--sp-2)" }}>{err}</p>
        )}
      </div>

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--gap-section)" }}>
        解析结果会保存在本机，所有内容只有你能看见。
      </p>
      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}

// ---------- 解析 AI 返回的纯文本 ----------
// 周公模式 11 行（1 总结 + 3 元素 + 4 情绪 + 3 建议）
// 心理学模式 13 行（1 洞察 + 5 元素 + 4 情绪 + 3 建议）
function parseAnalysis(raw: string, mode: DreamMode): DreamAnalysis {
  const lines = raw.split(/\n+/).map((l) => l.replace(/^[\s\d\.、\)\(\【\】•\-:：]+/, "").trim()).filter(Boolean);
  const expectElements = mode === "psych" ? 5 : 3;
  const expectEmotions = 4;
  const expectSuggestions = 3;

  // 元素行：line 用 "=" 切，三段 (element|symbol|emotion)
  const elementLines = lines.filter((l) => l.includes("=") && !/^\d/.test(l)).slice(0, expectElements + 4);
  const elements: DreamAnalysis["elements"] = [];
  for (const l of elementLines) {
    const parts = l.split("=").map((s) => s.trim());
    if (parts.length >= 2 && parts[0]) {
      const element = parts[0];
      const symbol = parts[1] ?? "";
      const emotion = parts.slice(2).join("=") || symbol;
      // 过滤掉明显是情绪行的（百分比）
      if (!/[%]/.test(element) && element.length <= 12 && !/^\d+$/.test(element)) {
        elements.push({ element, symbol, emotion });
      }
    }
    if (elements.length >= expectElements) break;
  }

  // 情绪行：包含 % 或匹配 name=num=desc
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

  // 建议行：剩下的、不含= 的短句
  const used = new Set<string>();
  [...elementLines, ...emotionLines].forEach((l) => used.add(l));
  const suggestionLines = lines.filter((l) => !used.has(l) && !/^[\d%=\.\s]+$/.test(l) && l.length >= 4 && l.length <= 40).slice(0, expectSuggestions + 4);
  const suggestions: string[] = [];
  for (const l of suggestionLines) {
    if (suggestions.length >= expectSuggestions) break;
    if (l.length >= 6 && l.length <= 36) suggestions.push(l);
  }
  // 兜底建议
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