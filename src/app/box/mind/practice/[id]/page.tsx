"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/components/ui";
import {
  MIND_PRACTICES,
  SCENE_THEMES,
  TIME_GREETING_LABEL,
  timeOfDayNow,
  MOOD_EMOJIS,
} from "@/lib/mind-data";
import { addMindSession } from "@/lib/db";
import {
  createWhiteNoise,
  prepareVoice,
  speak,
  speakCancel,
} from "@/lib/mind-audio";
import { VoiceDialog } from "@/lib/voice-dialog";
import { MIND_AUDIO_LABEL, type MindAudioKey, type MindSessionRecord } from "@/lib/types";

const AUDIO_OPTIONS: MindAudioKey[] = [
  "rain",
  "stream",
  "forest",
  "campfire",
  "ocean",
  "wind",
  "silence",
];

type Phase = "greeting" | "running" | "done";

export default function PracticePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const practice = MIND_PRACTICES.find((p) => p.id === id);
  const audio = useMemo(() => createWhiteNoise(), []);
  const [phase, setPhase] = useState<Phase>("greeting");
  const [now, setNow] = useState<Date>(new Date());
  const [audioKey, setAudioKey] = useState<MindAudioKey>(practice?.audio ?? "silence");
  const [elapsed, setElapsed] = useState(0);
  const [cyclePos, setCyclePos] = useState(0);
  const [breathLabel, setBreathLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<MindSessionRecord | null>(null);

  // 表单（完成页用）
  const [moodEmoji, setMoodEmoji] = useState<string>("");
  const [moodText, setMoodText] = useState("");
  const [note, setNote] = useState("");

  // 语音陪伴
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceAsr, setVoiceAsr] = useState("");
  const [voiceReply, setVoiceReply] = useState("");
  const voiceRef = useRef<VoiceDialog | null>(null);

  const startedAt = useRef<number>(0);
  const lastPhase = useRef<"inhale" | "hold" | "exhale" | "holdAfter" | "">("");

  // 实时时间（每秒）
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // 准备语音
  useEffect(() => {
    prepareVoice();
  }, []);

  // 启动练习：进入呼吸循环
  const start = () => {
    if (!practice) return;
    startedAt.current = Date.now();
    setElapsed(0);
    setCyclePos(0);
    setPhase("running");
    audio.start(audioKey);
  };

  // 主计时器：每秒 +1
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // 呼吸循环
  const bp = practice?.breathPattern ?? { inhale: 4, hold: 2, exhale: 6 };
  const cycleLen = bp.inhale + bp.hold + bp.exhale + (bp.holdAfter ?? 0);
  useEffect(() => {
    if (phase !== "running") return;
    const tPos = elapsed % cycleLen;
    let cur: "inhale" | "hold" | "exhale" | "holdAfter" = "inhale";
    let label = "吸气";
    let cursor = 0;
    cursor += bp.inhale;
    if (tPos < cursor) {
      cur = "inhale";
      label = "吸气";
    } else {
      cursor += bp.hold;
      if (tPos < cursor) {
        cur = "hold";
        label = bp.hold > 0 ? "屏息" : "—";
      } else {
        cursor += bp.exhale;
        if (tPos < cursor) {
          cur = "exhale";
          label = "呼气";
        } else {
          cur = "holdAfter";
          label = bp.holdAfter && bp.holdAfter > 0 ? "屏息" : "—";
        }
      }
    }
    setBreathLabel(label);
    setCyclePos(tPos);
    if (cur !== lastPhase.current) {
      lastPhase.current = cur;
      if (cur === "inhale") speak("吸气", { rate: 0.75 });
      else if (cur === "exhale") speak("呼气", { rate: 0.75 });
      else if (cur === "hold" && bp.hold > 0) speak("屏息", { rate: 0.75 });
    }
  }, [elapsed, phase, bp.inhale, bp.hold, bp.exhale, bp.holdAfter, cycleLen]);

  // 切换白噪音
  const switchAudio = (k: MindAudioKey) => {
    setAudioKey(k);
    if (phase === "running") audio.switchTo(k);
    else audio.start(k);
  };

  // 退出 / 完成
  const finish = (done: boolean) => {
    audio.stop();
    speakCancel();
    if (voiceRef.current) {
      voiceRef.current.close();
      voiceRef.current = null;
      setVoiceOn(false);
    }
    if (done) setPhase("done");
    else {
      setPhase("greeting");
      setElapsed(0);
    }
  };

  // 语音陪伴开关
  const toggleVoice = () => {
    if (voiceOn) {
      if (voiceRef.current) {
        voiceRef.current.close();
        voiceRef.current = null;
      }
      setVoiceOn(false);
      return;
    }
    if (!practice) return;
    const v = new VoiceDialog({
      onStatus: (s) => {
        const map: Record<string, string> = {
          connecting: "正在连接…",
          ready: "说点什么，我在听",
          listening: "正在听…",
          speaking: "正在说话…",
          error: "连接失败",
        };
        setVoiceStatus(map[s] ?? s);
      },
      onAsrText: (t, interim) => setVoiceAsr(t),
      onReplyText: (t) => setVoiceReply(t),
      onError: (m) => setVoiceStatus("⚠️ " + m),
      onSessionStarted: () => setVoiceStatus("说点什么，我在听"),
    });
    voiceRef.current = v;
    setVoiceOn(true);
    setVoiceAsr("");
    setVoiceReply("");
    setVoiceStatus("正在连接…");
    v.connect(
      `你是正念陪伴，此刻用户正在做「${practice.name}」呼吸练习。你要用温柔、简短、舒缓的话语陪伴他，可以鼓励呼吸节奏、安抚情绪，但不要长篇大论。`,
      "轻声、舒缓、温暖、简短",
    );
  };

  // 自动结束：满 30 分钟（最长）就停
  useEffect(() => {
    if (phase !== "running") return;
    if (elapsed >= 60 * 30) finish(true);
  }, [elapsed, phase]);

  // 完成保存
  const saveSession = async () => {
    if (!practice || saving) return;
    setSaving(true);
    const dur = Math.max(1, Math.ceil(elapsed / 60));
    const rec: MindSessionRecord = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      practiceId: practice.id,
      practiceName: practice.name,
      durationMin: dur,
      audio: audioKey,
      moodEmoji: moodEmoji || undefined,
      moodText: moodText.trim() || undefined,
      note: note.trim() || undefined,
    };
    await addMindSession(rec);
    setSaved(rec);
    setSaving(false);
  };

  if (!practice) {
    return (
      <div style={{ padding: "40px 20px", minHeight: "100vh", background: "#FAF7F2" }}>
        <p style={{ ...t.body, color: "var(--text-secondary)" }}>未找到这场练习。</p>
        <Link href="/box/mind" className="no-underline" style={{ color: "var(--forest-700)" }}>
          ← 返回放映室
        </Link>
      </div>
    );
  }

  // ===== 视图分支 =====
  const tod = timeOfDayNow(now);
  const theme = SCENE_THEMES[tod];
  const isDark = theme.warmth < 0.6;
  const fg = isDark ? "#F2EBD7" : "#3F4A43";
  const fgDim = isDark ? "rgba(242,235,215,0.78)" : "rgba(63,74,67,0.78)";

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, ${theme.sky[0]} 0%, ${theme.sky[1]} 100%)`,
        color: fg,
        transition: "background 1.2s ease",
      }}
    >
      {/* 实时时间 */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 20px",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          color: fgDim,
        }}
      >
        <span>{formatTime(now)}</span>
        <Link
          href="/box/mind"
          className="no-underline"
          style={{ color: fgDim, fontSize: 13 }}
        >
          ← 返回
        </Link>
      </div>

      {/* === 问候阶段 === */}
      {phase === "greeting" && (
        <div
          className="fade-up flex flex-col items-center text-center"
          style={{ padding: "20px 24px 40px" }}
        >
          {/* 中央插画区 */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 999,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 96,
              marginBottom: 16,
            }}
          >
            {theme.sun === "sun" ? "🌅" : "🌙"}
          </div>

          <h1 style={{ ...t.h1, color: fg, marginBottom: 6 }}>
            {TIME_GREETING_LABEL[tod]}
          </h1>
          <p
            style={{
              ...t.body,
              color: fgDim,
              maxWidth: 340,
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            {practice.greeting[tod]}
          </p>

          {/* 推荐卡片 */}
          <div
            style={{
              background: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.85)",
              borderRadius: "var(--r-xl)",
              padding: "20px 22px",
              width: "100%",
              maxWidth: 360,
              boxShadow: "0 6px 18px rgba(0,0,0,.06)",
              marginBottom: 20,
            }}
          >
            <div className="flex items-center" style={{ gap: 12, marginBottom: 8 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: practice.iconBg,
                  fontSize: 22,
                }}
              >
                {practice.iconEmoji}
              </div>
              <div className="text-left">
                <div style={{ ...t.body, fontWeight: 600, color: fg }}>{practice.name}</div>
                <div style={{ ...t.caption, color: fgDim, marginTop: 2 }}>
                  🌀 {practice.cycleLabel} · {practice.durationMin[0]}–{practice.durationMin[1]} 分钟
                </div>
              </div>
            </div>
            <p
              style={{
                ...t.body,
                fontStyle: "italic",
                color: fgDim,
                fontSize: "var(--fs-caption)",
                lineHeight: 1.7,
                marginTop: 8,
              }}
            >
              {practice.insight}
            </p>
          </div>

          {/* 开始按钮 */}
          <button
            onClick={start}
            style={{
              padding: "14px 36px",
              borderRadius: 999,
              background: isDark ? "rgba(255,255,255,0.92)" : "rgba(63,74,67,0.92)",
              color: isDark ? "#22366E" : "#FFFFFF",
              fontSize: 16,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            ▶ 开始
          </button>
          <button
            onClick={() => router.push("/box/mind")}
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              background: "transparent",
              color: fgDim,
              border: `1px solid ${fgDim}`,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ↻ 看看别的
          </button>
        </div>
      )}

      {/* === 进行中 === */}
      {phase === "running" && (
        <div
          className="fade-up flex flex-col"
          style={{ padding: "0 24px 40px" }}
        >
          <div className="text-center" style={{ marginTop: 12, marginBottom: 20 }}>
            <div style={{ ...t.body, fontSize: 14, color: fgDim }}>{practice.name}</div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 300,
                fontVariantNumeric: "tabular-nums",
                color: fg,
                marginTop: 4,
              }}
            >
              {formatCountdown(elapsed)}
            </div>
          </div>

          {/* 呼吸圆 */}
          <div
            className="flex items-center justify-center"
            style={{ minHeight: 260, marginBottom: 8 }}
          >
            <BreathingCircle
              breathPattern={bp}
              tPos={cyclePos}
              isDark={isDark}
              practiceName={practice.name}
            />
          </div>

          {/* 呼吸文字 */}
          <p
            className="text-center"
            style={{
              ...t.bodyLg,
              color: fg,
              minHeight: 30,
              marginTop: 4,
              letterSpacing: 2,
            }}
          >
            {breathLabel}
          </p>

          {/* 白噪音选择器（圆环） */}
          <div
            className="flex items-center justify-center"
            style={{
              flexWrap: "wrap",
              gap: 10,
              margin: "20px auto 12px",
              maxWidth: 320,
            }}
          >
            {AUDIO_OPTIONS.map((k) => (
              <button
                key={k}
                onClick={() => switchAudio(k)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background:
                    audioKey === k
                      ? isDark
                        ? "rgba(255,255,255,0.92)"
                        : "rgba(63,74,67,0.92)"
                      : "transparent",
                  color:
                    audioKey === k
                      ? isDark
                        ? "#22366E"
                        : "#FFFFFF"
                      : fgDim,
                  border: `1px solid ${audioKey === k ? "transparent" : fgDim}`,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {MIND_AUDIO_LABEL[k]}
              </button>
            ))}
          </div>

          {/* 语音陪伴 */}
          <div style={{ width: "100%", maxWidth: 360, margin: "16px auto 0" }}>
            <button
              onClick={toggleVoice}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: 999,
                background: voiceOn
                  ? "rgba(255,255,255,0.92)"
                  : "transparent",
                color: voiceOn ? "#22366E" : fgDim,
                border: voiceOn ? "none" : `1px dashed ${fgDim}`,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {voiceOn ? "🎙 语音陪伴已开启（点击关闭）" : "🎙 语音陪伴（一边呼吸一边聊）"}
            </button>
            {voiceOn && (
              <div
                className="fade-up"
                style={{
                  marginTop: 10,
                  borderRadius: "var(--r-lg)",
                  padding: "12px 14px",
                  background: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(255,255,255,0.85)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: fgDim,
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background:
                        voiceStatus === "正在听…"
                          ? "#E0543F"
                          : voiceStatus === "正在说话…"
                            ? "#4A9D6E"
                            : fgDim,
                      animation:
                        voiceStatus === "正在听…" ? "pulse 1s infinite" : "none",
                    }}
                  />
                  {voiceStatus}
                </div>
                {voiceAsr && (
                  <p style={{ fontSize: 13, color: fg, margin: "4px 0", lineHeight: 1.5 }}>
                    🗣 {voiceAsr}
                  </p>
                )}
                {voiceReply && (
                  <p
                    style={{
                      fontSize: 13,
                      color: isDark ? "#FFE9C9" : "#7A5F1E",
                      margin: "4px 0",
                      lineHeight: 1.5,
                    }}
                  >
                    💬 {voiceReply}
                  </p>
                )}
                <p style={{ fontSize: 11, color: fgDim, marginTop: 6, lineHeight: 1.6 }}>
                  说话它就会回应你，说完自动停止收音；需要先启动 voice-proxy
                  服务（node voice-proxy/server.mjs）。
                </p>
              </div>
            )}
          </div>

          {/* 结束按钮 */}
          <button
            onClick={() => finish(true)}
            style={{
              margin: "12px auto 0",
              padding: "10px 28px",
              borderRadius: 999,
              background: "transparent",
              border: `1px solid ${fgDim}`,
              color: fgDim,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ✕ 结束本次
          </button>
        </div>
      )}

      {/* === 完成 / 记录 === */}
      {phase === "done" && (
        <div
          className="fade-up"
          style={{
            padding: "0 20px 40px",
            background: `linear-gradient(180deg, ${theme.sky[0]} 0%, ${theme.sky[1]} 100%)`,
            minHeight: "100vh",
          }}
        >
          <div
            className="text-center"
            style={{
              background: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.92)",
              borderRadius: "var(--r-xl)",
              padding: "28px 22px",
              boxShadow: "0 6px 18px rgba(0,0,0,.06)",
              marginTop: 12,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🪷</div>
            <h2 style={{ ...t.h1, color: fg, margin: 0, marginBottom: 6 }}>做得很好。</h2>
            <p style={{ ...t.body, color: fgDim, marginBottom: 18 }}>
              这场练习 {formatCountdown(elapsed)} · {Math.max(1, Math.ceil(elapsed / 60))} 分钟
            </p>

            {!saved && (
              <>
                <p style={{ ...t.caption, color: fgDim, marginBottom: 10 }}>
                  此刻，心情如何？（选一个表情）
                </p>
                <div
                  className="flex items-center justify-center"
                  style={{ gap: 6, marginBottom: 16, flexWrap: "wrap" }}
                >
                  {MOOD_EMOJIS.map((m) => (
                    <button
                      key={m.emoji}
                      onClick={() => setMoodEmoji(m.emoji)}
                      title={m.label}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background:
                          moodEmoji === m.emoji
                            ? isDark
                              ? "rgba(255,255,255,0.92)"
                              : "rgba(63,74,67,0.92)"
                            : "rgba(255,255,255,0.6)",
                        border: "none",
                        fontSize: 22,
                        cursor: "pointer",
                      }}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>

                <input
                  value={moodText}
                  onChange={(e) => setMoodText(e.target.value)}
                  placeholder="给此刻的心情几个字（可选）"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1px solid ${fgDim}`,
                    background: "rgba(255,255,255,0.7)",
                    color: "#3F4A43",
                    fontSize: 14,
                    marginBottom: 10,
                  }}
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="练习时浮现的想法或感受…（可选）"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1px solid ${fgDim}`,
                    background: "rgba(255,255,255,0.7)",
                    color: "#3F4A43",
                    fontSize: 14,
                    marginBottom: 14,
                    resize: "vertical",
                  }}
                />

                <div className="flex" style={{ gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={() => finish(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 999,
                      background: "transparent",
                      border: `1px solid ${fgDim}`,
                      color: fgDim,
                      cursor: "pointer",
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={saveSession}
                    disabled={saving}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 999,
                      background: isDark ? "rgba(255,255,255,0.92)" : "rgba(63,74,67,0.92)",
                      color: isDark ? "#22366E" : "#FFFFFF",
                      border: "none",
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? "保存中…" : "保存这次记录"}
                  </button>
                </div>
              </>
            )}

            {saved && (
              <div className="fade-up">
                <p style={{ ...t.body, color: fgDim, marginBottom: 18 }}>
                  ✓ 已记进「正念记录室」，明天继续。
                </p>
                <div className="flex" style={{ gap: 10, justifyContent: "center" }}>
                  <Link
                    href="/box/mind"
                    className="no-underline"
                    style={{
                      padding: "10px 18px",
                      borderRadius: 999,
                      background: "transparent",
                      border: `1px solid ${fgDim}`,
                      color: fgDim,
                    }}
                  >
                    返回放映室
                  </Link>
                  <Link
                    href="/box/mind/records"
                    className="no-underline"
                    style={{
                      padding: "10px 20px",
                      borderRadius: 999,
                      background: isDark ? "rgba(255,255,255,0.92)" : "rgba(63,74,67,0.92)",
                      color: isDark ? "#22366E" : "#FFFFFF",
                      fontWeight: 600,
                    }}
                  >
                    查看记录 →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BreathingCircle({
  breathPattern,
  tPos,
  isDark,
  practiceName,
}: {
  breathPattern: { inhale: number; hold: number; exhale: number; holdAfter?: number };
  tPos: number;
  isDark: boolean;
  practiceName: string;
}) {
  // 当前位置在呼吸循环的进度（0-1）用于缩放
  const { inhale, hold, exhale, holdAfter } = breathPattern;
  const total = inhale + hold + exhale + (holdAfter ?? 0);
  const ratio = tPos / total;
  let scale = 1;
  let glow = 0;
  if (ratio < inhale / total) {
    // 吸气：放大 + 发光增强
    const r = ratio / (inhale / total || 1);
    scale = 1 + 0.4 * r;
    glow = r;
  } else if (ratio < (inhale + hold) / total) {
    scale = 1.4;
    glow = 1;
  } else if (ratio < (inhale + hold + exhale) / total) {
    const r =
      (ratio - (inhale + hold) / total) / (exhale / total || 1);
    scale = 1.4 - 0.4 * r;
    glow = 1 - r;
  } else {
    scale = 1;
    glow = 0;
  }
  return (
    <div
      style={{
        width: 220,
        height: 220,
        borderRadius: 999,
        background: isDark
          ? `radial-gradient(circle, rgba(255,255,255,${0.18 + 0.25 * glow}) 0%, rgba(255,255,255,0.04) 70%)`
          : `radial-gradient(circle, rgba(255,236,213,${0.55 + 0.4 * glow}) 0%, rgba(255,236,213,0.2) 70%)`,
        transform: `scale(${scale})`,
        transition: "transform 1.2s cubic-bezier(.4,0,.2,1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 56,
      }}
    >
      {isDark ? "🌙" : "🌅"}
    </div>
  );
}

function formatTime(d: Date) {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatCountdown(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}