import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Habit from "@/lib/models/Habit";
import HabitLog from "@/lib/models/HabitLog";
import { requireUserId } from "@/lib/session";
import { isValidTime } from "@/lib/habits";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.target === "number" && body.target >= 1) {
    update.target = Math.min(Math.floor(body.target), 99);
  }
  if (typeof body.targetTime === "string" && isValidTime(body.targetTime)) {
    update.targetTime = body.targetTime;
  }
  await dbConnect();
  const h = await Habit.findOneAndUpdate({ _id: params.id, userId }, update, { new: true });
  if (!h) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  await Habit.deleteOne({ _id: params.id, userId });
  await HabitLog.deleteMany({ habitId: params.id, userId });
  return NextResponse.json({ ok: true });
}
