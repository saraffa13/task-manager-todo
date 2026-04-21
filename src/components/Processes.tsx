"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Header";
import Mindmap from "./Mindmap";
import type { ProcessDTO, ProcessNode } from "@/types";

export default function Processes({ userEmail }: { userEmail: string }) {
  const [processes, setProcesses] = useState<ProcessDTO[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [importing, setImporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/processes");
    if (res.ok) {
      const data: ProcessDTO[] = await res.json();
      setProcesses(data);
      setActiveId((prev) => (prev && data.some((p) => p._id === prev) ? prev : data[0]?._id ?? null));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const active = useMemo(
    () => processes.find((p) => p._id === activeId) ?? null,
    [processes, activeId]
  );

  async function createProcess() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/processes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const p: ProcessDTO = await res.json();
      setProcesses((prev) => [...prev, p]);
      setActiveId(p._id);
      setNewName("");
      setCreating(false);
    }
  }

  function stripIds(node: ProcessNode): Omit<ProcessNode, "id"> {
    const out: { label: string; detail?: string; children?: unknown[] } = { label: node.label };
    if (node.detail) out.detail = node.detail;
    if (node.children.length > 0) out.children = node.children.map(stripIds);
    return out as Omit<ProcessNode, "id">;
  }

  async function exportProcess(p: ProcessDTO) {
    const payload = { name: p.name, root: stripIds(p.root) };
    const json = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert("Process JSON copied to clipboard.");
    } catch {
      window.prompt("Copy this JSON:", json);
    }
  }

  async function importFromJson(payload: unknown): Promise<string | null> {
    const res = await fetch("/api/processes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      return msg || `Import failed (${res.status})`;
    }
    const p: ProcessDTO = await res.json();
    setProcesses((prev) => [...prev, p]);
    setActiveId(p._id);
    setImporting(false);
    return null;
  }

  async function renameProcess(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProcesses((prev) => prev.map((p) => (p._id === id ? { ...p, name: trimmed } : p)));
    await fetch(`/api/processes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  }

  async function deleteProcess(id: string) {
    if (!confirm("Delete this process and all its steps?")) return;
    await fetch(`/api/processes/${id}`, { method: "DELETE" });
    setProcesses((prev) => {
      const next = prev.filter((p) => p._id !== id);
      if (activeId === id) setActiveId(next[0]?._id ?? null);
      return next;
    });
  }

  // Debounce tree updates so rapid node edits don't spam the API. Persist the
  // latest tree state after a short idle period.
  function updateTree(id: string, next: ProcessNode) {
    setProcesses((prev) => prev.map((p) => (p._id === id ? { ...p, root: next } : p)));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/processes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root: next }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        console.error("Failed to save process", res.status, msg);
      }
    }, 400);
  }

  return (
    <div className="h-screen flex flex-col">
      <Header email={userEmail} />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile drawer backdrop */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 top-14 z-30 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:static top-14 bottom-0 left-0 z-40 md:z-auto w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-200 md:transition-none`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                Processes
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setImporting(true)}
                  className="text-[10px] text-gray-500 hover:text-accent border border-gray-200 hover:border-accent rounded px-1.5 py-0.5"
                  title="Import from JSON"
                >
                  Import
                </button>
                <button
                  onClick={() => setCreating((v) => !v)}
                  className="text-accent hover:bg-accent/10 w-6 h-6 rounded flex items-center justify-center text-lg"
                  title="New process"
                  aria-label="New process"
                >
                  +
                </button>
              </div>
            </div>

            {creating && (
              <div className="mb-3 flex flex-col gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createProcess();
                    if (e.key === "Escape") {
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                  placeholder="Process name (e.g. Breathing)"
                  className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-accent"
                />
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                    className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-0.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createProcess}
                    className="text-[11px] bg-accent text-nav font-semibold rounded px-2 py-0.5"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : processes.length === 0 ? (
              <p className="text-xs text-gray-400">
                No processes yet. Click + to create your first mindmap.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {processes.map((p) => (
                  <li key={p._id}>
                    <button
                      onClick={() => {
                        setActiveId(p._id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded truncate transition-all ${
                        activeId === p._id
                          ? "bg-accent/15 text-teal-700 font-semibold"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      title={p.name}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6">
            <div className="md:hidden mb-3 flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-sm bg-nav text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                aria-label="Show processes list"
              >
                <span aria-hidden>☰</span>
                <span>Processes</span>
                {processes.length > 0 && (
                  <span className="text-[10px] bg-white/20 rounded px-1 py-0.5">
                    {processes.length}
                  </span>
                )}
              </button>
            </div>

            {!active ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-xl mb-2">Process Mindmaps</p>
                <p className="text-sm">
                  Create a process to map out the steps as a mindmap.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <ProcessNameHeader
                      name={active.name}
                      onRename={(n) => renameProcess(active._id, n)}
                    />
                  </div>
                  <button
                    onClick={() => exportProcess(active)}
                    className="text-xs text-gray-500 hover:text-accent border border-gray-200 hover:border-accent rounded px-2 py-1 whitespace-nowrap"
                    title="Copy JSON to clipboard"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => deleteProcess(active._id)}
                    className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded px-2 py-1 whitespace-nowrap"
                    title="Delete process"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  <span className="hidden md:inline">Hover a step to add a sub-step or delete.</span>
                  <span className="md:hidden">Tap a step for actions.</span>{" "}
                  Click any step to rename.
                </p>
                <Mindmap root={active.root} onChange={(r) => updateTree(active._id, r)} />
              </>
            )}
          </div>
        </main>
      </div>

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onSubmit={importFromJson}
        />
      )}
    </div>
  );
}

const EXAMPLE_JSON = `{
  "name": "Breathing",
  "steps": [
    { "label": "Diaphragmatic breathing", "detail": "5 min" },
    { "label": "Yawn to relax the muscles" },
    { "label": "Humm", "detail": "10 min" }
  ]
}`;

const LLM_PROMPT = `You are generating a process mindmap. Output ONLY valid JSON that conforms to the schema below — no prose, no markdown, no code fences.

Schema:
{
  "name": "<process name, required>",
  "root": {
    "label": "<string, required>",
    "detail": "<optional short string, e.g. duration or tip>",
    "children": [ /* recursive: nodes with the same shape */ ]
  }
}

Or, if the process is a single linear sequence with no branching, use this shortcut instead:
{
  "name": "<process name>",
  "steps": [
    { "label": "<string>", "detail": "<optional>" },
    { "label": "<string>", "detail": "<optional>" }
  ]
}

Rules:
- "name" is required. Every node has "label" (required); "detail" and "children" are optional.
- Keep "label" under 200 characters and "detail" under 500 characters.
- Aim for 3–12 nodes total unless the topic clearly needs more.
- Use "detail" for short quantitative or qualitative context (e.g. "5 min", "until relaxed", "optional").
- Prefer the "steps" shortcut when the flow is strictly linear; use "root"/"children" when branches exist.
- Do not include an "id" field; the app generates ids.

Process I want to map:
<<< describe your process here — e.g. "morning breathing routine to reduce anxiety" >>>`;

function ImportModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: unknown) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(LLM_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this prompt:", LLM_PROMPT);
    }
  }

  async function submit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    setBusy(true);
    const err = await onSubmit(parsed);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-nav">Import process from JSON</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Paste JSON with <code className="bg-gray-100 px-1 rounded">name</code> plus either{" "}
              <code className="bg-gray-100 px-1 rounded">steps</code> (linear) or{" "}
              <code className="bg-gray-100 px-1 rounded">root</code> (nested tree). Every node
              accepts <code className="bg-gray-100 px-1 rounded">label</code> (required) and{" "}
              <code className="bg-gray-100 px-1 rounded">detail</code> (optional).
            </p>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-accent">Show example</summary>
              <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">
                {EXAMPLE_JSON}
              </pre>
              <button
                type="button"
                onClick={() => setText(EXAMPLE_JSON)}
                className="mt-1 text-[11px] text-accent hover:underline"
              >
                Use example
              </button>
            </details>
          </div>

          <div className="bg-accent/5 border border-accent/30 rounded-lg p-2.5">
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-teal-700 hover:text-accent">
                Generate with an LLM (ChatGPT, Claude, etc.)
              </summary>
              <p className="text-[11px] text-gray-600 mt-2">
                Copy the prompt below, paste it into any LLM, replace the last line with your
                topic, then paste the LLM&apos;s JSON response into the textarea below.
              </p>
              <pre className="mt-2 bg-white border border-gray-200 rounded p-2 overflow-x-auto max-h-48 text-[10px] leading-snug whitespace-pre-wrap">
                {LLM_PROMPT}
              </pre>
              <button
                type="button"
                onClick={copyPrompt}
                className="mt-2 text-[11px] bg-accent text-nav font-semibold rounded px-2 py-1 hover:opacity-90"
              >
                {copied ? "Copied ✓" : "Copy prompt"}
              </button>
            </details>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste JSON here…"
            rows={14}
            className="w-full text-xs font-mono border border-gray-200 rounded p-2 focus:outline-none focus:border-accent resize-y"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="text-xs bg-accent text-nav font-semibold rounded px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProcessNameHeader({
  name,
  onRename,
}: {
  name: string;
  onRename: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  function commit() {
    const v = value.trim();
    if (v && v !== name) onRename(v);
    else setValue(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        className="text-2xl font-bold text-nav bg-transparent border-b border-accent outline-none flex-1 min-w-0"
      />
    );
  }

  return (
    <h2
      onClick={() => {
        setValue(name);
        setEditing(true);
      }}
      className="text-2xl font-bold text-nav cursor-text truncate"
      title="Click to rename"
    >
      {name}
    </h2>
  );
}
