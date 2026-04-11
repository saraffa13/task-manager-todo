"use client";
import { useEffect, useRef, useState } from "react";
import type { Attachment, AttachmentType } from "@/types";

// Turn a base64 data URL back into a Blob. window.open on a data: URL is
// blocked or rendered blank in most modern browsers, so we convert to a
// blob URL before opening a viewer.
function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  try {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

const MAX_PDF_BYTES = 2 * 1024 * 1024; // keep in sync with src/lib/attachments.ts
const MAX_ATTACHMENTS = 10;

interface Props {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  compact?: boolean;
}

function randId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function labelFor(type: AttachmentType) {
  if (type === "link") return "Link";
  if (type === "pdf") return "PDF";
  return "Note";
}

export default function AttachmentEditor({ attachments, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AttachmentType>("link");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [noteName, setNoteName] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Attachment | null>(null);
  const [viewingPdf, setViewingPdf] = useState<{ attachment: Attachment; url: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the PDF blob URL when the viewer closes (or the component unmounts)
  // so we don't leak memory holding onto multi-MB PDFs.
  useEffect(() => {
    if (!viewingPdf) return;
    const url = viewingPdf.url;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [viewingPdf]);

  // Close the viewer on Escape — standard modal affordance.
  useEffect(() => {
    if (!viewingPdf && !viewingNote) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingPdf(null);
        setViewingNote(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewingPdf, viewingNote]);

  const atLimit = attachments.length >= MAX_ATTACHMENTS;

  function resetForm() {
    setLinkUrl("");
    setLinkName("");
    setNoteName("");
    setNoteContent("");
    setError(null);
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) {
      setError("Enter a URL");
      return;
    }
    let normalized = url;
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    try {
      new URL(normalized);
    } catch {
      setError("Invalid URL");
      return;
    }
    onChange([
      ...attachments,
      { id: randId(), type: "link", name: linkName.trim() || normalized, url: normalized },
    ]);
    resetForm();
    setOpen(false);
  }

  async function handleFile(file: File) {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError(`PDF too large (max ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB)`);
      return;
    }
    try {
      const data = await readFileAsDataUrl(file);
      onChange([
        ...attachments,
        { id: randId(), type: "pdf", name: file.name || "document.pdf", data },
      ]);
      setOpen(false);
    } catch {
      setError("Failed to read file");
    }
  }

  function addNote() {
    const content = noteContent.trim();
    if (!content) {
      setError("Note is empty");
      return;
    }
    onChange([
      ...attachments,
      { id: randId(), type: "note", name: noteName.trim() || "Note", content },
    ]);
    resetForm();
    setOpen(false);
  }

  function remove(id: string) {
    onChange(attachments.filter((a) => a.id !== id));
  }

  function openAttachment(a: Attachment) {
    if (a.type === "link" && a.url) {
      window.open(a.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (a.type === "pdf" && a.data) {
      const blob = dataUrlToBlob(a.data);
      if (!blob) {
        setError("Could not decode PDF");
        return;
      }
      const url = URL.createObjectURL(blob);
      setViewingPdf({ attachment: a, url });
      return;
    }
    if (a.type === "note") {
      setViewingNote(a);
    }
  }

  function downloadPdf(a: Attachment) {
    if (a.type !== "pdf" || !a.data) return;
    const blob = dataUrlToBlob(a.data);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name || "document.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full pl-2 pr-1 py-0.5 max-w-[16rem]"
            >
              <button
                type="button"
                onClick={() => openAttachment(a)}
                className="inline-flex items-center gap-1 truncate"
                title={
                  a.type === "pdf"
                    ? `${a.name} — click to open in new tab`
                    : a.type === "note"
                    ? `${a.name} — click to view`
                    : a.url || a.name
                }
              >
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 bg-white rounded px-1 py-[1px]">
                  {labelFor(a.type)}
                </span>
                <span className="truncate">{a.name}</span>
              </button>
              {a.type === "pdf" && (
                <button
                  type="button"
                  onClick={() => downloadPdf(a)}
                  className="text-gray-400 hover:text-accent w-4 h-4 flex items-center justify-center"
                  aria-label="Download PDF"
                  title="Download"
                >
                  ↓
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="text-gray-400 hover:text-red-500 w-4 h-4 flex items-center justify-center rounded-full"
                aria-label="Remove attachment"
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {!atLimit && (
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen((v) => !v);
              setError(null);
            }}
            className={`inline-flex items-center gap-1 text-xs text-gray-500 hover:text-accent border border-dashed border-gray-300 hover:border-accent rounded-full px-2 py-0.5 transition-all ${
              compact ? "" : ""
            }`}
            title="Attach link, PDF, or note"
          >
            + Attach
          </button>
          {open && (
            <div className="absolute z-20 mt-1 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <div className="flex gap-1 mb-2 text-xs">
                {(["link", "pdf", "note"] as AttachmentType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => {
                      setTab(t);
                      setError(null);
                    }}
                    className={`px-2 py-1 rounded ${
                      tab === t ? "bg-accent/15 text-teal-700" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {labelFor(t)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {tab === "link" && (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Label (optional)"
                    className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-xs bg-accent text-white rounded px-3 py-1 self-end"
                  >
                    Add link
                  </button>
                </div>
              )}

              {tab === "pdf" && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-gray-400">
                    Max {Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB. Stored inline with the task.
                  </p>
                </div>
              )}

              {tab === "note" && (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={noteName}
                    onChange={(e) => setNoteName(e.target.value)}
                    placeholder="Note title (optional)"
                    className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-accent"
                  />
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write something related to this task…"
                    rows={5}
                    className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-accent resize-y"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    className="text-xs bg-accent text-white rounded px-3 py-1 self-end"
                  >
                    Add note
                  </button>
                </div>
              )}

              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>
          )}
        </div>
      )}

      {viewingNote && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setViewingNote(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-nav truncate">{viewingNote.name}</h3>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 whitespace-pre-wrap text-sm text-gray-700">
              {viewingNote.content}
            </div>
          </div>
        </div>
      )}

      {viewingPdf && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setViewingPdf(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 rounded px-1.5 py-[2px]">
                PDF
              </span>
              <h3 className="font-semibold text-nav truncate flex-1" title={viewingPdf.attachment.name}>
                {viewingPdf.attachment.name}
              </h3>
              <button
                type="button"
                onClick={() => downloadPdf(viewingPdf.attachment)}
                className="text-xs text-gray-500 hover:text-accent border border-gray-200 hover:border-accent rounded px-2 py-1"
                title="Download"
              >
                Download
              </button>
              <a
                href={viewingPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-accent border border-gray-200 hover:border-accent rounded px-2 py-1"
                title="Open in new tab"
              >
                Open in tab
              </a>
              <button
                type="button"
                onClick={() => setViewingPdf(null)}
                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center text-lg"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe
                src={viewingPdf.url}
                title={viewingPdf.attachment.name}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
