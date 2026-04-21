"use client";
import { useState } from "react";
import type { ProcessNode } from "@/types";

function randId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Immutable tree helpers — all operate by node id and return a new tree so
// React state updates are straightforward.
function mapNode(
  tree: ProcessNode,
  id: string,
  fn: (n: ProcessNode) => ProcessNode
): ProcessNode {
  if (tree.id === id) return fn(tree);
  return { ...tree, children: tree.children.map((c) => mapNode(c, id, fn)) };
}

function removeNode(tree: ProcessNode, id: string): ProcessNode {
  return {
    ...tree,
    children: tree.children.filter((c) => c.id !== id).map((c) => removeNode(c, id)),
  };
}

function countDescendants(n: ProcessNode): number {
  let c = 0;
  for (const child of n.children) c += 1 + countDescendants(child);
  return c;
}

interface Props {
  root: ProcessNode;
  onChange: (next: ProcessNode) => void;
  readOnly?: boolean;
}

export default function Mindmap({ root, onChange, readOnly = false }: Props) {
  function addChild(parentId: string) {
    const next = mapNode(root, parentId, (n) => ({
      ...n,
      children: [...n.children, { id: randId(), label: "New step", detail: "", children: [] }],
    }));
    onChange(next);
  }

  function updateNode(id: string, patch: Partial<ProcessNode>) {
    const next = mapNode(root, id, (n) => ({ ...n, ...patch }));
    onChange(next);
  }

  function deleteNode(id: string) {
    if (id === root.id) return; // cannot delete root
    onChange(removeNode(root, id));
  }

  return (
    <div className="overflow-x-auto overflow-y-auto p-4 min-h-[60vh] bg-gradient-to-br from-slate-50 to-white rounded-xl border border-gray-200">
      <div className="inline-block">
        <NodeView
          node={root}
          isRoot
          readOnly={readOnly}
          onAddChild={addChild}
          onUpdate={updateNode}
          onDelete={deleteNode}
        />
      </div>
    </div>
  );
}

interface NodeViewProps {
  node: ProcessNode;
  isRoot?: boolean;
  readOnly: boolean;
  onAddChild: (parentId: string) => void;
  onUpdate: (id: string, patch: Partial<ProcessNode>) => void;
  onDelete: (id: string) => void;
}

function NodeView({ node, isRoot, readOnly, onAddChild, onUpdate, onDelete }: NodeViewProps) {
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex items-stretch">
      {/* The node card + inline add button, vertically centered against its children column. */}
      <div className="flex items-center">
        <NodeCard
          node={node}
          isRoot={isRoot}
          readOnly={readOnly}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
        {hasChildren && (
          <div className="w-6 border-t-2 border-gray-300" aria-hidden />
        )}
      </div>

      {hasChildren && (
        <div className="flex flex-col justify-center gap-3 relative">
          {/* Vertical spine connecting the branch */}
          {node.children.length > 1 && (
            <div
              className="absolute left-0 top-0 bottom-0 border-l-2 border-gray-300"
              aria-hidden
            />
          )}
          {node.children.map((child) => (
            <div key={child.id} className="flex items-center">
              {/* Horizontal connector from spine to child */}
              <div className="w-6 border-t-2 border-gray-300" aria-hidden />
              <NodeView
                node={child}
                readOnly={readOnly}
                onAddChild={onAddChild}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  node: ProcessNode;
  isRoot?: boolean;
  readOnly: boolean;
  onUpdate: (id: string, patch: Partial<ProcessNode>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function NodeCard({ node, isRoot, readOnly, onUpdate, onDelete, onAddChild }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
  const [detail, setDetail] = useState(node.detail || "");

  function commit() {
    const trimmedLabel = label.trim();
    const trimmedDetail = detail.trim();
    if (trimmedLabel !== node.label || trimmedDetail !== (node.detail || "")) {
      onUpdate(node.id, { label: trimmedLabel, detail: trimmedDetail });
    }
    setEditing(false);
  }

  function cancel() {
    setLabel(node.label);
    setDetail(node.detail || "");
    setEditing(false);
  }

  const descendantCount = countDescendants(node);

  const baseCls = `group relative rounded-xl px-3 py-2 shadow-sm border transition-all min-w-[10rem] max-w-[16rem] flex-shrink-0 ${
    isRoot
      ? "bg-nav text-white border-nav"
      : "bg-white border-gray-200 hover:border-accent"
  }`;

  if (editing) {
    return (
      <div className={baseCls + " ring-2 ring-accent/40"}>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") cancel();
          }}
          placeholder="Step name"
          className={`w-full text-sm font-medium bg-transparent outline-none border-b ${
            isRoot ? "border-white/40 text-white placeholder:text-white/50" : "border-gray-200"
          }`}
        />
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") cancel();
          }}
          placeholder="Detail (e.g. 5 min)"
          className={`w-full mt-1 text-xs bg-transparent outline-none ${
            isRoot ? "text-white/80 placeholder:text-white/40" : "text-gray-500"
          }`}
        />
        <div className="flex gap-1 justify-end mt-2">
          <button
            onClick={cancel}
            className={`text-[10px] px-2 py-0.5 rounded ${
              isRoot ? "text-white/80 hover:bg-white/10" : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={commit}
            className="text-[10px] px-2 py-0.5 rounded bg-accent text-nav font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={baseCls}>
      <div
        onClick={() => !readOnly && setEditing(true)}
        className={readOnly ? "" : "cursor-text"}
      >
        <div className={`text-sm font-medium break-words ${node.label ? "" : "italic opacity-60"}`}>
          {node.label || "Untitled"}
        </div>
        {node.detail ? (
          <div className={`text-xs mt-0.5 break-words ${isRoot ? "text-white/75" : "text-gray-500"}`}>
            {node.detail}
          </div>
        ) : null}
      </div>
      {!readOnly && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(node.id)}
            className="w-6 h-6 rounded-full bg-accent text-nav text-sm font-bold shadow hover:scale-110 transition-transform"
            title="Add next step"
            aria-label="Add next step"
          >
            +
          </button>
          {!isRoot && (
            <button
              onClick={() => {
                const msg =
                  descendantCount > 0
                    ? `Delete this step and its ${descendantCount} sub-step(s)?`
                    : "Delete this step?";
                if (confirm(msg)) onDelete(node.id);
              }}
              className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 text-sm shadow"
              title="Delete step"
              aria-label="Delete step"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
