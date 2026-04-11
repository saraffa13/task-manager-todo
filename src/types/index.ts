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

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string };
  }
}
