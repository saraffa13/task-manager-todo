import mongoose, { Schema, Model } from "mongoose";

export interface IHabitLog {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  habitId: mongoose.Types.ObjectId;
  date: string; // local YYYY-MM-DD
  value?: number;
  time?: string; // HH:MM
  note?: string;
  createdAt: Date;
}

const HabitLogSchema = new Schema<IHabitLog>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
  date: { type: String, required: true, index: true },
  value: { type: Number },
  time: { type: String },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
});

HabitLogSchema.index({ habitId: 1, date: 1 });

if (mongoose.models.HabitLog) {
  delete mongoose.models.HabitLog;
}
const HabitLogModel: Model<IHabitLog> = mongoose.model<IHabitLog>("HabitLog", HabitLogSchema);
export default HabitLogModel;
