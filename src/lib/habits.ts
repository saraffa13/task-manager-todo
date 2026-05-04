import type { HabitKind, HabitLogDTO } from "@/types";

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKeyOffset(days: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

// Sum count-habit logs for a given date
export function logsForDate(logs: HabitLogDTO[], date: string): HabitLogDTO[] {
  return logs.filter((l) => l.date === date);
}

export function countForDate(logs: HabitLogDTO[], date: string): number {
  return logsForDate(logs, date).reduce((sum, l) => sum + (l.value ?? 1), 0);
}

// Earliest time logged on a date, e.g. wake-up time
export function earliestTimeForDate(logs: HabitLogDTO[], date: string): string | null {
  const times = logsForDate(logs, date)
    .map((l) => l.time)
    .filter((t): t is string => !!t)
    .sort();
  return times[0] ?? null;
}

export function isDateSuccess(
  kind: HabitKind,
  date: string,
  logs: HabitLogDTO[],
  target?: number,
  targetTime?: string
): boolean {
  if (kind === "check") {
    return logsForDate(logs, date).length > 0;
  }
  if (kind === "count") {
    return countForDate(logs, date) >= (target ?? 1);
  }
  if (kind === "time") {
    const t = earliestTimeForDate(logs, date);
    if (!t || !targetTime) return false;
    return t <= targetTime;
  }
  return false;
}

// Counts back from today; today is included only if already successful.
export function currentStreak(
  kind: HabitKind,
  logs: HabitLogDTO[],
  target?: number,
  targetTime?: string
): number {
  let streak = 0;
  let i = 0;
  // If today not yet successful, start from yesterday so the streak doesn't reset prematurely.
  if (!isDateSuccess(kind, dateKeyOffset(0), logs, target, targetTime)) {
    i = 1;
  }
  while (true) {
    const date = dateKeyOffset(-i);
    if (isDateSuccess(kind, date, logs, target, targetTime)) {
      streak++;
      i++;
    } else {
      break;
    }
  }
  return streak;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export function isValidTime(s: string): boolean {
  return HHMM.test(s);
}

export function longestStreak(
  kind: HabitKind,
  logs: HabitLogDTO[],
  target?: number,
  targetTime?: string,
  windowDays = 90
): number {
  let best = 0;
  let run = 0;
  for (let i = windowDays - 1; i >= 0; i--) {
    const date = dateKeyOffset(-i);
    if (isDateSuccess(kind, date, logs, target, targetTime)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

export function completionRate(
  kind: HabitKind,
  logs: HabitLogDTO[],
  target?: number,
  targetTime?: string,
  windowDays = 30
): number {
  let hits = 0;
  for (let i = 0; i < windowDays; i++) {
    if (isDateSuccess(kind, dateKeyOffset(-i), logs, target, targetTime)) hits++;
  }
  return Math.round((hits / windowDays) * 100);
}

// For count habits: average daily count over last N days (only counted days with at least 1 log)
export function avgPerActiveDay(logs: HabitLogDTO[], windowDays = 30): number {
  const counts = new Map<string, number>();
  for (let i = 0; i < windowDays; i++) {
    counts.set(dateKeyOffset(-i), 0);
  }
  for (const l of logs) {
    if (counts.has(l.date)) counts.set(l.date, counts.get(l.date)! + (l.value ?? 1));
  }
  const active = Array.from(counts.values()).filter((v) => v > 0);
  if (active.length === 0) return 0;
  const sum = active.reduce((a, b) => a + b, 0);
  return Math.round((sum / active.length) * 10) / 10;
}

// For time habits: average earliest-log time across days where one was logged
export function avgEarliestTime(logs: HabitLogDTO[], windowDays = 30): string | null {
  const byDate = new Map<string, string>();
  for (const l of logs) {
    if (!l.time) continue;
    const cur = byDate.get(l.date);
    if (!cur || l.time < cur) byDate.set(l.date, l.time);
  }
  const minutes: number[] = [];
  for (let i = 0; i < windowDays; i++) {
    const t = byDate.get(dateKeyOffset(-i));
    if (!t) continue;
    const [h, m] = t.split(":").map(Number);
    minutes.push(h * 60 + m);
  }
  if (minutes.length === 0) return null;
  const avg = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);
  const h = String(Math.floor(avg / 60)).padStart(2, "0");
  const m = String(avg % 60).padStart(2, "0");
  return `${h}:${m}`;
}
