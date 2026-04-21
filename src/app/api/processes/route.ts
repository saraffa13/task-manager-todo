import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Process from "@/lib/models/Process";
import { requireUserId } from "@/lib/session";
import { parseImportPayload, sanitizeProcessTree, serializeTree } from "@/lib/processes";

function randId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const list = await Process.find({ userId }).sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json(
    list.map((p) => ({
      _id: String(p._id),
      name: p.name,
      order: p.order,
      root: serializeTree(p.root),
    }))
  );
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Import mode — full payload with `steps` or `root` gets normalized to a
  // process tree. Falls through to the plain-create branch if neither is set.
  if (body && (body.root !== undefined || Array.isArray(body.steps))) {
    const parsed = parseImportPayload(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await dbConnect();
    const count = await Process.countDocuments({ userId });
    const p = await Process.create({
      userId,
      name: parsed.name,
      order: count,
      root: parsed.root,
    });
    return NextResponse.json({
      _id: String(p._id),
      name: p.name,
      order: p.order,
      root: serializeTree(p.root),
    });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  await dbConnect();
  const count = await Process.countDocuments({ userId });
  // New processes start with a root node labeled with the process name so the
  // mindmap has something visible immediately.
  const root = { id: randId(), label: name, detail: "", children: [] };
  const p = await Process.create({ userId, name, order: count, root });
  return NextResponse.json({
    _id: String(p._id),
    name: p.name,
    order: p.order,
    root: serializeTree(p.root),
  });
}
