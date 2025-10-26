import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase, isDatabaseEnabled } from "./database.js";
import { sendPasswordResetEmail } from "./email.js";
import { generatePortfolioCopy } from "./gemini.js";
import { getUserByEmail, getUserByHandle, upsertUserProfile } from "./store.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

initDatabase();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", database: isDatabaseEnabled() ? "ready" : "memory" });
});

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-_]{1,28}[a-z0-9])?$/;
const ALLOWED_AVATAR_STYLES = new Set([
  "aurora",
  "sunrise",
  "midnight",
  "ocean",
  "forest",
  "citrus"
]);

const DEFAULT_PREFERENCES = {
  themeColor: "#137fec",
  showEmail: true,
  notifyOnUpdates: false
};

function sanitizeString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeHandle(value) {
  return sanitizeString(value).toLowerCase();
}

function isValidHandle(handle) {
  return HANDLE_PATTERN.test(handle);
}

function normalizeAvatarStyle(raw) {
  const candidate = sanitizeString(raw).toLowerCase();
  return ALLOWED_AVATAR_STYLES.has(candidate) ? candidate : "aurora";
}

function parseInterests(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => sanitizeString(item)).filter(Boolean);
  }

  return String(raw)
    .split(/,|;|\r?\n|·/g)
    .map((item) => sanitizeString(item))
    .filter(Boolean);
}

function parseMilestones(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((item) => sanitizeString(item).replace(/^[*-]\s*/, "")).filter(Boolean);
  }

  return String(raw)
    .split(/\r?\n/)
    .map((item) => sanitizeString(item).replace(/^[*-]\s*/, ""))
    .filter(Boolean);
}

function coerceObject(input) {
  if (!input) return {};
  if (typeof input === "object" && !Array.isArray(input)) {
    return input;
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      console.warn("[api] Preferences string input could not be parsed as JSON.");
    }
  }

  return {};
}

function parsePreferences(raw) {
  const input = coerceObject(raw);
  const preferences = { ...DEFAULT_PREFERENCES };

  if (typeof input.themeColor === "string" && input.themeColor.trim()) {
    preferences.themeColor = input.themeColor.trim();
  }

  if (typeof input.showEmail !== "undefined") {
    preferences.showEmail = Boolean(input.showEmail);
  }

  if (typeof input.notifyOnUpdates !== "undefined") {
    preferences.notifyOnUpdates = Boolean(input.notifyOnUpdates);
  }

  return preferences;
}

function parseSocialLinks(raw) {
  const source = coerceObject(raw);
  const links = {};

  if (source.linkedin) {
    const value = sanitizeString(source.linkedin);
    if (value) {
      links.linkedin = value;
    }
  }

  if (source.github) {
    const value = sanitizeString(source.github);
    if (value) {
      links.github = value;
    }
  }

  if (source.website) {
    const value = sanitizeString(source.website);
    if (value) {
      links.website = value;
    }
  }

  return links;
}

function mapMilestonesToTimeline(milestones, profile) {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return [];
  }

  return milestones.slice(0, 5).map((entry, index) => {
    const text = sanitizeString(entry);
    if (!text) {
      return {
        title: `Milestone ${index + 1}`,
        timeframe: "In progress",
        description: `${profile.name || profile.handle} is exploring new experiences.`
      };
    }

    const dashSplit = text.split(/[-–—:]/);
    let timeframe = "";
    let description = text;

    if (dashSplit.length > 1) {
      timeframe = sanitizeString(dashSplit[0]);
      description = sanitizeString(text.slice(dashSplit[0].length + 1));
    }

    if (!timeframe && /^\d{4}$/.test(description.slice(0, 4))) {
      timeframe = description.slice(0, 4);
      description = sanitizeString(description.slice(4));
    }

    const fallbackDescription = `${profile.name || profile.handle} achieved a new milestone.`;
    const normalizedDescription = description || fallbackDescription;
    const titleSeed = normalizedDescription.split(/[.!?]/)[0].trim();

    return {
      title:
        titleSeed ||
        timeframe ||
        `Milestone ${index + 1}`,
      timeframe: timeframe || `Phase ${index + 1}`,
      description: normalizedDescription
    };
  });
}

function applyPreferencesToPortfolio(portfolio, preferences, profile) {
  const result = {
    ...portfolio,
    hero: {
      ...(portfolio.hero || {}),
      tagline:
        portfolio.hero?.tagline ||
        profile.tagline ||
        `${profile.handle || profile.name} is crafting their path.`
    }
  };

  if (!Array.isArray(result.timeline) || result.timeline.length === 0) {
    result.timeline = mapMilestonesToTimeline(profile.milestones, profile);
  } else {
    result.timeline = result.timeline.map((item, index) => ({
      title: sanitizeString(item.title) || `Milestone ${index + 1}`,
      timeframe: sanitizeString(item.timeframe) || `Phase ${index + 1}`,
      description:
        sanitizeString(item.description) ||
        `${profile.name || profile.handle} reached a new milestone.`
    }));
  }

  if (preferences.themeColor) {
    result.themeColor = preferences.themeColor;
  }

  if (preferences.showEmail === false) {
    result.contact = null;
  } else if (preferences.showEmail === true && profile.email) {
    if (!result.contact?.value) {
      result.contact = {
        label: result.contact?.label || "Email",
        value: profile.email
      };
    }
  }

  if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0) {
    result.socialLinks = { ...profile.socialLinks };
  }

  if (!result.callToAction) {
    result.callToAction = {
      label: "Preview my journey",
      url: profile.socialLinks?.website || `https://example.com/${profile.handle || ""}`,
      note: "Swap in a link to your projects or mentor booking."
    };
  } else {
    result.callToAction = {
      label: result.callToAction.label || "Preview my journey",
      url:
        result.callToAction.url ||
        profile.socialLinks?.website ||
        `https://example.com/${profile.handle || ""}`,
      note:
        result.callToAction.note ||
        "Swap in a link to your projects or mentor booking."
    };
  }

  result.title =
    result.title ||
    `${profile.name || profile.handle || "Student"} · Portfolio`;

  return result;
}

function buildStudentPayload(record) {
  if (!record) {
    return null;
  }

  const timeline = Array.isArray(record.timeline) ? record.timeline : [];

  return {
    profile: {
      name: record.name,
      email: record.email,
      handle: record.handle,
      title: record.title,
      bio: record.bio,
      hobby: record.hobby,
      focusArea: record.focusArea,
      interests: record.interests,
      socialLinks: record.socialLinks,
      preferences: record.preferences,
      tagline: record.tagline,
      avatar: record.avatar,
      goals: record.goals,
      milestones: record.milestones,
      timeline,
      lastGeneratedAt: record.lastGeneratedAt
        ? new Date(record.lastGeneratedAt).toISOString()
        : null
    },
    portfolio: record.portfolio
  };
}

async function handleStudentUpsert(req, res) {
  const {
    name,
    email,
    handle,
    title,
    bio,
    hobby,
    focusArea,
    tagline,
    avatar,
    interests,
    goals,
    milestones,
    socialLinks,
    preferences
  } = req.body ?? {};

  const sanitizedName = sanitizeString(name);
  const normalizedEmail = sanitizeString(email).toLowerCase();
  const normalizedHandle = normalizeHandle(handle);
  const profileFocus = sanitizeString(focusArea || hobby);

  if (!sanitizedName || !normalizedEmail || !normalizedHandle) {
    return res.status(400).json({
      message: "Please include name, email, and a valid handle."
    });
  }

  if (!isValidHandle(normalizedHandle)) {
    return res.status(400).json({
      message:
        "Handle must be 3–30 characters using lowercase letters, numbers, hyphen, or underscore."
    });
  }

  if (!profileFocus) {
    return res.status(400).json({
      message: "Tell us about your focus area so we can shape the portfolio."
    });
  }

  try {
    const existingByHandle = await getUserByHandle(normalizedHandle);
    if (existingByHandle && existingByHandle.email !== normalizedEmail) {
      return res.status(409).json({
        message: "That handle is already in use. Choose a different one."
      });
    }

    const existingByEmail = await getUserByEmail(normalizedEmail);
    const isNewUser = !existingByEmail;

    let emailResult = null;
    if (isNewUser) {
      emailResult = await sendPasswordResetEmail({
        name: sanitizedName,
        email: normalizedEmail
      });
    }

    const interestList = parseInterests(interests);
    const preferenceSettings = parsePreferences(preferences);
    const parsedSocialLinks = parseSocialLinks(socialLinks);
    const milestoneList = parseMilestones(milestones);

    const userProfile = {
      name: sanitizedName,
      email: normalizedEmail,
      handle: normalizedHandle,
      title: sanitizeString(title),
      bio: sanitizeString(bio),
      hobby: profileFocus,
      focusArea: profileFocus,
      interests: interestList,
      socialLinks: parsedSocialLinks,
      preferences: preferenceSettings,
      tagline: sanitizeString(tagline),
      avatar: normalizeAvatarStyle(avatar),
      goals: sanitizeString(goals),
      milestones: milestoneList
    };

    const generatedPortfolio = await generatePortfolioCopy({
      ...userProfile,
      milestones: milestoneList
    });
    const portfolio = applyPreferencesToPortfolio(
      generatedPortfolio,
      preferenceSettings,
      userProfile
    );

    const timeline = Array.isArray(portfolio.timeline) ? portfolio.timeline : [];

    const stored = await upsertUserProfile({
      ...userProfile,
      portfolio,
      timeline,
      lastGeneratedAt: new Date()
    });

    return res.json({
      message: isNewUser
        ? "Student onboarded and portfolio generated."
        : "Student portfolio refreshed.",
      email: {
        attempted: isNewUser,
        result: emailResult
      },
      student: buildStudentPayload(stored)
    });
  } catch (error) {
    console.error("[api] Failed to onboard student:", error);
    return res.status(500).json({
      message: "We could not complete the onboarding. Please try again later."
    });
  }
}

app.post("/api/students", handleStudentUpsert);
app.post("/api/users", handleStudentUpsert);

app.get("/api/handles/:handle", async (req, res) => {
  const normalizedHandle = normalizeHandle(req.params?.handle);

  if (!normalizedHandle) {
    return res.status(400).json({
      message: "Provide a handle to check availability."
    });
  }

  if (!isValidHandle(normalizedHandle)) {
    return res.json({
      handle: normalizedHandle,
      available: false,
      reason: "invalid-format"
    });
  }

  try {
    const existing = await getUserByHandle(normalizedHandle);
    return res.json({
      handle: normalizedHandle,
      available: !existing,
      ownerEmail: existing?.email ?? null
    });
  } catch (error) {
    console.error("[api] Failed to check handle availability:", error);
    return res.status(500).json({
      message: "Unable to check handle availability right now."
    });
  }
});

app.get("/api/students/:handle", async (req, res) => {
  const normalizedHandle = normalizeHandle(req.params?.handle);

  if (!normalizedHandle) {
    return res.status(400).json({
      message: "Handle is required to lookup a student."
    });
  }

  if (!isValidHandle(normalizedHandle)) {
    return res.status(400).json({
      message: "Handle format is invalid."
    });
  }

  try {
    const existing = await getUserByHandle(normalizedHandle);
    if (!existing) {
      return res.status(404).json({ message: "Student not found." });
    }

    return res.json({ student: buildStudentPayload(existing) });
  } catch (error) {
    console.error("[api] Failed to fetch student:", error);
    return res.status(500).json({
      message: "Unable to fetch student portfolio at this time."
    });
  }
});

app.get("/api/users/:email", async (req, res) => {
  const rawEmail = req.params?.email;
  const normalizedEmail = rawEmail ? sanitizeString(rawEmail).toLowerCase() : "";

  if (!normalizedEmail) {
    return res.status(400).json({
      message: "Email address is required to lookup an existing user."
    });
  }

  try {
    const existingUser = await getUserByEmail(normalizedEmail);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user: existingUser });
  } catch (error) {
    console.error("[api] Failed to lookup user:", error);
    return res.status(500).json({
      message: "Unable to fetch user profile at this time."
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
