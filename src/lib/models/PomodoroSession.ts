import mongoose, { Schema, Model } from "mongoose";

export type PomoItemType = "task" | "habit" | "process" | "other";

export interface IPomodoroSession {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  itemType: PomoItemType;
  itemId?: string; // ObjectId-as-string OR the literal "other"
  itemName: string; // snapshot at time of session
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  plannedSec: number;
  completed: boolean; // true = ran to plannedSec, false = stopped early
  createdAt: Date;
}

const PomodoroSessionSchema = new Schema<IPomodoroSession>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  itemType: { type: String, enum: ["task", "habit", "process", "other"], required: true },
  itemId: { type: String },
  itemName: { type: String, required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
  durationSec: { type: Number, required: true },
  plannedSec: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

PomodoroSessionSchema.index({ userId: 1, startedAt: -1 });

if (mongoose.models.PomodoroSession) {
  delete mongoose.models.PomodoroSession;
}
const PomodoroSessionModel: Model<IPomodoroSession> = mongoose.model<IPomodoroSession>(
  "PomodoroSession",
  PomodoroSessionSchema
);
export default PomodoroSessionModel;
