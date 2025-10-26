import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    handle: { type: String, required: true, unique: true },
    title: { type: String, default: "" },
    bio: { type: String, default: "" },
    hobby: { type: String, required: true },
    interests: { type: [String], default: [] },
    socialLinks: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    preferences: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    tagline: { type: String, default: "" },
    avatar: { type: String, default: "" },
    focusArea: { type: String, default: "" },
    goals: { type: String, default: "" },
    milestones: { type: [String], default: [] },
    timeline: { type: mongoose.Schema.Types.Mixed, default: () => [] },
    portfolio: { type: mongoose.Schema.Types.Mixed, default: null },
    lastGeneratedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ handle: 1 }, { unique: true });

export const User =
  mongoose.models.User || mongoose.model("User", userSchema, "users");
