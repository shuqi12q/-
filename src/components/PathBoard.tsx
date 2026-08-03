"use client";

import { PATH_TILES } from "@/lib/types";

// 12 格的路 —— 只能往前走
//
// 设计约束（设计文档 2.A.2 / 附录给 designer 的接口说明）：
// · 走过的格子留浅色足迹，未走的极淡
// · 不做进度百分比、不显示「还剩几格」（全局零倒计时语义）
// · 棋子是抽象圆点，无面孔（与 RoleTile / CrisisLayer 的设计原则一致）

// 一条从左中蜿蜒到右上的小路。硬编码坐标，保证每次渲染完全一致。
const PTS: [number, number][] = [
  [20, 60], [45, 75], [71, 85], [96, 88], [122, 83], [147, 71],
  [173, 56], [198, 42], [224, 33], [249, 33], [275, 40], [300, 54],
];

export default function PathBoard({
  pos,
  capsuleAt,
  onCapsule,
}: {
  pos: number; // 当前所在格 index，0 起
  capsuleAt?: number; // 路边有信的格 index，无则不传
  onCapsule?: () => void;
}) {
  const walked = PTS.slice(0, Math.min(pos + 1, PATH_TILES));
  const line = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg
      viewBox="0 0 320 110"
      width="100%"
      role="img"
      aria-label={`这一年的路，你在第 ${pos + 1} 格`}
      style={{ display: "block" }}
    >
      <polyline
        points={line(PTS)}
        fill="none"
        stroke="var(--forest-100)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {walked.length > 1 && (
        <polyline
          points={line(walked)}
          fill="none"
          stroke="var(--forest-500)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {PTS.map(([x, y], i) => {
        const passed = i < pos;
        const here = i === pos;
        if (here) return null;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={passed ? 3.5 : 2.5}
            fill={passed ? "var(--forest-300)" : "var(--forest-100)"}
          />
        );
      })}

      {/* 路边的信：第 7 格，安静地长在那儿，不打断回合 */}
      {capsuleAt !== undefined && PTS[capsuleAt] && (
        <g
          onClick={onCapsule}
          style={{ cursor: onCapsule ? "pointer" : "default" }}
          role={onCapsule ? "button" : undefined}
          aria-label={onCapsule ? "路边长着一封你之前留下的信" : undefined}
        >
          <rect
            x={PTS[capsuleAt][0] - 9}
            y={PTS[capsuleAt][1] + 9}
            width={18}
            height={13}
            rx={2}
            fill="var(--bg-elevated)"
            stroke="var(--wood-500)"
            strokeWidth={1}
          />
          <path
            d={`M${PTS[capsuleAt][0] - 9} ${PTS[capsuleAt][1] + 9} L${PTS[capsuleAt][0]} ${
              PTS[capsuleAt][1] + 17
            } L${PTS[capsuleAt][0] + 9} ${PTS[capsuleAt][1] + 9}`}
            fill="none"
            stroke="var(--wood-500)"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* 棋子最后画，压在最上层 */}
      <circle
        cx={PTS[Math.min(pos, PATH_TILES - 1)][0]}
        cy={PTS[Math.min(pos, PATH_TILES - 1)][1]}
        r={6}
        fill="var(--forest-700)"
        style={{ transition: "cx var(--dur-slow, 600ms) var(--ease-out), cy var(--dur-slow, 600ms) var(--ease-out)" }}
      />
    </svg>
  );
}
