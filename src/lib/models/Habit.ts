import mongoose, { Schema, Model } from "mongoose";

export type HabitKind = "check" | "count" | "time";

export interface IHabit {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  kind: HabitKind;
  target?: number;
  targetTime?: string;
  order: number;
  createdAt: Date;
}

const HabitSchema = new Schema<IHabit>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  kind: { type: String, enum: ["check", "count", "time"], required: true },
  target: { type: Number },
  targetTime: { type: String },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

if (mongoose.models.Habit) {
  delete mongoose.models.Habit;
}
const HabitModel: Model<IHabit> = mongoose.model<IHabit>("Habit", HabitSchema);
export default HabitModel;
