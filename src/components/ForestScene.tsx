// 首页氛围区：3 层森林剪影 + 4 个光斑，纯 SVG，无位图
// 摇曳周期取互质值（sway-a 31s / sway-b 24s），避免机械同步

type Variant = "day" | "dusk" | "night";

// 颜色一律取自 design-tokens，不出现任何硬编码色值。
// 时段差异不靠另一套调色板，而是在同一套 token 之上叠一层色罩：
//   dusk → 暖木罩（--wood-300）  night → 森林深色罩（--forest-900）
const c = {
  top: "var(--amb-top)",
  bottom: "var(--amb-bottom)",
  glow: "var(--amb-glow)",
  far: "var(--sil-far)",
  mid: "var(--sil-mid)",
  near: "var(--sil-near)",
};

const VEIL: Record<Variant, { fill: string; opacity: number } | null> = {
  day: null,
  dusk: { fill: "var(--wood-300)", opacity: 0.28 },
  night: { fill: "var(--forest-900)", opacity: 0.82 },
};

// 树冠 = 连续的 Q 峰，一条 path 走完整宽
const FAR = "M0 150 Q 18 118 34 148 Q 52 108 70 146 Q 92 120 112 148 Q 132 104 152 146 Q 174 118 194 148 Q 214 106 236 146 Q 258 122 278 148 Q 300 108 322 146 Q 344 120 362 148 Q 370 138 375 150 L375 220 L0 220 Z";
const MID = "M0 172 Q 22 140 44 170 Q 66 134 90 170 Q 116 146 140 172 Q 164 136 190 170 Q 214 148 240 172 Q 266 138 292 170 Q 318 148 344 172 Q 362 156 375 172 L375 220 L0 220 Z";
const NEAR = "M0 194 Q 26 172 52 192 Q 80 166 108 192 Q 138 176 166 194 Q 196 168 226 192 Q 254 176 282 194 Q 312 170 340 192 Q 360 182 375 194 L375 220 L0 220 Z";

const GLOWS = [
  { cx: 62, cy: 58, r: 46, dur: "8.4s" },
  { cx: 168, cy: 40, r: 34, dur: "11.2s" },
  { cx: 268, cy: 66, r: 52, dur: "9.6s" },
  { cx: 330, cy: 30, r: 30, dur: "12.8s" },
];

const STARS = [
  [38, 34], [96, 22], [148, 52], [206, 28], [252, 46], [304, 24], [352, 50],
];

export default function ForestScene({ variant = "day" }: { variant?: Variant }) {
  const veil = VEIL[variant];
  const night = variant === "night";
  return (
    <div
      className="w-full overflow-hidden"
      style={{ borderRadius: "var(--r-2xl)", lineHeight: 0 }}
    >
      <svg viewBox="0 0 375 220" width="100%" role="img" aria-label="清晨的森林剪影">
        <defs>
          <linearGradient id="amb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.top} />
            <stop offset="100%" stopColor={c.bottom} />
          </linearGradient>
          <radialGradient id="amb-glow">
            <stop offset="0%" stopColor={c.glow} stopOpacity="0.75" />
            <stop offset="100%" stopColor={c.glow} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="375" height="220" fill="url(#amb-sky)" />

        {!night &&
          GLOWS.map((g, i) => (
            <circle
              key={i}
              className="glow"
              style={{ animationDelay: `${-i * 1.7}s`, animationDuration: g.dur }}
              cx={g.cx}
              cy={g.cy}
              r={g.r}
              fill="url(#amb-glow)"
            />
          ))}

        <path d={FAR} fill={c.far} opacity="0.6" />
        <path className="sway-b" d={MID} fill={c.mid} opacity="0.75" />
        <path className="sway-a" d={NEAR} fill={c.near} />

        {/* 时段色罩：叠在剪影之上；星与月画在色罩之后，夜间才读得到 */}
        {veil && <rect width="375" height="220" fill={veil.fill} opacity={veil.opacity} />}

        {night && (
          <g>
            {STARS.map(([x, y], i) => (
              <circle
                key={i}
                className="glow"
                style={{ animationDelay: `${-i * 0.9}s`, animationDuration: "6s" }}
                cx={x}
                cy={y}
                r="1.5"
                fill="var(--text-inverse)"
              />
            ))}
            <path d="M316 30 A 12 12 0 1 1 304 18 A 9.5 9.5 0 1 0 316 30 Z" fill="var(--wood-glow)" opacity="0.8" />
          </g>
        )}
      </svg>
    </div>
  );
}
