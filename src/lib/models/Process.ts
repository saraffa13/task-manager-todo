import mongoose, { Schema, Model } from "mongoose";

// Node of a process tree. Stored as a recursive embedded document.
export interface IProcessNode {
  id: string;
  label: string;
  detail?: string;
  children: IProcessNode[];
}

export interface IProcess {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  root: IProcessNode;
  order: number;
  createdAt: Date;
}

// Recursive schemas need a forward declaration. We declare the shape once
// and add the `children` field pointing back at itself.
const ProcessNodeSchema = new Schema<IProcessNode>(
  {
    id: { type: String, required: true },
    label: { type: String, default: "" },
    detail: { type: String, default: "" },
  },
  { _id: false }
);
ProcessNodeSchema.add({ children: { type: [ProcessNodeSchema], default: [] } });

const ProcessSchema = new Schema<IProcess>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  root: { type: ProcessNodeSchema, required: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// Drop any cached compiled model so schema changes take effect under HMR.
if (mongoose.models.Process) {
  delete mongoose.models.Process;
}
const ProcessModel: Model<IProcess> = mongoose.model<IProcess>("Process", ProcessSchema);
export default ProcessModel;
