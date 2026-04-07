import mongoose, { Schema, Model } from "mongoose";

export interface ITask {
  _id: mongoose.Types.ObjectId;
  text: string;
  completed: boolean;
  workspaceId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  order: number;
  userId: mongoose.Types.ObjectId;
  deadline: Date | null;
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  parentId: { type: Schema.Types.ObjectId, ref: "Task", default: null, index: true },
  order: { type: Number, default: 0 },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deadline: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
export default Task;
