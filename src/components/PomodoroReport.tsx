"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Header";
import type { PomodoroSessionDTO } from "@/types";
import { pomoItemTypeLabel, usePomodoro } from "./PomodoroProvider";

function SessionRow({
  s,
  active,
  onStart,
  onDelete,
}: {
  s: PomodoroSessionDTO;
  active: boolean;
  onStart: (sec: number) => void;
  onDelete: () => void;
}) {
  const defaultMin = Math.max(1, Math.round((s.plannedSec || 25 * 60) / 60));
  const [min, setMin] = useState(String(defaultMin));
  return (
    <div className="p-3 flex items-start justify-between gap-2 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-nav font-medium break-words">{s.itemName}</div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400">
          {pomoItemTypeLabel(s.itemType)} · {fmtDateTime(s.startedAt)} ·{" "}
          {s.completed ? "completed" : "stopped early"}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-semibold text-nav">{fmtHM(s.durationSec)}</span>
        <input
          type="number"
          min={1}
          max={240}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          className="w-14 text-xs px-1.5 py-1 border border-gray-200 rounded outline-none focus:border-accent"
          title="Minutes for restart"
        />
        <span className="text-[10px] text-gray-400 -ml-1">min</span>
        <button
          onClick={() => {
            const m = Math.max(1, Math.min(240, Number(min) || defaultMin));
            onStart(m * 60);
          }}
          disabled={active}
          className="text-xs px-2 py-1 rounded bg-accent text-nav font-semibold disabled:opacity-40"
          title={active ? "A session is already running" : "Start with the chosen duration"}
        >
          ▶ Start
        </button>
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500"
          aria-label="Delete"
        >
          ×
        </button>
      </div>
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PomodoroReport({ userEmail }: { userEmail: string }) {
  const [sessions, setSessions] = useState<PomodoroSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { start, active } = usePomodoro();
  const wasActiveRef = useRef(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/pomodoro?limit=500");
    if (res.ok) setSessions(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Reload when a session finishes (active transitions from set to null)
  useEffect(() => {
    if (wasActiveRef.current && !active) {
      // Tiny delay to let the POST land before re-fetching
      setTimeout(load, 600);
    }
    wasActiveRef.current = !!active;
  }, [active]);

  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    const res = await fetch(`/api/pomodoro/${id}`, { method: "DELETE" });
    if (res.ok) setSessions((prev) => prev.filter((s) => s._id !== id));
  }

  const { todaySec, weekSec, allSec } = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const weekMs = now - 7 * DAY_MS;
    let t = 0,
      w = 0,
      a = 0;
    for (const s of sessions) {
      a += s.durationSec;
      const ts = new Date(s.startedAt).getTime();
      if (ts >= weekMs) w += s.durationSec;
      if (ts >= todayMs) t += s.durationSec;
    }
    return { todaySec: t, weekSec: w, allSec: a };
  }, [sessions]);

  // Per-item leaderboard for the last 30 days
  const leaderboard = useMemo(() => {
    const cutoff = Date.now() - 30 * DAY_MS;
    const map = new Map<string, { name: string; type: string; sec: number; count: number }>();
    for (const s of sessions) {
      if (new Date(s.startedAt).getTime() < cutoff) continue;
      const key = `${s.itemType}::${s.itemId ?? s.itemName}`;
      const cur = map.get(key);
      if (cur) {
        cur.sec += s.durationSec;
        cur.count += 1;
      } else {
        map.set(key, { name: s.itemName, type: s.itemType, sec: s.durationSec, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.sec - a.sec);
  }, [sessions]);

  return (
    <div className="h-screen flex flex-col">
      <Header email={userEmail} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-nav">Pomodoro report</h2>
          <button
            onClick={load}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-accent"
            title="Reload sessions"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          <Stat label="Today" value={fmtHM(todaySec)} accent />
          <Stat label="Last 7 days" value={fmtHM(weekSec)} />
          <Stat label="All-time" value={fmtHM(allSec)} />
        </div>

        <section className="mb-5">
          <h3 className="text-sm font-semibold text-nav mb-2">Top items (last 30 days)</h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">No sessions yet — start one from the floating pill.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {leaderboard.slice(0, 12).map((row, i) => {
                const max = leaderboard[0].sec || 1;
                const pct = (row.sec / max) * 100;
                return (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <div className="w-6 text-xs text-gray-400 text-right">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-nav font-medium break-words">{row.name}</div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">
                        {pomoItemTypeLabel(row.type as "task")} · {row.count} session
                        {row.count > 1 ? "s" : ""}
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-nav">{fmtHM(row.sec)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-nav mb-2">Recent sessions</h3>
          {loading ? null : sessions.length === 0 ? null : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {sessions.slice(0, 30).map((s) => (
                <SessionRow
                  key={s._id}
                  s={s}
                  active={!!active}
                  onStart={(sec) =>
                    start({ type: s.itemType, id: s.itemId, name: s.itemName }, sec)
                  }
                  onDelete={() => deleteSession(s._id)}
                />
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
      <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-base sm:text-xl font-bold mt-1 ${accent ? "text-accent" : "text-nav"}`}>
        {value}
      </div>
    </div>
  );
}

function fmtHM(sec: number) {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
