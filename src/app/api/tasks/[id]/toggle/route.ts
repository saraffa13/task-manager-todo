import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/lib/models/Task";
import { requireUserId } from "@/lib/session";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const task = await Task.findOne({ _id: params.id, userId });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const newState = !task.completed;
  await setCompletedRecursive(params.id, userId, newState);
  // Walk up: if all siblings of parent are now complete (or incomplete), update parent.
  if (task.parentId) await reconcileAncestors(String(task.parentId), userId);
  return NextResponse.json({ ok: true, completed: newState });
}

async function setCompletedRecursive(id: string, userId: string, completed: boolean) {
  await Task.updateOne({ _id: id, userId }, { completed });
  const children = await Task.find({ parentId: id, userId }).select("_id").lean();
  for (const c of children) await setCompletedRecursive(String(c._id), userId, completed);
}

async function reconcileAncestors(parentId: string, userId: string) {
  let current = await Task.findOne({ _id: parentId, userId });
  while (current) {
    const children = await Task.find({ parentId: current._id, userId }).select("completed").lean();
    const allDone = children.length > 0 && children.every((c) => c.completed);
    const shouldBe = allDone;
    if (current.completed !== shouldBe) {
      current.completed = shouldBe;
      await current.save();
    }
    if (!current.parentId) break;
    current = await Task.findOne({ _id: current.parentId, userId });
  }
}
