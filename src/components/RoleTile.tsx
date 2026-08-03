// 角色头像：双色渐变圆角方块 + 单笔画抽象符号（零素材）
export default function RoleTile({
  color,
  symbol,
  size = 72,
}: {
  color: string;
  symbol: string;
  size?: number;
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: "var(--r-md)",
        background: `linear-gradient(135deg, ${color}, ${color}55)`,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d={symbol} stroke="var(--bg-elevated)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
