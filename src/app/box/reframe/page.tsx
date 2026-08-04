"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";

// 转念器：一念之转（The Work）4 问式 + 认知重评"另一种可能"
// 参考 Byron Katie《一念之转》与 CBT 认知重评：不评判念头真假，只帮念头松动
const QUESTIONS = [
  {
    q: "① 这是真的吗？",
    hint: "不需要急着回答「不是」，就诚实地想一下：这件事，真的如你以为的那样吗？",
  },
  {
    q: "② 你能百分百确定它是真的吗？",
    hint: "有没有哪怕一丝可能，是你误会了、或漏掉了另一面？",
  },
  {
    q: "③ 有这个想法时，你是什么感受？你会怎么做？",
    hint: "注意它让你身体紧绷的地方，和它可能把你带向的行为（沉默、逃避、争吵…）。",
  },
  {
    q: "④ 如果暂时放下这个想法，你会是谁？你会怎么做？",
    hint: "那个松下来的瞬间，你会选择说什么、做什么？",
  },
];

export default function ReframePage() {
  const [text, setText] = useState("");
  const [step, setStep] = useState(0); // 0=输入，1-4=四问，5=完成
  const [answers, setAnswers] = useState<string[]>([]);

  const start = () => {
    if (!text.trim()) return;
    setStep(1);
    setAnswers([]);
  };

  const next = (a: string) => {
    setAnswers((p) => [...p, a]);
    if (step < 4) setStep(step + 1);
    else setStep(5);
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setText("");
  };

  // 另一种可能：把"绝对化"的句子转成更开放的表述
  const reframe = (): string => {
    const t = text.trim();
    if (/一定|肯定|绝对|永远|从来/.test(t)) {
      return `也许事情没有你以为的那么绝对——「${t.replace(/一定|肯定|绝对|永远|从来/g, "")}」的背面，也可能藏着别的可能。`;
    }
    return `也许「${t.length > 24 ? t.slice(0, 24) + "…" : t}」只是现在这一刻的看法；换个位置看，或许还有别的角度。`;
  };

  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>转念器</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        把一件让你不舒服的事写下来，跟着四个问题走一遍——不评判念头真假，只是让它松动一点。
      </p>

      {step === 0 && (
        <div className="fade-up">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="比如：他觉得我不够好 / 我这次一定会搞砸 / 他肯定不在乎我……"
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
          <div style={{ marginTop: "var(--sp-4)" }}>
            <Btn size="lg" full disabled={!text.trim()} onClick={start}>
              开始转念
            </Btn>
          </div>
        </div>
      )}

      {step >= 1 && step <= 4 && (
        <div className="fade-up flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
          <Card>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.8 }}>
              「{text}」
            </p>
          </Card>
          <Card>
            <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>{QUESTIONS[step - 1].q}</div>
            <p style={{ ...t.body, color: "var(--text-secondary)" }}>{QUESTIONS[step - 1].hint}</p>
            <textarea
              autoFocus
              rows={3}
              placeholder="把心里冒出来的话写下来…"
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
                  next((e.target as HTMLTextAreaElement).value);
                }
              }}
            />
            <div style={{ marginTop: "var(--sp-3)" }}>
              <Btn size="lg" full onClick={() => next("")}>
                {step === 4 ? "看看另一种可能" : "下一问"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {step === 5 && (
        <div className="fade-up flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
          {answers.filter((a) => a.trim()).length > 0 && (
            <Card>
              <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>你刚才想到的</div>
              {answers.filter((a) => a.trim()).map((a, i) => (
                <p key={i} className="content-serif" style={{ ...t.body, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 6 }}>
                  {a}
                </p>
              ))}
            </Card>
          )}
          <Card>
            <div style={{ ...t.h3, color: "var(--forest-700)", marginBottom: "var(--sp-2)" }}>另一个角度</div>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.8 }}>{reframe()}</p>
            <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-3)" }}>
              转念不是否定你的感受，只是给念头留一点可以呼吸的缝隙。
            </p>
          </Card>
          <Btn variant="secondary" size="lg" onClick={reset}>再转一个念头</Btn>
        </div>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}