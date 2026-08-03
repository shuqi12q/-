"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrivacyBadge from "@/components/PrivacyBadge";
import Shell from "@/components/Shell";
import { Btn, Card, MOOD_LABEL, MOOD_VAR, Overline, t } from "@/components/ui";
import { readCapsule, tearCapsule } from "@/lib/lifepath";
import type { Capsule, JournalEntry } from "@/lib/types";

// 仅开发环境的肉眼验收入口，生产产物里必须一个字节都不剩。
// 为什么用 require 而不是 import / next/dynamic：
//   · 静态 import 会把 CrisisLayer 钉进 /me 的首屏 chunk —— 客户端组件模块被当作有副作用，
//     不会因为 DEBUG=false 就被 tree-shake 掉；
//   · next/dynamic 本身是运行时，import 它就会带进约 2.4kB，即使那个分支永远不执行；
//   · 条件 require 会被 webpack 常量折叠成 if(false)，整个依赖边被删除，实测零残留。
const DEBUG = process.env.NODE_ENV === "development";
const CrisisLayerPreview: typeof import("@/components/CrisisLayer").default | null = DEBUG
  ? // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require("@/components/CrisisLayer") as typeof import("@/components/CrisisLayer")).default
  : null;

export default function Me() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [storyDone, setStoryDone] = useState(0);
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [previewCrisis, setPreviewCrisis] = useState(false);

  useEffect(() => {
    (async () => {
      const { getEntries } = await import("@/lib/db");
      setEntries(await getEntries());
    })().catch(() => undefined);
    setStoryDone(Number(window.localStorage.getItem("psy_story_done") || 0));
    setCapsule(readCapsule());
  }, []);

  const dist = [0, 1, 2, 3, 4].map((lv) => entries.filter((e) => e.quick === lv).length);
  const total = entries.length || 1;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `psycare-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clear = async () => {
    const { clearAll } = await import("@/lib/db");
    await clearAll();
    window.localStorage.removeItem("psy_draft");
    window.localStorage.removeItem("psy_chat");
    setEntries([]);
    setConfirmClear(false);
  };

  return (
    <Shell>
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--gap-section)" }}>
        <h1 style={{ ...t.h1, color: "var(--forest-900)" }}>我的</h1>
        <PrivacyBadge text="0 条数据上传过" />
      </div>

      <div className="flex" style={{ gap: "var(--gap-card-stack)", marginBottom: "var(--gap-card-stack)" }}>
        <Card className="flex-1">
          <div style={{ ...t.h2, color: "var(--forest-900)" }}>{entries.length}</div>
          <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>篇记录</div>
        </Card>
        <Card className="flex-1">
          <div style={{ ...t.h2, color: "var(--forest-900)" }}>{storyDone}</div>
          <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>次走完故事</div>
        </Card>
      </div>

      <Card style={{ marginBottom: "var(--gap-card-stack)" }}>
        <Overline>我留在路上的话</Overline>
        {capsule ? (
          <>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9, margin: "var(--sp-3) 0" }}>
              {capsule.text}
            </p>
            <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-3)" }}>
              写给「{capsule.keepText}」的 · 只在这台设备上
            </p>
            <Btn variant="ghost" size="sm" onClick={() => { tearCapsule(); setCapsule(null); }}>撕掉这封信</Btn>
          </>
        ) : (
          <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-3)" }}>
            还没在《这一年的路》里留过话。下次走到第 7 格，会再遇到它。
          </p>
        )}
      </Card>

      <Card style={{ marginBottom: "var(--gap-card-stack)" }}>
        <Overline>情绪分布</Overline>
        {entries.length === 0 ? (
          <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-3)" }}>
            还没有记录，写一篇就会出现在这里。
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-4)" }}>
            {[4, 3, 2, 1, 0].map((lv) => (
              <div key={lv} className="flex items-center" style={{ gap: "var(--gap-inline)" }}>
                <span style={{ ...t.caption, color: "var(--text-secondary)", width: 44 }}>{MOOD_LABEL[lv]}</span>
                <span className="flex-1" style={{ height: 8, borderRadius: 999, background: "var(--bg-sunken)", overflow: "hidden" }}>
                  <span
                    className="block"
                    style={{
                      width: `${(dist[lv] / total) * 100}%`,
                      height: "100%",
                      background: `var(${MOOD_VAR[lv]})`,
                      transitionDuration: "var(--dur-base)",
                    }}
                  />
                </span>
                <span style={{ ...t.caption, color: "var(--text-tertiary)", width: 24, textAlign: "right" }}>{dist[lv]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: "var(--gap-card-stack)" }}>
        <Overline>数据与隐私</Overline>
        <p style={{ ...t.body, color: "var(--text-secondary)", margin: "var(--sp-3) 0 var(--sp-4)" }}>
          所有内容都存在这台设备的浏览器里。清空浏览器数据会一起丢失，建议偶尔导出备份。
        </p>
        <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
          <Btn variant="secondary" size="md" full onClick={exportJson}>导出为 JSON</Btn>

          {confirmClear ? (
            <div style={{ background: "var(--bg-tint)", borderRadius: "var(--r-sm)", padding: "var(--sp-4)" }}>
              <p style={{ ...t.body, color: "var(--text-primary)" }}>
                会删掉这台设备上的全部记录与对话，不可恢复。确定吗？
              </p>
              <div className="flex" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-3)" }}>
                <Btn variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>再想想</Btn>
                {/* DESIGN §1.1.6：破坏性操作 = Secondary 按钮 + care-700 文字色，不做实心红按钮 */}
                <Btn variant="secondary" size="sm" onClick={clear} style={{ color: "var(--care-700)", borderColor: "var(--care-700)" }}>
                  确认彻底删除
                </Btn>
              </div>
            </div>
          ) : (
            <Btn variant="ghost" size="md" full onClick={() => setConfirmClear(true)}>彻底删除所有数据</Btn>
          )}

          <div className="flex items-center justify-between" style={{ paddingTop: "var(--sp-3)", borderTop: "1px solid var(--divider)" }}>
            <div>
              <div style={{ ...t.body, color: "var(--text-primary)" }}>同步到云端</div>
              <div style={{ ...t.caption, color: "var(--text-tertiary)" }}>暂未开放，本地优先是默认</div>
            </div>
            <span
              className="flex items-center"
              style={{ width: 44, height: 26, borderRadius: 999, background: "var(--bg-sunken)", padding: 3 }}
            >
              <span style={{ width: 20, height: 20, borderRadius: 999, background: "var(--text-disabled)" }} />
            </span>
          </div>
        </div>
      </Card>

      <Link href="/me/help" className="no-underline">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ ...t.h3, color: "var(--forest-900)" }}>需要专业帮助</div>
              <div style={{ ...t.caption, color: "var(--text-secondary)" }}>热线与现实中的支持方式</div>
            </div>
            <span style={{ color: "var(--forest-700)" }}>→</span>
          </div>
        </Card>
      </Link>

      {DEBUG && (
        <div className="text-center" style={{ marginTop: "var(--gap-section)" }}>
          <button
            onClick={() => setPreviewCrisis(true)}
            style={{ ...t.caption, color: "var(--text-tertiary)", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            （调试）预览关怀层
          </button>
        </div>
      )}

      {/* 纯预览：不写 localStorage、不 armSuppress、不碰 psy_safe，关闭就是单纯关闭 */}
      {CrisisLayerPreview && previewCrisis && (
        <CrisisLayerPreview
          variant="chat"
          onClose={() => setPreviewCrisis(false)}
          onContinue={() => setPreviewCrisis(false)}
        />
      )}
    </Shell>
  );
}
