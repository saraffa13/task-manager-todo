import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Habit from "@/lib/models/Habit";
import HabitLog from "@/lib/models/HabitLog";
import { requireUserId } from "@/lib/session";
import { isValidTime, todayKey } from "@/lib/habits";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  await dbConnect();
  const habit = await Habit.findOne({ _id: params.id, userId }).lean();
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : todayKey();

  const doc: Record<string, unknown> = { userId, habitId: habit._id, date };

  if (habit.kind === "count") {
    const v = Number(body?.value ?? 1);
    doc.value = Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), 99) : 1;
  }
  if (habit.kind === "time") {
    const t = typeof body?.time === "string" ? body.time : "";
    if (!isValidTime(t)) {
      return NextResponse.json({ error: "Invalid time (HH:MM)" }, { status: 400 });
    }
    doc.time = t;
  }
  if (typeof body?.note === "string" && body.note.trim()) {
    doc.note = body.note.trim().slice(0, 500);
  }

  const log = await HabitLog.create(doc);
  return NextResponse.json({
    _id: String(log._id),
    habitId: String(log.habitId),
    date: log.date,
    value: log.value,
    time: log.time,
    note: log.note,
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const logId = url.searchParams.get("logId");
  if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });
  await dbConnect();
  await HabitLog.deleteOne({ _id: logId, habitId: params.id, userId });
  return NextResponse.json({ ok: true });
}
