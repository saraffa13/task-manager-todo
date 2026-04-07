"use client";
import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import type { TaskDTO, Workspace } from "@/types";

type StatusFilter = "all" | "pending" | "completed";
type DateFilter = "all" | "overdue" | "today" | "week" | "none";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Overview({ userEmail }: { userEmail: string }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWs, setSelectedWs] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [wsRes, tRes] = await Promise.all([
      fetch("/api/workspaces"),
      fetch("/api/tasks"),
    ]);
    if (wsRes.ok) setWorkspaces(await wsRes.json());
    if (tRes.ok) setTasks(await tRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const wsMap = useMemo(() => {
    const m = new Map<string, string>();
    workspaces.forEach((w) => m.set(w._id, w.name));
    return m;
  }, [workspaces]);

  const depthMap = useMemo(() => {
    const byId = new Map<string, TaskDTO>();
    tasks.forEach((t) => byId.set(t._id, t));
    const cache = new Map<string, number>();
    const compute = (id: string): number => {
      if (cache.has(id)) return cache.get(id)!;
      const t = byId.get(id);
      if (!t || !t.parentId) {
        cache.set(id, 1);
        return 1;
      }
      const d = compute(t.parentId) + 1;
      cache.set(id, d);
      return d;
    };
    tasks.forEach((t) => compute(t._id));
    return cache;
  }, [tasks]);

  const maxDepthAvailable = useMemo(() => {
    let m = 1;
    depthMap.forEach((d) => {
      if (d > m) m = d;
    });
    return m;
  }, [depthMap]);

  const filtered = useMemo(() => {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const weekEnd = endOfDay(new Date(Date.now() + 6 * 86400000));
    const fromDate = from ? startOfDay(new Date(from)) : null;
    const toDate = to ? endOfDay(new Date(to)) : null;

    return tasks.filter((t) => {
      if (selectedLevels.size > 0 && !selectedLevels.has(depthMap.get(t._id) ?? 1)) return false;
      if (selectedWs.size > 0 && !selectedWs.has(t.workspaceId)) return false;
      if (status === "pending" && t.completed) return false;
      if (status === "completed" && !t.completed) return false;

      const dl = t.deadline ? new Date(t.deadline) : null;
      if (dateFilter === "none" && dl) return false;
      if (dateFilter === "overdue") {
        if (!dl || t.completed) return false;
        if (dl >= todayStart) return false;
      }
      if (dateFilter === "today") {
        if (!dl) return false;
        if (dl < todayStart || dl > todayEnd) return false;
      }
      if (dateFilter === "week") {
        if (!dl) return false;
        if (dl < todayStart || dl > weekEnd) return false;
      }
      if (fromDate && (!dl || dl < fromDate)) return false;
      if (toDate && (!dl || dl > toDate)) return false;

      return true;
    });
  }, [tasks, selectedWs, status, dateFilter, from, to, selectedLevels, depthMap]);

  const levelProgress = useMemo(() => {
    // Respect workspace filter so the breakdown matches the user's scope.
    const scoped = tasks.filter(
      (t) => selectedWs.size === 0 || selectedWs.has(t.workspaceId)
    );
    const buckets = new Map<number, { total: number; done: number }>();
    for (const t of scoped) {
      const lvl = depthMap.get(t._id) ?? 1;
      const b = buckets.get(lvl) ?? { total: 0, done: 0 };
      b.total += 1;
      if (t.completed) b.done += 1;
      buckets.set(lvl, b);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, b]) => ({ level, ...b }));
  }, [tasks, selectedWs, depthMap]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter(
      (t) => !t.completed && t.deadline && new Date(t.deadline) < startOfDay()
    ).length;
    const upcoming = tasks.filter(
      (t) => !t.completed && t.deadline && new Date(t.deadline) >= startOfDay()
    ).length;
    return { total, completed, overdue, upcoming };
  }, [tasks]);

  function toggleWs(id: string) {
    setSelectedWs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSelectedWs(new Set());
    setStatus("all");
    setDateFilter("all");
    setFrom("");
    setTo("");
    setSelectedLevels(new Set());
  }

  function toggleLevel(lvl: number) {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  }

  async function toggleTask(id: string) {
    await fetch(`/api/tasks/${id}/toggle`, { method: "PATCH" });
    await load();
  }

  return (
    <div className="h-screen flex flex-col">
      <Header email={userEmail} />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } md:block w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto`}
        >
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                Filters
              </h2>
              <button
                onClick={clearFilters}
                className="text-xs text-accent hover:underline"
              >
                Clear
              </button>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Status</h3>
              <div className="space-y-1">
                {(["all", "pending", "completed"] as StatusFilter[]).map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-accent"
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={status === s}
                      onChange={() => setStatus(s)}
                      className="accent-accent"
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Levels</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {Array.from({ length: Math.max(maxDepthAvailable, 1) }, (_, i) => i + 1).map(
                  (lvl) => (
                    <label
                      key={lvl}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:text-accent"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLevels.has(lvl)}
                        onChange={() => toggleLevel(lvl)}
                        className="accent-accent"
                      />
                      <span>Level {lvl}</span>
                    </label>
                  )
                )}
              </div>
              <p className="mt-2 text-[10px] text-gray-400">Leave empty to include all.</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Date</h3>
              <div className="space-y-1">
                {(
                  [
                    ["all", "All"],
                    ["overdue", "Overdue"],
                    ["today", "Today"],
                    ["week", "Next 7 days"],
                    ["none", "No deadline"],
                  ] as [DateFilter, string][]
                ).map(([k, label]) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-accent"
                  >
                    <input
                      type="radio"
                      name="date"
                      checked={dateFilter === k}
                      onChange={() => setDateFilter(k)}
                      className="accent-accent"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-[10px] uppercase text-gray-400 mb-0.5">
                    From
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-400 mb-0.5">
                    To
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Workspaces</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {workspaces.length === 0 && (
                  <p className="text-xs text-gray-400">No workspaces yet.</p>
                )}
                {workspaces.map((w) => (
                  <label
                    key={w._id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedWs.has(w._id)}
                      onChange={() => toggleWs(w._id)}
                      className="accent-accent"
                    />
                    <span className="truncate">{w.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                Leave empty to include all.
              </p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-nav">Dashboard</h2>
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="md:hidden text-sm bg-nav text-white px-3 py-1.5 rounded-lg"
              >
                {sidebarOpen ? "Hide" : "Filters"}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total" value={stats.total} />
              <StatCard label="Completed" value={stats.completed} tone="green" />
              <StatCard label="Upcoming" value={stats.upcoming} tone="teal" />
              <StatCard label="Overdue" value={stats.overdue} tone="red" />
            </div>

            {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-nav">Level progress</h3>
                <p className="text-xs text-gray-400">
                  Completion of tasks at each nesting level.
                </p>
              </div>
              {levelProgress.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">No tasks yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {levelProgress.map(({ level, total, done }) => {
                    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                    const allDone = total > 0 && done === total;
                    return (
                      <li key={level} className="px-4 py-3 flex items-center gap-3">
                        <span className="text-xs font-mono w-16 text-gray-500">
                          Level {level}
                        </span>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                allDone ? "bg-green-500" : "bg-accent"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium w-20 text-right ${
                            allDone ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {done}/{total} {allDone && "✓"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div> */}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-nav">
                  Tasks <span className="text-gray-400 font-normal">({filtered.length})</span>
                </h3>
              </div>
              {loading ? (
                <p className="p-6 text-sm text-gray-400">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-10 text-center text-gray-400 text-sm">
                  No tasks match these filters.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((t) => {
                    const overdue =
                      !t.completed &&
                      t.deadline &&
                      new Date(t.deadline) < startOfDay();
                    return (
                      <li
                        key={t._id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={() => toggleTask(t._id)}
                          className="w-5 h-5 accent-accent flex-shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm ${
                              t.completed ? "line-through opacity-50" : ""
                            }`}
                          >
                            {t.text}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {wsMap.get(t.workspaceId) ?? "—"}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            overdue
                              ? "bg-red-100 text-red-600"
                              : t.deadline
                              ? "bg-accent/15 text-teal-700"
                              : "text-gray-300"
                          }`}
                        >
                          {fmt(t.deadline)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "red" | "teal";
}) {
  const toneCls =
    tone === "green"
      ? "text-green-600"
      : tone === "red"
      ? "text-red-500"
      : tone === "teal"
      ? "text-teal-600"
      : "text-nav";
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}
