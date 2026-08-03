"use client";

import React from "react";
import { AVATAR_PATHS, type CompanionKey } from "./svg-data";

const NAMES: Record<CompanionKey, string> = {
  lili: "栗栗",
  achi: "阿赤",
  tuan: "团团",
};

export function CompanionAvatar({
  char,
  size = 48,
  still,
  className,
  style,
}: {
  char: CompanionKey;
  size?: number;
  still?: boolean; // 兼容 BreathingLeaf 的 still prop（忽略，头像无动画）
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={{ width: size, height: size, flex: "0 0 auto", ...style }}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${NAMES[char]}头像`}
    >
      <g dangerouslySetInnerHTML={{ __html: AVATAR_PATHS[char] }} />
    </svg>
  );
}

export function companionName(char: CompanionKey): string {
  return NAMES[char];
}
