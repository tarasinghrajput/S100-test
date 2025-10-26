import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_THEME_COLOR = "#137fec";
const MAX_TIMELINE_ITEMS = 5;

let geminiClient = null;

if (GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  console.warn(
    "[gemini] GEMINI_API_KEY is missing. Falling back to deterministic portfolio copy."
  );
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeJsonCandidate(text) {
  const trimmed = sanitizeText(text);
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("[gemini] Failed to parse JSON response:", error);
    return null;
  }
}

function ensureInterestList(raw, fallback) {
  if (Array.isArray(raw)) {
    const list = raw
      .map((item) => sanitizeText(item))
      .filter(Boolean)
      .slice(0, 5);
    if (list.length > 0) {
      return list;
    }
  }
  return fallback;
}

function buildTimelineFromMilestones(milestones, profile) {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    const focus = profile.focusArea || profile.hobby || "their studies";
    return [
      {
        title: "Getting started",
        timeframe: "Recently",
        description: `${profile.name || profile.handle} began sharing projects in ${focus}.`
      },
      {
        title: "Hands-on practice",
        timeframe: "This term",
        description: `Building momentum by experimenting with new ideas and collaborating with peers.`
      },
      {
        title: "Looking ahead",
        timeframe: "Next",
        description: `Preparing to showcase work to mentors and future collaborators.`
      }
    ];
  }

  return milestones.slice(0, MAX_TIMELINE_ITEMS).map((entry, index) => {
    const text = sanitizeText(entry);
    if (!text) {
      return {
        title: `Milestone ${index + 1}`,
        timeframe: `Phase ${index + 1}`,
        description: `${profile.name || profile.handle} reached a new milestone.`
      };
    }

    const parts = text.split(/[-–—:]/);
    let timeframe = "";
    let description = text;

    if (parts.length > 1) {
      timeframe = sanitizeText(parts[0]);
      description = sanitizeText(text.slice(parts[0].length + 1));
    }

    if (!timeframe && /^\d{4}$/.test(description.slice(0, 4))) {
      timeframe = sanitizeText(description.slice(0, 4));
      description = sanitizeText(description.slice(4));
    }

    const summary = description || text;
    const titleSeed = summary.split(/[.!?]/)[0].trim();

    return {
      title: titleSeed || timeframe || `Milestone ${index + 1}`,
      timeframe: timeframe || `Phase ${index + 1}`,
      description:
        summary ||
        `${profile.name || profile.handle} reached a new milestone.`
    };
  });
}

function normalizeTimeline(rawTimeline, profile) {
  if (!Array.isArray(rawTimeline) || rawTimeline.length === 0) {
    return buildTimelineFromMilestones(profile.milestones, profile);
  }

  return rawTimeline.slice(0, MAX_TIMELINE_ITEMS).map((item, index) => {
    const title = sanitizeText(item?.title);
    const timeframe = sanitizeText(item?.timeframe);
    const description = sanitizeText(item?.description);

    const fallbackSummary = `${profile.name || profile.handle} reached a new milestone.`;

    return {
      title: title || `Milestone ${index + 1}`,
      timeframe: timeframe || `Phase ${index + 1}`,
      description: description || fallbackSummary
    };
  });
}

function normalizePortfolioResult(raw, profile) {
  const interestFallback = (profile.interests && profile.interests.length
    ? profile.interests
    : ["Collaborative projects", "Building a portfolio", "Leveling up skills"]
  ).slice(0, 5);

  const normalizedHero = {
    headline:
      sanitizeText(raw?.hero?.headline) ||
      `${profile.name || profile.handle} · Emerging talent`,
    subheading:
      sanitizeText(raw?.hero?.subheading) ||
      `Focused on ${profile.focusArea || profile.hobby || "creative growth"}.`,
    tagline:
      sanitizeText(raw?.hero?.tagline) ||
      profile.tagline ||
      `${profile.handle || profile.name} is crafting their path.`
  };

  const normalized = {
    themeColor: sanitizeText(raw?.themeColor) || DEFAULT_THEME_COLOR,
    title:
      sanitizeText(raw?.title) ||
      `${profile.name || `@${profile.handle}`} · Portfolio`,
    hero: normalizedHero,
    about:
      sanitizeText(raw?.about) ||
      (profile.bio ||
        `${profile.name || "This student"} thrives on curiosity and steady progress.`),
    hobbySpotlight: {
      title:
        sanitizeText(raw?.hobbySpotlight?.title) ||
        `Why ${profile.focusArea || profile.hobby || "this focus"} matters`,
      description:
        sanitizeText(raw?.hobbySpotlight?.description) ||
        `${profile.name || "This student"} channels energy into ${
          profile.focusArea || profile.hobby || "their craft"
        }, building confidence with every iteration.`
    },
    interestList: ensureInterestList(raw?.interestList, interestFallback),
    timeline: normalizeTimeline(raw?.timeline, profile),
    socialLinks: raw?.socialLinks && typeof raw.socialLinks === "object" ? raw.socialLinks : {},
    callToAction: {
      label: sanitizeText(raw?.callToAction?.label) || "Preview my journey",
      url:
        sanitizeText(raw?.callToAction?.url) ||
        profile.socialLinks?.website ||
        `https://example.com/${profile.handle || ""}`,
      note:
        sanitizeText(raw?.callToAction?.note) ||
        "Swap in your project repository or mentor booking link."
    },
    contact: raw?.contact ?? null
  };

  return normalized;
}

function fallbackPortfolio(profile) {
  const interestList =
    profile.interests && profile.interests.length > 0
      ? profile.interests.slice(0, 5)
      : ["Collaborative projects", "Hackathon sprints", "Sharing progress updates"];

  return {
    themeColor: DEFAULT_THEME_COLOR,
    title: `${profile.name || "Student"} · Portfolio`,
    hero: {
      headline: profile.title
        ? `${profile.name || profile.handle} · ${profile.title}`
        : `${profile.name || "An emerging creator"} building momentum`,
      subheading: profile.focusArea
        ? `${profile.name || "This student"} is focused on ${profile.focusArea.toLowerCase()}.`
        : `Follow along as projects and collaborations take shape.`,
      tagline:
        profile.tagline ||
        `${profile.handle || profile.name || "This student"} is crafting their path.`
    },
    about:
      profile.bio ||
      `${profile.name || "This student"} is steadily building confidence through applied learning and collaborative work.`,
    hobbySpotlight: {
      title: profile.focusArea ? `Inside ${profile.focusArea}` : "Focus in view",
      description: profile.focusArea
        ? `${profile.name || "This student"} draws inspiration from ${profile.focusArea.toLowerCase()}, experimenting and sharing work in progress.`
        : "A quick look at the passions driving this portfolio."
    },
    interestList,
    timeline: buildTimelineFromMilestones(profile.milestones, profile),
    socialLinks: profile.socialLinks ?? {},
    callToAction: {
      label: "See current work",
      url: profile.socialLinks?.website || `https://example.com/${profile.handle || ""}`,
      note: "Replace this link with your projects or mentorship booking."
    },
    contact: profile.email
      ? {
          label: "Email",
          value: profile.email
        }
      : null
  };
}

export async function generatePortfolioCopy(input) {
  if (!geminiClient) {
    return fallbackPortfolio(input);
  }

  const milestoneSummary = Array.isArray(input.milestones)
    ? input.milestones.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "";

  try {
    const prompt = `
You are a portfolio storyteller for a student program. Respond with strict JSON, no prose, no Markdown fences.

Return an object with:
- themeColor: hex colour string (fallback to ${DEFAULT_THEME_COLOR} if unsure).
- title: catchy page title using their name or handle.
- hero: { headline, subheading, tagline }.
- about: 2 sentences in first person celebrating their momentum.
- hobbySpotlight: { title, description } describing their focus area.
- interestList: 3-5 short punchy interests as strings.
- timeline: array of 3 timeline entries. Each entry MUST include { title, timeframe, description }.
- callToAction: { label, url, note } encouraging mentors to view their work.
- contact: { label, value } ONLY if an email is provided.
- socialLinks: include provided links when available.

Student profile:
- Name: ${input.name || "Unknown"}
- Handle: ${input.handle || "N/A"}
- Tagline: ${input.tagline || "Not provided"}
- Title: ${input.title || "Not provided"}
- Focus area: ${input.focusArea || input.hobby || "Not provided"}
- Goals: ${input.goals || "Not provided"}
- Bio: ${input.bio || "Not provided"}
- Interests: ${(input.interests || []).join(", ") || "Not provided"}
- Milestone ideas:
${milestoneSummary || "No milestone notes supplied."}
- LinkedIn: ${input.socialLinks?.linkedin || "Not provided"}
- GitHub: ${input.socialLinks?.github || "Not provided"}
- Website: ${input.socialLinks?.website || "Not provided"}
- Email: ${input.email || "Not provided"}

Guidelines:
- Keep language encouraging, professional, and concise.
- Tagline should build on the provided one if it exists.
- Timeline should highlight progress and near-term plans using the milestone ideas when present.
`;

    const response = await geminiClient.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    const candidates = response?.candidates ?? [];

    for (const candidate of candidates) {
      const text = candidate.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();
      const parsed = text ? sanitizeJsonCandidate(text) : null;
      if (parsed) {
        return normalizePortfolioResult(parsed, input);
      }
    }

    const rawText =
      typeof response?.text === "function" ? response.text() : response?.text;
    if (rawText) {
      const parsed = sanitizeJsonCandidate(rawText);
      if (parsed) {
        return normalizePortfolioResult(parsed, input);
      }
    }

    console.warn(
      "[gemini] Did not receive valid JSON from Gemini. Falling back to heuristic copy."
    );
    return fallbackPortfolio(input);
  } catch (error) {
    console.error("[gemini] Generation failed, using fallback:", error);
    return fallbackPortfolio(input);
  }
}
