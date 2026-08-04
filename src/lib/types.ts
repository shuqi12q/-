// 核心类型定义

export type QuickMood = 0 | 1 | 2 | 3 | 4; // 0 很糟 1 不太好 2 一般 3 还行 4 很好

// 给过去的自己留言（回头看的回复）
export interface JournalReply {
  id: string;
  text: string;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  createdAt: number;
  quick: QuickMood;
  emotions: string[]; // 细化的 12 情绪词
  intensity?: number; // 1-5
  light: string; // 今天的「光」
  shadow: string; // 今天的「影」
  tags: string[];
  replies?: JournalReply[]; // 自己回头回复的记录
}

export type CopingStyle = "avoid" | "please" | "direct" | "seek";

// ---------- 梦境解析 ----------
// 解析模式：传统文化（周公解梦风格） / 现代心理学（弗洛伊德/荣格取向）
export type DreamMode = "zhougong" | "psych";
// 标签分类（噩梦/美梦/日常梦）
export type DreamType = "nightmare" | "good" | "ordinary";

// 元素地图单条：梦境里的一个元素 + 象征 + 可能情绪
export interface DreamElement {
  element: string;  // 元素本身（如「坠落」「水」「亲人」）
  symbol: string;   // 象征意义
  emotion: string;  // 可能情绪
}

// 情绪仪表盘单条：情绪名 + 百分比 + 一句话解释
export interface DreamEmotion {
  name: string;      // 情绪词（如「害怕」）
  percent: number;   // 0-100
  desc: string;      // 一句话解释
}

// 一次 AI 解析的完整结果
export interface DreamAnalysis {
  mode: DreamMode;
  elements: DreamElement[];    // 元素地图（建议 3-6 条）
  emotions: DreamEmotion[];     // 情绪仪表盘（建议 4 条）
  suggestions: string[];       // 三点建议
  summary: string;              // 一句话总结（可选）
}

// 一条梦境记录
export interface DreamRecord {
  id: string;
  createdAt: number;
  text: string;
  mode: DreamMode;
  type?: DreamType;             // 噩梦/美梦/日常
  clarity?: number;             // 1-10
  tags: string[];               // 自由标签
  place?: string;
  people: string[];
  analysis: DreamAnalysis;     // 保存时随附 AI 解析
  favorite?: boolean;
}

export interface RoleCharacter {
  id: string;
  name: string;
  coping: CopingStyle;
  color: string;
  symbol: string; // 单笔画抽象符号（SVG path 的 d，或 emoji-free 字符）
  blurb: string; // 角色描述（不暴露专业词）
  learnGoal: string; // 用户能学到什么
}

export interface StoryChoice {
  label: string;
  next: string;
  coping: CopingStyle;
}

export interface StoryNode {
  id: string;
  act: number;
  speaker?: string;
  text: string;
  choices?: StoryChoice[];
  ending?: {
    style: CopingStyle;
    title: string;
    body: string;
    action: string;
  };
}

export interface Story {
  id: string;
  title: string;
  theme: string;
  characters: RoleCharacter[];
  start: string;
  nodes: Record<string, StoryNode>;
}

// ============ 《这一年的路》桌游模块 ============
// 设计依据：deliverables/gstack/boardgame-research-and-design-2026-08-03.md

// 一张「在意」卡：随身格里或路边的一样东西
export interface Keep {
  id: string;
  text: string;
  group?: "人" | "事" | "感觉" | "习惯";
  custom?: boolean; // 用户自己写的空白卡
}

// 一张「今天」卡：场景 + 它孕育出的新在意 + 步数
// steps 语义：过得快=3 / 普通=2 / 难熬=1。时间不是匀速的，这本身就是内容。
export interface DayCard {
  id: string;
  scene: string;
  gain: string;
  steps: 1 | 2 | 3;
}

// 一局的完整记录（存 localStorage，不进 Dexie —— 与日记数据隔离）
export interface PathRun {
  startedAt: number;
  finishedAt?: number;
  kept: Keep[]; // 终点时还在随身格里的
  roadside: Keep[]; // 被放到路边的（按放下顺序）
  shieldedId?: string; // 用掉「护住」保下的那张
}

// 时间胶囊：这一局结算时写下的话，下一局走到第 7 格时由自己捡到
// 不是「给陌生人」而是「过去的自己伸手给未来的自己」—— 纯本地，不上云。
// ⚠️ 写入前必须过 detectCrisis() 门：命中则整条丢弃、不落盘（设计文档附录 A d-3）。
//    把用户最脆弱的一刻在毫无防备时重新推到面前，等于无支撑的创伤复现。
export interface Capsule {
  id: string;
  keepId: string;
  keepText: string; // 写时的卡面快照，避免卡池变动后查不到
  text: string;
  createdAt: number; // 仅用于软语境，绝不展示天数/倒计时
}

export const CAPSULE_TILE = 7; // 第 7 格捡到：已过半进入状态，又不与终点翻面撞车

export const PATH_TILES = 12; // 路的格数
export const SLOT_MAX = 4; // 随身格位置数 —— 稀缺的来源，不要改
export const ROUNDS = 6; // 回合数
export const WIND_AFTER = [3, 5]; // 第 3、5 回合结束后起风

export const EMO_12 = [
  "喜悦", "平静", "感激", "期待",
  "焦虑", "低落", "愤怒", "委屈",
  "孤独", "疲惫", "迷茫", "羞愧",
] as const;

export const TAG_PRESET = [
  "学业", "工作", "家人", "朋友", "伴侣", "自己", "身体", "金钱", "未来",
] as const;

export const COPING_LABEL: Record<CopingStyle, string> = {
  avoid: "回避型",
  please: "取悦型",
  direct: "直面型",
  seek: "求助型",
};

// =============== 正念 ===============

export type MindTimeOfDay = "morning" | "noon" | "afternoon" | "evening" | "night";

export type MindAudioKey =
  | "rain"
  | "stream"
  | "forest"
  | "campfire"
  | "ocean"
  | "wind"
  | "silence";

export const MIND_AUDIO_LABEL: Record<MindAudioKey, string> = {
  rain: "雨声",
  stream: "溪流",
  forest: "森林鸟鸣",
  campfire: "篝火",
  ocean: "海浪",
  wind: "晚风",
  silence: "静音",
};

export interface MindPractice {
  id: string;
  name: string;
  desc: string;
  iconBg: string; // 卡片左侧色块背景
  iconEmoji: string;
  durationMin: [number, number]; // 推荐时长区间
  tag: string; // "放松" / "专注" / "助眠" 等
  companion: "lili" | "achi" | "tuan" | "yixi" | "kuki" | "brin" | null;
  greeting: { morning: string; noon: string; afternoon: string; evening: string; night: string };
  insight: string; // 引导核心句（卡片下方"开始"按钮旁的副文字）
  audio: MindAudioKey;
  breathPattern: { inhale: number; hold: number; exhale: number; holdAfter?: number };
  cycleLabel: string; // 循环节奏文案，如 "吸 4s · 屏 4s · 呼 4s · 屏 4s"
  scenes: { morning: string; noon: string; afternoon: string; evening: string; night: string };
}

export interface MindSessionRecord {
  id: string;
  createdAt: number;
  practiceId: string;
  practiceName: string;
  durationMin: number;
  audio: MindAudioKey;
  moodEmoji?: string;
  moodText?: string;
  note?: string;
}
