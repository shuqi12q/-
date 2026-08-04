"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";

export default function CoinPage() {
  const [question, setQuestion] = useState("");
  const [side, setSide] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  const flip = () => {
    if (spinning) return;
    setSpinning(true);
    setSide(null);
    setTimeout(() => {
      setSide(Math.random() < 0.5 ? "正面" : "反面");
      setSpinning(false);
    }, 650);
  };

  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>决策币</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        硬币不替你决定，它只帮你把犹豫摊开——真正重要的，是硬币落下前你心里的那点倾向。
      </p>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="在纠结什么？（可选）比如：要不要去？要不要说？"
        className="w-full"
        style={{
          background: "var(--bg-elevated)",
          border: "1.5px solid var(--forest-300)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-paper-inset)",
          padding: "0 16px",
          height: 48,
          fontSize: "var(--fs-body)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />

      <div className="flex flex-col items-center" style={{ padding: "var(--sp-8) 0" }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 132,
            height: 132,
            borderRadius: 999,
            background: "var(--wood-200)",
            color: "var(--forest-900)",
            fontSize: "var(--fs-h2)",
            fontWeight: 600,
            boxShadow: "var(--shadow-md)",
            transitionDuration: "var(--dur-base)",
            transform: spinning ? "rotateY(720deg) scale(.96)" : "rotateY(0deg) scale(1)",
          }}
        >
          {side ?? "?"}
        </div>

        <div style={{ marginTop: "var(--sp-6)" }}>
          <Btn size="lg" onClick={flip} disabled={spinning}>
            {spinning ? "…" : side ? "再抛一次" : "抛 硬 币"}
          </Btn>
        </div>

        {side && (
          <div className="fade-up" style={{ marginTop: "var(--sp-6)", width: "100%", maxWidth: 420 }}>
            <Card>
              <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>抛完，问自己一句</div>
              <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.8 }}>
                刚才硬币翻起来的那一刻，你心里更希望看到「正面」还是「反面」？那个直觉，往往比硬币本身更接近答案。
              </p>
              <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-3)" }}>
                小决定可以交给硬币，重大的事请结合现实好好权衡，也可以找信任的人聊聊。
              </p>
            </Card>
          </div>
        )}
      </div>

      <div className="text-center">
        <PrivacyBadge />
      </div>
    </Shell>
  );
}