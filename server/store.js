import { initDatabase, isDatabaseEnabled } from "./database.js";
import { User } from "./models/User.js";

const memoryStore = {
  byEmail: new Map(),
  byHandle: new Map()
};

function cloneDate(value) {
  return value ? new Date(value) : null;
}

function normalizeDocument(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    name: plain.name,
    email: plain.email,
    handle: plain.handle ?? "",
    title: plain.title ?? "",
    bio: plain.bio ?? "",
    hobby: plain.hobby ?? "",
    focusArea: plain.focusArea ?? "",
    interests: Array.isArray(plain.interests) ? plain.interests : [],
    socialLinks: plain.socialLinks ?? {},
    preferences: plain.preferences ?? {},
    portfolio: plain.portfolio ?? null,
    tagline: plain.tagline ?? "",
    avatar: plain.avatar ?? "",
    goals: plain.goals ?? "",
    milestones: Array.isArray(plain.milestones) ? plain.milestones : [],
    timeline: Array.isArray(plain.timeline) ? plain.timeline : [],
    lastGeneratedAt: cloneDate(plain.lastGeneratedAt)
  };
}

function storeInMemory(payload) {
  const previous = memoryStore.byEmail.get(payload.email);

  if (previous?.handle && previous.handle !== payload.handle) {
    memoryStore.byHandle.delete(previous.handle);
  }

  memoryStore.byEmail.set(payload.email, payload);
  if (payload.handle) {
    memoryStore.byHandle.set(payload.handle, payload);
  }

  return payload;
}

export async function getUserByEmail(email) {
  if (!email) return null;

  if (isDatabaseEnabled()) {
    await initDatabase();
    if (isDatabaseEnabled()) {
      const existing = await User.findOne({ email }).exec();
      return normalizeDocument(existing);
    }
  }

  return memoryStore.byEmail.get(email) ?? null;
}

export async function getUserByHandle(handle) {
  if (!handle) return null;

  if (isDatabaseEnabled()) {
    await initDatabase();
    if (isDatabaseEnabled()) {
      const existing = await User.findOne({ handle }).exec();
      return normalizeDocument(existing);
    }
  }

  return memoryStore.byHandle.get(handle) ?? null;
}

export async function upsertUserProfile(profile) {
  if (!profile?.email) {
    throw new Error("Cannot upsert user without an email.");
  }

  if (!profile.handle) {
    throw new Error("Cannot upsert user without a handle.");
  }

  const payload = {
    name: profile.name,
    email: profile.email,
    handle: profile.handle,
    title: profile.title ?? "",
    bio: profile.bio ?? "",
    hobby: profile.hobby ?? "",
    focusArea: profile.focusArea ?? "",
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    socialLinks: profile.socialLinks ?? {},
    preferences: profile.preferences ?? {},
    portfolio: profile.portfolio ?? null,
    tagline: profile.tagline ?? "",
    avatar: profile.avatar ?? "",
    goals: profile.goals ?? "",
    milestones: Array.isArray(profile.milestones) ? profile.milestones : [],
    timeline: Array.isArray(profile.timeline) ? profile.timeline : [],
    lastGeneratedAt: profile.lastGeneratedAt ?? new Date()
  };

  if (isDatabaseEnabled()) {
    await initDatabase();
    if (isDatabaseEnabled()) {
      const updated = await User.findOneAndUpdate(
        { email: payload.email },
        { $set: payload },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();
      return normalizeDocument(updated);
    }
  }

  return storeInMemory(payload);
}

export function resetMemoryStore() {
  memoryStore.byEmail.clear();
  memoryStore.byHandle.clear();
}
