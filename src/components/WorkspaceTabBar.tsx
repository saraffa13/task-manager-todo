"use client";
import { useState } from "react";
import type { Workspace } from "@/types";

interface Props {
  workspaces: Workspace[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function WorkspaceTabBar({
  workspaces,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = workspaces.map((w) => w._id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  }

  function submitNew() {
    if (newName.trim()) onCreate(newName.trim());
    setNewName("");
    setAdding(false);
  }
  function submitRename(id: string) {
    if (editingName.trim()) onRename(id, editingName.trim());
    setEditingId(null);
  }

  return (
    <div className="flex-shrink-0 bg-nav border-t border-navlight">
      <div className="flex items-end overflow-x-auto no-scrollbar px-2 pt-1">
        {workspaces.map((w) => {
          const active = w._id === activeId;
          const isEditing = editingId === w._id;
          return (
            <div
              key={w._id}
              draggable={!isEditing}
              onDragStart={() => setDragId(w._id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId && dragId !== w._id) setOverId(w._id);
              }}
              onDragLeave={() => setOverId((id) => (id === w._id ? null : id))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(w._id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onClick={() => !isEditing && onSelect(w._id)}
              onDoubleClick={() => {
                setEditingId(w._id);
                setEditingName(w.name);
              }}
              className={`relative cursor-pointer min-h-[44px] flex items-center gap-2 px-4 rounded-t-lg whitespace-nowrap text-sm font-medium transition-all ${
                active
                  ? "bg-white text-nav shadow-md"
                  : "bg-navlight text-gray-300 hover:text-white"
              } ${dragId === w._id ? "opacity-50" : ""} ${
                overId === w._id ? "ring-2 ring-accent" : ""
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => submitRename(w._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename(w._id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="bg-transparent outline-none w-24 text-nav"
                />
              ) : (
                <>
                  <span>{w.name}</span>
                  {active && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete workspace "${w.name}" and all its tasks?`))
                          onDelete(w._id);
                      }}
                      className="text-gray-400 hover:text-red-500 text-xs ml-1"
                      aria-label="Delete workspace"
                    >
                      ✕
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
        {adding ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitNew}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNew();
              if (e.key === "Escape") {
                setNewName("");
                setAdding(false);
              }
            }}
            placeholder="Workspace name"
            className="min-h-[44px] px-3 rounded-t-lg bg-white text-nav text-sm outline-none w-40"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="min-h-[44px] min-w-[44px] px-4 rounded-t-lg text-gray-300 hover:text-accent hover:bg-navlight text-xl font-bold transition-all"
            aria-label="Add workspace"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
