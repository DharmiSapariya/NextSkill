import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";

const NAV_LINKS = [
  { to: "/recommend", label: "Recommend" },
  { to: "/explore-skill", label: "Explore a Skill" },
  { to: "/career-paths", label: "Career Paths" },
  { to: "/skill-network", label: "Skill Network" },
  { to: "/resume-salary", label: "Resume & Salary" },
  { to: "/jobs", label: "Jobs" },
  { to: "/companies", label: "Companies" },
];

export default function Layout() {
  const { isLoggedIn, profile, logout } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  // Only the landing page's nav overlays its (dark) hero and morphs into
  // the normal solid bar on scroll — every other route keeps today's
  // static, always-cream nav untouched.
  const [scrolledPastHero] = useScrolledPastHero(isLanding);
  const overlay = isLanding && !scrolledPastHero;

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header
        className={`${isLanding ? "fixed inset-x-0 top-0 z-40" : "relative"} border-b transition-colors duration-300 ${
          overlay ? "border-transparent bg-transparent" : "border-black/10 bg-cream"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
          <Link
            to="/"
            className={`text-lg font-bold transition-colors duration-300 ${overlay ? "text-cream" : "text-forest"}`}
          >
            NextSkill
          </Link>
          <div className="flex flex-1 flex-wrap gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `transition-colors duration-300 ${
                    isActive
                      ? overlay
                        ? "font-semibold text-cream"
                        : "font-semibold text-forest"
                      : overlay
                        ? "text-cream/70 hover:text-cream"
                        : "text-charcoal/70 hover:text-charcoal"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          {isLoggedIn ? (
            <div
              className={`flex items-center gap-3 text-sm transition-colors duration-300 ${overlay ? "text-cream/70" : "text-charcoal/70"}`}
            >
              <Link to="/account" className="hover:opacity-80">
                {profile?.email ?? "My Account"}
              </Link>
              {profile?.is_admin && (
                <Link to="/admin" className="hover:opacity-80">
                  Admin
                </Link>
              )}
              <button onClick={logout} className="hover:opacity-80">
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className={`text-sm font-semibold transition-colors duration-300 ${overlay ? "text-cream" : "text-forest"}`}
            >
              Log in / Sign up
            </Link>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

// Tracks whether the page has been scrolled past ~85% of one viewport
// height — i.e. past the hero (h-screen) — only while `active`. Returns
// false (and stops listening) whenever `active` is false, so navigating
// away from and back to the landing page always starts the nav in its
// transparent-overlay state again, not wherever it was left off.
function useScrolledPastHero(active) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!active) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [active]);

  return [scrolled];
}
