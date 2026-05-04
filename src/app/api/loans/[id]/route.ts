import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Loan from "@/lib/models/Loan";
import { requireUserId } from "@/lib/session";
import { sanitizeScreenshot } from "@/lib/loans";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (typeof body.borrower === "string" && body.borrower.trim()) {
    update.borrower = body.borrower.trim().slice(0, 200);
  }
  if (body.amount !== undefined) {
    const a = Number(body.amount);
    if (!Number.isFinite(a) || a <= 0) {
      return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
    }
    update.amount = a;
  }
  if (typeof body.currency === "string" && body.currency.trim()) {
    update.currency = body.currency.trim().slice(0, 8).toUpperCase();
  }
  if (body.lentAt) {
    const d = new Date(body.lentAt);
    if (!Number.isNaN(d.getTime())) update.lentAt = d;
  }
  if (body.dueAt !== undefined) {
    if (body.dueAt === null || body.dueAt === "") {
      update.dueAt = null;
    } else {
      const d = new Date(body.dueAt);
      if (!Number.isNaN(d.getTime())) update.dueAt = d;
    }
  }
  if (typeof body.note === "string") update.note = body.note.trim().slice(0, 1000);
  if (body.screenshot !== undefined) {
    if (body.screenshot === null || body.screenshot === "") {
      update.screenshot = null;
    } else {
      const s = sanitizeScreenshot(body.screenshot);
      if (!s) return NextResponse.json({ error: "Invalid screenshot" }, { status: 400 });
      update.screenshot = s;
    }
  }
  if (body.status === "outstanding" || body.status === "repaid") {
    update.status = body.status;
    update.repaidAt = body.status === "repaid" ? new Date() : null;
  }

  await dbConnect();
  const loan = await Loan.findOneAndUpdate({ _id: params.id, userId }, update, { new: true });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  await Loan.deleteOne({ _id: params.id, userId });
  return NextResponse.json({ ok: true });
}
