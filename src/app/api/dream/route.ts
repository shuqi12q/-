import https from "node:https";

export const runtime = "nodejs";

interface Body {
  text?: string;
  mode?: "zhougong" | "psych";
}

// 两种模式的 system prompt：周公解梦 / 现代心理学
const SYSTEM_ZHOUGONG = `你是「周公解梦」风格的传统梦境分析师，参考《周公解梦》《断梦秘书》传统寓意体系。
你的输出不是「算命吉凶」，而是借古人之镜，帮助现代人觉察当下心境、调整行为。
语气温和、有文化味，不恐吓，不绝对化。

输出必须是 5 段纯文本，每段一行，不要编号：
LINE1: 一句话总结（≤30 字）
LINE2-4: 三个「元素 = 象征 + 情绪」格式（例：坠落 = 放下旧执念的信号 = 释然），用「=」分隔三项
LINE5-8: 三个情绪「名字=百分比=一句话解释」（百分比 10-95），用「=」分隔三项（返回 4 个，最后 1 行也用「=」格式）
LINE9-11: 三条建议（短句，每条 ≤25 字）

严格要求：
- 只输出这 5 段共 11 行
- 每行不要带「LINE1」「LINE2」前缀
- 不要编号、不要项目符号、不要解释`;

const SYSTEM_PSYCH = `你是一位温柔的梦境心理咨询师，融合弗洛伊德（潜意识冲突）、荣格（原型与阴影）、Perls 完形（梦是自我的信使）。
你的工作不是诊断，是陪用户觉察。语气温和、开放、不绝对化、不说教、不归因。

输出必须是 5 段纯文本，每段一行，不要编号：
LINE1: 一句话洞察（≤35 字，不要用「这是…」「这意味着…」开头）
LINE2-6: 五个「元素 = 象征意义 + 可能情绪」格式，用「=」分隔
LINE7-10: 四个情绪「名字=百分比=一句话解释」，百分比 10-95，用「=」分隔
LINE11-13: 三条建议（短句，每条 ≤25 字）

严格要求：
- 只输出这 5 段共 13 行
- 每行不要带「LINE1」前缀
- 不要编号、不要项目符号`;

function buildSystem(mode: string) {
  return mode === "zhougong" ? SYSTEM_ZHOUGONG : SYSTEM_PSYCH;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const text: string = (body.text ?? "").toString().trim();
  const mode: "zhougong" | "psych" = body.mode === "zhougong" ? "zhougong" : "psych";
  if (!text) {
    return new Response("(梦境内容不能为空)", { status: 400 });
  }
  if (text.length > 1500) {
    return new Response("(请把梦境控制在 1500 字内)", { status: 400 });
  }
  // 危机兜底：自伤/自杀
  if (/(自伤|自杀|不想活|轻生|伤害自己|结束生命)/.test(text)) {
    return new Response(
      "看到你提到了这些。梦境里的恐惧是真的，但你此刻是安全的。如果今天很难受，请拨打心理援助热线 12356（24 小时），或联系身边信任的人。\n12356",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const useArk = !!process.env.ARK_API_KEY;
  const key = useArk
    ? (process.env.ARK_API_KEY as string)
    : (process.env.DEEPSEEK_API_KEY ?? "");
  if (!key) return new Response("(未配置 ARK_API_KEY 或 DEEPSEEK_API_KEY)", { status: 503 });
  const baseUrl = useArk
    ? process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"
    : process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";
  const model = useArk
    ? process.env.ARK_MODEL || "doubao-seed-1-6-250615"
    : process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const u = new URL(baseUrl.replace(/\/$/, "") + "/chat/completions");
  const payload = JSON.stringify({
    model,
    messages: [
      { role: "system", content: buildSystem(mode) },
      { role: "user", content: `【用户描述的梦境】\n${text}\n\n请严格按 system 要求的格式输出。` },
    ],
    stream: true,
    temperature: 0.85,
    max_tokens: mode === "psych" ? 700 : 520,
  });
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const r = https.request(
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
            res.resume();
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
                /* ignore */
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
                } catch { /* ignore */ }
              }
            }
            controller.close();
          });
        },
      );
      r.on("error", () => controller.close());
      r.write(payload);
      r.end();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}