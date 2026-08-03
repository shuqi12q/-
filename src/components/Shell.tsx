"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "./BottomNav";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [needAccept, setNeedAccept] = useState(false);

  // 首次使用检查：非阻塞提示，不做强制拦截
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = window.localStorage.getItem("psy_accepted");
    setNeedAccept(!ok && pathname !== "/welcome");
  }, [pathname]);

  return (
    <>
      <main className="app-main">
        {needAccept && (
          <Link
            href="/welcome"
            className="block no-underline fade-up"
            style={{
              background: "var(--bg-tint)",
              color: "var(--text-secondary)",
              borderRadius: "var(--r-sm)",
              padding: "10px 12px",
              marginBottom: "var(--gap-card-stack)",
              fontSize: "var(--fs-caption)",
              lineHeight: "var(--lh-caption)",
            }}
          >
            首次使用前请阅读边界声明 →
          </Link>
        )}
        {children}
      </main>
      <BottomNav />
    </>
  );
}
