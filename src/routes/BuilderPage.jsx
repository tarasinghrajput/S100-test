import { useState } from "react";
import { Link } from "react-router-dom";
import SignupForm from "../components/SignupForm.jsx";

const initialState = {
  status: "idle",
  message: "",
  portfolio: null,
  email: null,
  user: null,
  student: null,
  lookupEmail: "",
  lookupHandle: ""
};

function BuilderPage() {
  const [result, setResult] = useState(initialState);

  return (
    <div className="view-stack">
      <section className="app-intro-card">
        <span className="material-symbols-outlined app-intro-icon">
          auto_awesome
        </span>
        <h2>Onboard a student portfolio</h2>
        <p>
          Walk through the onboarding wizard to reserve a handle, capture their story, and
          let Gemini craft a timeline-powered portfolio page.
        </p>
      </section>

      <SignupForm onResult={setResult} loading={result.status === "pending"} />

      {result.status !== "idle" && (
        <section
          className={`app-status-card${
            result.status === "error" ? " app-status-card--error" : ""
          }`.trim()}
        >
          <h3>Automation status</h3>
          <p>{result.message}</p>
          {result.status === "success" && result.student?.profile?.handle && (
            <p className="app-status-subtext">
              Assigned to <strong>@{result.student.profile.handle}</strong>
            </p>
          )}
          {result.status === "success" && (result.lookupHandle || result.lookupEmail) && (
            <div className="status-actions">
              {result.lookupHandle && (
                <Link
                  className="wizard-button wizard-button--primary"
                  to={`/portfolio/${encodeURIComponent(result.lookupHandle)}`}
                >
                  View portfolio
                </Link>
              )}
              {(result.lookupEmail || result.student?.profile?.email) && (
                <Link
                  className="wizard-button wizard-button--secondary"
                  to={`/account?email=${encodeURIComponent(
                    result.lookupEmail || result.student?.profile?.email || ""
                  )}`}
                >
                  Manage account
                </Link>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default BuilderPage;
