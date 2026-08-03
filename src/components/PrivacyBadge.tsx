// 12px 灰色小字 —— 刻意克制，不做成绿色成功徽章
export default function PrivacyBadge({ text = "你的内容只存在这台设备上" }: { text?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-tertiary)" }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M12 3 L19 6 V12 C19 16.2 15.9 19.6 12 21 C8.1 19.6 5 16.2 5 12 V6 Z" />
      </svg>
      {text}
    </span>
  );
}
