// 直接连火山上游，捕获 401 响应体详情（诊断用）
import { WebSocket } from "ws";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const env = {};
  const envPath = path.join(ROOT, ".env.local");
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const env = loadEnv();

const UPSTREAM = "wss://openspeech.bytedance.com/api/v3/realtime/dialogue";
const headers = {
  "X-Api-App-ID": env.VOICE_APP_ID,
  "X-Api-Access-Key": env.VOICE_ACCESS_KEY,
  "X-Api-Resource-Id": "volc.speech.dialog",
  "X-Api-App-Key": env.VOICE_APP_KEY,
  "X-Api-Connect-Id": crypto.randomUUID(),
};

console.log("请求头（值打码）:");
for (const [k, v] of Object.entries(headers)) {
  const masked = k.includes("Key") || k.includes("ID")
    ? v.slice(0, 3) + "…" + v.slice(-3)
    : v;
  console.log(`  ${k}: ${masked} (len=${v.length})`);
}

const ws = new WebSocket(UPSTREAM, { headers });

ws.on("unexpected-response", (req, res) => {
  console.log("\n❌ 上游 HTTP 状态:", res.statusCode, res.statusMessage);
  let body = "";
  res.on("data", (d) => (body += d.toString()));
  res.on("end", () => {
    console.log("响应体:", body.slice(0, 500));
    process.exit(0);
  });
});

ws.on("open", () => {
  console.log("✅ 上游连接成功！");
  process.exit(0);
});

ws.on("error", (e) => {
  console.log("错误:", e.message);
});

setTimeout(() => {
  console.log("⏱ 超时");
  process.exit(1);
}, 15000);
