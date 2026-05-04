"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { fmtClock, pomoItemTypeLabel, usePomodoro } from "./PomodoroProvider";
import type { PomoItemRef, PomoItemType } from "@/types";

const PRESETS = [
  { label: "25", sec: 25 * 60 },
  { label: "50", sec: 50 * 60 },
  { label: "5", sec: 5 * 60 },
];

const HIDE_PATHS = ["/login", "/register"];

export default function PomodoroFloating() {
  const { status } = useSession();
  const pathname = usePathname();
  const { active, remainingSec, start, stop, cancel } = usePomodoro();
  const [open, setOpen] = useState(false);

  if (status !== "authenticated") return null;
  if (HIDE_PATHS.includes(pathname)) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-4 right-4 z-40 shadow-lg rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2 transition ${
          active
            ? "bg-accent text-nav animate-pulse-soft"
            : "bg-nav text-white hover:bg-navlight"
        }`}
        title={active ? `${active.item.name} — ${fmtClock(remainingSec)}` : "Start pomodoro"}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-current opacity-80" />
        {active ? (
          <>
            <span className="font-mono">{fmtClock(remainingSec)}</span>
            <span className="hidden sm:inline truncate max-w-[160px]">{active.item.name}</span>
          </>
        ) : (
          <>Pomodoro</>
        )}
      </button>

      {open && (
        <div className="fixed bottom-16 right-4 z-40 w-[min(92vw,360px)] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex flex-col gap-3">
          {active ? (
            <RunningPanel
              name={active.item.name}
              type={active.item.type}
              remainingSec={remainingSec}
              plannedSec={active.plannedSec}
              onStop={async () => {
                await stop();
                setOpen(false);
              }}
              onCancel={() => {
                if (confirm("Cancel without saving?")) {
                  cancel();
                  setOpen(false);
                }
              }}
            />
          ) : (
            <IdlePanel
              onStart={(item, sec) => {
                start(item, sec);
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </>
  );
}

function RunningPanel({
  name,
  type,
  remainingSec,
  plannedSec,
  onStop,
  onCancel,
}: {
  name: string;
  type: PomoItemType;
  remainingSec: number;
  plannedSec: number;
  onStop: () => void;
  onCancel: () => void;
}) {
  const pct = ((plannedSec - remainingSec) / plannedSec) * 100;
  return (
    <>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400">
          {pomoItemTypeLabel(type)}
        </div>
        <div className="font-semibold text-nav break-words">{name}</div>
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold font-mono text-nav">{fmtClock(remainingSec)}</div>
        <div className="text-xs text-gray-400 mt-1">of {fmtClock(plannedSec)}</div>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onStop}
          className="flex-1 bg-accent text-nav font-semibold text-sm py-1.5 rounded-lg"
        >
          Stop & save
        </button>
        <button
          onClick={onCancel}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

function IdlePanel({
  onStart,
  onClose,
}: {
  onStart: (item: PomoItemRef, sec: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ type: PomoItemType; id?: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<PomoItemRef | null>(null);
  const [duration, setDuration] = useState(25 * 60);
  const [customMin, setCustomMin] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(q);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function runSearch(query: string) {
    setLoading(true);
    const res = await fetch(`/api/pomodoro/items?q=${encodeURIComponent(query)}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function go() {
    const sec = customMin ? Math.max(60, Math.floor(Number(customMin) * 60)) : duration;
    if (!Number.isFinite(sec) || sec < 60) return;
    const item: PomoItemRef =
      picked ?? { type: "other", name: q.trim() || "Task Name" };
    onStart(item, sec);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-nav">Start a pomodoro</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-nav text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tasks, habits, processes…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-accent"
      />

      <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-lg">
        {loading && items.length === 0 ? (
          <div className="p-2 text-xs text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-2 text-xs text-gray-400">No matches</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((it) => {
              const isPicked =
                picked?.type === it.type && picked?.id === it.id && picked?.name === it.name;
              return (
                <li key={`${it.type}-${it.id}-${it.name}`}>
                  <button
                    onClick={() => setPicked({ type: it.type, id: it.id, name: it.name })}
                    className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 ${
                      isPicked ? "bg-accent/15" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-[10px] uppercase text-gray-400 w-12 flex-shrink-0">
                      {it.type}
                    </span>
                    <span className="text-nav truncate">{it.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {q.trim() && !items.some((i) => i.name.toLowerCase() === q.trim().toLowerCase()) && (
        <button
          onClick={() => setPicked({ type: "other", name: q.trim() })}
          className={`text-left px-2 py-1.5 text-xs rounded border ${
            picked?.type === "other" && picked.name === q.trim()
              ? "bg-accent/15 border-accent"
              : "border-dashed border-gray-200 hover:border-accent"
          }`}
        >
          + Use “{q.trim()}” as ad-hoc focus
        </button>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Duration</div>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setDuration(p.sec);
                setCustomMin("");
              }}
              className={`text-xs px-3 py-1.5 rounded border ${
                !customMin && duration === p.sec
                  ? "bg-nav text-white border-nav"
                  : "bg-white text-gray-600 border-gray-200 hover:border-accent"
              }`}
            >
              {p.label} min
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={240}
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            placeholder="or enter minutes"
            className={`flex-1 text-sm px-3 py-1.5 border rounded-lg outline-none ${
              customMin ? "border-accent text-nav font-semibold" : "border-gray-200"
            }`}
          />
          <span className="text-xs text-gray-400">min</span>
        </div>
      </div>

      <button
        onClick={go}
        className="bg-accent text-nav font-semibold text-sm py-2 rounded-lg"
      >
        {picked
          ? `Start ${pomoItemTypeLabel(picked.type)}: ${picked.name}`
          : q.trim()
            ? `Start: ${q.trim()}`
            : "Start (Task Name)"}
      </button>
    </>
  );
}
