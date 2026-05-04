export interface Workspace {
  _id: string;
  name: string;
  order: number;
}

export type AttachmentType = "link" | "pdf" | "note";

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  url?: string;
  data?: string;
  content?: string;
}

export interface TaskDTO {
  _id: string;
  text: string;
  completed: boolean;
  workspaceId: string;
  parentId: string | null;
  order: number;
  deadline: string | null;
  attachments: Attachment[];
  workspaceName?: string;
}

export interface TaskNode extends TaskDTO {
  children: TaskNode[];
}

export interface ProcessNode {
  id: string;
  label: string;
  detail?: string;
  children: ProcessNode[];
}

export interface ProcessDTO {
  _id: string;
  name: string;
  root: ProcessNode;
  order: number;
}

export type HabitKind = "check" | "count" | "time";

export interface HabitLogDTO {
  _id: string;
  habitId: string;
  date: string;
  value?: number;
  time?: string;
  note?: string;
}

export interface HabitDTO {
  _id: string;
  name: string;
  kind: HabitKind;
  target?: number;
  targetTime?: string;
  order: number;
  recentLogs: HabitLogDTO[]; // last 90 days
}

export type LoanStatus = "outstanding" | "repaid";

export interface LoanDTO {
  _id: string;
  borrower: string;
  amount: number;
  currency: string;
  lentAt: string;
  dueAt?: string | null;
  note?: string;
  screenshot?: string;
  status: LoanStatus;
  repaidAt?: string | null;
  createdAt: string;
}

export type PomoItemType = "task" | "habit" | "process" | "other";

export interface PomoItemRef {
  type: PomoItemType;
  id?: string;
  name: string;
}

export interface PomodoroSessionDTO {
  _id: string;
  itemType: PomoItemType;
  itemId?: string;
  itemName: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  plannedSec: number;
  completed: boolean;
}

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string };
  }
}
