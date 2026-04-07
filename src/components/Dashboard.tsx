"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Header from "./Header";
import WorkspaceTabBar from "./WorkspaceTabBar";
import TaskTree from "./TaskTree";
import type { Workspace } from "@/types";

export default function Dashboard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlWs = searchParams.get("ws");

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loaded, setLoaded] = useState(false);

  function navigateTo(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("ws", id);
    else params.delete("ws");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function loadWorkspaces() {
    const res = await fetch("/api/workspaces");
    if (res.ok) {
      const data: Workspace[] = await res.json();
      setWorkspaces(data);
      const exists = urlWs && data.some((w) => w._id === urlWs);
      if (!exists && data[0]) navigateTo(data[0]._id);
      else if (!data[0]) navigateTo(null);
    }
    setLoaded(true);
  }

  useEffect(() => {
    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeId = urlWs && workspaces.some((w) => w._id === urlWs) ? urlWs : null;
  const setActiveId = (id: string | null) => navigateTo(id);

  async function createWorkspace(name: string) {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const ws: Workspace = await res.json();
      setWorkspaces((prev) => [...prev, ws]);
      navigateTo(ws._id);
    }
  }

  async function renameWorkspace(id: string, name: string) {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setWorkspaces((prev) => prev.map((w) => (w._id === id ? { ...w, name } : w)));
    }
  }

  async function reorderWorkspaces(orderedIds: string[]) {
    // Optimistic update
    setWorkspaces((prev) => {
      const map = new Map(prev.map((w) => [w._id, w]));
      return orderedIds.map((id, idx) => ({ ...(map.get(id) as Workspace), order: idx }));
    });
    await fetch("/api/workspaces/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: orderedIds }),
    });
  }

  async function deleteWorkspace(id: string) {
    const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkspaces((prev) => {
        const next = prev.filter((w) => w._id !== id);
        if (activeId === id) navigateTo(next[0]?._id ?? null);
        return next;
      });
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Header email={userEmail} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {!loaded ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl mb-2">Welcome to TaskNest</p>
              <p className="text-sm">Create your first workspace using the + tab below.</p>
            </div>
          ) : activeId ? (
            <TaskTree key={activeId} workspaceId={activeId} />
          ) : null}
        </div>
      </main>
      <WorkspaceTabBar
        workspaces={workspaces}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={createWorkspace}
        onRename={renameWorkspace}
        onDelete={deleteWorkspace}
        onReorder={reorderWorkspaces}
      />
    </div>
  );
}
