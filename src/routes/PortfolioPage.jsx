import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import PortfolioPreview from "../components/PortfolioPreview.jsx";
import { apiFetch } from "../utils/apiClient.js";

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-_]{1,28}[a-z0-9])?$/;

function PortfolioPage() {
  const [student, setStudent] = useState(null);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [lookupHandle, setLookupHandle] = useState("");
  const [searchParams] = useSearchParams();
  const { handle: routeHandle } = useParams();
  const lastLookupRef = useRef("");
  const lastEmailRef = useRef("");

  const fetchStudent = useCallback(
    async (rawHandle, { showEmptyError = false } = {}) => {
      const trimmedHandle = (rawHandle || "").trim().toLowerCase();

      setLookupHandle(rawHandle || "");

      if (!trimmedHandle) {
        if (showEmptyError) {
          setStatus({ state: "error", message: "Enter a handle to continue." });
          setStudent(null);
        }
        return;
      }

      if (!HANDLE_PATTERN.test(trimmedHandle)) {
        setStatus({
          state: "error",
          message: "Handles use lowercase letters, numbers, hyphen, or underscore."
        });
        setStudent(null);
        return;
      }

      lastLookupRef.current = trimmedHandle;
      setLookupHandle(rawHandle);
      setStatus({ state: "pending", message: "Fetching the latest portfolio…" });
      setStudent(null);

      try {
        const response = await apiFetch(`/api/students/${encodeURIComponent(trimmedHandle)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "We could not find that portfolio.");
        }

        setStudent(payload.student ?? null);
        setStatus({
          state: "success",
          message: payload.student?.portfolio
            ? "Here is the latest generated portfolio."
            : "We found that handle, but no portfolio has been generated yet."
        });
      } catch (error) {
        setStatus({
          state: "error",
          message: error.message || "Unexpected error fetching the portfolio."
        });
        setStudent(null);
      }
    },
    []
  );

  const handleLookup = async (event) => {
    event.preventDefault();
    await fetchStudent(lookupHandle, { showEmptyError: true });
  };

  useEffect(() => {
    if (!routeHandle) {
      return;
    }

    const trimmed = routeHandle.trim().toLowerCase();
    if (!trimmed || trimmed === lastLookupRef.current) {
      return;
    }

    fetchStudent(routeHandle, { showEmptyError: false });
  }, [routeHandle, fetchStudent]);

  useEffect(() => {
    const queryHandle = searchParams.get("handle");
    if (queryHandle) {
      const trimmed = queryHandle.trim().toLowerCase();
      if (trimmed && trimmed !== lastLookupRef.current) {
        fetchStudent(queryHandle, { showEmptyError: false });
      }
      return;
    }

    const queryEmail = searchParams.get("email");
    if (!queryEmail) {
      return;
    }

    const trimmedEmail = queryEmail.trim().toLowerCase();
    if (!trimmedEmail || trimmedEmail === lastEmailRef.current) {
      return;
    }

    lastEmailRef.current = trimmedEmail;
    const controller = new AbortController();

    (async () => {
      try {
        setStatus({ state: "pending", message: "Looking up the handle for that email…" });
        setStudent(null);

        const response = await apiFetch(`/api/users/${encodeURIComponent(trimmedEmail)}`, {
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "We could not find your portfolio.");
        }

        const handleFromProfile = payload.user?.handle;

        if (handleFromProfile) {
          await fetchStudent(handleFromProfile, { showEmptyError: false });
        } else {
          setStatus({
            state: "error",
            message: "That email is not linked to a handle yet."
          });
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setStatus({
          state: "error",
          message: error.message || "Unable to locate a handle for that email."
        });
        setStudent(null);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [fetchStudent, searchParams]);

  return (
    <div className="view-stack">
      <section className="app-intro-card">
        <span className="material-symbols-outlined app-intro-icon">
          web_stories
        </span>
        <h2>Preview student portfolio</h2>
        <p>
          Enter a student handle (for example, <code>@super100</code>) to load their
          Gemini-generated portfolio. You can also paste an email—if it is linked to a
          handle we&apos;ll look it up for you.
        </p>
      </section>

      <section className="lookup-card">
        <form onSubmit={handleLookup} className="lookup-form">
          <label htmlFor="lookupHandle">Student handle</label>
          <input
            id="lookupHandle"
            value={lookupHandle}
            onChange={(event) => setLookupHandle(event.target.value)}
            placeholder="@super100"
          />
          <button type="submit">Show portfolio</button>
        </form>
        {status.state !== "idle" && (
          <p
            className={`lookup-status lookup-status--${status.state}`}
          >
            {status.message}
          </p>
        )}
      </section>
      {student && student.portfolio && <PortfolioPreview student={student} />}
    </div>
  );
}

export default PortfolioPage;
