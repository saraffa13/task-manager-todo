import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Loan from "@/lib/models/Loan";
import { requireUserId } from "@/lib/session";
import { sanitizeScreenshot } from "@/lib/loans";

function serialize(p: Record<string, unknown>) {
  return {
    _id: String(p._id),
    borrower: p.borrower,
    amount: p.amount,
    currency: p.currency,
    lentAt: p.lentAt instanceof Date ? p.lentAt.toISOString() : p.lentAt,
    dueAt: p.dueAt instanceof Date ? p.dueAt.toISOString() : p.dueAt ?? null,
    note: p.note,
    screenshot: p.screenshot,
    status: p.status,
    repaidAt: p.repaidAt instanceof Date ? p.repaidAt.toISOString() : p.repaidAt ?? null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const list = await Loan.find({ userId }).sort({ status: 1, lentAt: -1 }).lean();
  return NextResponse.json(list.map(serialize));
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const borrower = typeof body?.borrower === "string" ? body.borrower.trim().slice(0, 200) : "";
  const amount = Number(body?.amount);
  if (!borrower) return NextResponse.json({ error: "Borrower required" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
  }

  const lentAt = body?.lentAt ? new Date(body.lentAt) : new Date();
  if (Number.isNaN(lentAt.getTime())) {
    return NextResponse.json({ error: "Invalid lentAt" }, { status: 400 });
  }
  let dueAt: Date | undefined;
  if (body?.dueAt) {
    const d = new Date(body.dueAt);
    if (!Number.isNaN(d.getTime())) dueAt = d;
  }

  const currency = typeof body?.currency === "string" && body.currency.trim()
    ? body.currency.trim().slice(0, 8).toUpperCase()
    : "INR";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : undefined;
  const screenshot = sanitizeScreenshot(body?.screenshot) ?? undefined;

  await dbConnect();
  const loan = await Loan.create({
    userId,
    borrower,
    amount,
    currency,
    lentAt,
    dueAt,
    note,
    screenshot,
    status: "outstanding",
  });
  return NextResponse.json(serialize(loan.toObject()));
}
