"use client";

import Link from "next/link";

// 统一返回入口：子功能页顶部「← 返回上一级」，避免用户迷失
export default function BoxBack({ label = "百宝箱", to = "/box" }: { label?: string; to?: string }) {
  return (
    <Link
      href={to}
      className="no-underline"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: "var(--forest-700)",
        fontSize: "var(--fs-caption)",
        fontWeight: 500,
        marginBottom: "var(--sp-3)",
        padding: "4px 10px 4px 6px",
        borderRadius: 999,
        background: "rgba(38,95,68,.06)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}