import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Habit from "@/lib/models/Habit";
import HabitLog from "@/lib/models/HabitLog";
import { requireUserId } from "@/lib/session";
import { dateKeyOffset, isValidTime } from "@/lib/habits";
import type { HabitKind } from "@/types";

const VALID_KINDS: HabitKind[] = ["check", "count", "time"];

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const habits = await Habit.find({ userId }).sort({ order: 1, createdAt: 1 }).lean();
  const since = dateKeyOffset(-89);
  const logs = await HabitLog.find({ userId, date: { $gte: since } }).lean();

  const byHabit = new Map<string, typeof logs>();
  for (const l of logs) {
    const k = String(l.habitId);
    if (!byHabit.has(k)) byHabit.set(k, []);
    byHabit.get(k)!.push(l);
  }

  return NextResponse.json(
    habits.map((h) => ({
      _id: String(h._id),
      name: h.name,
      kind: h.kind,
      target: h.target,
      targetTime: h.targetTime,
      order: h.order,
      recentLogs: (byHabit.get(String(h._id)) ?? []).map((l) => ({
        _id: String(l._id),
        habitId: String(l.habitId),
        date: l.date,
        value: l.value,
        time: l.time,
        note: l.note,
      })),
    }))
  );
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const kind = body?.kind as HabitKind;
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const doc: Record<string, unknown> = { userId, name, kind };
  if (kind === "count") {
    const target = Number(body?.target);
    if (!Number.isFinite(target) || target < 1) {
      return NextResponse.json({ error: "Target must be >= 1" }, { status: 400 });
    }
    doc.target = Math.min(Math.floor(target), 99);
  }
  if (kind === "time") {
    const t = typeof body?.targetTime === "string" ? body.targetTime : "";
    if (!isValidTime(t)) {
      return NextResponse.json({ error: "Invalid targetTime (HH:MM)" }, { status: 400 });
    }
    doc.targetTime = t;
  }

  await dbConnect();
  const count = await Habit.countDocuments({ userId });
  doc.order = count;
  const h = await Habit.create(doc);
  return NextResponse.json({
    _id: String(h._id),
    name: h.name,
    kind: h.kind,
    target: h.target,
    targetTime: h.targetTime,
    order: h.order,
    recentLogs: [],
  });
}
