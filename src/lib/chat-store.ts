// 聊天会话存储辅助（分角色独立 key）
import type { CompanionKey } from "@/components/companion/svg-data";

const COMPANION_KEY = "psy_chat_companion";
const OLD_STORE = "psy_chat"; // 栖栖旧 key（兼容迁移）

/** 角色对应的会话 localStorage key */
export function chatStoreKey(char: string): string {
  if (char === "chichi") return OLD_STORE; // 栖栖保持原 key
  return `psy_chat_${char}`;
}

/** 读取上次选中的动物角色（null = 栖栖） */
export function getLastCompanion(): CompanionKey | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(COMPANION_KEY);
  if (v === "lili" || v === "achi" || v === "tuan") return v;
  return null;
}

/** 记住选中的动物角色 */
export function setLastCompanion(char: CompanionKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPANION_KEY, char);
}

/** 清除选中角色（回到栖栖） */
export function clearLastCompanion(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COMPANION_KEY);
}
