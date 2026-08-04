// 正念白噪音 + 呼吸引导 —— 全程 Web Audio 合成，不依赖外部音频文件
// 参考：用户要求 雨声/溪流/森林鸟鸣/篝火 等可自由切换；吸气/呼气语音提示
import type { MindAudioKey } from "./types";

type NoiseKind = "white" | "pink" | "brown";
type Node = AudioNode & { stop?: () => void };

// ---------- 白噪音生成器 ----------
class NoiseSource {
  protected ctx: AudioContext;
  protected gainNode: GainNode;
  protected nodes: AudioNode[] = [];
  protected kind: NoiseKind;

  constructor(ctx: AudioContext, kind: NoiseKind = "white") {
    this.ctx = ctx;
    this.kind = kind;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(ctx.destination);
  }

  protected makeNoiseBuffer(durationSec = 2): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = sr * durationSec;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    if (this.kind === "white") {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } else if (this.kind === "pink") {
      // Paul Kellet 的 pink noise 近似算法
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      // brown noise 累积
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buf;
  }

  start() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer();
    src.loop = true;
    src.connect(this.gainNode);
    src.start();
    this.nodes.push(src);
  }

  setVolume(v: number, fadeSec = 0.4) {
    this.gainNode.gain.linearRampToValueAtTime(v, this.ctx.currentTime + fadeSec);
  }

  stop() {
    this.nodes.forEach((n) => {
      try {
        (n as AudioBufferSourceNode).stop();
      } catch {}
    });
    this.nodes = [];
    this.gainNode.disconnect();
  }
}

interface WhiteNoiseController {
  start(key: MindAudioKey): Promise<void>;
  switchTo(key: MindAudioKey): void;
  setVolume(v: number): void;
  stop(): void;
}

export function createWhiteNoise(): WhiteNoiseController {
  let ctx: AudioContext | null = null;
  let current: NoiseSource | null = null;
  let extra: { stop: () => void } | null = null; // 海浪调制 / 鸟鸣 / 火焰噼啪
  let currentKey: MindAudioKey = "silence";

  function ensureCtx(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function buildExtraForKey(c: AudioContext, k: MindAudioKey): { stop: () => void } | null {
    if (k === "ocean") {
      // 海浪：pink noise + 慢振幅 LFO 模拟潮汐
      const src = new NoiseSource(c, "pink");
      src.start();
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.18; // 慢潮 ~5.5 秒一次
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain);
      lfoGain.connect((src as unknown as { gainNode: GainNode }).gainNode.gain);
      (src as unknown as { gainNode: GainNode }).gainNode.gain.setValueAtTime(
        0.3,
        c.currentTime,
      );
      lfo.start();
      return {
        stop: () => {
          lfo.stop();
          src.stop();
        },
      };
    }
    if (k === "campfire") {
      // 篝火：brown noise + 高频短脉冲模拟噼啪
      const src = new NoiseSource(c, "brown");
      src.start();
      (src as unknown as { gainNode: GainNode }).gainNode.gain.setValueAtTime(0.3, c.currentTime);
      // 周期性高频 tick
      const tickOsc = c.createOscillator();
      const tickGain = c.createGain();
      tickGain.gain.value = 0;
      tickOsc.frequency.value = 2000;
      tickOsc.connect(tickGain);
      tickGain.connect(c.destination);
      tickOsc.start();
      const interval = setInterval(() => {
        if (!ctx) return;
        const t = ctx.currentTime;
        tickGain.gain.cancelScheduledValues(t);
        tickGain.gain.setValueAtTime(0, t);
        tickGain.gain.linearRampToValueAtTime(0.08, t + 0.005);
        tickGain.gain.linearRampToValueAtTime(0, t + 0.04);
      }, 250);
      return {
        stop: () => {
          tickOsc.stop();
          clearInterval(interval);
          src.stop();
        },
      };
    }
    if (k === "forest") {
      // 森林鸟鸣：周期性短 chirp
      const osc = c.createOscillator();
      const gain = c.createGain();
      gain.gain.value = 0;
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      let stopped = false;
      const chirp = () => {
        if (stopped || !ctx) return;
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(1500 + Math.random() * 1500, t);
        osc.frequency.linearRampToValueAtTime(800 + Math.random() * 1000, t + 0.12);
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + 0.16);
        setTimeout(chirp, 1200 + Math.random() * 1800);
      };
      setTimeout(chirp, 800);
      return {
        stop: () => {
          stopped = true;
          osc.stop();
        },
      };
    }
    if (k === "rain") {
      // 雨声：white noise + 低通
      const src = new NoiseSource(c, "white");
      src.start();
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1500;
      const srcGain = (src as unknown as { gainNode: GainNode }).gainNode;
      srcGain.disconnect();
      srcGain.connect(lp);
      lp.connect(c.destination);
      srcGain.gain.setValueAtTime(0.25, c.currentTime);
      return {
        stop: () => src.stop(),
      };
    }
    if (k === "stream") {
      // 溪流：pink noise + 高通（高频水声）
      const src = new NoiseSource(c, "pink");
      src.start();
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 600;
      const srcGain = (src as unknown as { gainNode: GainNode }).gainNode;
      srcGain.disconnect();
      srcGain.connect(hp);
      hp.connect(c.destination);
      srcGain.gain.setValueAtTime(0.3, c.currentTime);
      return {
        stop: () => src.stop(),
      };
    }
    if (k === "wind") {
      // 晚风：brown noise + 慢速低通调制
      const src = new NoiseSource(c, "brown");
      src.start();
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 400;
      const srcGain = (src as unknown as { gainNode: GainNode }).gainNode;
      srcGain.disconnect();
      srcGain.connect(lp);
      lp.connect(c.destination);
      srcGain.gain.setValueAtTime(0.25, c.currentTime);
      return {
        stop: () => src.stop(),
      };
    }
    return null;
  }

  function teardown() {
    if (current) {
      current.stop();
      current = null;
    }
    if (extra) {
      extra.stop();
      extra = null;
    }
  }

  return {
    async start(key: MindAudioKey) {
      const c = ensureCtx();
      teardown();
      currentKey = key;
      if (key === "silence") return;
      extra = buildExtraForKey(c, key);
    },
    switchTo(key: MindAudioKey) {
      if (key === currentKey) return;
      this.start(key);
    },
    setVolume(v: number) {
      if (current) current.setVolume(v);
    },
    stop() {
      teardown();
      currentKey = "silence";
    },
  };
}

// ---------- 呼吸引导语音（Web Speech API，浏览器原生 TTS） ----------
let zhVoice: SpeechSynthesisVoice | null = null;
let voiceReady = false;

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  voiceReady = true;
  return (
    voices.find((v) => /zh[-_]?CN|cmn[-_]?Hans/i.test(v.lang)) ||
    voices.find((v) => /zh|Chinese|Mandarin/i.test(v.name)) ||
    null
  );
}

export function prepareVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  pickChineseVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    zhVoice = pickChineseVoice();
  };
}

export function speak(text: string, opts: { rate?: number; pitch?: number } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (!voiceReady) zhVoice = pickChineseVoice();
  // 取消正在说的
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "zh-CN";
  utt.rate = opts.rate ?? 0.7;
  utt.pitch = opts.pitch ?? 1;
  if (zhVoice) utt.voice = zhVoice;
  window.speechSynthesis.speak(utt);
}

export function speakCancel() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}