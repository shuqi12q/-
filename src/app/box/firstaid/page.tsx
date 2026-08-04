"use client";

import Link from "next/link";
import { useState } from "react";
import Shell from "@/components/Shell";
import PrivacyBadge from "@/components/PrivacyBadge";
import { Btn, Card, t } from "@/components/ui";
import { FIRST_AID_PLANS, type FirstAidPlan } from "@/lib/box-data";

export default function FirstAidPage() {
  const [plan, setPlan] = useState<FirstAidPlan | null>(null);

  return (
    <Shell>
      <h1 style={{ ...t.h1, color: "var(--forest-900)", marginBottom: "var(--sp-2)" }}>情绪急救</h1>
      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
        情绪受伤和身体受伤一样，需要先处理再恢复。选一个你现在最像的状态，跟着步骤走。
      </p>

      {/* 危机红线：始终置顶 */}
      <Card style={{ background: "var(--care-50, var(--bg-tint))", border: "1px solid var(--care-200, var(--hairline))" }}>
        <div style={{ ...t.h3, color: "var(--care-700)" }}>如果你现在有伤害自己的想法</div>
        <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: "var(--sp-2)", lineHeight: 1.7 }}>
          请立即拨打心理援助热线 <b style={{ color: "var(--care-700)" }}>12356</b>（24 小时），或联系身边信任的人。这里的小工具不是紧急求助的替代。
        </p>
        <div style={{ marginTop: "var(--sp-3)" }}>
          <Link href="/me/help" className="no-underline">
            <Btn variant="secondary" size="sm">查看全部援助电话 →</Btn>
          </Link>
        </div>
      </Card>

      {/* 情绪类型选择 */}
      <div style={{ marginTop: "var(--gap-section)" }}>
        <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-3)" }}>
          你现在更接近哪一种？
        </p>
        <div className="flex flex-wrap" style={{ gap: "var(--gap-inline)" }}>
          {FIRST_AID_PLANS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlan(p)}
              style={{
                background: plan?.key === p.key ? "var(--forest-100)" : "var(--bg-elevated)",
                border: plan?.key === p.key ? "1.5px solid var(--forest-500)" : "1px solid var(--hairline)",
                color: plan?.key === p.key ? "var(--forest-900)" : "var(--text-secondary)",
                borderRadius: 999,
                padding: "9px 14px",
                minHeight: 40,
                fontSize: "var(--fs-body)",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 急救步骤 */}
      {plan && (
        <div className="fade-up flex flex-col" style={{ gap: "var(--gap-card-stack)", marginTop: "var(--gap-section)" }}>
          <Card>
            <div style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-1)" }}>{plan.label}急救包</div>
            <p style={{ ...t.body, color: "var(--text-secondary)" }}>{plan.hint}</p>
          </Card>
          {plan.steps.map((s, i) => (
            <Card key={i} className="flex" style={{ gap: "var(--sp-3)" }}>
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 28, height: 28, borderRadius: 999, background: "var(--forest-100)", color: "var(--forest-700)", fontSize: "var(--fs-caption)", fontWeight: 600 }}
              >
                {i + 1}
              </div>
              <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.8 }}>{s}</p>
            </Card>
          ))}
          <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)" }}>
            不用一次做完，做一步就算照顾自己了。步骤参考《情绪急救》(Guy Winch) 与 CBT 自助方法。
          </p>
        </div>
      )}

      <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
        <PrivacyBadge />
      </div>
    </Shell>
  );
}