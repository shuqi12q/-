"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";

// 一念之转 4 问（Byron Katie《一念之转》+ CBT 认知重评）
const QUESTIONS = [
  { q: "这是真的吗？", hint: "不需要立刻反驳，先诚实地觉察：它真的如你以为的那样吗？" },
  { q: "你能百分百确定它是真的吗？", hint: "有没有哪怕一丝可能，是你误会了、或漏掉了另一面？" },
  { q: "带着这个想法，你有什么感受？做了什么？", hint: "注意它让你身体紧绷的地方，和它把你带向的行为（沉默、逃避、争吵…）" },
  { q: "如果暂时放下这个想法，你会是谁？可以怎么做？", hint: "那个松下来的瞬间，你会选择说什么、做什么？" },
];

const SAMPLE_THOUGHTS = [
  "婆婆在欺负我",
  "我受到了不公平的对待",
  "我可能被孤立或排挤",
  "我怀疑某某人不尊重我",
  "我担心这种情况会持续下去",
  "我感到委屈和无助",
];

const FALLBACK = [
  "也许我看到的只是一面，还有别的可能。",
  "也许事情没有我想的那么绝对。",
  "我的感受是正当的，但想法可以松动一点。",
  "也许对方有我不知道的原因。",
  "也许当下我只需要陪自己一阵。",
  "也许我不需要立刻就有答案。",
];

export default function ReframePage() {
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0=念头 1=4问 2=转念结果
  const [thought, setThought] = useState("");
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [current, setCurrent] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [reframes, setReframes] = useState<string[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (stage === 1) taRef.current?.focus();
  }, [stage, qIdx]);

  // 把当前输入写到 answers[qIdx]，返回最新数组
  const saveCurrent = (arr: string[]): string[] => {
    const next = arr.slice();
    next[qIdx] = current;
    setAnswers(next);
    return next;
  };

  const start4 = () => {
    if (!thought.trim()) return;
    setStage(1);
    setQIdx(0);
    setCurrent("");
    setAnswers(["", "", "", ""]);
  };

  const goNext = () => {
    const arr = saveCurrent(answers);
    if (!arr[qIdx].trim() && qIdx < 3) return; // 没填不让进下一问
    setCurrent("");
    if (qIdx < 3) {
      setQIdx(qIdx + 1);
    } else {
      triggerReframe(arr);
    }
  };

  const goPrev = () => {
    if (qIdx === 0) return;
    const arr = saveCurrent(answers);
    setCurrent(arr[qIdx - 1] || "");
    setQIdx(qIdx - 1);
  };

  // 跳到第 N 问（顶部进度点点击）
  const jumpTo = (i: number) => {
    if (stage !== 1) return;
    if (i === qIdx) return;
    const arr = saveCurrent(answers);
    setCurrent(arr[i] || "");
    setQIdx(i);
  };

  const triggerReframe = async (finalAnswers?: string[]) => {
    const ans = finalAnswers ?? saveCurrent(answers);
    setStage(2);
    setLoading(true);
    setStreamed("");
    setReframes([]);
    try {
      const res = await fetch("/api/reframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought, answers: ans }),
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
      const lines = acc
        .split(/\n+/)
        .map((l) => l.replace(/^[\s\d\.、\)\(\【\】•\-:：]+/, "").trim())
        .filter((l) => l.length >= 4)
        .slice(0, 6);
      setReframes(lines.length ? lines : FALLBACK);
    } catch {
      setReframes(FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  const redo4 = () => {
    setStage(1);
    setQIdx(0);
    setCurrent("");
    setReframes([]);
    setStreamed("");
  };

  const regenerate = () => {
    setReframes([]);
    setStreamed("");
    triggerReframe(answers);
  };

  // 上一问/下一问/重做 4 问按钮的可用性
  const canNext = current.trim().length > 0;

  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>转念器</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        把一个让你不舒服的念头拿来，先用 4 问梳理一遍，再让 AI 帮你翻出 6 种"另一种可能"。
      </p>

      {/* ---------- 阶段 0：输入念头 ---------- */}
      {stage === 0 && (
        <div className="fade-up">
          <Card>
            <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>你的念头</div>
            <div className="flex flex-wrap" style={{ gap: "var(--gap-inline)", marginBottom: "var(--sp-3)" }}>
              {SAMPLE_THOUGHTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setThought(s)}
                  style={{
                    background: "var(--bg-tint)",
                    color: "var(--text-secondary)",
                    borderRadius: 999,
                    padding: "7px 12px",
                    fontSize: "var(--fs-caption)",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="把你脑子里那个反复出现的念头写下来…"
              rows={4}
              className="content-serif w-full"
              style={{
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
          <div style={{ marginTop: "var(--sp-4)" }}>
            <Btn size="lg" full disabled={!thought.trim()} onClick={start4}>
              翻念头 →
            </Btn>
          </div>
        </div>
      )}

      {/* ---------- 阶段 1：4 问梳理 ---------- */}
      {stage === 1 && (
        <div className="fade-up">
          {/* 顶部：原念头 + 返回 */}
          <Card style={{ background: "var(--bg-tint)", border: "none" }}>
            <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>你在转的念头</p>
            <p className="content-serif" style={{ ...t.body, color: "var(--text-primary)", marginTop: 4, lineHeight: 1.7 }}>
              「{thought}」
            </p>
          </Card>

          {/* 进度：4 个点，可点击回看 */}
          <div className="flex items-center justify-center" style={{ gap: "var(--sp-2)", margin: "var(--sp-5) 0" }}>
            {QUESTIONS.map((_, i) => {
              const answered = answers[i]?.trim().length > 0;
              const active = i === qIdx;
              return (
                <button
                  key={i}
                  onClick={() => jumpTo(i)}
                  aria-label={`第 ${i + 1} 问${answered ? "（已答）" : ""}`}
                  style={{
                    width: active ? 22 : 14,
                    height: 14,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: active ? "var(--forest-700)" : answered ? "var(--forest-300)" : "var(--hairline)",
                    transitionDuration: "var(--dur-fast)",
                  }}
                />
              );
            })}
            <span style={{ ...t.caption, color: "var(--text-tertiary)", marginLeft: "var(--sp-2)" }}>
              {qIdx + 1} / 4
            </span>
          </div>

          <Card>
            <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>
              问 {qIdx + 1}：{QUESTIONS[qIdx].q}
            </div>
            <p style={{ ...t.body, color: "var(--text-secondary)" }}>{QUESTIONS[qIdx].hint}</p>
            <textarea
              ref={taRef}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              rows={4}
              placeholder="写下你此刻浮现的回答（想留空就写一句「我先跳过」，但写一些效果更好）"
              className="content-serif w-full"
              style={{
                background: "var(--bg-elevated)",
                border: "1.5px solid var(--forest-300)",
                borderRadius: "var(--r-md)",
                boxShadow: "var(--shadow-paper-inset)",
                padding: "var(--sp-3)",
                fontSize: "var(--fs-body)",
                lineHeight: 1.7,
                color: "var(--text-primary)",
                resize: "none",
                outline: "none",
                marginTop: "var(--sp-4)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canNext) goNext();
                }
              }}
            />
          </Card>

          <div className="flex items-center" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-4)" }}>
            <Btn variant="ghost" onClick={goPrev} disabled={qIdx === 0}>上一问</Btn>
            <Btn onClick={goNext} disabled={!canNext} className="flex-1">
              {qIdx === 3 ? "翻出 6 条另一种可能 →" : "下一问 →"}
            </Btn>
          </div>

          {qIdx === 3 && (
            <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-3)", textAlign: "center" }}>
              也可以直接 <Btn variant="secondary" size="sm" onClick={() => triggerReframe()}>跳过 4 问直接翻</Btn>
            </p>
          )}
        </div>
      )}

      {/* ---------- 阶段 2：转念结果 ---------- */}
      {stage === 2 && (
        <div className="fade-up flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
          {/* 念头回放 */}
          <Card style={{ background: "var(--bg-tint)", border: "none" }}>
            <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>你在转的念头</p>
            <p className="content-serif" style={{ ...t.body, color: "var(--text-primary)", marginTop: 4, lineHeight: 1.7 }}>
              「{thought}」
            </p>
          </Card>

          {/* 4 问摘要（折叠式，可点击展开） */}
          <Card style={{ background: "var(--bg-elevated)" }}>
            <details>
              <summary style={{ cursor: "pointer", ...t.body, color: "var(--text-secondary)", listStyle: "none" }}>
                4 问自检 · 你写下的（点开看）
              </summary>
              <div className="flex flex-col" style={{ gap: 8, marginTop: "var(--sp-3)" }}>
                {QUESTIONS.map((qq, i) => (
                  <div key={i}>
                    <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>问 {i + 1}：{qq.q}</div>
                    <p className="content-serif" style={{ ...t.body, color: "var(--text-primary)", marginTop: 2, lineHeight: 1.7 }}>
                      {answers[i]?.trim() || "（未答）"}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </Card>

          {/* 流式累积 / 解析结果 */}
          {loading && (
            <Card>
              <div className="flex items-center" style={{ gap: "var(--sp-3)" }}>
                <span className="flex" style={{ gap: 4 }}>
                  <i style={{ width: 6, height: 6, borderRadius: 999, background: "var(--forest-500)", display: "inline-block", animation: "caret 1s infinite" }} />
                  <i style={{ width: 6, height: 6, borderRadius: 999, background: "var(--forest-500)", display: "inline-block", animation: "caret 1s .2s infinite" }} />
                  <i style={{ width: 6, height: 6, borderRadius: 999, background: "var(--forest-500)", display: "inline-block", animation: "caret 1s .4s infinite" }} />
                </span>
                <span className="content-serif" style={{ ...t.body, color: "var(--text-primary)" }}>{streamed || "正在翻念头…"}</span>
              </div>
            </Card>
          )}

          {!loading && reframes.length > 0 && (
            <>
              <div className="fade-up" style={{ ...t.h3, color: "var(--forest-900)", marginTop: "var(--sp-3)" }}>另一种可能</div>
              <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
                {reframes.map((r, i) => (
                  <Card key={i} className="fade-up" style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}>
                    <div className="flex items-start" style={{ gap: "var(--sp-3)" }}>
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 999, background: "var(--forest-100)", color: "var(--forest-700)", fontSize: "var(--fs-caption)", fontWeight: 600 }}
                      >
                        {i + 1}
                      </div>
                      <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.8 }}>{r}</p>
                    </div>
                  </Card>
                ))}
              </div>
              <p style={{ ...t.caption, color: "var(--text-tertiary)", textAlign: "center", marginTop: "var(--sp-2)" }}>
                转念不是否定你的感受，只是给念头留一点可以呼吸的缝隙。
              </p>
            </>
          )}

          {!loading && (
            <div className="flex" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-3)" }}>
              <Btn variant="ghost" onClick={redo4} className="flex-1">回到 4 问重做</Btn>
              <Btn variant="secondary" onClick={regenerate} className="flex-1">再来 6 条</Btn>
            </div>
          )}
        </div>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}