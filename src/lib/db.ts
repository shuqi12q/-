import Dexie, { Table } from "dexie";
import { JournalEntry, JournalReply, DreamRecord } from "./types";

class PsyDB extends Dexie {
  entries!: Table<JournalEntry, string>;
  dreams!: Table<DreamRecord, string>;
  constructor() {
    super("psycare");
    // v1: 情绪记录 entries
    this.version(1).stores({
      entries: "id,createdAt",
    });
    // v2: 新增梦境记录 dreams；entries 保持不变
    this.version(2).stores({
      entries: "id,createdAt",
      dreams: "id,createdAt,*tags",
    });
  }
}

export const db = new PsyDB();

export async function addEntry(e: JournalEntry) {
  await db.entries.add(e);
}

export async function updateEntry(e: JournalEntry) {
  await db.entries.put(e);
}

export async function getEntries(): Promise<JournalEntry[]> {
  return (await db.entries.orderBy("createdAt").reverse().toArray()) as JournalEntry[];
}

export async function getEntry(id: string): Promise<JournalEntry | undefined> {
  return db.entries.get(id);
}

export async function getEntriesInRange(from: number, to: number): Promise<JournalEntry[]> {
  return (await db.entries.where("createdAt").between(from, to, true, true).toArray()) as JournalEntry[];
}

export async function deleteEntry(id: string) {
  await db.entries.delete(id);
}

// 给某条记录追加一条"回头回复"
export async function addReplyToEntry(entryId: string, reply: JournalReply) {
  const e = await db.entries.get(entryId);
  if (!e) return;
  const replies = [...(e.replies ?? []), reply];
  await db.entries.put({ ...e, replies });
}

export async function clearAll() {
  await db.entries.clear();
}

// ---------- 梦境记录 CRUD ----------
export async function addDream(d: DreamRecord) {
  await db.dreams.add(d);
}
export async function updateDream(d: DreamRecord) {
  await db.dreams.put(d);
}
export async function getDreams(): Promise<DreamRecord[]> {
  return (await db.dreams.orderBy("createdAt").reverse().toArray()) as DreamRecord[];
}
export async function getDream(id: string): Promise<DreamRecord | undefined> {
  return db.dreams.get(id);
}
export async function deleteDream(id: string) {
  await db.dreams.delete(id);
}
