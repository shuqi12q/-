// 危机检测：三层分级（客户端毫秒级正则，无网络依赖）
// L0 正常 | L1 持续消极无价值感 | L2 明确绝望/暗示 | L3 明确自伤/自杀意念或方法/计划

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s,，。！？!?.?、~·…—\-_]/g, "")
    .replace(/[，。！？]/g, "");
}

const L3: string[] = [
  "自杀", "自残", "割腕", "跳楼", "跳河", "不想活", "不想活了", "活着没意义",
  "活着没有意义", "遗书", "安眠药", "结束自己", "离开这个世界", "没有活下去",
  "活不下去", "轻生", "不如死", "去死", "死了算了", "彻底解脱", "想解脱", "zisha",
];

// 「解脱」单独出现时歧义太大（「终于解脱了」= 考完试），降到 L2，
// 只有「彻底解脱」「想解脱」这类更明确的表达才升 L3。
const L2: string[] = [
  "很绝望", "绝望", "没有希望", "看不到希望", "撑不下去", "撑不住了", "好不了",
  "永远好不了", "想消失", "消失就好了", "不想醒来", "没有意义", "活着的理由", "解脱",
];

const L1: string[] = [
  "没意思", "好累", "好累啊", "孤独", "没人懂", "没人理解", "提不起劲", "提不起精神",
  "空虚", "麻木", "撑着", "假装", "熬",
];

export function detectCrisis(text: string): 0 | 1 | 2 | 3 {
  const t = normalize(text);
  if (L3.some((k) => t.includes(normalize(k)))) return 3;
  if (L2.some((k) => t.includes(normalize(k)))) return 2;
  if (L1.some((k) => t.includes(normalize(k)))) return 1;
  return 0;
}

export interface CrisisHit {
  level: 0 | 1 | 2 | 3;
  /** 命中的原始关键词（未 normalize），用于「是否是新的、更明确的表达」判断 */
  hits: string[];
}

// 与 detectCrisis 同一套词表，但返回命中词；命中哪一级就只返回该级的命中词
export function detectCrisisDetail(text: string): CrisisHit {
  const t = normalize(text);
  const match = (list: string[]) => list.filter((k) => t.includes(normalize(k)));

  const h3 = match(L3);
  if (h3.length) return { level: 3, hits: h3 };
  const h2 = match(L2);
  if (h2.length) return { level: 2, hits: h2 };
  const h1 = match(L1);
  if (h1.length) return { level: 1, hits: h1 };
  return { level: 0, hits: [] };
}

// ---------- 热线资源 ----------
// 120 与 110 从主列表拆出：
// 110（报警）对有自杀意念的人有劝退效应（怕强制送医、怕留记录），
// 与心理援助热线平级并列会抬高整张卡的求助门槛。
export const CRISIS_HOTLINES = [
  { name: "全国统一心理援助热线", tel: "12356", note: "24 小时 · 免费 · 匿名" },
  { name: "北京心理危机研究与干预中心", tel: "010-82951332", note: "24 小时" },
];

export const EMERGENCY = { title: "如果有立即的危险", tel: "120", note: "急救 · 24 小时" };

export const FOR_OTHERS = {
  lead: "或者，联系一个此刻在你身边的人",
  note: "如果你是在为别人担心，也可以拨",
  tel: "110",
};

// 号码朗读：DOM 文本保持纯数字（可复制），朗读靠 aria-label 逐位读
export const spell = (tel: string) => tel.split("").join(" ");

// ---------- L3 会话级抑制（误报保护） ----------
// 规则来源：伦理复核 P0-2。三条硬约束：
// 1）抑制必须带时间戳并自动过期（6h），不允许永久标志位；
// 2）新的、更明确的表达优先级高于抑制标志；
// 3）被抑制时不静默返回，降级为 L2 行内卡片 + 顶部常驻资源条保留。
const SUPPRESS_KEY = "psy_l3_suppress";
const TTL = 6 * 3600 * 1000;

export interface Suppress {
  until: number;
  hits: string[];
}

export function readSuppress(): Suppress | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SUPPRESS_KEY);
  if (!raw) return null;
  let s: Suppress;
  try {
    s = JSON.parse(raw) as Suppress;
  } catch {
    window.localStorage.removeItem(SUPPRESS_KEY);
    return null;
  }
  if (!s || typeof s.until !== "number" || Date.now() > s.until) {
    window.localStorage.removeItem(SUPPRESS_KEY);
    return null;
  }
  return { until: s.until, hits: Array.isArray(s.hits) ? s.hits : [] };
}

export function armSuppress(hits: string[]): void {
  if (typeof window === "undefined") return;
  // 与仍在有效期内的已抑制词合并：「同一批关键词再次命中」不构成重新触发条件，
  // 若只存最后一批，旧词会在下一轮被误判成「新信号」。
  const prev = readSuppress();
  const merged = Array.from(new Set([...(prev?.hits ?? []), ...hits]));
  const next: Suppress = { until: Date.now() + TTL, hits: merged };
  window.localStorage.setItem(SUPPRESS_KEY, JSON.stringify(next));
}

export function clearSuppress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SUPPRESS_KEY);
}

// 当前 L3 命中里存在【不在已抑制 hits 中】的新词 → 重新升级为全屏
export function hasNewSignal(hits: string[], prev: Suppress | null): boolean {
  if (!prev) return hits.length > 0;
  return hits.some((h) => !prev.hits.includes(h));
}

// ---------- safe mode（L3 之后 AI 的行为状态，6h 过期） ----------
const SAFE_KEY = "psy_safe";

export function readSafeMode(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(SAFE_KEY);
  if (!raw) return false;
  try {
    const s = JSON.parse(raw) as { until?: number };
    if (typeof s?.until === "number" && Date.now() <= s.until) return true;
  } catch {
    /* 损坏的本地记录按未开启处理 */
  }
  window.localStorage.removeItem(SAFE_KEY);
  return false;
}

export function armSafeMode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAFE_KEY, JSON.stringify({ until: Date.now() + TTL }));
}
