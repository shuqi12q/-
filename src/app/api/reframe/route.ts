import https from "node:https";

export const runtime = "nodejs";

const SYSTEM = `你是认知行为疗法（CBT）"转念器"助手。基于用户原念头 + 4 问自检，生成 6 条温和、可行、非绝对的"另一种角度"。

要求：
- 每条 1 行短句，不超过 30 字，不要序号/项目符号/解释
- 用「也许 / 可能 / 有时候」等开放语气，不否定用户感受，不讲道理
- 用第一人称"我"或"我们"，让用户能直接念出来
- 不许把念头全盘否定；保留对感受的尊重，再换一种解释的可能
- 危机相关输入（自伤/自杀/不想活/轻生/伤害自己）跳过生成，直接给热线提示`;

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const thought: string = (body.thought ?? "").toString().trim();
  const answers: string[] = Array.isArray(body.answers)
    ? body.answers.map((s: any) => (s ?? "").toString())
    : ["", "", "", ""];
  if (!thought) {
    return new Response("(念头不能为空)", { status: 400 });
  }

  // 危机直转热线
  if (/(自伤|自杀|不想活|轻生|伤害自己|结束生命)/.test(thought)) {
    return new Response(
      "看到你提到了这些。如果你现在很危险，请立即拨打心理援助热线 12356（24 小时），或联系身边信任的人。\n这条线一直有人在接。",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const a0 = answers[0]?.trim() || "（未答）";
  const a1 = answers[1]?.trim() || "（未答）";
  const a2 = answers[2]?.trim() || "（未答）";
  const a3 = answers[3]?.trim() || "（未答）";

  const userContent = `【用户的念头】
${thought}

【4 问自检】
① 这是真的吗？ ${a0}
② 你能百分百确定它是真的吗？ ${a1}
③ 带着这个想法，我有什么感受、做了什么？ ${a2}
④ 如果暂时放下这个想法，我会是谁、可以怎么做？ ${a3}

请基于以上，输出 6 条"另一种角度"短句。
格式：6 行纯文本，每行一条，不带序号、不带符号、不加解释。`;

  const useArk = !!process.env.ARK_API_KEY;
  const key = useArk
    ? (process.env.ARK_API_KEY as string)
    : (process.env.DEEPSEEK_API_KEY ?? "");
  if (!key) {
    return new Response("(未配置 ARK_API_KEY 或 DEEPSEEK_API_KEY)", { status: 503 });
  }
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
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ],
    stream: true,
    temperature: 0.9,
    max_tokens: 260,
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
      r.on("error", () => controller.close());
      r.write(payload);
      r.end();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}