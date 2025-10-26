const avatarPalette = {
  aurora: ["#7f5af0", "#2cb67d"],
  sunrise: ["#f97316", "#facc15"],
  midnight: ["#0f172a", "#64748b"],
  ocean: ["#0ea5e9", "#22d3ee"],
  forest: ["#16a34a", "#4ade80"],
  citrus: ["#f97316", "#ef4444"]
};

function humaniseLinkLabel(key) {
  switch (key) {
    case "linkedin":
      return "LinkedIn";
    case "github":
      return "GitHub";
    case "website":
      return "Website";
    default:
      return key.replace(/^[a-z]/, (match) => match.toUpperCase());
  }
}

function PortfolioPreview({ student }) {
  if (!student) {
    return null;
  }

  const profile = student.profile ?? {};
  const portfolio = student.portfolio ?? {};
  const themeColor = portfolio.themeColor || "#137fec";
  const hero = portfolio.hero || {};
  const timeline = Array.isArray(portfolio.timeline) ? portfolio.timeline : [];
  const interestList = Array.isArray(portfolio.interestList) ? portfolio.interestList : [];
  const socialLinks = portfolio.socialLinks || profile.socialLinks || {};
  const socialEntries = Object.entries(socialLinks).filter(([, value]) => Boolean(value));
  const avatarKey = profile.avatar && avatarPalette[profile.avatar] ? profile.avatar : "aurora";
  const avatarColors = avatarPalette[avatarKey];
  const avatarInitial = (profile.handle || profile.name || "S").charAt(0).toUpperCase();

  return (
    <section className="portfolio-card">
      <header
        className="portfolio-header"
        style={{
          borderColor: themeColor,
          background: `${themeColor}1a`
        }}
      >
        <div className="portfolio-identity">
          <div
            className="portfolio-avatar"
            style={{
              background: `linear-gradient(135deg, ${avatarColors[0]}, ${avatarColors[1]})`
            }}
          >
            {avatarInitial}
          </div>
          <div>
            {profile.handle && <span className="portfolio-handle">@{profile.handle}</span>}
            <h2>{hero.headline || `${profile.name || "Student"} · Portfolio`}</h2>
            {hero.tagline && <p className="portfolio-tagline">{hero.tagline}</p>}
            {hero.subheading && <p className="portfolio-subheading">{hero.subheading}</p>}
          </div>
        </div>
      </header>

      <div className="portfolio-body">
        {portfolio.about && (
          <section className="portfolio-section">
            <h3>About</h3>
            <p>{portfolio.about}</p>
          </section>
        )}

        {profile.goals && (
          <section className="portfolio-section">
            <h3>Goals</h3>
            <p>{profile.goals}</p>
          </section>
        )}

        {portfolio.hobbySpotlight && (
          <section className="portfolio-section">
            <h3>{portfolio.hobbySpotlight.title || "Focus spotlight"}</h3>
            <p>{portfolio.hobbySpotlight.description}</p>
          </section>
        )}

        {timeline.length > 0 && (
          <section className="portfolio-section">
            <h3>Timeline</h3>
            <ul className="portfolio-timeline">
              {timeline.map((item, index) => (
                <li key={`${item.title || "milestone"}-${index}`}>
                  <span className="portfolio-timeline-time">{item.timeframe}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {interestList.length > 0 && (
          <section className="portfolio-section">
            <h3>Interests</h3>
            <ul className="portfolio-interests">
              {interestList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {socialEntries.length > 0 && (
          <section className="portfolio-section">
            <h3>Links</h3>
            <ul className="portfolio-links">
              {socialEntries.map(([key, value]) => (
                <li key={key}>
                  <span>{humaniseLinkLabel(key)}</span>
                  <a href={value} target="_blank" rel="noreferrer">
                    {value}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="portfolio-footer">
        {portfolio.contact?.value && (
          <div className="portfolio-contact">
            <strong>{portfolio.contact.label || "Contact"}</strong>
            <a href={`mailto:${portfolio.contact.value}`}>{portfolio.contact.value}</a>
          </div>
        )}
        {portfolio.callToAction?.label && (
          <a
            className="portfolio-cta"
            href={portfolio.callToAction.url || "#"}
            style={{ backgroundColor: themeColor }}
            target="_blank"
            rel="noreferrer"
          >
            {portfolio.callToAction.label}
          </a>
        )}
        {portfolio.callToAction?.note && (
          <p className="portfolio-note">{portfolio.callToAction.note}</p>
        )}
      </footer>
    </section>
  );
}

export default PortfolioPreview;
