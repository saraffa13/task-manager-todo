import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/lib/models/Task";
import Habit from "@/lib/models/Habit";
import Process from "@/lib/models/Process";
import { requireUserId } from "@/lib/session";

// Returns a flat, search-friendly list of work targets across the app.
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  await dbConnect();
  const [tasks, habits, processes] = await Promise.all([
    Task.find({ userId, completed: false }).select({ text: 1 }).limit(200).lean(),
    Habit.find({ userId }).select({ name: 1 }).limit(100).lean(),
    Process.find({ userId }).select({ name: 1 }).limit(100).lean(),
  ]);

  type Item = { type: "task" | "habit" | "process"; id: string; name: string };
  const items: Item[] = [
    ...tasks.map((t) => ({ type: "task" as const, id: String(t._id), name: t.text ?? "" })),
    ...habits.map((h) => ({ type: "habit" as const, id: String(h._id), name: h.name ?? "" })),
    ...processes.map((p) => ({
      type: "process" as const,
      id: String(p._id),
      name: p.name ?? "",
    })),
  ];

  const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  return NextResponse.json(filtered.slice(0, 50));
}
