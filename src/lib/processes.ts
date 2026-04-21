import type { IProcessNode } from "./models/Process";

const MAX_LABEL = 200;
const MAX_DETAIL = 500;
const MAX_NODES = 200;
const MAX_DEPTH = 12;

function randId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clamp(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const trimmed = s.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

// Recursively normalize a node tree coming from an untrusted client payload.
// Caps total node count and depth to prevent pathological trees.
export function sanitizeProcessTree(raw: unknown): IProcessNode {
  const count = { n: 0 };
  const tree = walk(raw, 0, count);
  return tree ?? { id: randId(), label: "", detail: "", children: [] };
}

function walk(raw: unknown, depth: number, count: { n: number }): IProcessNode | null {
  if (!raw || typeof raw !== "object") return null;
  if (count.n >= MAX_NODES) return null;
  if (depth > MAX_DEPTH) return null;
  count.n += 1;
  const r = raw as Record<string, unknown>;
  const node: IProcessNode = {
    id: typeof r.id === "string" && r.id ? r.id : randId(),
    label: clamp(r.label, MAX_LABEL),
    detail: clamp(r.detail, MAX_DETAIL),
    children: [],
  };
  if (Array.isArray(r.children)) {
    for (const c of r.children) {
      const child = walk(c, depth + 1, count);
      if (child) node.children.push(child);
    }
  }
  return node;
}

// Convert the user-facing import format (either `root` or `steps`) into a
// normalized tree. Returns { name, root } on success or { error } on failure.
// Accepts a `steps` array as a convenience — treated as a linear chain under
// a root labeled with `name`.
export function parseImportPayload(
  raw: unknown
):
  | { name: string; root: IProcessNode }
  | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Expected a JSON object" };
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return { error: "Missing required field: name" };

  if (r.root !== undefined) {
    const root = sanitizeProcessTree(r.root);
    if (!root.label) root.label = name;
    return { name, root };
  }

  if (Array.isArray(r.steps)) {
    // Build a linear chain: root -> steps[0] -> steps[1] -> ...
    const root: IProcessNode = {
      id: randId(),
      label: name,
      detail: "",
      children: [],
    };
    let cursor = root;
    for (const step of r.steps) {
      if (!step || typeof step !== "object") continue;
      const s = step as Record<string, unknown>;
      const child: IProcessNode = {
        id: randId(),
        label: clamp(s.label, MAX_LABEL),
        detail: clamp(s.detail, MAX_DETAIL),
        children: [],
      };
      if (!child.label) continue;
      cursor.children.push(child);
      cursor = child;
    }
    return { name, root };
  }

  return { error: "Provide either `root` or `steps`" };
}

export function serializeTree(node: IProcessNode): IProcessNode {
  return {
    id: node.id,
    label: node.label,
    detail: node.detail,
    children: (node.children || []).map(serializeTree),
  };
}
