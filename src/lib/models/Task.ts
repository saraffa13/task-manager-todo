import mongoose, { Schema, Model } from "mongoose";

export type AttachmentType = "link" | "pdf" | "note";

export interface IAttachment {
  id: string;
  type: AttachmentType;
  name: string;
  url?: string;
  data?: string;
  content?: string;
  createdAt: Date;
}

export interface ITask {
  _id: mongoose.Types.ObjectId;
  text: string;
  completed: boolean;
  workspaceId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  order: number;
  userId: mongoose.Types.ObjectId;
  deadline: Date | null;
  attachments: IAttachment[];
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["link", "pdf", "note"], required: true },
    name: { type: String, default: "" },
    url: { type: String },
    data: { type: String },
    content: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  parentId: { type: Schema.Types.ObjectId, ref: "Task", default: null, index: true },
  order: { type: Number, default: 0 },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deadline: { type: Date, default: null },
  attachments: { type: [AttachmentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Mongoose caches compiled models on the global `mongoose` instance. Under
// Next.js dev HMR, the Task.ts module is reimported on schema changes but
// the old compiled model lingers on `mongoose.models`, causing Mongoose to
// silently strip any newly-added fields (e.g. `attachments`) on writes.
// Drop the cached model so each import recompiles the current schema.
if (mongoose.models.Task) {
  delete mongoose.models.Task;
}
const Task: Model<ITask> = mongoose.model<ITask>("Task", TaskSchema);
export default Task;
