// AI 头像「呼吸叶」：两片对称贝塞尔 + 叶脉，外圈相位滞后
export default function BreathingLeaf({
  size = 40,
  still = false,
}: {
  size?: number;
  still?: boolean;
}) {
  const uid = `leafgrad-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--forest-500)" />
          <stop offset="100%" stopColor="var(--forest-700)" />
        </linearGradient>
      </defs>
      <circle
        className={still ? undefined : "breathe"}
        style={still ? undefined : { animationDelay: "-0.6s", transformOrigin: "center" }}
        cx="24"
        cy="24"
        r="22"
        fill="none"
        stroke="var(--forest-300)"
        strokeWidth="1.5"
      />
      <g className={still ? undefined : "breathe"} style={{ transformOrigin: "center" }}>
        <path
          d="M24 10 C 33 15, 37 24, 24 38 C 11 24, 15 15, 24 10 Z"
          fill={`url(#${uid})`}
        />
        {/* 叶脉：用 token 色 + opacity，不硬编码 rgba */}
        <path d="M24 13 V35" stroke="var(--text-inverse)" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
