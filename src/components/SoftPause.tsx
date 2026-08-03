"use client";

import BreathingLeaf from "./BreathingLeaf";
import { Btn, t } from "./ui";

// 情绪缓冲页 —— 介于「正常游戏」与「危机层」之间的中间态
//
// 伦理约束（设计文档 3.3，P0）：
// · 只由用户主动点击触发。绝不自动弹出。
//   不做停留时长监测、不做操作频率监测、不做任何情绪推断弹窗 ——
//   监视用户的情绪状态既不准确又冒犯，会让用户觉得自己被判定为「有问题」。
// · 不记录、不上报、不影响任何后续内容。
// · 这里不是危机层，不出现热线、不使用危机色（--care-*）。
export default function SoftPause({
  onBack,
  onLeave,
  onChat,
}: {
  onBack: () => void;
  onLeave: () => void;
  onChat: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center fade-up"
      style={{ background: "var(--bg-base)", zIndex: 60, padding: "var(--gap-page-x)" }}
      role="dialog"
      aria-label="缓一下"
    >
      <BreathingLeaf size={72} />

      <p
        className="content-serif text-center"
        style={{ ...t.bodyLg, color: "var(--text-primary)", margin: "var(--sp-6) 0 var(--sp-10)" }}
      >
        不着急。这里可以待着。
      </p>

      <div className="flex flex-col w-full" style={{ gap: "var(--sp-3)", maxWidth: 320 }}>
        <Btn size="lg" full onClick={onBack}>
          回去接着走
        </Btn>
        <Btn variant="secondary" size="lg" full onClick={onChat}>
          找栖栖说两句
        </Btn>
        <Btn variant="ghost" size="lg" full onClick={onLeave}>
          先停在这里
        </Btn>
      </div>
    </div>
  );
}
