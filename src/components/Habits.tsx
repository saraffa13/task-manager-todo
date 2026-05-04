"use client";
import { useEffect, useState } from "react";
import Header from "./Header";
import type { HabitDTO, HabitKind, HabitLogDTO } from "@/types";
import {
  avgEarliestTime,
  avgPerActiveDay,
  completionRate,
  countForDate,
  currentStreak,
  dateKeyOffset,
  earliestTimeForDate,
  isDateSuccess,
  isValidTime,
  longestStreak,
  todayKey,
} from "@/lib/habits";

export default function Habits({ userEmail }: { userEmail: string }) {
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [logTarget, setLogTarget] = useState<HabitDTO | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailHabit = detailId ? habits.find((h) => h._id === detailId) ?? null : null;

  async function load() {
    setLoading(true);
    const res = await fetch("/api/habits");
    if (res.ok) setHabits(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteHabit(id: string) {
    if (!confirm("Delete this habit and all its logs?")) return;
    const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
    if (res.ok) setHabits((prev) => prev.filter((h) => h._id !== id));
  }

  async function deleteLog(habitId: string, logId: string) {
    const res = await fetch(`/api/habits/${habitId}/log?logId=${logId}`, { method: "DELETE" });
    if (res.ok) {
      setHabits((prev) =>
        prev.map((h) =>
          h._id === habitId
            ? { ...h, recentLogs: h.recentLogs.filter((l) => l._id !== logId) }
            : h
        )
      );
    }
  }

  async function quickLog(habit: HabitDTO) {
    if (habit.kind === "time") {
      setLogTarget(habit);
      return;
    }
    const res = await fetch(`/api/habits/${habit._id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const log: HabitLogDTO = await res.json();
      setHabits((prev) =>
        prev.map((h) =>
          h._id === habit._id ? { ...h, recentLogs: [...h.recentLogs, log] } : h
        )
      );
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Header email={userEmail} />
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-nav">Habit Tracker</h2>
          <button
            onClick={() => setCreating(true)}
            className="text-sm bg-accent text-nav font-semibold px-3 py-1.5 rounded-lg hover:opacity-90"
          >
            + New habit
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : habits.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
            No habits yet. Click <span className="font-semibold">New habit</span> to start tracking.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {habits.map((h) => (
              <HabitCard
                key={h._id}
                habit={h}
                onLog={() => quickLog(h)}
                onOpenLog={() => setLogTarget(h)}
                onOpenDetail={() => setDetailId(h._id)}
                onDelete={() => deleteHabit(h._id)}
              />
            ))}
          </div>
        )}
      </main>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={(h) => {
            setHabits((prev) => [...prev, h]);
            setCreating(false);
          }}
        />
      )}
      {detailHabit && (
        <HabitDetailModal
          habit={detailHabit}
          onClose={() => setDetailId(null)}
          onDeleteLog={(logId) => deleteLog(detailHabit._id, logId)}
          onDeleteHabit={async () => {
            await deleteHabit(detailHabit._id);
            setDetailId(null);
          }}
        />
      )}
      {logTarget && (
        <LogModal
          habit={logTarget}
          onClose={() => setLogTarget(null)}
          onLogged={(log) => {
            setHabits((prev) =>
              prev.map((h) =>
                h._id === logTarget._id ? { ...h, recentLogs: [...h.recentLogs, log] } : h
              )
            );
            setLogTarget(null);
          }}
        />
      )}
    </div>
  );
}

function HabitCard({
  habit,
  onLog,
  onOpenLog,
  onOpenDetail,
  onDelete,
}: {
  habit: HabitDTO;
  onLog: () => void;
  onOpenLog: () => void;
  onOpenDetail: () => void;
  onDelete: () => void;
}) {
  const today = todayKey();
  const streak = currentStreak(habit.kind, habit.recentLogs, habit.target, habit.targetTime);
  const successToday = isDateSuccess(
    habit.kind,
    today,
    habit.recentLogs,
    habit.target,
    habit.targetTime
  );

  const days = Array.from({ length: 7 }, (_, i) => dateKeyOffset(-(6 - i)));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onOpenDetail}
          className="min-w-0 text-left flex-1 hover:opacity-80"
          title="View report"
        >
          <div className="font-semibold text-nav break-words">{habit.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            <KindLabel habit={habit} />
          </div>
        </button>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0"
          title="Delete habit"
          aria-label="Delete habit"
        >
          ×
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TodayStatus habit={habit} success={successToday} />
        <div className="text-right">
          <div className="text-2xl font-bold text-accent leading-none">{streak}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">day streak</div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {days.map((d) => {
          const isToday = d === today;
          let intensity = 0;
          if (habit.kind === "count") {
            const c = countForDate(habit.recentLogs, d);
            intensity = Math.min(c / (habit.target ?? 1), 1);
          } else {
            intensity = isDateSuccess(
              habit.kind,
              d,
              habit.recentLogs,
              habit.target,
              habit.targetTime
            )
              ? 1
              : 0;
          }
          const c = countForDate(habit.recentLogs, d);
          const title =
            habit.kind === "count" ? `${d} · ${c}/${habit.target ?? 1}` : d;
          return (
            <div
              key={d}
              title={title}
              className={`flex-1 h-2.5 rounded-full ${
                isToday ? "ring-2 ring-nav/20" : ""
              }`}
              style={{ backgroundColor: barColor(intensity) }}
            />
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onLog}
          className="flex-1 bg-nav text-white text-sm py-1.5 rounded-lg hover:bg-navlight"
        >
          {habit.kind === "time" ? "Log time" : successToday ? "Log again" : "Log today"}
        </button>
        {habit.kind !== "time" && (
          <button
            onClick={onOpenLog}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-accent"
            title="Log with note"
          >
            …
          </button>
        )}
      </div>
    </div>
  );
}

function KindLabel({ habit }: { habit: HabitDTO }) {
  if (habit.kind === "check") return <>Daily check-in</>;
  if (habit.kind === "count") return <>Goal: {habit.target ?? 1}× per day</>;
  if (habit.kind === "time") return <>By {habit.targetTime ?? "—"}</>;
  return null;
}

function TodayStatus({ habit, success }: { habit: HabitDTO; success: boolean }) {
  const today = todayKey();
  if (habit.kind === "check") {
    return (
      <div className="text-sm">
        {success ? (
          <span className="text-accent font-semibold">✓ Done today</span>
        ) : (
          <span className="text-gray-500">Not yet today</span>
        )}
      </div>
    );
  }
  if (habit.kind === "count") {
    const c = countForDate(habit.recentLogs, today);
    return (
      <div className="text-sm">
        <span className={success ? "text-accent font-semibold" : "text-nav font-semibold"}>
          {c}
        </span>
        <span className="text-gray-500"> of {habit.target ?? 1} today</span>
      </div>
    );
  }
  if (habit.kind === "time") {
    const t = earliestTimeForDate(habit.recentLogs, today);
    if (!t) return <div className="text-sm text-gray-500">Not logged today</div>;
    return (
      <div className="text-sm">
        <span className={success ? "text-accent font-semibold" : "text-red-500 font-semibold"}>
          {t}
        </span>
        <span className="text-gray-500"> {success ? "✓" : "✗"} target {habit.targetTime}</span>
      </div>
    );
  }
  return null;
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (h: HabitDTO) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<HabitKind>("check");
  const [target, setTarget] = useState(2);
  const [targetTime, setTargetTime] = useState("06:00");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    if (kind === "time" && !isValidTime(targetTime)) {
      setError("Time must be HH:MM");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        kind,
        target: kind === "count" ? target : undefined,
        targetTime: kind === "time" ? targetTime : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed");
      return;
    }
    onCreated(await res.json());
  }

  return (
    <ModalShell onClose={onClose} title="New habit">
      <label className="block text-sm">
        <span className="text-gray-600">Name</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pomodoro session"
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
        />
      </label>

      <div className="text-sm">
        <span className="text-gray-600">Type</span>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {(["check", "count", "time"] as HabitKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-2 py-2 text-xs rounded-lg border ${
                kind === k
                  ? "bg-nav text-white border-nav"
                  : "bg-white text-gray-600 border-gray-200 hover:border-accent"
              }`}
            >
              {k === "check" ? "Check-in" : k === "count" ? "Count/day" : "By time"}
            </button>
          ))}
        </div>
      </div>

      {kind === "count" && (
        <label className="block text-sm">
          <span className="text-gray-600">Daily target</span>
          <input
            type="number"
            min={1}
            max={99}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
          />
        </label>
      )}
      {kind === "time" && (
        <label className="block text-sm">
          <span className="text-gray-600">Target time (must be at or before)</span>
          <input
            type="time"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
          />
        </label>
      )}

      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="text-sm px-3 py-1.5 text-gray-500 hover:text-nav">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="text-sm px-3 py-1.5 rounded-lg bg-accent text-nav font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create"}
        </button>
      </div>
    </ModalShell>
  );
}

function LogModal({
  habit,
  onClose,
  onLogged,
}: {
  habit: HabitDTO;
  onClose: () => void;
  onLogged: (log: HabitLogDTO) => void;
}) {
  const [value, setValue] = useState(1);
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (habit.kind === "time" && !isValidTime(time)) {
      setError("Time must be HH:MM");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {};
    if (habit.kind === "count") body.value = value;
    if (habit.kind === "time") body.time = time;
    if (note.trim()) body.note = note.trim();
    const res = await fetch(`/api/habits/${habit._id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed");
      return;
    }
    onLogged(await res.json());
  }

  return (
    <ModalShell onClose={onClose} title={`Log: ${habit.name}`}>
      {habit.kind === "count" && (
        <label className="block text-sm">
          <span className="text-gray-600">Count</span>
          <input
            type="number"
            min={1}
            max={99}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
          />
        </label>
      )}
      {habit.kind === "time" && (
        <label className="block text-sm">
          <span className="text-gray-600">Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
          />
        </label>
      )}
      <label className="block text-sm">
        <span className="text-gray-600">Note (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent resize-none"
        />
      </label>

      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="text-sm px-3 py-1.5 text-gray-500 hover:text-nav">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="text-sm px-3 py-1.5 rounded-lg bg-accent text-nav font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Log it"}
        </button>
      </div>
    </ModalShell>
  );
}

function HabitDetailModal({
  habit,
  onClose,
  onDeleteLog,
  onDeleteHabit,
}: {
  habit: HabitDTO;
  onClose: () => void;
  onDeleteLog: (logId: string) => void;
  onDeleteHabit: () => void;
}) {
  const today = todayKey();
  const cur = currentStreak(habit.kind, habit.recentLogs, habit.target, habit.targetTime);
  const best = longestStreak(habit.kind, habit.recentLogs, habit.target, habit.targetTime);
  const rate30 = completionRate(habit.kind, habit.recentLogs, habit.target, habit.targetTime, 30);
  const totalLogs = habit.recentLogs.length;

  // Build a 12-week × 7-day grid (oldest column first), aligned so today is in the rightmost column.
  const WEEKS = 12;
  const cells: { date: string; success: boolean; intensity: number }[][] = [];
  // Find today's day-of-week and shift the start so the latest column is "today".
  for (let w = WEEKS - 1; w >= 0; w--) {
    const col: { date: string; success: boolean; intensity: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const offset = w * 7 + d;
      const date = dateKeyOffset(-offset);
      const success = isDateSuccess(
        habit.kind,
        date,
        habit.recentLogs,
        habit.target,
        habit.targetTime
      );
      let intensity = success ? 1 : 0;
      if (habit.kind === "count") {
        const c = countForDate(habit.recentLogs, date);
        const t = habit.target ?? 1;
        intensity = Math.min(c / t, 1);
      }
      col.push({ date, success, intensity });
    }
    cells.push(col);
  }

  // Recent logs: newest first
  const recent = [...habit.recentLogs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 25);

  return (
    <ModalShell title={habit.name} onClose={onClose}>
      <div className="text-xs text-gray-500 -mt-1">
        <KindLabel habit={habit} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Current streak" value={`${cur}d`} accent />
        <Stat label="Longest (90d)" value={`${best}d`} />
        <Stat label="30d rate" value={`${rate30}%`} />
        <Stat label="Total logs" value={String(totalLogs)} />
      </div>

      {habit.kind === "count" && (
        <div className="text-xs text-gray-500">
          Avg per active day (30d):{" "}
          <span className="text-nav font-semibold">
            {avgPerActiveDay(habit.recentLogs, 30)} / {habit.target ?? 1}
          </span>
        </div>
      )}
      {habit.kind === "time" && (
        <div className="text-xs text-gray-500">
          Avg log time (30d):{" "}
          <span className="text-nav font-semibold">
            {avgEarliestTime(habit.recentLogs, 30) ?? "—"}
          </span>{" "}
          · target {habit.targetTime}
        </div>
      )}

      <div>
        <div className="text-xs text-gray-500 mb-1">Last 12 weeks</div>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {cells.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((c) => (
                <div
                  key={c.date}
                  title={`${c.date}${c.success ? " ✓" : ""}`}
                  className={`w-3 h-3 rounded-sm ${cellClass(c.intensity, c.date === today)}`}
                  style={cellStyle(c.intensity)}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm" style={cellStyle(0)} />
          <div className="w-3 h-3 rounded-sm" style={cellStyle(0.3)} />
          <div className="w-3 h-3 rounded-sm" style={cellStyle(0.6)} />
          <div className="w-3 h-3 rounded-sm" style={cellStyle(1)} />
          <span>More</span>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-1">Recent logs</div>
        {recent.length === 0 ? (
          <div className="text-sm text-gray-400 italic">No logs yet</div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
            {recent.map((l) => (
              <li key={l._id} className="flex items-start justify-between gap-2 px-2 py-1.5 text-xs">
                <div className="min-w-0">
                  <div className="text-nav font-medium">
                    {l.date}
                    {l.time ? ` · ${l.time}` : ""}
                    {habit.kind === "count" ? ` · +${l.value ?? 1}` : ""}
                  </div>
                  {l.note && (
                    <div className="text-gray-500 break-words whitespace-pre-wrap">{l.note}</div>
                  )}
                </div>
                <button
                  onClick={() => onDeleteLog(l._id)}
                  className="text-gray-300 hover:text-red-500 flex-shrink-0"
                  title="Delete log"
                  aria-label="Delete log"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end pt-1 border-t border-gray-100 mt-1">
        <button
          onClick={onDeleteHabit}
          className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"
        >
          Delete habit
        </button>
      </div>
    </ModalShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-accent" : "text-nav"}`}>{value}</div>
    </div>
  );
}

// Accent color is #2dd4bf (teal-400). We compose the alpha at render time so
// Tailwind's JIT scanner can't miss the class names.
function barColor(intensity: number): string {
  if (intensity <= 0) return "#e5e7eb"; // gray-200
  const alpha = Math.max(0.25, Math.min(1, intensity));
  return `rgba(45, 212, 191, ${alpha})`;
}

function cellClass(intensity: number, isToday: boolean): string {
  return isToday ? "ring-1 ring-nav/40" : "";
}

function cellStyle(intensity: number): React.CSSProperties {
  if (intensity <= 0) return { backgroundColor: "#f3f4f6" }; // gray-100
  const alpha = Math.max(0.25, Math.min(1, intensity));
  return { backgroundColor: `rgba(45, 212, 191, ${alpha})` };
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md p-4 sm:p-5 flex flex-col gap-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-nav">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-nav text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
