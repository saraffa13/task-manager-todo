"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PomoItemRef, PomoItemType } from "@/types";

interface ActiveTimer {
  startedAt: number; // ms epoch
  plannedSec: number;
  item: PomoItemRef;
}

interface Ctx {
  active: ActiveTimer | null;
  remainingSec: number;
  start: (item: PomoItemRef, plannedSec: number) => void;
  cancel: () => void; // discard, no save
  stop: () => Promise<void>; // save what was done so far (if >=30s)
}

const PomoCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "pomo-active-v1";

export function usePomodoro() {
  const ctx = useContext(PomoCtx);
  if (!ctx) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return ctx;
}

export default function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef(false);

  // Restore on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ActiveTimer;
        // Drop stale timers that already expired more than 1h ago.
        const elapsed = (Date.now() - parsed.startedAt) / 1000;
        if (elapsed < parsed.plannedSec + 3600) {
          setActive(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Tick loop
  useEffect(() => {
    if (!active) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      setRemainingSec(0);
      return;
    }
    function compute() {
      if (!active) return;
      const elapsed = Math.floor((Date.now() - active.startedAt) / 1000);
      const remaining = Math.max(0, active.plannedSec - elapsed);
      setRemainingSec(remaining);
      if (remaining === 0 && !autoStopRef.current) {
        autoStopRef.current = true;
        finish(true).catch(() => {
          autoStopRef.current = false;
        });
      }
    }
    compute();
    tickRef.current = setInterval(compute, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const persist = useCallback((t: ActiveTimer | null) => {
    if (typeof window === "undefined") return;
    if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const start = useCallback(
    (item: PomoItemRef, plannedSec: number) => {
      const t: ActiveTimer = { startedAt: Date.now(), plannedSec, item };
      autoStopRef.current = false;
      setActive(t);
      persist(t);
    },
    [persist]
  );

  const finish = useCallback(
    async (completed: boolean) => {
      const cur = active;
      if (!cur) return;
      const endedAt = Date.now();
      const durationSec = Math.min(
        cur.plannedSec,
        Math.max(0, Math.floor((endedAt - cur.startedAt) / 1000))
      );
      setActive(null);
      persist(null);
      autoStopRef.current = false;
      if (completed) playChime();
      if (durationSec < 30) return; // server would reject anyway
      try {
        await fetch("/api/pomodoro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemType: cur.item.type,
            itemId: cur.item.id,
            itemName: cur.item.name,
            startedAt: new Date(cur.startedAt).toISOString(),
            endedAt: new Date(endedAt).toISOString(),
            durationSec,
            plannedSec: cur.plannedSec,
            completed,
          }),
        });
      } catch {
        // swallow; the alternative is annoying the user
      }
    },
    [active, persist]
  );

  const cancel = useCallback(() => {
    setActive(null);
    persist(null);
    autoStopRef.current = false;
  }, [persist]);

  const stop = useCallback(async () => {
    await finish(false);
  }, [finish]);

  const value = useMemo(
    () => ({ active, remainingSec, start, cancel, stop }),
    [active, remainingSec, start, cancel, stop]
  );

  return <PomoCtx.Provider value={value}>{children}</PomoCtx.Provider>;
}

// Synthesize a bell strike via Web Audio. A real bell has inharmonic partials
// — we mix a fundamental with 2.76x and 5.4x ratios (standard tubular-bell
// approximation) and give each a slow exponential decay for the lingering ring.
function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // Strike twice for a "ding-ding" bell effect.
    const strikes = [0, 0.55];
    const fundamental = 880; // A5
    const partials = [
      { ratio: 1, gain: 0.6, decay: 2.4 },
      { ratio: 2.76, gain: 0.35, decay: 1.6 },
      { ratio: 5.4, gain: 0.18, decay: 1.0 },
      { ratio: 8.93, gain: 0.08, decay: 0.6 },
    ];

    for (const t of strikes) {
      for (const p of partials) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = fundamental * p.ratio;
        const start = now + t;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(p.gain, start + 0.005); // sharp strike
        gain.gain.exponentialRampToValueAtTime(0.0001, start + p.decay);
        osc.connect(gain).connect(master);
        osc.start(start);
        osc.stop(start + p.decay + 0.05);
      }
    }
    setTimeout(() => ctx.close().catch(() => {}), 4000);
  } catch {
    // ignore
  }
}

export function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function pomoItemTypeLabel(t: PomoItemType): string {
  switch (t) {
    case "task":
      return "Task";
    case "habit":
      return "Habit";
    case "process":
      return "Process";
    case "other":
      return "Other";
  }
}
