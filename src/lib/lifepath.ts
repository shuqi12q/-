import { detectCrisis } from "./crisis";
import type { Capsule, DayCard, Keep, PathRun } from "./types";

// ===========================================================================
// 《这一年的路》· 卡池与文案
// 设计文档：deliverables/gstack/boardgame-research-and-design-2026-08-03.md
//
// ⚠️ 结算与界面的禁止清单（伦理红线，改动前请先读设计文档第三部分）：
//   ❌ 任何数字、百分比、进度条、星级、评分
//   ❌ 任何「你是 XX 型」的类型标签
//   ❌ 任何与他人的比较（「超过了 X% 的人」）
//   ❌ 任何「再玩一遍看看别的结局」的诱导
//   ❌ 任何解读式说教（「这说明你是一个重视亲情的人」）
//   生命的价值由机制产生，不由文案宣布。
//
// ⚠️ 风卡内容池：严禁死亡、疾病、背叛、创伤，严禁归因于玩家。
//   风的触发与结果绝不能与玩家之前的任何选择挂钩 —— 一旦挂钩，
//   机制就在暗示「你失去它是因为你没照顾好它」。
// ===========================================================================

// ---------------------------------------------------------------------------
// 「在意」卡 · 16 张（开局 16 选 4，其中最多 2 张可换成空白自填）
// 分四类各 4 张。配比刻意包含正向 / 中性 / 带遗憾的，遵循生命回顾疗法的「生命平衡」原则。
// ---------------------------------------------------------------------------
export const KEEPS: Keep[] = [
  { id: "k1", group: "人", text: "妈妈每周三晚上打来的那个电话" },
  { id: "k2", group: "人", text: "高中那个还在群里发烂梗的朋友" },
  { id: "k3", group: "人", text: "楼下便利店记得你不要香菜的那个店员" },
  { id: "k4", group: "人", text: "那个你一直没敢加回来的人" },

  { id: "k5", group: "事", text: "还差三章没写完的那篇东西" },
  { id: "k6", group: "事", text: "每年生日都说要去、但一直没去的那个地方" },
  { id: "k7", group: "事", text: "你偷偷练了两个月、还没弹给任何人听的那首曲子" },
  { id: "k8", group: "事", text: "那门你其实喜欢、但成绩很差的课" },

  { id: "k9", group: "感觉", text: "洗完澡坐在床边发呆的那十分钟" },
  { id: "k10", group: "感觉", text: "有人认真听你说完一整句话的时候" },
  { id: "k11", group: "感觉", text: "走在回家路上突然想笑的那一下" },
  { id: "k12", group: "感觉", text: "做完一件事、没人知道但你自己知道的那种踏实" },

  { id: "k13", group: "习惯", text: "早上第一口热的东西" },
  { id: "k14", group: "习惯", text: "睡前一定要看完的那个更新" },
  { id: "k15", group: "习惯", text: "难受的时候就一个人走很远的路" },
  { id: "k16", group: "习惯", text: "把想说的话写下来，然后不发出去" },
];

export const BLANK_MAX = 2; // 最多能把几张换成自己写的
export const BLANK_PLACEHOLDER = "还有什么，一直占着你心里的位置？";

// ---------------------------------------------------------------------------
// 「今天」卡 · 14 张（每局随机抽 6）
// 步数写在卡上而不是掷骰 —— 让「时间过得快不快」和当天的内容绑定。
// ---------------------------------------------------------------------------
export const DAYS: DayCard[] = [
  { id: "d1", steps: 1, scene: "闹钟响了四遍。你在被子里躺着，听见楼下有人在扫地。", gain: "还没起床的那十五分钟" },
  { id: "d2", steps: 2, scene: "课上到一半，窗外突然下雨了。整间教室的人都往外看了一眼。", gain: "一屋子人同时抬头的那一下" },
  { id: "d3", steps: 3, scene: "你今天做完了一件拖了很久的事。没人知道，但你自己知道。", gain: "只有你知道的那次做到了" },
  { id: "d4", steps: 2, scene: "有人在群里 @ 了你。你看了三遍才回。", gain: "那条你想了很久才发出去的消息" },
  { id: "d5", steps: 1, scene: "你今天一句话都没跟人说。回到房间才发现。", gain: "一整天没出声的那种安静" },
  { id: "d6", steps: 2, scene: "食堂的阿姨多给了你一勺。你说了谢谢。", gain: "被陌生人多给的那一勺" },
  { id: "d7", steps: 3, scene: "你熬到凌晨三点。第二天什么都不记得了。", gain: "那些糊过去的日子" },
  { id: "d8", steps: 1, scene: "你路过一家开了很久的店，发现它关门了。", gain: "还没来得及再去一次的地方" },
  { id: "d9", steps: 2, scene: "有人问你最近怎么样。你说还行。", gain: "那句没说出口的「其实不太行」" },
  { id: "d10", steps: 1, scene: "你翻到两年前的照片，看了很久。", gain: "照片里那个还什么都不知道的自己" },
  { id: "d11", steps: 3, scene: "今天什么都没发生。天气还不错。", gain: "一个什么都没发生的好天" },
  { id: "d12", steps: 2, scene: "你答应了一件本来不想答应的事。", gain: "那个说不出口的「不」" },
  { id: "d13", steps: 1, scene: "你发现自己已经很久没做那件以前每天都做的事了。", gain: "不知道什么时候停掉的那件事" },
  { id: "d14", steps: 2, scene: "有人跟你说了一句话，你到晚上还在想。", gain: "那句一直在脑子里转的话" },
];

// ---------------------------------------------------------------------------
// 「风」卡 · 6 张（每局随机抽 2，在第 3、5 回合后触发）
// 全部经过伦理筛查：无死亡、无疾病、无背叛、无创伤、无归因于玩家。
// 传达的是：生命里有些重要的东西会离开，而那不是因为你做错了什么。
// ---------------------------------------------------------------------------
export const WINDS: string[] = [
  "时间过去了。有些东西你没做错什么，它只是自己变淡了。",
  "你搬了一次家。有些东西没有跟过来。",
  "那个人换了城市。你们还是好的，只是不常说话了。",
  "你长大了一点。有些从前很要紧的事，现在没那么要紧了。",
  "有件事忙了很久。回过神来，另一件已经落在后面了。",
  "季节换了。有些习惯是跟着天气走的。",
];

// ---------------------------------------------------------------------------
// 界面文案（集中管理，便于统一改口径）
// ---------------------------------------------------------------------------
export const COPY = {
  title: "这一年的路",
  subtitle: "12 格 · 大约 10 分钟 · 随时可以停",

  // 玩前提示（尽告知义务，但不吓人）
  introTitle: "开始之前",
  introBody:
    "接下来的十分钟，你会回头看看这一年。\n路上会有些东西留下来，也会有些东西被放到路边。\n没有分数，没有对错，也没有人会看到。",
  introNote: "如果哪一刻觉得有点重，右上角随时可以停。",
  introGo: "我知道了，开始吧",
  introLater: "今天先不玩",

  // 开局选卡
  pickTitle: "这一年里，一直占着你心里位置的，是哪四样？",
  pickHint: "选四样。可以把其中最多两样换成自己写的。",
  pickDone: "就这四样",

  // 回合中
  slotsLabel: "随身带着的",
  roadsideLabel: "路边",
  takeIt: "收下它（要放下一张）",
  letPass: "就这样过去",
  dropHint: "从随身格里选一张，放到路边",
  dropConfirm: "放到路边",
  dropCancel: "再想想",

  // 风
  windTitle: "起风了",
  windShieldHint: "风要吹走一张。这一整年，你只能护住一次。",
  windShield: "护住其中一张",
  windLetGo: "让它去吧",
  windShieldUsed: "你已经用过这一次了",
  windTook: "风带走了",
  windKept: "你护住了",

  // 结算四屏
  endScreen1: "你走完了这一年。",
  endKeptLabel: "一直带着的",
  endRoadsideLabel: "放在路边的",
  // 整个游戏最重要的一句话。把「失去」重构成「沉淀」，卸掉自责，
  // 但不否认那个有点疼的感觉 —— 不安慰过头，只是给它一个位置。
  endEyeline: "它们不是被丢掉的。它们只是没有一直在你手上。",
  endNotePrompt: "从路边挑一张，跟它说句话。",
  endNotePlaceholder: "什么都可以，一句就够",
  endNoteSave: "写好了",
  endNoteSkip: "跳过",
  endCardTitle: "这一年的路上，你带着的是——",

  // 时间胶囊（给下一次的自己，纯本地）
  capsuleHint: "这句话只留在你这台设备上，不会发给任何人。",
  capsuleFound: "路边长着一封你之前留下的信。",
  capsuleLead: "你当时对着「{keep}」写了：",
  capsulePrivate: "这是你自己写下的，没有别人读过。",
  capsuleGo: "继续走",
  capsuleTear: "撕掉这封信",
  capsuleChat: "找栖栖聊两句",
  // L2 命中时的内联告知：把「不存」归因于系统选择，而不是用户的过错
  capsuleHeld: "这句话我就不替你收着了。要是它有点重，栖栖一直都在。",

  // 出口
  toJournal: "把这句话写进今天的记录",
  toChat: "找栖栖聊两句",
  toHome: "回营地",
  footer: "这不是评估，只是一次回头看",

  // 常驻退出与缓冲
  pause: "先停在这里",
  pauseHeavy: "有点重了，缓一下",
} as const;

// ---------------------------------------------------------------------------
// 抽牌工具：不放回抽样
// ---------------------------------------------------------------------------
export function drawSome<T>(pool: readonly T[], n: number): T[] {
  const rest = [...pool];
  const out: T[] = [];
  while (out.length < n && rest.length > 0) {
    out.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 时间胶囊：本地读写（设计文档附录 A）
// 「给下一次的自己」，不是给陌生人。永不联网。
// ---------------------------------------------------------------------------
const CAPSULE_KEY = "psy_path_capsule";
const RUN_KEY = "psy_path_last";
const DONE_KEY = "psy_path_done";

// 胶囊持久化的丢弃门槛。
// 比 CrisisLayer 的弹层门槛（L3）更严一档：
// 「当下即时展示」和「未来在毫无防备时被推回面前」是两种风险，后者更需要保护。
// L1（好累/孤独/撑着）是这个游戏最典型也最健康的产出，必须允许留下。
//
// 已知代价：L2 词表含「没有意义」「解脱」，而本游戏主题恰恰是反思意义，
// 会有语义贴近的正常反思被判进 L2。权衡后接受 —— 不改词表（词表是 chat/journal
// 共用的，动它风险更大），且 L2 的后果仅是「这一条不存胶囊」，不阻断任何流程。
const CAPSULE_BLOCK_LEVEL = 2;

export function readCapsule(): Capsule | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CAPSULE_KEY);
    return raw ? (JSON.parse(raw) as Capsule) : null;
  } catch {
    return null;
  }
}

// 单条覆盖写。
//
// ⚠️ 两种「不存」要区别对待（设计文档附录 A Q2 定级）：
//   L3 → CrisisLayer 照常弹，胶囊不存，不叠加任何软文案（此刻用户需要的是支持，不是解释）
//   L2 → 不弹层，但必须给一句诚实、不羞辱的内联告知（见 COPY.capsuleHeld）
//        —— 既不制造「以为存了」的虚假信任，也不贴「你太危险」的标签
//   L1/L0 → 正常存。L1（好累/孤独/空虚）是这个游戏最健康、最高频的产出
export type CapsuleResult = "saved" | "held" | "crisis" | "empty";

export function writeCapsule(keepId: string, keepText: string, text: string): CapsuleResult {
  if (typeof window === "undefined") return "empty";
  const body = text.trim();
  if (!body) return "empty";

  const level = detectCrisis(body);
  if (level >= 3) return "crisis";
  if (level >= CAPSULE_BLOCK_LEVEL) return "held";

  try {
    const capsule: Capsule = {
      id: `cap-${Date.now()}`,
      keepId,
      keepText,
      text: body,
      createdAt: Date.now(),
    };
    window.localStorage.setItem(CAPSULE_KEY, JSON.stringify(capsule));
    return "saved";
  } catch {
    return "empty";
  }
}

// 用户主动「撕掉这封信」—— 不可逆，与全局不可逆机制一致
export function tearCapsule(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CAPSULE_KEY);
  } catch {
    /* 忽略 */
  }
}

export function saveRun(run: PathRun): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RUN_KEY, JSON.stringify(run));
    const n = Number(window.localStorage.getItem(DONE_KEY) || 0);
    window.localStorage.setItem(DONE_KEY, String(n + 1));
  } catch {
    /* 忽略 */
  }
}
