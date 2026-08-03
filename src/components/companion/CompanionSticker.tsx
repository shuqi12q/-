"use client";

import React from "react";
import { STICKERS_BY_CHAR, type CompanionKey, type StickerDef } from "./svg-data";

export type { CompanionKey, StickerDef };
export { STICKERS_BY_CHAR };

export function CompanionSticker({
  char,
  sticker,
  size = 56,
  className,
  style,
}: {
  char: CompanionKey;
  sticker: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const def = STICKERS_BY_CHAR[char]?.find((s) => s.key === sticker);
  if (!def) return null;
  return (
    <svg
      className={className}
      style={{ width: size, height: size, ...style }}
      viewBox="0 0 64 64"
      role="img"
      aria-label={def.label}
    >
      <g dangerouslySetInnerHTML={{ __html: def.svg }} />
    </svg>
  );
}
