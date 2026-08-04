// 豆包实时语音对话 前端客户端
// 连接本地代理 ws://localhost:3301/voice（代理负责带鉴权 header 转发火山）
// 协议：二进制帧（4B header + optional + payload_size + payload），JSON 事件
// 上行：StartConnection(1) / StartSession(100) / TaskRequest(200 音频 PCM16k) / FinishSession(102)
// 下行：SessionStarted(150) / ASRResponse(451) / ASREnded(459) / TTSResponse(352 PCM24k) / TTSEnded(359) / DialogCommonError(599)

export type VoiceStatus =
  | "idle"      // 未连接
  | "connecting"
  | "ready"     // SessionStarted 成功
  | "listening" // ASREnded 之后，等 TTS
  | "speaking"  // 收到 TTS 音频播放中
  | "error";

export interface VoiceDialogEvents {
  onStatus: (s: VoiceStatus) => void;
  onAsrText: (text: string, isInterim: boolean) => void;
  onReplyText: (text: string) => void;
  onError: (msg: string) => void;
  onSessionStarted: () => void;
}

// ---------- 帧编解码 ----------
// eventId 不带 session 的 Connect 类：1 StartConnection / 2 FinishConnection / 50 51 52
const CONNECT_EVENTS = new Set([1, 2, 50, 51, 52]);

function encodeFrame(eventId: number | null, sessionId: string | null, payload: Uint8Array, isAudio: boolean): ArrayBuffer {
  const sid = sessionId ? new TextEncoder().encode(sessionId) : null;
  const header1 = isAudio ? 0x02 : 0x01; // msgType: audio-only=0b0010, full-client=0b0001
  const flags = 0x04; // event flag
  const serialization = isAudio ? 0x00 : 0x10; // raw / JSON
  const parts: Uint8Array[] = [];
  parts.push(new Uint8Array([0x11, (header1 << 4) | flags, serialization, 0x00]));
  // event
  const ev = new Uint8Array(4);
  new DataView(ev.buffer).setUint32(0, eventId ?? 0, false);
  parts.push(ev);
  // session id（Connect 类不带）
  if (!isAudio && eventId !== null && !CONNECT_EVENTS.has(eventId) && sid) {
    const sz = new Uint8Array(4);
    new DataView(sz.buffer).setUint32(0, sid.length, false);
    parts.push(sz, sid);
  } else if (isAudio && sid) {
    const sz = new Uint8Array(4);
    new DataView(sz.buffer).setUint32(0, sid.length, false);
    parts.push(sz, sid);
  }
  // payload size + payload
  const ps = new Uint8Array(4);
  new DataView(ps.buffer).setUint32(0, payload.length, false);
  parts.push(ps, payload);
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out.buffer;
}

function encodeEventJson(eventId: number, sessionId: string, obj: Record<string, unknown>): ArrayBuffer {
  const payload = new TextEncoder().encode(JSON.stringify(obj));
  return encodeFrame(eventId, sessionId, payload, false);
}

function encodeAudio(sessionId: string, pcm: Uint8Array): ArrayBuffer {
  return encodeFrame(200, sessionId, pcm, true);
}

// 解析服务端帧 → { eventId, payload, isAudio }
function parseFrame(buf: ArrayBuffer): { eventId: number | null; payload: Uint8Array; isAudio: boolean } {
  const view = new DataView(buf);
  if (view.byteLength < 4) return { eventId: null, payload: new Uint8Array(0), isAudio: false };
  const b1 = view.getUint8(1);
  const msgType = (b1 >> 4) & 0x0f;
  const flags = b1 & 0x0f;
  const isAudio = msgType === 0x0b || msgType === 0x02;
  let off = 4;
  let eventId: number | null = null;
  // sequence（flags bit0/1）
  if (flags & 0x03) off += 4;
  // event
  if (flags & 0x04 && off + 4 <= view.byteLength) {
    eventId = view.getUint32(off, false);
    off += 4;
  }
  // session id（Connect 类不带）
  if (eventId !== null && !CONNECT_EVENTS.has(eventId) && off + 8 <= view.byteLength) {
    const sidLen = view.getUint32(off, false);
    off += 4 + sidLen;
  }
  // payload
  if (off + 4 <= view.byteLength) {
    const pLen = view.getUint32(off, false);
    off += 4;
    const payload = new Uint8Array(buf.slice(off, Math.min(off + pLen, view.byteLength)));
    return { eventId, payload, isAudio };
  }
  return { eventId, payload: new Uint8Array(0), isAudio };
}

// ---------- 播放 PCM（24kHz int16 小端） ----------
class PcmPlayer {
  private ctx: AudioContext;
  private queue: AudioBuffer[] = [];
  private playing = false;
  private node: AudioBufferSourceNode | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  push(pcm: Uint8Array) {
    if (pcm.length < 2) return;
    const samples = Math.floor(pcm.length / 2);
    const f32 = new Float32Array(samples);
    const dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    for (let i = 0; i < samples; i++) f32[i] = dv.getInt16(i * 2, true) / 32768;
    const ab = this.ctx.createBuffer(1, samples, 24000);
    ab.copyToChannel(f32, 0);
    this.queue.push(ab);
    if (!this.playing) this.playNext();
  }

  private playNext() {
    if (!this.queue.length) {
      this.playing = false;
      return;
    }
    this.playing = true;
    const ab = this.queue.shift()!;
    const src = this.ctx.createBufferSource();
    src.buffer = ab;
    src.connect(this.ctx.destination);
    this.node = src;
    src.onended = () => this.playNext();
    src.start();
  }

  stop() {
    this.queue = [];
    if (this.node) {
      try {
        this.node.stop();
      } catch {}
      this.node = null;
    }
    this.playing = false;
  }
}

// ---------- 主控制器 ----------
export class VoiceDialog {
  private ws: WebSocket | null = null;
  private sessionId = "voice-" + Math.random().toString(36).slice(2, 10);
  private status: VoiceStatus = "idle";
  private events: VoiceDialogEvents;
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private player: PcmPlayer | null = null;
  private proxyUrl = "ws://localhost:3301/voice";
  private serverVad = true; // 服务端 VAD 模式（不说话会自动结束）

  constructor(events: VoiceDialogEvents, opts?: { proxyUrl?: string }) {
    this.events = events;
    if (opts?.proxyUrl) this.proxyUrl = opts.proxyUrl;
  }

  getStatus() {
    return this.status;
  }

  private setStatus(s: VoiceStatus) {
    this.status = s;
    this.events.onStatus(s);
  }

  async connect(systemRole: string, speakingStyle: string, context?: { role: string; text: string }[]) {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      this.close();
    }
    this.setStatus("connecting");
    const ws = new WebSocket(this.proxyUrl);
    this.ws = ws;

    ws.onopen = () => {
      // StartConnection
      ws.send(encodeEventJson(1, this.sessionId, {}));
      // StartSession
      const session: Record<string, unknown> = {
        asr: { extra: { end_smooth_window_ms: 1200, enable_custom_vad: true } },
        dialog: {
          bot_name: "正念陪伴",
          system_role: systemRole,
          speaking_style: speakingStyle,
          extra: { model: "1.2.1.1", input_mod: "keep_alive", strict_audit: true },
        },
        tts: {
          speaker: "zh_female_vv_jupiter_bigtts",
          audio_config: { channel: 1, format: "pcm_s16le", sample_rate: 24000 },
        },
      };
      if (context && context.length) {
        (session.dialog as { dialog_context?: unknown }).dialog_context = context.map((c) => ({
          role: c.role,
          text: c.text,
        }));
      }
      ws.send(encodeEventJson(100, this.sessionId, session));
    };

    ws.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer) && typeof ev.data !== "string" && !(ev.data instanceof Blob)) {
        return;
      }
      let buf: ArrayBuffer;
      if (typeof ev.data === "string") {
        buf = new TextEncoder().encode(ev.data).buffer;
      } else if (ev.data instanceof Blob) {
        ev.data.arrayBuffer().then((ab) => this.handleFrame(ab));
        return;
      } else {
        buf = ev.data;
      }
      this.handleFrame(buf);
    };

    ws.onerror = () => {
      this.setStatus("error");
      this.events.onError("连接代理失败，请确认 voice-proxy 已启动（node voice-proxy/server.mjs）");
    };

    ws.onclose = () => {
      if (this.status !== "idle") this.setStatus("idle");
    };
  }

  private handleFrame(buf: ArrayBuffer) {
    const { eventId, payload, isAudio } = parseFrame(buf);
    if (eventId === 150) {
      // SessionStarted
      this.setStatus("ready");
      this.events.onSessionStarted();
      this.startMic();
      return;
    }
    if (eventId === 153 || eventId === 599) {
      let msg = "对话服务错误";
      try {
        const j = JSON.parse(new TextDecoder().decode(payload));
        msg = j.message || j.error || msg;
      } catch {}
      this.setStatus("error");
      this.events.onError(msg);
      return;
    }
    if (isAudio && eventId === 352) {
      // TTSResponse：PCM 24k
      this.setStatus("speaking");
      if (this.player) this.player.push(payload);
      return;
    }
    if (eventId === 359) {
      // TTSEnded
      if (this.status === "speaking") this.setStatus("ready");
      return;
    }
    if (eventId === 451) {
      // ASRResponse
      try {
        const j = JSON.parse(new TextDecoder().decode(payload));
        const t = j.results?.[0]?.text ?? "";
        this.events.onAsrText(t, j.results?.[0]?.is_interim ?? false);
      } catch {}
      return;
    }
    if (eventId === 459) {
      // ASREnded
      this.setStatus("ready");
      return;
    }
    if (eventId === 550) {
      // ChatResponse 文本
      try {
        const j = JSON.parse(new TextDecoder().decode(payload));
        if (j.content) this.events.onReplyText(j.content);
      } catch {}
    }
  }

  private async startMic() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      this.audioCtx = new AudioContext();
      this.player = new PcmPlayer(this.audioCtx);
      const src = this.audioCtx.createMediaStreamSource(this.stream);
      this.scriptNode = this.audioCtx.createScriptProcessor(4096, 1, 1);
      src.connect(this.scriptNode);
      this.scriptNode.connect(this.audioCtx.destination);
      this.scriptNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // 48k → 16k 降采样：每 3 取 1（平均）
        const outLen = Math.floor(input.length / 3);
        const pcm = new Uint8Array(outLen * 2);
        const dv = new DataView(pcm.buffer);
        for (let i = 0; i < outLen; i++) {
          let sum = 0;
          for (let k = 0; k < 3; k++) sum += input[i * 3 + k] ?? 0;
          const v = Math.max(-1, Math.min(1, sum / 3));
          dv.setInt16(i * 2, v * 32767, true);
        }
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(encodeAudio(this.sessionId, pcm));
        }
      };
    } catch (e) {
      this.setStatus("error");
      this.events.onError("无法访问麦克风：" + (e as Error).message);
    }
  }

  // 文本输入（不需要麦克风时）
  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== 1) return;
    const obj = { content: text };
    this.ws.send(encodeEventJson(501, this.sessionId, obj));
  }

  close() {
    // 发 FinishSession
    if (this.ws && this.ws.readyState === 1) {
      try {
        this.ws.send(encodeEventJson(102, this.sessionId, {}));
      } catch {}
    }
    if (this.scriptNode) {
      try {
        this.scriptNode.disconnect();
      } catch {}
      this.scriptNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    if (this.player) {
      this.player.stop();
      this.player = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus("idle");
  }
}
