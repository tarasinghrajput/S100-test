import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const stepSequence = [
  {
    key: "onboarding",
    title: "Student Onboarding",
    description: "Choose your handle, avatar, and tagline before we generate anything."
  },
  {
    key: "story",
    title: "Story & Focus",
    description: "Share the goals, focus areas, and milestones that should appear on your timeline."
  },
  {
    key: "preferences",
    title: "Sharing Preferences",
    description: "Fine-tune your theme, contact visibility, and social links."
  },
  {
    key: "review",
    title: "Review & Launch",
    description: "Confirm the details, then generate your portfolio and timeline."
  }
];

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-_]{1,28}[a-z0-9])?$/;
const interestSplitter = /,|\n|;|·/g;
const milestoneSplitter = /\r?\n/g;
const avatarOptions = [
  {
    id: "aurora",
    label: "Aurora",
    gradient: ["#7f5af0", "#2cb67d"]
  },
  {
    id: "sunrise",
    label: "Sunrise",
    gradient: ["#f97316", "#facc15"]
  },
  {
    id: "midnight",
    label: "Midnight",
    gradient: ["#0f172a", "#64748b"]
  },
  {
    id: "ocean",
    label: "Ocean",
    gradient: ["#0ea5e9", "#22d3ee"]
  },
  {
    id: "forest",
    label: "Forest",
    gradient: ["#16a34a", "#4ade80"]
  },
  {
    id: "citrus",
    label: "Citrus",
    gradient: ["#f97316", "#ef4444"]
  }
];

const defaultAnswers = {
  name: "",
  handle: "",
  title: "",
  bio: "",
  hobby: "",
  interests: "",
  tagline: "",
  goals: "",
  milestones: "",
  avatarStyle: avatarOptions[0].id
};

const defaultSocialLinks = {
  linkedin: "",
  github: "",
  website: ""
};

const defaultPreferences = {
  themeColor: "#137fec",
  showEmail: true,
  notifyOnUpdates: false
};

function splitInterests(value) {
  if (!value) return [];
  return String(value)
    .split(interestSplitter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitMilestones(value) {
  if (!value) return [];
  return String(value)
    .split(milestoneSplitter)
    .map((item) => item.replace(/^[*-]\s*/, "").trim())
    .filter(Boolean);
}

function parseSavedPreferences(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...defaultPreferences };
  }

  return {
    themeColor:
      typeof raw.themeColor === "string" && raw.themeColor.trim()
        ? raw.themeColor.trim()
        : defaultPreferences.themeColor,
    showEmail:
      typeof raw.showEmail === "boolean"
        ? raw.showEmail
        : defaultPreferences.showEmail,
    notifyOnUpdates:
      typeof raw.notifyOnUpdates === "boolean"
        ? raw.notifyOnUpdates
        : defaultPreferences.notifyOnUpdates
  };
}

function parseSavedSocialLinks(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...defaultSocialLinks };
  }

  return {
    linkedin:
      typeof raw.linkedin === "string" ? raw.linkedin.trim() : defaultSocialLinks.linkedin,
    github:
      typeof raw.github === "string" ? raw.github.trim() : defaultSocialLinks.github,
    website:
      typeof raw.website === "string" ? raw.website.trim() : defaultSocialLinks.website
  };
}

function isValidEmail(value) {
  if (!value) return false;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function SignupForm({ onResult, loading }) {
  const totalSteps = stepSequence.length;
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState(defaultAnswers);
  const [socialLinks, setSocialLinks] = useState(defaultSocialLinks);
  const [preferences, setPreferences] = useState(() => ({ ...defaultPreferences }));
  const [activeStep, setActiveStep] = useState(0);
  const [formError, setFormError] = useState("");
  const [lookupState, setLookupState] = useState({ status: "idle", message: "" });
  const [handleStatus, setHandleStatus] = useState({ state: "idle", message: "" });
  const navigate = useNavigate();

  const currentStep = stepSequence[activeStep];
  const summaryInterests = useMemo(() => splitInterests(answers.interests), [answers.interests]);
  const summaryMilestones = useMemo(
    () => splitMilestones(answers.milestones),
    [answers.milestones]
  );
  const selectedAvatar = useMemo(
    () => avatarOptions.find((option) => option.id === answers.avatarStyle) || avatarOptions[0],
    [answers.avatarStyle]
  );
  const progressPercentage = Math.round(((activeStep + 1) / totalSteps) * 100);

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setLookupState((previous) =>
        previous.status === "idle" ? previous : { status: "idle", message: "" }
      );
      return;
    }

    const controller = new AbortController();
    const debounceTimer = setTimeout(async () => {
      setLookupState({ status: "pending", message: "" });

      try {
        const response = await fetch(`/api/users/${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        });

        if (response.status === 404) {
          setLookupState({ status: "not-found", message: "" });
          return;
        }

        if (!response.ok) {
          throw new Error("Lookup failed");
        }

        const payload = await response.json();
        const user = payload.user ?? {};
        const interestsString = Array.isArray(user.interests)
          ? user.interests.join(", ")
          : user.interests || "";

        const milestoneString = Array.isArray(user.milestones)
          ? user.milestones.join("\n")
          : user.milestones || "";
        const focusValue = user.focusArea || user.hobby || "";

        setAnswers({
          name: user.name || "",
          handle: user.handle || "",
          title: user.title || "",
          bio: user.bio || "",
          hobby: focusValue,
          interests: interestsString,
          tagline: user.tagline || "",
          goals: user.goals || "",
          milestones: milestoneString,
          avatarStyle: user.avatar || avatarOptions[0].id
        });
        setSocialLinks(parseSavedSocialLinks(user.socialLinks));
        setPreferences(parseSavedPreferences(user.preferences));
        setFormError("");
        setActiveStep(totalSteps - 1);
        setLookupState({
          status: "found",
          message: "Welcome back! We've pre-filled your previous details."
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        console.error("[client] Failed to lookup existing user:", error);
        setLookupState({
          status: "error",
          message: "We could not check your previous signup right now."
        });
      }
    }, 400);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [email, totalSteps]);

  useEffect(() => {
    const trimmedHandle = answers.handle.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedHandle) {
      setHandleStatus({ state: "idle", message: "" });
      return;
    }

    if (trimmedHandle.length < 3) {
      setHandleStatus({
        state: "invalid",
        message: "Handle must be at least three characters."
      });
      return;
    }

    if (!HANDLE_PATTERN.test(trimmedHandle)) {
      setHandleStatus({
        state: "invalid",
        message:
          "Use lowercase letters, numbers, hyphen, or underscore."
      });
      return;
    }

    const controller = new AbortController();
    const debounceTimer = setTimeout(async () => {
      setHandleStatus({ state: "pending", message: "" });
      try {
        const response = await fetch(`/api/handles/${encodeURIComponent(trimmedHandle)}`, {
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Handle lookup failed.");
        }

        const isSelfOwned =
          payload.ownerEmail && trimmedEmail && payload.ownerEmail === trimmedEmail;
        if (payload.available || isSelfOwned) {
          setHandleStatus({
            state: "available",
            message: payload.available
              ? "Handle is available."
              : "This handle already belongs to your account."
          });
        } else if (payload.reason === "invalid-format") {
          setHandleStatus({
            state: "invalid",
            message: "Handle format is invalid."
          });
        } else {
          setHandleStatus({
            state: "taken",
            message: "That handle is already taken."
          });
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        console.error("[client] Handle availability check failed:", error);
        setHandleStatus({
          state: "error",
          message: "We couldn't verify this handle right now."
        });
      }
    }, 350);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [answers.handle, email]);

  const setAnswerField = (key) => (event) => {
    const value = event.target.value;
    setAnswers((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const handleHandleChange = (event) => {
    const value = event.target.value;
    const normalized = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    setAnswers((previous) => ({
      ...previous,
      handle: normalized
    }));
  };

  const handleAvatarSelect = (id) => {
    setAnswers((previous) => ({
      ...previous,
      avatarStyle: id
    }));
  };

  const handleSocialLinkChange = (key) => (event) => {
    const value = event.target.value;
    setSocialLinks((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const handleThemeColorChange = (event) => {
    const value = event.target.value;
    setPreferences((previous) => ({
      ...previous,
      themeColor: value
    }));
  };

  const handlePreferenceToggle = (key) => (event) => {
    const checked = event.target.checked;
    setPreferences((previous) => ({
      ...previous,
      [key]: checked
    }));
  };

  const validateStep = (index) => {
    const step = stepSequence[index];

    if (!step) return "";

    if (step.key === "onboarding") {
      if (!answers.handle.trim()) {
        return "Choose a handle to reserve your student space.";
      }
      if (!HANDLE_PATTERN.test(answers.handle.trim())) {
        return "Handle must use lowercase letters, numbers, hyphen, or underscore.";
      }
      if (handleStatus.state === "taken") {
        return "That handle is already taken.";
      }
      if (handleStatus.state === "invalid") {
        return handleStatus.message || "Handle format is invalid.";
      }
      if (!answers.name.trim()) {
        return "Please enter your full name before continuing.";
      }
      if (!isValidEmail(email)) {
        return "Enter a valid email so we can recognise you and send the reset link.";
      }
    }

    if (step.key === "story") {
      if (!answers.hobby.trim()) {
        return "Describe your focus area so we can tailor the copy.";
      }
    }

    return "";
  };

  const handleNext = () => {
    const error = validateStep(activeStep);
    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    setActiveStep((previous) => Math.min(previous + 1, totalSteps - 1));
  };

  const handleBack = () => {
    if (activeStep === 0) {
      return;
    }
    setFormError("");
    setActiveStep((previous) => Math.max(previous - 1, 0));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const requiredIndices = [0, 1];
    for (const index of requiredIndices) {
      const error = validateStep(index);
      if (error) {
        setFormError(error);
        setActiveStep(index);
        return;
      }
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedHandle = answers.handle.trim().toLowerCase();
    setFormError("");
    onResult({
      status: "pending",
      message: "Generating your portfolio...",
      portfolio: null,
      email: null,
      user: null,
      student: null,
      lookupEmail: trimmedEmail,
      lookupHandle: trimmedHandle
    });

    const cleanedLinks = Object.entries(socialLinks).reduce((acc, [key, value]) => {
      const trimmed = value.trim();
      if (trimmed) {
        acc[key] = trimmed;
      }
      return acc;
    }, {});

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: answers.name,
          handle: trimmedHandle,
          tagline: answers.tagline,
          avatar: answers.avatarStyle,
          title: answers.title,
          bio: answers.bio,
          email: trimmedEmail,
          hobby: answers.hobby,
          focusArea: answers.hobby,
          interests: answers.interests,
          goals: answers.goals,
          milestones: answers.milestones,
          socialLinks: cleanedLinks,
          preferences
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "The request failed. Please try again.");
      }

      onResult({
        status: "success",
        message: payload.message || "Portfolio generated.",
        student: payload.student || null,
        portfolio: payload.student?.portfolio || null,
        email: payload.email || null,
        user: payload.student?.profile || null,
        lookupEmail: trimmedEmail,
        lookupHandle: payload.student?.profile?.handle || trimmedHandle
      });
    } catch (error) {
      onResult({
        status: "error",
        message: error.message || "Unexpected error while generating portfolio.",
        portfolio: null,
        email: null,
        user: null,
        student: null,
        lookupEmail: trimmedEmail,
        lookupHandle: trimmedHandle
      });
    }
  };

  const isFinalStep = activeStep === totalSteps - 1;
  const nextButtonLabel =
    activeStep === totalSteps - 2 ? "Review details" : "Next step";

  const renderProgress = () => (
    <div className="wizard-progress">
      <div className="wizard-progress-meta">
        <p>
          Step {activeStep + 1} of {totalSteps}: {currentStep.title}
        </p>
        <p>{progressPercentage}%</p>
      </div>
      <div className="wizard-progress-track">
        <span
          className="wizard-progress-indicator"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );

  const renderOnboardingStep = () => {
    const handleHintText =
      handleStatus.state === "pending"
        ? "Checking handle availability…"
        : handleStatus.message;
    const handleHintClass =
      handleStatus.state === "available"
        ? "wizard-hint wizard-hint--success"
        : handleStatus.state === "error" ||
          handleStatus.state === "taken" ||
          handleStatus.state === "invalid"
        ? "wizard-hint wizard-hint--error"
        : "wizard-hint";

    return (
      <>
        <div className="wizard-banner">
          <div className="wizard-brand">
            <span className="material-symbols-outlined wizard-brand-icon">
              auto_awesome_mosaic
            </span>
            <h2>PortfolioGen</h2>
          </div>
          <button
            type="button"
            className="wizard-account-btn"
            onClick={() => {
              const destEmail = email.trim().toLowerCase();
              if (destEmail) {
                navigate(`/account?email=${encodeURIComponent(destEmail)}`);
              } else {
                navigate("/account");
              }
            }}
          >
            My Account
          </button>
        </div>

        <div className="wizard-heading">
          <div>
            <p className="wizard-title">Claim your student handle</p>
            <p className="wizard-subtitle">
              Reserve a unique handle and pick an avatar vibe before we generate anything.
            </p>
          </div>
        </div>

        {renderProgress()}

        <div className="wizard-grid wizard-grid--two">
          <div className="form-field">
            <label htmlFor="handle">Student Handle</label>
            <div className="input-with-prefix">
              <span>@</span>
              <input
                id="handle"
                name="handle"
                placeholder="super100"
                value={answers.handle}
                onChange={handleHandleChange}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            {handleStatus.state !== "idle" && handleHintText && (
              <p className={handleHintClass}>{handleHintText}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              placeholder="Enter your full name"
              value={answers.name}
              onChange={setAnswerField("name")}
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-field form-field--full">
            <label htmlFor="tagline">Tagline</label>
            <input
              id="tagline"
              name="tagline"
              placeholder="Designing products that put people first"
              value={answers.tagline}
              onChange={setAnswerField("tagline")}
              disabled={loading}
            />
            <p className="field-hint">
              Keep it short and energetic. Gemini will reuse this tone in the copy.
            </p>
          </div>
        </div>

        <div className="avatar-selector">
          <p className="avatar-selector-title">Pick an avatar vibe</p>
          <div className="avatar-option-grid">
            {avatarOptions.map((option) => {
              const isSelected = answers.avatarStyle === option.id;
              const initials =
                answers.handle?.charAt(0) ||
                answers.name?.charAt(0) ||
                option.label.charAt(0);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`avatar-option${isSelected ? " avatar-option--active" : ""}`}
                  onClick={() => handleAvatarSelect(option.id)}
                  disabled={loading}
                >
                  <span
                    className="avatar-option-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${option.gradient[0]}, ${option.gradient[1]})`
                    }}
                  >
                    {initials?.toUpperCase()}
                  </span>
                  <span className="avatar-option-label">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {lookupState.status === "pending" && (
          <p className="wizard-hint">Checking if you have signed up before…</p>
        )}
        {lookupState.status === "found" && (
          <p className="wizard-hint wizard-hint--success">{lookupState.message}</p>
        )}
        {lookupState.status === "not-found" && (
          <p className="wizard-hint">New student? Great—we&apos;ll create a fresh profile.</p>
        )}
        {lookupState.status === "error" && (
          <p className="wizard-hint wizard-hint--error">{lookupState.message}</p>
        )}
      </>
    );
  };

  const renderStoryStep = () => (
    <>
      <div className="wizard-heading">
        <div>
          <p className="wizard-title">{currentStep.title}</p>
          <p className="wizard-subtitle">{currentStep.description}</p>
        </div>
      </div>

      {renderProgress()}

      <div className="wizard-grid wizard-grid--two">
        <div className="form-field">
          <label htmlFor="professionalTitle">Role or Title</label>
          <input
            id="professionalTitle"
            name="professionalTitle"
            placeholder="e.g., Product design student"
            value={answers.title}
            onChange={setAnswerField("title")}
            disabled={loading}
            autoComplete="organization-title"
          />
        </div>
        <div className="form-field">
          <label htmlFor="focusArea">Focus area</label>
          <input
            id="focusArea"
            name="focusArea"
            placeholder="Front-end engineering, community projects…"
            value={answers.hobby}
            onChange={setAnswerField("hobby")}
            disabled={loading}
          />
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="bio">Short bio</label>
          <textarea
            id="bio"
            name="bio"
            placeholder="Tell us about your drive, your learning style, or recent wins."
            value={answers.bio}
            onChange={setAnswerField("bio")}
            disabled={loading}
          />
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="interests">Signature interests</label>
          <textarea
            id="interests"
            name="interests"
            placeholder="Prototyping, user research, hackathons"
            value={answers.interests}
            onChange={setAnswerField("interests")}
            disabled={loading}
          />
          <p className="field-hint">Separate interests with commas. We’ll surface the best 3–5.</p>
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="goals">Goals & momentum</label>
          <textarea
            id="goals"
            name="goals"
            placeholder="Ship two portfolio-ready projects, find a mentor, lead a community workshop…"
            value={answers.goals}
            onChange={setAnswerField("goals")}
            disabled={loading}
          />
          <p className="field-hint">These goals help shape the about section and call-to-action.</p>
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="milestones">Milestones for the timeline</label>
          <textarea
            id="milestones"
            name="milestones"
            placeholder={`2024 - Joined the Super100 cohort\nMay 2024 - Built a prototype for campus navigation\nQ3 2024 - Presenting capstone at demo day`}
            value={answers.milestones}
            onChange={setAnswerField("milestones")}
            disabled={loading}
          />
          <p className="field-hint">Add one milestone per line. Include dates or phases if you can.</p>
        </div>
      </div>

      {summaryInterests.length > 0 && (
        <div className="interest-preview">
          <span>Interest preview:</span>
          <div className="interest-chips">
            {summaryInterests.map((item) => (
              <span key={item} className="interest-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {summaryMilestones.length > 0 && (
        <div className="milestone-preview">
          <span>Timeline preview:</span>
          <ol>
            {summaryMilestones.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      )}
    </>
  );

  const renderPreferencesStep = () => (
    <>
      <div className="wizard-heading">
        <div>
          <p className="wizard-title">{currentStep.title}</p>
          <p className="wizard-subtitle">{currentStep.description}</p>
        </div>
      </div>

      {renderProgress()}

      <div className="preferences-group">
        <div className="preferences-card">
          <label htmlFor="themeColor">Theme colour</label>
          <input
            id="themeColor"
            type="color"
            value={preferences.themeColor}
            onChange={handleThemeColorChange}
            disabled={loading}
          />
        </div>
        <label className="preferences-card preferences-card--toggle">
          <input
            type="checkbox"
            checked={preferences.showEmail}
            onChange={handlePreferenceToggle("showEmail")}
            disabled={loading}
          />
          <span>Display my email on the generated portfolio</span>
        </label>
        <label className="preferences-card preferences-card--toggle">
          <input
            type="checkbox"
            checked={preferences.notifyOnUpdates}
            onChange={handlePreferenceToggle("notifyOnUpdates")}
            disabled={loading}
          />
          <span>Email me when the template gets new features</span>
        </label>
      </div>

      <div className="wizard-grid wizard-grid--two">
        <div className="form-field">
          <label htmlFor="linkedin">LinkedIn profile</label>
          <div className="input-with-icon">
            <span className="material-symbols-outlined">link</span>
            <input
              id="linkedin"
              name="linkedin"
              placeholder="linkedin.com/in/yourprofile"
              value={socialLinks.linkedin}
              onChange={handleSocialLinkChange("linkedin")}
              disabled={loading}
              autoComplete="url"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="github">GitHub profile</label>
          <div className="input-with-icon">
            <span className="material-symbols-outlined">code</span>
            <input
              id="github"
              name="github"
              placeholder="github.com/yourusername"
              value={socialLinks.github}
              onChange={handleSocialLinkChange("github")}
              disabled={loading}
              autoComplete="url"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="website">Website or portfolio</label>
          <div className="input-with-icon">
            <span className="material-symbols-outlined">language</span>
            <input
              id="website"
              name="website"
              placeholder="yourdomain.com"
              value={socialLinks.website}
              onChange={handleSocialLinkChange("website")}
              disabled={loading}
              autoComplete="url"
            />
          </div>
        </div>
      </div>
    </>
  );

  const renderReviewStep = () => {
    const avatarInitial =
      answers.handle?.charAt(0) || answers.name?.charAt(0) || "S";

    return (
      <>
        <div className="wizard-heading">
          <div>
            <p className="wizard-title">{currentStep.title}</p>
            <p className="wizard-subtitle">{currentStep.description}</p>
          </div>
        </div>

        {renderProgress()}

        <div className="review-card">
          <div className="review-section review-section--identity">
            <h4>Student identity</h4>
            <div
              className="review-avatar"
              style={{
                background: `linear-gradient(135deg, ${selectedAvatar.gradient[0]}, ${selectedAvatar.gradient[1]})`
              }}
            >
              {avatarInitial.toUpperCase()}
            </div>
            <dl>
              <dt>Handle</dt>
              <dd>{answers.handle ? `@${answers.handle}` : "—"}</dd>
              <dt>Name</dt>
              <dd>{answers.name || "—"}</dd>
              <dt>Email</dt>
              <dd>{email || "—"}</dd>
              <dt>Tagline</dt>
              <dd>{answers.tagline || "—"}</dd>
            </dl>
          </div>
          <div className="review-section">
            <h4>Story & focus</h4>
            <dl>
              <dt>Title</dt>
              <dd>{answers.title || "—"}</dd>
              <dt>Focus area</dt>
              <dd>{answers.hobby || "—"}</dd>
              <dt>Bio</dt>
              <dd>{answers.bio || "—"}</dd>
              <dt>Goals</dt>
              <dd>{answers.goals || "—"}</dd>
            </dl>
          </div>
          <div className="review-section">
            <h4>Interests & milestones</h4>
            <dl>
              <dt>Interests</dt>
              <dd>
                {summaryInterests.length > 0 ? summaryInterests.join(", ") : "—"}
              </dd>
              <dt>Timeline seeds</dt>
              <dd>
                {summaryMilestones.length > 0 ? (
                  <ol className="review-list">
                    {summaryMilestones.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  "—"
                )}
              </dd>
            </dl>
          </div>
          <div className="review-section">
            <h4>Links & preferences</h4>
            <dl>
              <dt>LinkedIn</dt>
              <dd>{socialLinks.linkedin || "—"}</dd>
              <dt>GitHub</dt>
              <dd>{socialLinks.github || "—"}</dd>
              <dt>Website</dt>
              <dd>{socialLinks.website || "—"}</dd>
              <dt>Theme colour</dt>
              <dd>{preferences.themeColor}</dd>
              <dt>Email visibility</dt>
              <dd>{preferences.showEmail ? "Shown on portfolio" : "Hidden"}</dd>
              <dt>Product updates</dt>
              <dd>{preferences.notifyOnUpdates ? "Subscribed" : "Not subscribed"}</dd>
            </dl>
          </div>
        </div>

        <p className="wizard-hint">
          When you generate your portfolio we’ll keep these details saved for your next visit.
        </p>
      </>
    );
  };

  const renderStepContent = () => {
    switch (currentStep.key) {
      case "onboarding":
        return renderOnboardingStep();
      case "story":
        return renderStoryStep();
      case "preferences":
        return renderPreferencesStep();
      case "review":
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="wizard-card">
      <form className="wizard-form" onSubmit={handleSubmit}>
        {renderStepContent()}

        {formError && <p className="wizard-hint wizard-hint--error">{formError}</p>}

        <div className="wizard-actions">
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={handleBack}
            disabled={loading || activeStep === 0}
          >
            Back
          </button>

          {isFinalStep ? (
            <button
              type="submit"
              className="wizard-button wizard-button--primary"
              disabled={loading}
            >
              {loading ? "Working..." : "Generate portfolio"}
            </button>
          ) : (
            <button
              type="button"
              className="wizard-button wizard-button--primary"
              onClick={handleNext}
              disabled={loading}
            >
              {nextButtonLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default SignupForm;
