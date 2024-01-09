import mongoose, { Schema } from "mongoose";

const subsSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // the one who is subscribing
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // the one to whom "subscriber" is subscribing
      ref: "User",
    },
  },
  { timestamps: true }
);

export const SUBSCRIPTION = mongoose.model("Subscription", subsSchema);
