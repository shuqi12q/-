import { JournalEntry, CopingStyle, RoleCharacter } from "./types";

// 标签 → 应对倾向（用于估算用户"已经常用"的应对方式）
const TAG_COPING: Record<string, CopingStyle> = {
  工作: "avoid",
  学业: "avoid",
  未来: "avoid",
  金钱: "avoid",
  家人: "please",
  伴侣: "please",
  朋友: "please",
  自己: "direct",
  身体: "seek",
};

export interface UserProfile {
  total: number;
  negCount: number;
  posCount: number;
  tagCount: Record<string, number>;
  // 各应对风格的"已有证据量"（越多=用户越常用）
  evidence: Record<CopingStyle, number>;
}

export function computeProfile(entries: JournalEntry[]): UserProfile {
  const tagCount: Record<string, number> = {};
  let neg = 0;
  let pos = 0;
  for (const e of entries) {
    for (const t of e.tags) tagCount[t] = (tagCount[t] || 0) + 1;
    if (e.quick <= 1) neg++;
    else if (e.quick >= 3) pos++;
  }
  const evidence: Record<CopingStyle, number> = { avoid: 0, please: 0, direct: 0, seek: 0 };
  for (const [tag, c] of Object.entries(tagCount)) {
    const style = TAG_COPING[tag];
    if (style) evidence[style] += c;
  }
  return { total: entries.length, negCount: neg, posCount: pos, tagCount, evidence };
}

export interface Recommendation {
  character: RoleCharacter;
  reason: string;
  deficit: CopingStyle;
}

// 推荐"你缺的那一面"：从证据最少的应对风格里挑对应角色
export function recommendRole(
  profile: UserProfile,
  characters: RoleCharacter[]
): Recommendation | null {
  if (profile.total < 3) return null; // 冷启动：数据不足不瞎推荐

  const order = (["avoid", "please", "direct", "seek"] as CopingStyle[]).sort(
    (a, b) => profile.evidence[a] - profile.evidence[b]
  );
  const deficit = order[0];
  const character =
    characters.find((c) => c.coping === deficit) || characters[0];

  const topTag = Object.entries(profile.tagCount).sort((a, b) => b[1] - a[1])[0];
  const tagPhrase = topTag
    ? `关于 #${topTag[0]} 你写了 ${topTag[1]} 次，且多为消极`
    : "你最近的记录多为消极情绪";

  const reason = `最近 ${profile.total} 篇记录里，${tagPhrase}，但你很少练习「直接表达需求」。要不要试试用【${character.name}】的视角，看看换一种方式会怎样？`;

  return { character, reason, deficit };
}
