"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Header";
import type { LoanDTO, LoanDirection, LoanStatus } from "@/types";
import { MAX_SCREENSHOT_BYTES, isImageDataUrl } from "@/lib/loans";

type Filter = "all" | "outstanding" | "repaid";
type DirFilter = "all" | "lent" | "borrowed";

export default function Loans({ userEmail }: { userEmail: string }) {
  const [loans, setLoans] = useState<LoanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("outstanding");
  const [dirFilter, setDirFilter] = useState<DirFilter>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LoanDTO | null>(null);
  const [viewing, setViewing] = useState<LoanDTO | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/loans");
    if (res.ok) setLoans(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return loans.filter((l) => {
      const dir = (l.direction ?? "lent") as LoanDirection;
      if (dirFilter !== "all" && dir !== dirFilter) return false;
      if (filter !== "all" && l.status !== filter) return false;
      return true;
    });
  }, [loans, filter, dirFilter]);

  const totals = useMemo(() => {
    let owedToMe = 0;
    let iOwe = 0;
    for (const l of loans) {
      if (l.status !== "outstanding") continue;
      if ((l.direction ?? "lent") === "borrowed") iOwe += l.amount;
      else owedToMe += l.amount;
    }
    return { owedToMe, iOwe, count: loans.length };
  }, [loans]);

  async function setStatus(id: string, status: LoanStatus) {
    const res = await fetch(`/api/loans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setLoans((prev) =>
        prev.map((l) =>
          l._id === id
            ? { ...l, status, repaidAt: status === "repaid" ? new Date().toISOString() : null }
            : l
        )
      );
    }
  }

  async function deleteLoan(id: string) {
    if (!confirm("Delete this loan record?")) return;
    const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
    if (res.ok) setLoans((prev) => prev.filter((l) => l._id !== id));
  }

  return (
    <div className="h-screen flex flex-col">
      <Header email={userEmail} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-nav">Loans</h2>
          <button
            onClick={() => setCreating(true)}
            className="text-sm bg-accent text-nav font-semibold px-3 py-1.5 rounded-lg hover:opacity-90"
          >
            + New entry
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <SummaryCard label="Owed to me" value={fmtMoney(totals.owedToMe)} accent />
          <SummaryCard label="I owe" value={fmtMoney(totals.iOwe)} danger />
          <SummaryCard label="Records" value={String(totals.count)} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {(["outstanding", "all", "repaid"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs sm:text-sm px-3 py-1 rounded-md capitalize ${
                  filter === f ? "bg-white shadow-sm text-nav font-semibold" : "text-gray-500"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {(["all", "lent", "borrowed"] as DirFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setDirFilter(f)}
                className={`text-xs sm:text-sm px-3 py-1 rounded-md capitalize ${
                  dirFilter === f ? "bg-white shadow-sm text-nav font-semibold" : "text-gray-500"
                }`}
              >
                {f === "all" ? "all directions" : f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
            {filter === "outstanding"
              ? "Nothing outstanding. Nice."
              : "No loans recorded yet."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((l) => (
              <LoanCard
                key={l._id}
                loan={l}
                onView={() => setViewing(l)}
                onEdit={() => setEditing(l)}
                onMarkRepaid={() => setStatus(l._id, "repaid")}
                onUndo={() => setStatus(l._id, "outstanding")}
                onDelete={() => deleteLoan(l._id)}
              />
            ))}
          </div>
        )}
        </div>
      </main>

      {creating && (
        <LoanFormModal
          onClose={() => setCreating(false)}
          onSaved={(l) => {
            setLoans((prev) => [l, ...prev]);
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <LoanFormModal
          loan={editing}
          onClose={() => setEditing(null)}
          onSaved={(l) => {
            setLoans((prev) => prev.map((x) => (x._id === l._id ? l : x)));
            setEditing(null);
          }}
        />
      )}
      {viewing?.screenshot && (
        <ImageViewer src={viewing.screenshot} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
      <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div
        className={`text-base sm:text-xl font-bold mt-1 break-words ${
          danger ? "text-red-500" : accent ? "text-accent" : "text-nav"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function LoanCard({
  loan,
  onView,
  onEdit,
  onMarkRepaid,
  onUndo,
  onDelete,
}: {
  loan: LoanDTO;
  onView: () => void;
  onEdit: () => void;
  onMarkRepaid: () => void;
  onUndo: () => void;
  onDelete: () => void;
}) {
  const isRepaid = loan.status === "repaid";
  const direction: LoanDirection = (loan.direction ?? "lent") as LoanDirection;
  const isBorrowed = direction === "borrowed";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm flex gap-3">
      {loan.screenshot ? (
        <button
          onClick={onView}
          className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-accent"
          title="View screenshot"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={loan.screenshot} alt="" className="w-full h-full object-cover" />
        </button>
      ) : (
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
          No image
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-gray-400">
              {isBorrowed ? "Borrowed from" : "Lent to"}
            </div>
            <div className="font-semibold text-nav break-words">{loan.borrower}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {fmtDate(loan.lentAt)}
              {loan.dueAt ? ` · due ${fmtDate(loan.dueAt)}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-bold ${isBorrowed && !isRepaid ? "text-red-500" : "text-nav"}`}>
              {isBorrowed ? "-" : ""}{fmtMoney(loan.amount, loan.currency)}
            </div>
            <span
              className={`inline-block mt-0.5 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                isRepaid
                  ? "bg-gray-100 text-gray-500"
                  : isBorrowed
                    ? "bg-red-50 text-red-500"
                    : "bg-accent/15 text-accent"
              }`}
            >
              {isBorrowed ? "i owe" : loan.status}
            </span>
          </div>
        </div>
        {loan.note && (
          <div className="text-xs text-gray-600 mt-1 break-words whitespace-pre-wrap">
            {loan.note}
          </div>
        )}
        <div className="flex gap-2 mt-2 flex-wrap">
          {isRepaid ? (
            <button
              onClick={onUndo}
              className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-accent"
            >
              Mark outstanding
            </button>
          ) : (
            <button
              onClick={onMarkRepaid}
              className="text-xs px-2.5 py-1 rounded bg-accent text-nav font-semibold"
            >
              {isBorrowed ? "Mark paid back" : "Mark repaid"}
            </button>
          )}
          <button
            onClick={onEdit}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-accent"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanFormModal({
  loan,
  onClose,
  onSaved,
}: {
  loan?: LoanDTO;
  onClose: () => void;
  onSaved: (l: LoanDTO) => void;
}) {
  const isEdit = !!loan;
  const [direction, setDirection] = useState<LoanDirection>(
    (loan?.direction ?? "lent") as LoanDirection
  );
  const [borrower, setBorrower] = useState(loan?.borrower ?? "");
  const [amount, setAmount] = useState(loan ? String(loan.amount) : "");
  const [currency, setCurrency] = useState(loan?.currency ?? "INR");
  const [lentAt, setLentAt] = useState(() =>
    (loan?.lentAt ?? new Date().toISOString()).slice(0, 10)
  );
  const [dueAt, setDueAt] = useState(loan?.dueAt ? loan.dueAt.slice(0, 10) : "");
  const [note, setNote] = useState(loan?.note ?? "");
  const [screenshot, setScreenshot] = useState<string | null>(loan?.screenshot ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError("Image too large (max 3 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!isImageDataUrl(result)) {
        setError("Unsupported image format");
        return;
      }
      setError(null);
      setScreenshot(result);
    };
    reader.readAsDataURL(file);
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((i) => i.type.startsWith("image/"));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (file) {
      e.preventDefault();
      handleFile(file);
    }
  }

  async function submit() {
    setError(null);
    if (!borrower.trim()) {
      setError("Borrower required");
      return;
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      setError("Amount must be > 0");
      return;
    }
    setSaving(true);
    const payload = {
      direction,
      borrower: borrower.trim(),
      amount: a,
      currency,
      lentAt,
      dueAt: dueAt || (isEdit ? null : undefined),
      note: note.trim(),
      screenshot: screenshot ?? (isEdit ? null : undefined),
    };
    const res = await fetch(isEdit ? `/api/loans/${loan!._id}` : "/api/loans", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed");
      return;
    }
    if (isEdit) {
      onSaved({
        ...loan!,
        direction: payload.direction,
        borrower: payload.borrower,
        amount: payload.amount,
        currency: payload.currency,
        lentAt: new Date(payload.lentAt).toISOString(),
        dueAt: payload.dueAt ? new Date(payload.dueAt).toISOString() : null,
        note: payload.note,
        screenshot: payload.screenshot ?? undefined,
      });
    } else {
      onSaved(await res.json());
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg p-4 sm:p-5 flex flex-col gap-3 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onPaste={onPaste}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-nav">{isEdit ? "Edit entry" : "New entry"}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-nav text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(["lent", "borrowed"] as LoanDirection[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`text-xs sm:text-sm px-3 py-1 rounded-md ${
                direction === d ? "bg-white shadow-sm text-nav font-semibold" : "text-gray-500"
              }`}
            >
              {d === "lent" ? "I lent" : "I borrowed"}
            </button>
          ))}
        </div>

        <label className="block text-sm">
          <span className="text-gray-600">
            {direction === "borrowed" ? "Lender" : "Borrower"}
          </span>
          <input
            autoFocus
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            placeholder="Name"
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block text-sm col-span-2">
            <span className="text-gray-600">Amount</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Currency</span>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-gray-600">
              {direction === "borrowed" ? "Borrowed on" : "Lent on"}
            </span>
            <input
              type="date"
              value={lentAt}
              onChange={(e) => setLentAt(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Due (optional)</span>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-gray-600">Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent resize-none"
          />
        </label>

        <div className="text-sm">
          <span className="text-gray-600">Screenshot</span>
          <div className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-3 flex flex-col items-center gap-2">
            {screenshot ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshot}
                  alt="preview"
                  className="max-h-40 rounded border border-gray-100"
                />
                <button
                  onClick={() => setScreenshot(null)}
                  className="text-xs text-gray-500 hover:text-red-500"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 text-center">
                  Paste a screenshot anywhere in this dialog (Ctrl/Cmd+V), or
                </p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:border-accent"
                >
                  Choose image
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-sm px-3 py-1.5 text-gray-500 hover:text-nav">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="text-sm px-3 py-1.5 rounded-lg bg-accent text-nav font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="screenshot"
        className="max-w-full max-h-full rounded shadow-lg"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-white/80 hover:text-white text-2xl leading-none"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

function fmtMoney(n: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s;
  }
}
