import Link from "next/link";
import { Btn, Card, t } from "@/components/ui";
import { CRISIS_HOTLINES, EMERGENCY, FOR_OTHERS, spell } from "@/lib/crisis";
import { FRIEND_NAME } from "@/lib/persona";

// 危机资源页 —— 允许使用 care 配色的 3 处之一
// 按 DESIGN §3.5.2：此页不放底部导航，避免误触离开；
// 出口改为 sticky header + 页面底部一条明确的、温暖的回来的路。
// 全页禁止 emoji（伦理复核 P0-4）。
export const metadata = { title: "需要专业帮助 · 林间聊愈室" };

export default function Help() {
  const [primary, secondary] = CRISIS_HOTLINES;

  return (
    <main className="app-main" style={{ paddingBottom: "var(--sp-12)" }}>
      <div
        className="flex items-center"
        style={{
          gap: "var(--gap-inline)",
          position: "sticky",
          top: 0,
          zIndex: "var(--z-sticky)",
          background: "var(--bg-base)",
          margin: "calc(var(--gap-page-x) * -1) calc(var(--gap-page-x) * -1) var(--sp-6)",
          padding: "var(--sp-4) var(--gap-page-x)",
        }}
      >
        <Link href="/me" aria-label="返回" className="no-underline" style={{ color: "var(--forest-700)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </Link>
        <span style={{ ...t.body, color: "var(--text-secondary)" }}>需要专业帮助</span>
      </div>

      {/* 托举意象 */}
      <div className="flex justify-center" style={{ marginBottom: "var(--sp-6)" }}>
        <span className="flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: 999, background: "var(--care-100)" }}>
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden>
            <circle cx="24" cy="19" r="7" stroke="var(--care-700)" strokeWidth="2" />
            <path d="M10 30 Q 24 42 38 30" stroke="var(--care-700)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </div>

      <h1 className="text-center" style={{ ...t.h2, color: "var(--care-700)", marginBottom: "var(--gap-section)" }}>
        如果你现在很难受，
        <br />
        下面这些人是真的可以接住你的。
      </h1>

      <p style={{ ...t.body, color: "var(--text-secondary)", marginBottom: "var(--sp-5)" }}>
        这些号码现在就可以拨通。如果身边有你信得过的人，也可以同时告诉他一声。
      </p>

      <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
        {/* 12356 —— 卡内全宽主按钮 */}
        <div
          style={{
            background: "var(--care-100)",
            border: "1.5px solid var(--care-700)",
            borderRadius: "var(--r-lg)",
            padding: "var(--gap-card-inner)",
          }}
        >
          <div style={{ ...t.body, color: "var(--text-secondary)" }}>{primary.name}</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              letterSpacing: "0.04em",
              color: "var(--forest-900)",
              margin: "6px 0",
            }}
          >
            {primary.tel}
          </div>
          <div style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-3)" }}>{primary.note}</div>
          <a href={`tel:${primary.tel}`} aria-label={spell(primary.tel)} className="no-underline block">
            <Btn variant="care" size="lg" full>拨打</Btn>
          </a>
        </div>

        {/* 北京心理危机研究与干预中心 */}
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-lg)",
            padding: "var(--gap-card-inner)",
          }}
        >
          <div style={{ ...t.body, color: "var(--text-secondary)" }}>{secondary.name}</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              letterSpacing: "0.04em",
              color: "var(--forest-900)",
              margin: "6px 0",
            }}
          >
            {secondary.tel}
          </div>
          <div className="flex items-center justify-between">
            <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{secondary.note}</span>
            <a href={`tel:${secondary.tel}`} aria-label={spell(secondary.tel)} className="no-underline">
              <Btn variant="care" size="sm">拨打</Btn>
            </a>
          </div>
        </div>

        {/* 120 独立卡 —— 纯文字标题，无图标 */}
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-lg)",
            padding: "var(--gap-card-inner)",
          }}
        >
          <div style={{ ...t.body, color: "var(--care-700)", fontWeight: 500 }}>{EMERGENCY.title}</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              letterSpacing: "0.04em",
              color: "var(--forest-900)",
              margin: "6px 0",
            }}
          >
            {EMERGENCY.tel}
          </div>
          <div className="flex items-center justify-between">
            <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{EMERGENCY.note}</span>
            <a href={`tel:${EMERGENCY.tel}`} aria-label={spell(EMERGENCY.tel)} className="no-underline">
              <Btn variant="care" size="sm">拨打</Btn>
            </a>
          </div>
        </div>

        {/* 110 —— quiet 卡，重定位为「替他人求助」，无按钮 */}
        <div
          style={{
            background: "var(--bg-tint)",
            borderRadius: "var(--r-lg)",
            padding: "var(--gap-card-inner)",
          }}
        >
          <div style={{ ...t.body, color: "var(--text-secondary)" }}>{FOR_OTHERS.lead}</div>
          <div style={{ fontSize: 13, lineHeight: "var(--lh-caption)", color: "var(--text-tertiary)", marginTop: 4 }}>
            {FOR_OTHERS.note}
            <a
              href={`tel:${FOR_OTHERS.tel}`}
              aria-label={spell(FOR_OTHERS.tel)}
              className="underline"
              style={{ color: "var(--text-tertiary)", textUnderlineOffset: 3, marginLeft: 4 }}
            >
              {FOR_OTHERS.tel}
            </a>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "var(--gap-section)" }}>
        <div style={{ ...t.overline, color: "var(--care-700)", marginBottom: "var(--sp-3)" }}>还可以做的</div>
        <Card style={{ background: "var(--bg-tint)", boxShadow: "none", border: "none" }}>
          <ul style={{ ...t.body, color: "var(--text-secondary)", lineHeight: 1.9 }}>
            <li>去学校心理中心 / 医院心理科</li>
            <li>告诉一个你信得过的人</li>
            <li>把危险物品交给别人保管</li>
          </ul>
        </Card>
      </div>

      {/* 一条明确的、温暖的回来的路 —— 读完这一页，不把人留在原地 */}
      <div style={{ marginTop: "var(--gap-section)" }}>
        <Link href="/chat" className="no-underline block">
          <Btn variant="ghost" size="lg" full>
            回去和{FRIEND_NAME}说说话
          </Btn>
        </Link>
      </div>

      <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-5)" }}>
        这个页面永远在页脚，随时可以回来
      </p>
    </main>
  );
}
