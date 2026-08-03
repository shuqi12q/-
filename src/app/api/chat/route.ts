import https from "node:https";
import { getCompanion, SAFE_MODE_PROMPT } from "@/lib/persona";

export const runtime = "nodejs";

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

// ---------- Demo 降级：无 API key 时的拟人流式回复 ----------
const NAMED: { re: RegExp; line: string }[] = [
  { re: /(累|疲惫|困|没力气|熬)/, line: "听起来是那种从身体一直漫到心里的累。" },
  { re: /(焦虑|紧张|慌|睡不着|失眠)/, line: "那种一直悬着、放不下来的紧绷感，挺熬人的。" },
  { re: /(委屈|不公平|凭什么)/, line: "被这样对待，会觉得委屈是很自然的事。" },
  { re: /(孤独|一个人|没人懂|没人理)/, line: "有话却不知道能跟谁说，那种空落落的感觉我听到了。" },
  { re: /(生气|愤怒|烦|讨厌)/, line: "你是真的被惹到了，这股火气有它的道理。" },
  { re: /(难过|低落|想哭|不开心)/, line: "听起来心里沉沉的，像压了一层东西。" },
  { re: /(开心|高兴|不错|顺利|喜欢)/, line: "能感觉到你说这件事的时候，语气是松的。" },
];

// safe mode 下的 grounding 收尾问句：停在当下，不做探索、不给建议
const GROUNDING = [
  "你现在在哪儿？身边有人吗？",
  "今晚打算在哪儿待着？",
  "这会儿身上还好吗，冷不冷、渴不渴？",
];

function mockReply(text: string, safeMode = false): string {
  const t = (text || "").trim();
  if (!t) return "我在这儿。你想从哪儿说起都行。";

  const excerpt = t.length > 16 ? `${t.slice(0, 16)}…` : t;
  const named = NAMED.find((n) => n.re.test(t))?.line ?? "听起来这件事在你心里放了有一会儿了。";
  const asksAdvice = /(怎么办|该怎么|怎么做|建议|办法|我该)/.test(t);

  if (safeMode) {
    // 更短、不给建议、以 grounding 提问收尾
    const ask = GROUNDING[Math.floor(Math.random() * GROUNDING.length)];
    return `${named}${ask}`;
  }

  const parts = [`你说「${excerpt}」，我听着。`, named, "有这样的感受，一点都不奇怪。"];
  if (asksAdvice) {
    parts.push("如果想试点小的：先不急着解决，把最想说的那一句写下来，写完再决定要不要做什么。");
  } else {
    parts.push("想接着说的话，我都在。");
  }
  return parts.join("");
}

function mockStream(text: string, safeMode = false): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const reply = mockReply(text, safeMode);
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < reply.length; i += 2) {
        controller.enqueue(enc.encode(reply.slice(i, i + 2)));
        await new Promise((r) => setTimeout(r, 30 + Math.floor(Math.random() * 30)));
      }
      controller.close();
    },
  });
}

// ---------- OpenAI 兼容（原生 https SSE，绕开 undici 对 Ark 流式的挂起） ----------
// 只转发 delta.content；reasoning_content（模型"思考"过程）不展示给用户。
// 上游非 200（如模型未开通 404）→ 静默回退到拟人兜底文本，不在前端暴露错误。
function openaiStreamHttps(
  baseUrl: string,
  model: string,
  messages: ChatMsg[],
  key: string,
  fallback: string,
): ReadableStream<Uint8Array> {
  const u = new URL(baseUrl.replace(/\/$/, "") + "/chat/completions");
  const payload = JSON.stringify({
    model,
    messages,
    stream: true,
    temperature: 0.85,
    max_tokens: 320,
  });
  const enc = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume(); // 丢弃错误体
            controller.enqueue(enc.encode(fallback));
            controller.close();
            return;
          }
          let buf = "";
          res.setEncoding("utf8");
          res.on("data", (chunk: string) => {
            buf += chunk;
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const s = line.trim();
              if (!s.startsWith("data:")) continue;
              const p = s.slice(5).trim();
              if (!p || p === "[DONE]") continue;
              try {
                const j = JSON.parse(p);
                const c: string | undefined = j?.choices?.[0]?.delta?.content;
                if (c) controller.enqueue(enc.encode(c));
              } catch {
                /* 半包 JSON 直接跳过 */
              }
            }
          });
          res.on("end", () => {
            const tail = buf.trim();
            if (tail.startsWith("data:")) {
              const p = tail.slice(5).trim();
              if (p && p !== "[DONE]") {
                try {
                  const j = JSON.parse(p);
                  const c = j?.choices?.[0]?.delta?.content;
                  if (c) controller.enqueue(enc.encode(c));
                } catch {
                  /* ignore */
                }
              }
            }
            controller.close();
          });
        },
      );
      req.on("error", () => {
        controller.enqueue(enc.encode(fallback));
        controller.close();
      });
      req.write(payload);
      req.end();
    },
    cancel() {
      /* 客户端断开，静默 */
    },
  });
}

export async function POST(req: Request) {
  let incoming: ChatMsg[] = [];
  let safeMode = false;
  let personaId: string | null = null;
  let memoryContext = "";
  try {
    const body = (await req.json()) as {
      messages?: ChatMsg[];
      safeMode?: boolean;
      persona?: string;
      memoryContext?: string;
    };
    incoming = Array.isArray(body.messages) ? body.messages : [];
    safeMode = body.safeMode === true;
    personaId = typeof body.persona === "string" && body.persona ? body.persona : null;
    memoryContext = typeof body.memoryContext === "string" ? body.memoryContext : "";
  } catch {
    incoming = [];
  }

  const companion = getCompanion(personaId);
  const history = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-16);
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  // 优先级：豆包方舟 (ARK_API_KEY) → DeepSeek (DEEPSEEK_API_KEY) → 本地 mock 兜底
  const useArk = !!process.env.ARK_API_KEY;
  const key = useArk ? process.env.ARK_API_KEY! : (process.env.DEEPSEEK_API_KEY ?? "");
  const baseUrl = useArk
    ? process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"
    : process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";
  const model = useArk
    ? process.env.ARK_MODEL || "doubao-seed-1-6-250615"
    : process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const base = safeMode
    ? `${companion.systemPrompt}\n\n${companion.safeModePrompt ?? SAFE_MODE_PROMPT}`
    : companion.systemPrompt;
  const system = memoryContext ? `${base}\n\n${memoryContext}` : base;
  const fallback = mockReply(lastUser, safeMode);

  let stream: ReadableStream<Uint8Array> | null = null;
  if (key) {
    try {
      stream = openaiStreamHttps(
        baseUrl,
        model,
        [{ role: "system", content: system }, ...history],
        key,
        fallback,
      );
    } catch {
      stream = null; // 上游异常 → 静默降级，不打印用户内容
    }
  }
  if (!stream) stream = mockStream(lastUser, safeMode);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
