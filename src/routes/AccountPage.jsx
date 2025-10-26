import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch, buildApiUrl } from "../utils/apiClient.js";

function AccountPage() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const lastLookupRef = useRef("");

  useEffect(() => {
    if (!email) {
      setProfile(null);
      setStatus({ state: "idle", message: "" });
    }
  }, [email]);

  const lookupProfile = useCallback(
    async (rawEmail, { showEmptyError = false } = {}) => {
      const trimmedEmail = (rawEmail || "").trim().toLowerCase();
      if (!trimmedEmail) {
        if (showEmptyError) {
          setStatus({ state: "error", message: "Enter your email to continue." });
          setProfile(null);
        }
        return;
      }

      lastLookupRef.current = trimmedEmail;
      setEmail(rawEmail);
      setIsLoading(true);
      setStatus({ state: "pending", message: "Retrieving your saved profile…" });
      setProfile(null);

      try {
        const response = await apiFetch(`/api/users/${encodeURIComponent(trimmedEmail)}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || "We could not find an account with that email.");
        }

        setProfile(payload.user ?? null);
        setStatus({
          state: "success",
          message: "Here is the profile we have stored for you."
        });
      } catch (error) {
        setStatus({
          state: "error",
          message: error.message || "Unexpected error fetching your account."
        });
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleLookup = async (event) => {
    event.preventDefault();
    await lookupProfile(email, { showEmptyError: true });
  };

  useEffect(() => {
    const queryEmail = searchParams.get("email");
    if (!queryEmail) {
      return;
    }

    const trimmed = queryEmail.trim().toLowerCase();
    if (trimmed && trimmed !== lastLookupRef.current) {
      lookupProfile(queryEmail, { showEmptyError: false });
    }
  }, [lookupProfile, searchParams]);

  return (
    <div className="view-stack">
      <section className="app-intro-card">
        <span className="material-symbols-outlined app-intro-icon">
          account_circle
        </span>
        <h2>Manage your profile</h2>
        <p>
          Review the information you shared with PortfolioGen and update it from the
          Builder tab. Use this space to confirm your preferences or share the reset link.
        </p>
      </section>

      <section className="lookup-card">
        <form onSubmit={handleLookup} className="lookup-form">
          <label htmlFor="accountEmail">Email address</label>
          <input
            id="accountEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Looking up…" : "Find my account"}
          </button>
        </form>
        {status.state !== "idle" && (
          <p className={`lookup-status lookup-status--${status.state}`}>
            {status.message}
          </p>
        )}
      </section>

      {profile && (
        <section className="account-card">
          <header>
            <h3>{profile.name || "Unnamed creator"}</h3>
            {profile.title && <p>{profile.title}</p>}
          </header>
          <div className="account-columns">
            <dl>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
              <dt>Handle</dt>
              <dd>{profile.handle ? `@${profile.handle}` : "—"}</dd>
              <dt>Tagline</dt>
              <dd>{profile.tagline || "—"}</dd>
              <dt>Bio</dt>
              <dd>{profile.bio || "—"}</dd>
              <dt>Goals</dt>
              <dd>{profile.goals || "—"}</dd>
            </dl>
            <dl>
              <dt>Focus area</dt>
              <dd>{profile.focusArea || profile.hobby || "—"}</dd>
              <dt>Interests</dt>
              <dd>
                {Array.isArray(profile.interests) && profile.interests.length > 0
                  ? profile.interests.join(", ")
                  : "—"}
              </dd>
              <dt>Milestones</dt>
              <dd>
                {Array.isArray(profile.milestones) && profile.milestones.length > 0 ? (
                  <ol className="review-list">
                    {profile.milestones.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  "—"
                )}
              </dd>
            </dl>
            <dl>
              <dt>LinkedIn</dt>
              <dd>{profile.socialLinks?.linkedin || "—"}</dd>
              <dt>GitHub</dt>
              <dd>{profile.socialLinks?.github || "—"}</dd>
              <dt>Website</dt>
              <dd>{profile.socialLinks?.website || "—"}</dd>
              <dt>Preferences</dt>
              <dd>
                Theme colour: {profile.preferences?.themeColor || "default"}
                <br />
                Email visibility:{" "}
                {profile.preferences?.showEmail ? "Shown" : "Hidden"}
                <br />
                Product updates:{" "}
                {profile.preferences?.notifyOnUpdates ? "Subscribed" : "Unsubscribed"}
              </dd>
            </dl>
          </div>
          <div className="account-actions">
            <a
              className="wizard-button wizard-button--primary"
              href={buildApiUrl(`/api/users/${encodeURIComponent(profile.email)}`)}
              target="_blank"
              rel="noreferrer"
            >
              Download JSON snapshot
            </a>
            <a
              className="wizard-button wizard-button--secondary"
              href="mailto:support@portfoliogen.dev"
            >
              Contact support
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

export default AccountPage;
