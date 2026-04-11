"use client";
import { useEffect, useMemo, useState } from "react";
import type { Attachment, TaskDTO, TaskNode } from "@/types";
import TaskItem from "./TaskItem";
import AddTaskInput from "./AddTaskInput";

function buildTree(tasks: TaskDTO[]): TaskNode[] {
  const map = new Map<string, TaskNode>();
  tasks.forEach((t) => map.set(t._id, { ...t, children: [] }));
  const roots: TaskNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: TaskNode[]) => {
    arr.sort((a, b) => {
      const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return a.order - b.order;
    });
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function pruneToDepth(nodes: TaskNode[], maxDepth: number, current = 1): TaskNode[] {
  return nodes.map((n) => ({
    ...n,
    children: current >= maxDepth ? [] : pruneToDepth(n.children, maxDepth, current + 1),
  }));
}
function maxTreeDepth(nodes: TaskNode[]): number {
  let m = 0;
  for (const n of nodes) {
    const d = 1 + maxTreeDepth(n.children);
    if (d > m) m = d;
  }
  return m;
}

export default function TaskTree({ workspaceId }: { workspaceId: string }) {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDepth, setMaxDepth] = useState<number | "all">("all");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const tree = useMemo(() => buildTree(tasks), [tasks]);
  const treeDepth = useMemo(() => maxTreeDepth(tree), [tree]);
  const visibleTree = useMemo(
    () => (maxDepth === "all" ? tree : pruneToDepth(tree, maxDepth)),
    [tree, maxDepth]
  );

  async function addTask(
    text: string,
    parentId: string | null,
    attachments: Attachment[] = []
  ) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, workspaceId, parentId, attachments }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("Failed to create task", res.status, msg);
      alert(`Failed to create task (${res.status}). ${msg}`);
      return;
    }
    await load();
  }

  async function setAttachments(id: string, attachments: Attachment[]) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachments }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("Failed to update attachments", res.status, msg);
      alert(`Failed to save attachments (${res.status}). ${msg}`);
      return;
    }
    await load();
  }

  async function toggle(id: string) {
    await fetch(`/api/tasks/${id}/toggle`, { method: "PATCH" });
    await load();
  }

  async function edit(id: string, text: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await load();
  }

  async function setDeadline(id: string, deadline: string | null) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline }),
    });
    await load();
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <label className="text-xs text-gray-500">Show levels:</label>
        <select
          value={maxDepth === "all" ? "all" : String(maxDepth)}
          onChange={(e) =>
            setMaxDepth(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
        >
          <option value="all">All</option>
          {Array.from({ length: Math.max(treeDepth, 1) }, (_, i) => i + 1).map((lvl) => (
            <option key={lvl} value={lvl}>
              Up to {lvl}
            </option>
          ))}
        </select>
      </div>
      {tree.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">No tasks yet</p>
          <p className="text-sm">Add your first task below.</p>
        </div>
      ) : (
        visibleTree.map((t, i) => (
          <TaskItem
            key={t._id}
            task={t}
            depth={0}
            number={`${i + 1}`}
            onToggle={toggle}
            onEdit={edit}
            onDelete={remove}
            onAddChild={(pid, text, atts) => addTask(text, pid, atts)}
            onSetDeadline={setDeadline}
            onSetAttachments={setAttachments}
          />
        ))
      )}
      <div className="mt-4">
        <AddTaskInput onAdd={(text, atts) => addTask(text, null, atts)} />
      </div>
    </div>
  );
}
