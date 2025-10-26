import { Outlet, NavLink, useLocation, useNavigationType } from "react-router-dom";
import { useEffect } from "react";

const navLinks = [
  { to: "/", label: "Builder" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/account", label: "My Account" }
];

function AppLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.pathname, navigationType]);

  return (
    <div className="app-frame">
      <div className="app-container">
        <header className="app-header">
          <div className="app-header-brand">
            <span className="material-symbols-outlined app-header-icon">
              auto_awesome_mosaic
            </span>
            <div>
              <p className="app-header-eyebrow">PortfolioGen</p>
              <h1>Creator Studio</h1>
            </div>
          </div>

          <nav className="app-header-nav">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `app-header-link${isActive ? " app-header-link--active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
