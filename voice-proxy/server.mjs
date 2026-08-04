// 火山豆包实时语音对话 代理服务 v2
// 浏览器 WebSocket 无法携带自定义 header（X-Api-App-ID 等），
// 故本代理负责：接收浏览器连接 → 用鉴权 header 连火山 wss → 双向透明转发二进制/文本帧。
//
// 运行：node voice-proxy/server.mjs  （默认端口 3301）
// 前端连接：ws://localhost:3301/voice
//
// 凭据来源：读取项目根目录 .env.local 中的
//   VOICE_APP_ID / VOICE_ACCESS_KEY / VOICE_APP_KEY（Resource-Id 固定 volc.speech.dialog）

import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.VOICE_PROXY_PORT || 3301);

// ---------- 读取 .env.local ----------
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  const env = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const APP_ID = env.VOICE_APP_ID;
const ACCESS_KEY = env.VOICE_ACCESS_KEY;
const APP_KEY = env.VOICE_APP_KEY;
const RESOURCE_ID = "volc.speech.dialog";
const UPSTREAM = "wss://openspeech.bytedance.com/api/v3/realtime/dialogue";

if (!APP_ID || !ACCESS_KEY || !APP_KEY) {
  console.error(
    "[voice-proxy] 缺少凭据：请在 .env.local 配置 VOICE_APP_ID / VOICE_ACCESS_KEY / VOICE_APP_KEY",
  );
  process.exit(1);
}

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("voice-proxy running (ws://localhost:" + PORT + "/voice)\n");
});

const wss = new WebSocketServer({ server, path: "/voice" });

wss.on("connection", (clientSocket, req) => {
  let upstreamOpen = false;
  let clientClosed = false;

  const upstream = new WebSocket(UPSTREAM, {
    headers: {
      "X-Api-App-ID": APP_ID,
      "X-Api-Access-Key": ACCESS_KEY,
      "X-Api-Resource-Id": RESOURCE_ID,
      "X-Api-App-Key": APP_KEY,
      "X-Api-Connect-Id": randomUUID(),
    },
  });

  upstream.on("open", () => {
    upstreamOpen = true;
    console.log("[voice-proxy] 上游已连接 " + new Date().toLocaleTimeString());
  });

  upstream.on("message", (data, isBinary) => {
    if (clientSocket.readyState === 1) {
      clientSocket.send(data, { binary: isBinary });
    }
  });

  upstream.on("error", (e) => {
    console.error("[voice-proxy] 上游错误", e.message);
  });

  upstream.on("close", (code, reason) => {
    console.log("[voice-proxy] 上游关闭 code=" + code + " reason=" + reason);
    if (!clientClosed && clientSocket.readyState === 1) {
      clientSocket.close(1011, "upstream closed");
    }
  });

  clientSocket.on("message", (data, isBinary) => {
    if (upstreamOpen && upstream.readyState === 1) {
      upstream.send(data, { binary: isBinary });
    }
  });

  clientSocket.on("close", () => {
    clientClosed = true;
    if (upstreamOpen && upstream.readyState === 1) {
      try {
        upstream.close(1000, "client closed");
      } catch {}
    }
  });

  clientSocket.on("error", (e) => {
    console.error("[voice-proxy] 客户端错误", e.message);
  });
});

server.listen(PORT, () => {
  console.log("[voice-proxy] listening on ws://localhost:" + PORT + "/voice");
});
