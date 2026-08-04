// 测试 voice-proxy —— 使用 Node 22 原生 WebSocket（undici），零依赖
const WS_URL = process.env.WS_URL || "ws://localhost:3301/voice";
const SID = "test-session-001";

function encodeEvent(eventId, sessionId, payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj), "utf-8");
  const sid = Buffer.from(sessionId, "utf-8");
  const ev = Buffer.alloc(4);
  ev.writeUInt32BE(eventId, 0);
  const sidSize = Buffer.alloc(4);
  sidSize.writeUInt32BE(sid.length, 0);
  const pSize = Buffer.alloc(4);
  pSize.writeUInt32BE(payload.length, 0);
  return Buffer.concat([
    Buffer.from([0x11, 0x14, 0x10, 0x00]),
    ev,
    sidSize,
    sid,
    pSize,
    payload,
  ]);
}

const ws = new WebSocket(WS_URL);

ws.addEventListener("open", () => {
  console.log("✔ 代理连接成功");
  ws.send(encodeEvent(1, SID, {}));
  console.log("→ StartConnection (1) 已发送");
  const startSession = {
    asr: { extra: { end_smooth_window_ms: 1500, enable_custom_vad: true } },
    dialog: {
      bot_name: "正念陪伴",
      system_role: "你是林间小森林里温柔的正念呼吸陪伴者，说话轻声慢语，简短温暖。",
      speaking_style: "轻声、舒缓、简洁",
      extra: { model: "1.2.1.1", input_mod: "keep_alive" },
    },
    tts: {
      speaker: "zh_female_vv_jupiter_bigtts",
      audio_config: { channel: 1, format: "pcm_s16le", sample_rate: 24000 },
    },
  };
  setTimeout(() => {
    ws.send(encodeEvent(100, SID, startSession));
    console.log("→ StartSession (100) 已发送");
  }, 500);
});

ws.addEventListener("message", (ev) => {
  const buf = Buffer.from(ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : ev.data);
  if (buf.length < 4) return;
  const flags = buf[1] & 0x0f;
  let off = 4;
  let eventId = null;
  if (flags & 0x04 && buf.length >= off + 4) {
    eventId = buf.readUInt32BE(off);
    off += 4;
  }
  const jsonStart = buf.indexOf(0x7b);
  let summary = "";
  if (jsonStart >= 0) {
    try {
      summary = JSON.stringify(JSON.parse(buf.subarray(jsonStart).toString("utf-8"))).slice(0, 180);
    } catch {}
  }
  console.log(`← msgType=${(buf[1] >> 4) & 0x0f} flags=${flags} event=${eventId} len=${buf.length} ${summary}`);
  if (eventId === 150) {
    console.log("🎉 SessionStarted 成功！");
    ws.send(encodeEvent(102, SID, {}));
    setTimeout(() => ws.close(), 300);
  }
});

ws.addEventListener("close", (ev) => {
  console.log("连接关闭 code=" + ev.code + " reason=" + (ev.reason || ""));
  process.exit(0);
});
ws.addEventListener("error", (e) => {
  console.error("错误:", e.message || e);
  process.exit(1);
});

setTimeout(() => {
  console.log("⏱ 15 秒无 SessionStarted，超时");
  process.exit(2);
}, 15000);
