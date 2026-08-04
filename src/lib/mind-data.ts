// 正念练习预设数据 —— 4 种呼吸法，每种配标准循环节奏
import type { MindPractice } from "./types";

export const MIND_PRACTICES: MindPractice[] = [
  {
    id: "belly",
    name: "腹式呼吸",
    desc: "把注意力放在腹部，吸气鼓起、呼气回落",
    iconBg: "#FDE2D4",
    iconEmoji: "🌷",
    durationMin: [5, 20],
    tag: "放松",
    companion: null,
    greeting: {
      morning: "早安，从一次深长的腹式呼吸开始。",
      noon: "午安，让呼吸落到肚子里。",
      afternoon: "下午好，给神经松个口。",
      evening: "傍晚好，把白天慢慢放下来。",
      night: "晚安，腹部起伏如潮，愿此刻安然。",
    },
    insight: "「吸气时肚子像气球鼓起，呼气时慢慢瘪下去——不控制，只观察。」",
    audio: "rain",
    breathPattern: { inhale: 4, hold: 0, exhale: 6 },
    cycleLabel: "吸 4s · 呼 6s",
    scenes: {
      morning: "浅蓝渐变 + 阳光柔散",
      noon: "暖白 + 明亮白光",
      afternoon: "蜜橘渐变 + 暖阳",
      evening: "雾蓝渐变 + 落日余晖",
      night: "深蓝渐变 + 月色",
    },
  },
  {
    id: "box",
    name: "箱式呼吸",
    desc: "四边等长的呼吸：吸、屏、呼、屏",
    iconBg: "#D6E6F2",
    iconEmoji: "📦",
    durationMin: [5, 15],
    tag: "专注",
    companion: null,
    greeting: {
      morning: "早安，画出今天的第一格方框。",
      noon: "午安，把心装进四边等长的盒子里。",
      afternoon: "下午好，一吸一屏一呼一屏。",
      evening: "傍晚好，让呼吸回到整齐的节拍。",
      night: "晚安，在方框里慢慢滑入睡眠。",
    },
    insight: "「吸气 4 秒、屏息 4 秒、呼气 4 秒、再屏息 4 秒——像画一个方框。」",
    audio: "ocean",
    breathPattern: { inhale: 4, hold: 4, exhale: 4, holdAfter: 4 },
    cycleLabel: "吸 4s · 屏 4s · 呼 4s · 屏 4s",
    scenes: {
      morning: "晨光 + 平静水面",
      noon: "晴空 + 白云",
      afternoon: "午后暖阳 + 微风",
      evening: "暮色 + 归鸟",
      night: "星空 + 静谧",
    },
  },
  {
    id: "sleep478",
    name: "4-7-8 睡眠呼吸",
    desc: "专为入睡设计：吸 4、屏 7、呼 8",
    iconBg: "#E0DBE9",
    iconEmoji: "😴",
    durationMin: [5, 15],
    tag: "助眠",
    companion: null,
    greeting: {
      morning: "早安，用一次 4-7-8 唤醒身体。",
      noon: "午安，中场休息来一组。",
      afternoon: "下午好，让呼吸慢下来。",
      evening: "傍晚好，为今晚的睡眠提前铺路。",
      night: "晚安，吸 4 秒、屏 7 秒、呼 8 秒——让身体自己滑入睡眠。",
    },
    insight: "「吸气 4 秒，屏住 7 秒，缓缓呼气 8 秒——让神经系统慢慢松弛。」",
    audio: "campfire",
    breathPattern: { inhale: 4, hold: 7, exhale: 8 },
    cycleLabel: "吸 4s · 屏 7s · 呼 8s",
    scenes: {
      morning: "晨曦微光",
      noon: "柔和日光",
      afternoon: "金色暖光",
      evening: "暮蓝降临",
      night: "月光 + 星河",
    },
  },
  {
    id: "resonance",
    name: "共鸣呼吸",
    desc: "每分钟约 6 次的均匀呼吸，让身心同频",
    iconBg: "#D8EAD3",
    iconEmoji: "🌿",
    durationMin: [5, 20],
    tag: "深度放松",
    companion: null,
    greeting: {
      morning: "早安，让呼吸和心跳同频。",
      noon: "午安，找回自己的节拍。",
      afternoon: "下午好，共振从一次呼吸开始。",
      evening: "傍晚好，让身心慢慢合拍。",
      night: "晚安，均匀的呼吸是最好的摇篮曲。",
    },
    insight: "「吸气 5 秒、呼气 5 秒——像钟摆一样均匀，身心自然同频。」",
    audio: "forest",
    breathPattern: { inhale: 5, hold: 0, exhale: 5 },
    cycleLabel: "吸 5s · 呼 5s",
    scenes: {
      morning: "晨雾森林",
      noon: "光斑林间",
      afternoon: "金黄原野",
      evening: "湖面倒影",
      night: "星空森林",
    },
  },
];

export const MIND_TIMES_OF_DAY = ["morning", "noon", "afternoon", "evening", "night"] as const;

// 时段判断（5-10 早 / 11-13 午 / 14-17 下午 / 18-20 傍晚 / 其余夜）
export function timeOfDayNow(d: Date = new Date()): typeof MIND_TIMES_OF_DAY[number] {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "noon";
  if (h >= 14 && h < 18) return "afternoon";
  if (h >= 18 && h < 21) return "evening";
  return "night";
}

export const TIME_GREETING_LABEL: Record<typeof MIND_TIMES_OF_DAY[number], string> = {
  morning: "早安",
  noon: "午安",
  afternoon: "下午好",
  evening: "傍晚好",
  night: "晚安",
};

export const SCENE_THEMES: Record<
  typeof MIND_TIMES_OF_DAY[number],
  { sky: [string, string]; sun: "sun" | "moon"; ground: string; warmth: number }
> = {
  morning: { sky: ["#FCEFE6", "#A8D8F0"], sun: "sun", ground: "#E8F1DA", warmth: 1 },
  noon: { sky: ["#FFFFFF", "#E5F2FF"], sun: "sun", ground: "#F0F6E0", warmth: 1.2 },
  afternoon: { sky: ["#FCD7B8", "#9FBBE6"], sun: "sun", ground: "#F2DFB7", warmth: 1.5 },
  evening: { sky: ["#F2A7B6", "#5B6592"], sun: "sun", ground: "#9C7C9B", warmth: 0.9 },
  night: { sky: ["#0E1A3A", "#22366E"], sun: "moon", ground: "#1A2B53", warmth: 0.3 },
};

// 心情 emoji（记录室用）
export const MOOD_EMOJIS = [
  { emoji: "😊", label: "平静" },
  { emoji: "😌", label: "放松" },
  { emoji: "🤔", label: "清醒" },
  { emoji: "🥲", label: "感触" },
  { emoji: "😴", label: "困倦" },
  { emoji: "😣", label: "焦虑" },
] as const;