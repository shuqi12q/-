"use client";

import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Card, Btn, t } from "@/components/ui";
import { CompanionAvatar, companionName } from "@/components/companion/CompanionAvatar";
import { COMPANIONS } from "@/lib/persona";
import type { CompanionKey } from "@/components/companion/svg-data";
import { setLastCompanion } from "@/lib/chat-store";

// 只有动物角色出现在选择页，栖栖是默认/隐藏
const SELECTABLE = (["lili", "achi", "tuan"] as const) satisfies readonly string[];

export default function ChatPalsPage() {
  const [picked, setPicked] = useState<CompanionKey | null>(null);

  return (
    <Shell>
      <div style={{ ...t.h2, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>
        今天想和谁聊聊？
      </div>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        每一位都有自己的脾气。挑一个合眼缘的就行，随时可以换。
      </p>

      <div className="flex flex-col" style={{ gap: "var(--sp-4)" }}>
        {SELECTABLE.map((id) => {
          const c = COMPANIONS.find((x) => x.id === id)!;
          const isPicked = picked === id;
          return (
            <Card
              key={id}
              onClick={() => setPicked(id as CompanionKey)}
              style={{
                cursor: "pointer",
                border: isPicked ? "2px solid var(--forest-500)" : "1px solid var(--hairline)",
                transition: "border-color var(--dur-fast) ease",
              }}
            >
              <div className="flex items-center" style={{ gap: "var(--sp-4)" }}>
                <CompanionAvatar char={id as CompanionKey} size={72} />
                <div className="flex-1">
                  <div style={{ ...t.h3, color: "var(--forest-900)" }}>
                    {c.name}
                    <span style={{ ...t.caption, color: "var(--text-tertiary)", marginLeft: "var(--sp-2)" }}>
                      {c.species}
                    </span>
                  </div>
                  <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: 4 }}>
                    {c.tagline}
                  </p>
                </div>
                {isPicked && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--forest-600)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {picked && (
        <div className="fade-up" style={{ marginTop: "var(--sp-6)" }}>
          <Link
            href={`/chat?p=${picked}`}
            onClick={() => setLastCompanion(picked)}
            className="no-underline"
          >
            <Btn full size="lg">
              和{companionName(picked)}聊聊 →
            </Btn>
          </Link>
        </div>
      )}

      <div style={{ marginTop: "var(--sp-8)", textAlign: "center" }}>
        <Link
          href="/chat?p=chichi"
          className="underline"
          style={{ ...t.caption, color: "var(--text-tertiary)", textUnderlineOffset: 3 }}
        >
          还是找栖栖聊 →
        </Link>
      </div>
    </Shell>
  );
}
