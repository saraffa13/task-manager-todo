import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { requireUserId } from "@/lib/session";

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { order } = await req.json();
  if (!Array.isArray(order)) return NextResponse.json({ error: "order must be array" }, { status: 400 });
  await dbConnect();
  await Promise.all(
    order.map((id: string, idx: number) =>
      Workspace.updateOne({ _id: id, userId }, { order: idx })
    )
  );
  return NextResponse.json({ ok: true });
}
