import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="notfound-wrapper">
      <div className="notfound-card">
        <span className="material-symbols-outlined notfound-icon">
          travel_explore
        </span>
        <h1>Page not found</h1>
        <p>
          We couldn&apos;t find the page you were looking for. Return to the creator studio
          to keep building your portfolio experience.
        </p>
        <Link className="wizard-button wizard-button--primary" to="/">
          Back to builder
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
