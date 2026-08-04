// 正念练习预设数据 —— 8 个不同类型的练习，参考同类应用常见分类
import type { MindPractice } from "./types";

export const MIND_PRACTICES: MindPractice[] = [
  {
    id: "balance",
    name: "平衡冥想",
    desc: "和丽丽一起在呼吸的平衡里找到内心的微笑",
    iconBg: "#FDE2D4",
    iconEmoji: "🌷",
    durationMin: [5, 20],
    tag: "呼吸",
    companion: "lili",
    greeting: {
      morning: "早安，又是新的一页。",
      noon: "午安，先停下脚步跟自己打个招呼。",
      afternoon: "下午好，给神经松个口吧。",
      evening: "傍晚好，慢慢把白天放下来。",
      night: "晚安，愿此刻安然。",
    },
    insight: "「聚焦呼吸，慢慢地，让心安住在当下这一刻。」",
    audio: "rain",
    breathPattern: { inhale: 4, hold: 2, exhale: 6 },
    scenes: {
      morning: "浅蓝渐变 + 阳光柔散",
      noon: "暖白 + 明亮白光",
      afternoon: "蜜橘渐变 + 暖阳",
      evening: "雾蓝渐变 + 落日余晖",
      night: "深蓝渐变 + 月色",
    },
  },
  {
    id: "nature",
    name: "自然白噪音冥想",
    desc: "和酷奇一起在大自然的天籁之音中给心灵放个假",
    iconBg: "#FCE9A8",
    iconEmoji: "🦊",
    durationMin: [15, 30],
    tag: "白噪音",
    companion: "achi",
    greeting: {
      morning: "早安，来听一片叶子的早晨。",
      noon: "午安，让风替你停一停。",
      afternoon: "下午好，把耳朵交给自然。",
      evening: "傍晚好，最后一缕风正好听。",
      night: "晚安，让森林的夜把你抱起来。",
    },
    insight: "「不必思考，只消听着，把心安放在声音里。」",
    audio: "forest",
    breathPattern: { inhale: 4, hold: 4, exhale: 8, holdAfter: 2 },
    scenes: {
      morning: "晨雾森林 + 鸟鸣",
      noon: "阳光斑驳林间",
      afternoon: "金色黄昏原野",
      evening: "湖面夕阳倒影",
      night: "星空下静谧森林",
    },
  },
  {
    id: "energy",
    name: "能量冥想",
    desc: "和楞头布里一起吸收宇宙的能量，给内心充能",
    iconBg: "#FCD7B8",
    iconEmoji: "🥔",
    durationMin: [5, 20],
    tag: "呼吸",
    companion: "tuan",
    greeting: {
      morning: "早安，今天也来给自己充点电。",
      noon: "午安，电池告急？进来歇歇。",
      afternoon: "下午好，伸个懒腰继续。",
      evening: "傍晚好，把一天的电量收一收。",
      night: "晚安，把今天轻轻放下再睡。",
    },
    insight: "「吸气，想象光进来；呼气，把疲倦送出去。」",
    audio: "campfire",
    breathPattern: { inhale: 6, hold: 2, exhale: 6 },
    scenes: {
      morning: "晨曦 + 第一缕光",
      noon: "明亮日光 + 白云",
      afternoon: "橙金黄昏 + 长影",
      evening: "紫橙晚霞",
      night: "篝火 + 星河",
    },
  },
  {
    id: "breath-base",
    name: "基础呼吸练习",
    desc: "基础的呼吸正念指引，交互式引导你进行呼吸练习",
    iconBg: "#FAD2DC",
    iconEmoji: "💨",
    durationMin: [3, 5],
    tag: "呼吸",
    companion: null,
    greeting: {
      morning: "早安，一起来呼吸一下。",
      noon: "午安，深呼吸一下。",
      afternoon: "下午好，重新和身体打个照面。",
      evening: "傍晚好，呼吸就是回家的路。",
      night: "晚安，慢慢地，长长地呼吸。",
    },
    insight: "「吸气 4 秒，屏息 2 秒，呼气 6 秒。跟着圆一起。」",
    audio: "silence",
    breathPattern: { inhale: 4, hold: 2, exhale: 6 },
    scenes: {
      morning: "清晨柔光",
      noon: "正午清亮",
      afternoon: "午后暖阳",
      evening: "暮色柔光",
      night: "深夜静谧",
    },
  },
  {
    id: "forest-walk",
    name: "森林漫步",
    desc: "想象自己走在林间小路，每一步都踩在松软的落叶上",
    iconBg: "#D8EAD3",
    iconEmoji: "🌲",
    durationMin: [10, 25],
    tag: "专注",
    companion: null,
    greeting: {
      morning: "早安，森林刚醒，先去散步吧。",
      noon: "午安，去林子里坐一会儿。",
      afternoon: "下午好，光在叶子上跳。",
      evening: "傍晚好，听树叶回家。",
      night: "晚安，月光下林子也很好。",
    },
    insight: "「每走一步都留意脚下。」",
    audio: "forest",
    breathPattern: { inhale: 5, hold: 1, exhale: 5 },
    scenes: {
      morning: "晨露林间小路",
      noon: "光斑跳跃的林道",
      afternoon: "金黄树叶纷飞",
      evening: "森林黄昏 + 归鸟",
      night: "月光林径",
    },
  },
  {
    id: "ocean",
    name: "海浪冥想",
    desc: "听着海浪一起呼吸，把心思交给潮起潮落",
    iconBg: "#D6E6F2",
    iconEmoji: "🌊",
    durationMin: [10, 20],
    tag: "白噪音",
    companion: null,
    greeting: {
      morning: "早安，海平线刚被第一缕光擦亮。",
      noon: "午安，海风替你打了个盹。",
      afternoon: "下午好，浪声一阵一阵。",
      evening: "傍晚好，海也快要睡了。",
      night: "晚安，潮汐替你说晚安。",
    },
    insight: "「吸气，浪起；呼气，浪落。」",
    audio: "ocean",
    breathPattern: { inhale: 4, hold: 0, exhale: 6 },
    scenes: {
      morning: "晨曦海面",
      noon: "正午碧海",
      afternoon: "金色海滩",
      evening: "落日海平线",
      night: "月色海浪",
    },
  },
  {
    id: "campfire",
    name: "篝火夜晚",
    desc: "围着一团火，把思绪丢进火苗里",
    iconBg: "#F8C9A4",
    iconEmoji: "🔥",
    durationMin: [10, 20],
    tag: "助眠",
    companion: null,
    greeting: {
      morning: "早安，先在心里升起一团暖火。",
      noon: "午安，把心事扔进火里烧一烧。",
      afternoon: "下午好，让火光陪你一段。",
      evening: "傍晚好，最适合火光的时候。",
      night: "晚安，伴着火苗慢慢入睡。",
    },
    insight: "「每一簇火苗都是一个念头，看着它烧完就好。」",
    audio: "campfire",
    breathPattern: { inhale: 5, hold: 0, exhale: 7 },
    scenes: {
      morning: "清晨薄雾 + 火光",
      noon: "白日篝火",
      afternoon: "夕阳篝火",
      evening: "暮色篝火",
      night: "深夜篝火 + 星空",
    },
  },
  {
    id: "rainy",
    name: "雨天放空",
    desc: "听雨发呆，什么都不想就好",
    iconBg: "#E0DBE9",
    iconEmoji: "🌧️",
    durationMin: [10, 30],
    tag: "助眠",
    companion: null,
    greeting: {
      morning: "早安，听雨是一种奢侈。",
      noon: "午安，雨替世界按下暂停。",
      afternoon: "下午好，雨声比思考更温柔。",
      evening: "傍晚好，雨和暮色一起落下。",
      night: "晚安，听着雨入睡最踏实。",
    },
    insight: "「别让脑袋思考，让雨替你思考。」",
    audio: "rain",
    breathPattern: { inhale: 4, hold: 0, exhale: 8 },
    scenes: {
      morning: "清晨雨巷",
      noon: "正午雷阵雨",
      afternoon: "午后雷阵雨",
      evening: "暮色细雨",
      night: "深夜夜雨",
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