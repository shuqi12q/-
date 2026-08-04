"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";
import { DREAM_KEYS } from "@/lib/box-data";

export default function DreamPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ title: string; text: string }[] | null>(null);
  const [empty, setEmpty] = useState(false);

  const analyze = () => {
    const v = text.trim();
    if (!v) return;
    const hits = DREAM_KEYS.filter((k) => k.re.test(v)).slice(0, 2).map((k) => ({ title: k.title, text: k.text }));
    setResult(hits.length ? hits : null);
    setEmpty(hits.length === 0);
  };

  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>梦的解析</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        把你记得的梦写下来。梦没有标准答案，但常常是最近心情的镜子——把它当作认识自己的一扇小窗。
      </p>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setResult(null); setEmpty(false); }}
        placeholder="比如：我梦见自己在往下坠落，怎么都抓不住东西……"
        rows={5}
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
        <Btn size="lg" full disabled={!text.trim()} onClick={analyze}>
          看看这个梦在说什么
        </Btn>
      </div>

      {result && (
        <div className="flex flex-col fade-up" style={{ gap: "var(--gap-card-stack)", marginTop: "var(--sp-6)" }}>
          {result.map((r) => (
            <Card key={r.title}>
              <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>「{r.title}」的梦</div>
              <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.8 }}>{r.text}</p>
            </Card>
          ))}
          <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>
            以上只是自我探索的参考，不是诊断。如果这个梦让你反复难受，可以和信任的人说说，或记录下来慢慢看。
          </p>
        </div>
      )}
      {empty && (
        <div className="fade-up" style={{ marginTop: "var(--sp-6)" }}>
          <Card>
            <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>这个梦有点特别</div>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.8 }}>
              它不在常见主题里，但那不代表它不重要。试着问自己：梦里的感觉，和最近哪件事的感觉最像？把答案写下来，那就是你的解读。
            </p>
          </Card>
        </div>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}