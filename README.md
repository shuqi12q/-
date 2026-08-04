This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# 林间聊愈室 · 项目说明

一个本地优先（local-first）的轻心理疗愈 Web 应用：记录情绪、和 AI 陪伴角色聊天、走一段叙事桌游。所有数据只存在本机（Dexie / localStorage），无后端云。

## 功能模块（按 src/app 路由划分）

| 板块 | 路由 | 用途 |
|------|------|------|
| 营地（首页） | `/` | 今日心情入口、快捷开聊 |
| 记录 | `/journal` | 情绪日记（写/看/删，含 5 态情绪曲线） |
| 聊聊 | `/chat` · `/chat/pals` | AI 陪伴对话：栖栖 + 三只动物朋友（栗栗/阿赤/团团），分角色记忆 + 表情包 |
| 故事 | `/story` · `/story/path` | 叙事剧本 + 桌游《这一年的路》（12 格路径 + 随身格 + 风卡 + 时间胶囊） |
| 我的 | `/me` · `/me/help` | 个人回顾、留在路上的话、心理援助热线 |

## 分支结构（每板块一条分支，改哪块切哪条）

| 分支 | 模块 | 核心文件 / 职责 |
|------|------|----------------|
| `main` | 集成主干 | 完整可运行版本（所有板块合入） |
| `feature/chat-ai-companion` | AI 陪伴对话 | `src/app/chat`、`src/app/api/chat`、`src/lib/persona*.ts`、`src/components/companion`：栖栖 + 三只动物（栗栗/阿赤/团团）分角色人设、跨角色共享记忆串联、开场白随机不重复、颜文字、表情包（动物每 3-5 轮主动发）、新话题追加 |
| `feature/story-boardgame` | 剧本 + 桌游 | `src/app/story`：叙事剧本、桌游《这一年的路》（12 格路径 + 随身格 + 风卡 + 时间胶囊） |
| `feature/journal-emotion` | 情绪记录日记 | `src/app/journal`、`src/lib/db.ts`：标准月历视图（按月切换）、写 / 编辑 / 删除、回复过去的自己、5 态情绪 + 光/影/情绪/标签 |
| `feature/me-profile` | 个人中心 | `src/app/me`：个人回顾、留在路上的话、心理援助热线帮助页 |
| `feature/base-shell` | 基座 | `src/components/Shell`、`src/components/ui`、`src/lib/crisis.ts`：布局 / 导航 / 设计 token / 危机干预层 |

> 约定：改某个板块时 `git checkout feature/<板块>`，只动对应 `src/app/<板块>` 及相关 lib / 组件；改完合回 `main`。

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写（豆包方舟 ARK_API_KEY 或 DeepSeek DEEPSEEK_API_KEY）；不填则 AI 走本地拟人兜底。`.env.local` 已加入 `.gitignore`，不会上传。

## 本地运行

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```
