import Dexie, { Table } from "dexie";
import { JournalEntry, JournalReply } from "./types";

class PsyDB extends Dexie {
  entries!: Table<JournalEntry, string>;
  constructor() {
    super("psycare");
    this.version(1).stores({
      entries: "id,createdAt",
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
