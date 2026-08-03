// 陪伴角色轻量记忆（local-first，零后端）
// 设计来源：deliverables/gstack/companion-characters-design-2026-08-03.md §B4
// 每个角色独立 key：psy_mem_<personaId>
// 事实提取用廉价正则（客户端毫秒级）；注入时由 buildMemoryContext 拼成文本随请求带上。

export interface MemoryFact {
  text: string;
  touched: number; // 最近一次提到的时间戳
  count: number; // 提到次数（R1"连续两次提同一件事"的数据来源）
}

export interface PersonaMemory {
  facts: MemoryFact[];
  unfinished: { text: string; touched: number } | null; // 未完成话题（≤40 字）
  lastSeen: number; // 上次会话时间戳（R6 隔天开场）
  totalSessions: number; // 累计会话数
}

const KEY = (id: string) => `psy_mem_${id}`;
const FACT_MAX = 8;

export function emptyMemory(): PersonaMemory {
  return { facts: [], unfinished: null, lastSeen: 0, totalSessions: 0 };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s，。！？!?.、~·…—\-_，]/g, "");
}

// ---------- 读取 / 写入 ----------
export function readMemory(personaId: string): PersonaMemory {
  if (typeof window === "undefined") return emptyMemory();
  const raw = window.localStorage.getItem(KEY(personaId));
  if (!raw) return emptyMemory();
  try {
    const m = JSON.parse(raw) as PersonaMemory;
    return {
      facts: Array.isArray(m.facts) ? m.facts : [],
      unfinished: m.unfinished ?? null,
      lastSeen: typeof m.lastSeen === "number" ? m.lastSeen : 0,
      totalSessions: typeof m.totalSessions === "number" ? m.totalSessions : 0,
    };
  } catch {
    window.localStorage.removeItem(KEY(personaId));
    return emptyMemory();
  }
}

export function writeMemory(personaId: string, mem: PersonaMemory): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(personaId), JSON.stringify(mem));
}

// ---------- 事实提取（B4.2 优先级规则） ----------
const RULES: { re: RegExp; make: (m: RegExpMatchArray) => string | null }[] = [
  // 1. 自我介绍：我叫X / 我是X
  { re: /我(?:叫|是)([\u4e00-\u9fa5A-Za-z]{1,8})(?:[，。！？]|$)/, make: (m) => (m[1] ? `用户叫${m[1]}` : null) },
  // 2. 关系·对象
  { re: /我(男|女)朋友|我妈|我爸爸|我爸|我同事|我朋友|我室友|我同学|我老师|我家人/, make: (m) => (m[0] ? m[0] : null) },
  // 3. 偏好
  { re: /我(?:超级喜欢|超爱|最喜欢|喜欢|爱|讨厌|不喜欢)([^，。！？!?]{1,20})/, make: (m) => (m[1] ? `用户喜欢/讨厌${m[1]}` : null) },
  // 4. 近况事件
  { re: /我(?:下(?:周|个月|礼拜)|明天|后天|最近|这周|这个月|周末)(?:要|会|在|打算|准备)([^，。！？!?]{1,20})/, make: (m) => (m[1] ? `用户近期要${m[1]}` : null) },
];

function extractFacts(text: string): string[] {
  const out: string[] = [];
  for (const r of RULES) {
    const re = new RegExp(r.re.source, "g");
    let m: RegExpMatchArray | null;
    while ((m = re.exec(text)) !== null) {
      const f = r.make(m);
      if (f && out.indexOf(f) < 0) out.push(f);
      // 防止零宽匹配死循环
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return out;
}

// 去重：normalize 后相同或互为子串视为同一条
function mergeFact(facts: MemoryFact[], text: string): MemoryFact[] {
  const n = normalize(text);
  const hit = facts.find((f) => {
    const fn = normalize(f.text);
    return fn === n || fn.includes(n) || n.includes(fn);
  });
  if (hit) {
    return facts.map((f) =>
      f === hit ? { ...f, count: f.count + 1, touched: Date.now() } : f,
    );
  }
  const next: MemoryFact[] = [...facts, { text, touched: Date.now(), count: 1 }];
  if (next.length <= FACT_MAX) return next;
  // 淘汰：count 最低 & touched 最旧（取综合最弱的一条）
  next.sort((a, b) => a.count - b.count || a.touched - b.touched);
  return next.slice(1);
}

// 未完成话题（B4.2）：疑问收尾 / 转折 / 犹豫词
const UNFINISHED_RE = /(?:吗|呢|么|吧)[，。]?$|可是|但是|我该不该|不知道怎么办|不知道该怎么|下次再说|回头再说|再说吧|想不通|还没想好/;

function detectUnfinished(text: string): string | null {
  if (!UNFINISHED_RE.test(text)) return null;
  const t = text.trim().slice(0, 40);
  return t.length >= 3 ? t : null;
}

// ---------- 每次用户消息后更新记忆（前端调用） ----------
export function updateMemoryAfterMessage(personaId: string, userText: string): PersonaMemory {
  const mem = readMemory(personaId);
  const facts = extractFacts(userText);
  let nextFacts = mem.facts;
  for (const f of facts) nextFacts = mergeFact(nextFacts, f);

  const un = detectUnfinished(userText);
  const unfinished = un
    ? { text: un, touched: Date.now() }
    : mem.unfinished && Date.now() - mem.unfinished.touched < 1000 * 60 * 60 * 24
      ? mem.unfinished
      : null; // 超过 1 天的未完成话题留作开场素材，不再参与本次

  const next: PersonaMemory = { ...mem, facts: nextFacts, unfinished, lastSeen: Date.now() };
  writeMemory(personaId, next);
  return next;
}

// 会话开始（冷启动时计数 +1）
export function touchSession(personaId: string): PersonaMemory {
  const mem = readMemory(personaId);
  const next: PersonaMemory = { ...mem, lastSeen: Date.now(), totalSessions: mem.totalSessions + 1 };
  writeMemory(personaId, next);
  return next;
}

// ---------- 记忆上下文注入（B4.3，拼在 system prompt 之后） ----------
export function buildMemoryContext(personaId: string): string {
  const mem = readMemory(personaId);
  const parts: string[] = [];
  // 取 count 高、touched 新的 2-4 条
  const top = [...mem.facts]
    .sort((a, b) => b.count - a.count || b.touched - a.touched)
    .slice(0, 4);
  if (top.length) {
    parts.push("【你记得关于用户的事】");
    for (const f of top) parts.push(`- 他说过：${f.text}`);
  }
  if (mem.unfinished) {
    parts.push(`- 上次没聊完：${mem.unfinished.text}`);
  }
  if (!parts.length) return "";
  return `\n\n${parts.join("\n")}`;
}

// 冷启动开场上下文：是否今天已聊过 / 是否有未完成话题
export function openerContext(personaId: string): { checkedInToday: boolean; unfinishedTopic?: string; lastNegative?: boolean } {
  const mem = readMemory(personaId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkedInToday = mem.lastSeen >= today.getTime();
  return {
    checkedInToday,
    unfinishedTopic: mem.unfinished?.text ?? undefined,
    lastNegative: mem.facts.some((f) => /(难过|累|孤独|烦|焦虑|委屈|失眠|哭|撑)/.test(f.text)),
  };
}
