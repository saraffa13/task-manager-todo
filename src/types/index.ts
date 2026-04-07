export interface Workspace {
  _id: string;
  name: string;
  order: number;
}

export interface TaskDTO {
  _id: string;
  text: string;
  completed: boolean;
  workspaceId: string;
  parentId: string | null;
  order: number;
  deadline: string | null;
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
