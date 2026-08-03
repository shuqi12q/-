import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "林间聊愈室 · 你的森林朋友",
  description: "记录、对话、故事 —— 一个会记得你的森林朋友",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="phone-frame">{children}</div>
      </body>
    </html>
  );
}
