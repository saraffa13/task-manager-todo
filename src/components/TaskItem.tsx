"use client";
import { useState } from "react";
import type { Attachment, TaskNode } from "@/types";
import AddTaskInput from "./AddTaskInput";
import AttachmentEditor from "./AttachmentEditor";

interface Props {
  task: TaskNode;
  depth: number;
  number: string;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, text: string, attachments: Attachment[]) => void;
  onSetDeadline: (id: string, deadline: string | null) => void;
  onSetAttachments: (id: string, attachments: Attachment[]) => void;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function isOverdue(iso: string | null, completed: boolean) {
  if (!iso || completed) return false;
  return new Date(iso).getTime() < new Date().setHours(0, 0, 0, 0);
}
function toInputValue(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function TaskItem({
  task,
  depth,
  number,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  onSetDeadline,
  onSetAttachments,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const hasChildren = task.children.length > 0;
  const overdue = isOverdue(task.deadline, task.completed);
  const attachmentCount = task.attachments?.length ?? 0;

  function commitEdit() {
    const v = text.trim();
    if (v && v !== task.text) onEdit(task._id, v);
    else setText(task.text);
    setEditing(false);
  }

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 16 }} className="mt-1">
      <div className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 transition-all min-h-[44px]">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`w-5 text-gray-400 text-xs flex-shrink-0 ${
            hasChildren ? "visible" : "invisible"
          }`}
          aria-label="Toggle children"
        >
          {expanded ? "▼" : "▶"}
        </button>
        <span className="text-xs font-mono text-gray-400 min-w-[2rem] flex-shrink-0">
          {number}
        </span>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task._id)}
          className="w-5 h-5 accent-accent flex-shrink-0 cursor-pointer"
        />
        {editing ? (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") {
                setText(task.text);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent outline-none border-b border-accent text-sm"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className={`flex-1 text-sm cursor-text break-words ${
              task.completed ? "line-through opacity-50" : ""
            }`}
          >
            {task.text}
          </span>
        )}

        {editingDate ? (
          <span className="flex items-center gap-1">
            <input
              type="date"
              autoFocus
              value={toInputValue(task.deadline)}
              onChange={(e) => {
                onSetDeadline(task._id, e.target.value || null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") setEditingDate(false);
              }}
              className="text-xs border border-gray-200 rounded px-1 py-0.5"
            />
            <button
              onClick={() => setEditingDate(false)}
              className="text-xs text-gray-400 hover:text-nav px-1"
              title="Done"
            >
              ✓
            </button>
            {task.deadline && (
              <button
                onClick={() => {
                  onSetDeadline(task._id, null);
                  setEditingDate(false);
                }}
                className="text-xs text-gray-400 hover:text-red-500 px-1"
                title="Clear deadline"
              >
                ×
              </button>
            )}
          </span>
        ) : task.deadline ? (
          <button
            onClick={() => setEditingDate(true)}
            className={`text-xs px-2 py-0.5 rounded-full transition-all ${
              overdue
                ? "bg-red-100 text-red-600"
                : task.completed
                ? "bg-gray-100 text-gray-400"
                : "bg-accent/15 text-teal-700"
            }`}
            title="Edit deadline"
          >
            {fmtDate(task.deadline)}
          </button>
        ) : (
          <button
            onClick={() => setEditingDate(true)}
            className="opacity-0 max-sm:opacity-100 group-hover:opacity-100 focus:opacity-100 text-xs text-gray-400 hover:text-accent px-2 py-0.5 rounded-full border border-dashed border-gray-300 transition-all"
            title="Set deadline"
          >
            + date
          </button>
        )}

        <button
          onClick={() => setShowAttachments((v) => !v)}
          className={`${
            attachmentCount > 0
              ? "opacity-100"
              : "opacity-0 max-sm:opacity-100 group-hover:opacity-100 focus:opacity-100"
          } text-[11px] text-gray-500 hover:text-accent px-1.5 h-8 min-w-[2rem] flex items-center justify-center hover:bg-accent/10 rounded transition-all`}
          aria-label="Attachments"
          title={attachmentCount > 0 ? `${attachmentCount} attachment(s)` : "Add attachment"}
        >
          {attachmentCount > 0 ? `@ ${attachmentCount}` : "@"}
        </button>
        <button
          onClick={() => setShowAddChild((v) => !v)}
          className="opacity-0 max-sm:opacity-100 group-hover:opacity-100 focus:opacity-100 text-accent text-lg w-8 h-8 flex items-center justify-center hover:bg-accent/10 rounded transition-all"
          aria-label="Add sub-task"
          title="Add sub-task"
        >
          +
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this task and all its sub-tasks?")) onDelete(task._id);
          }}
          className="opacity-0 max-sm:opacity-100 group-hover:opacity-100 focus:opacity-100 text-gray-400 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded transition-all"
          aria-label="Delete"
          title="Delete"
        >
          ×
        </button>
      </div>

      {showAttachments && (
        <div style={{ marginLeft: 32 }} className="my-1 p-2 bg-gray-50 border border-gray-200 rounded-lg">
          <AttachmentEditor
            attachments={task.attachments || []}
            onChange={(next) => onSetAttachments(task._id, next)}
          />
        </div>
      )}

      {showAddChild && (
        <div style={{ marginLeft: 32 }} className="my-1">
          <AddTaskInput
            placeholder="New sub-task…"
            onAdd={(t, atts) => {
              onAddChild(task._id, t, atts);
              setShowAddChild(false);
              setExpanded(true);
            }}
          />
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {task.children.map((c, i) => (
            <TaskItem
              key={c._id}
              task={c}
              depth={depth + 1}
              number={`${number}.${i + 1}`}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onSetDeadline={onSetDeadline}
              onSetAttachments={onSetAttachments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
