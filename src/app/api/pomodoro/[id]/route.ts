import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import PomodoroSession from "@/lib/models/PomodoroSession";
import { requireUserId } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  await PomodoroSession.deleteOne({ _id: params.id, userId });
  return NextResponse.json({ ok: true });
}
