import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import PomodoroSession from "@/lib/models/PomodoroSession";
import { requireUserId } from "@/lib/session";
import type { PomoItemType } from "@/types";

const VALID: PomoItemType[] = ["task", "habit", "process", "other"];

function serialize(p: Record<string, unknown>) {
  return {
    _id: String(p._id),
    itemType: p.itemType,
    itemId: p.itemId,
    itemName: p.itemName,
    startedAt: p.startedAt instanceof Date ? p.startedAt.toISOString() : p.startedAt,
    endedAt: p.endedAt instanceof Date ? p.endedAt.toISOString() : p.endedAt,
    durationSec: p.durationSec,
    plannedSec: p.plannedSec,
    completed: p.completed,
  };
}

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "200"), 500);
  await dbConnect();
  const list = await PomodoroSession.find({ userId }).sort({ startedAt: -1 }).limit(limit).lean();
  return NextResponse.json(list.map(serialize));
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const itemType = body?.itemType as PomoItemType;
  if (!VALID.includes(itemType)) {
    return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
  }
  const itemName = typeof body?.itemName === "string" ? body.itemName.trim().slice(0, 200) : "";
  if (!itemName) return NextResponse.json({ error: "itemName required" }, { status: 400 });

  const startedAt = new Date(body?.startedAt);
  const endedAt = new Date(body?.endedAt);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return NextResponse.json({ error: "Invalid timestamps" }, { status: 400 });
  }
  const durationSec = Math.max(0, Math.floor(Number(body?.durationSec ?? 0)));
  const plannedSec = Math.max(1, Math.floor(Number(body?.plannedSec ?? durationSec)));
  // Reject sessions of <30s — usually accidental cancels we don't want polluting stats.
  if (durationSec < 30) {
    return NextResponse.json({ error: "Session too short to record" }, { status: 400 });
  }
  const completed = !!body?.completed;
  const itemId = typeof body?.itemId === "string" ? body.itemId : undefined;

  await dbConnect();
  const doc = await PomodoroSession.create({
    userId,
    itemType,
    itemId,
    itemName,
    startedAt,
    endedAt,
    durationSec,
    plannedSec,
    completed,
  });
  return NextResponse.json(serialize(doc.toObject()));
}
