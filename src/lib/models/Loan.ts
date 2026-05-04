import mongoose, { Schema, Model } from "mongoose";

export type LoanStatus = "outstanding" | "repaid";

export interface ILoan {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  borrower: string;
  amount: number;
  currency: string;
  lentAt: Date;
  dueAt?: Date;
  note?: string;
  screenshot?: string; // data URL (image/*)
  status: LoanStatus;
  repaidAt?: Date;
  createdAt: Date;
}

const LoanSchema = new Schema<ILoan>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  borrower: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  lentAt: { type: Date, required: true },
  dueAt: { type: Date },
  note: { type: String },
  screenshot: { type: String },
  status: { type: String, enum: ["outstanding", "repaid"], default: "outstanding", index: true },
  repaidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

if (mongoose.models.Loan) {
  delete mongoose.models.Loan;
}
const LoanModel: Model<ILoan> = mongoose.model<ILoan>("Loan", LoanSchema);
export default LoanModel;
