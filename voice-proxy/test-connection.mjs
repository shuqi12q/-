// 测试 voice-proxy：连接代理 → 发 StartConnection(1) → StartSession(100) → 收 SessionStarted(150)
// 协议：4字节头 | optional(event 4B + session_id_size 4B + session_id) | payload_size 4B | payload
import WebSocket from "ws";

const WS_URL = process.env.WS_URL || "ws://localhost:3301/voice";
const SID = "test-session-001";

function encodeEvent(eventId, sessionId, payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj), "utf-8");
  const sid = Buffer.from(sessionId, "utf-8");
  // 头: 0x11 (v1 + hdrSize4) | 0x14 (Full-client request + event flag) | 0x10 (JSON, 无压缩) | 0x00
  const optional = Buffer.alloc(0);
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

ws.on("open", () => {
  console.log("✔ 代理连接成功");
  // 1) StartConnection
  ws.send(encodeEvent(1, SID, {}));
  console.log("→ StartConnection (1) 已发送");
  // 2) StartSession
  const startSession = {
    asr: {
      extra: {
        end_smooth_window_ms: 1500,
        enable_custom_vad: true,
      },
    },
    dialog: {
      bot_name: "正念陪伴",
      system_role: "你是林间小森林里温柔的正念呼吸陪伴者，说话轻声慢语，简短温暖。",
      speaking_style: "轻声、舒缓、简洁",
      extra: {
        model: "1.2.1.1",
        input_mod: "keep_alive",
      },
    },
    tts: {
      speaker: "zh_female_vv_jupiter_bigtts",
      audio_config: {
        channel: 1,
        format: "pcm_s16le",
        sample_rate: 24000,
      },
    },
  };
  setTimeout(() => {
    ws.send(encodeEvent(100, SID, startSession));
    console.log("→ StartSession (100) 已发送");
  }, 500);
});

ws.on("message", (data) => {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buf.length < 4) return;
  const msgType = (buf[1] >> 4) & 0x0f;
  const flags = buf[1] & 0x0f;
  let off = 4;
  let eventId = null;
  if (flags & 0x04 && buf.length >= off + 4) {
    eventId = buf.readUInt32BE(off);
    off += 4;
  }
  console.log(`← msgType=${msgType} flags=${flags} event=${eventId} payloadLen=${buf.length - off}`);
  // 找到 payload（跳过 session id 等 optional，简化：直接尝试从尾部找 JSON）
  const jsonStart = buf.indexOf(0x7b); // '{'
  if (jsonStart >= 0) {
    try {
      const json = JSON.parse(buf.subarray(jsonStart).toString("utf-8"));
      console.log("  payload:", JSON.stringify(json).slice(0, 200));
      if (eventId === 150) {
        console.log("🎉 SessionStarted 成功！dialog_id =", json.dialog_id);
        // 发送 FinishSession 结束
        ws.send(encodeEvent(102, SID, {}));
        setTimeout(() => ws.close(), 300);
        process.exit(0);
      }
    } catch {}
  }
});

ws.on("close", (code, reason) => {
  console.log("连接关闭 code=" + code, reason ? reason.toString() : "");
  process.exit(0);
});
ws.on("error", (e) => {
  console.error("错误:", e.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("⏱ 10 秒无响应，超时");
  process.exit(2);
}, 10000);
