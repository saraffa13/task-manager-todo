import mongoose, { Schema, Model } from "mongoose";

export interface IWorkspace {
  _id: mongoose.Types.ObjectId;
  name: string;
  userId: mongoose.Types.ObjectId;
  order: number;
  createdAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>({
  name: { type: String, required: true, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace || mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);
export default Workspace;
