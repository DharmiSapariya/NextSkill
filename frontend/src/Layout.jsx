import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import IntroOverlay from "./intro/IntroOverlay";
import NextSkillLogo from "./components/NextSkillLogo";

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

  // Plays once per page load, only when the landing page is actually
  // reached — not on every in-app navigation back to "/" (that would mean
  // reloading is what "starts fresh," matching how the hero's own fold-in
  // has always worked; a full-page reload remounts Layout and this state
  // along with it, so reload really does replay it). While it's playing,
  // there's no nav bar at all — not transparent, not present.
  const [introDone, setIntroDone] = useState(!isLanding);
  const introPlaying = isLanding && !introDone;

  // Only the landing page's nav overlays its (dark) hero and morphs into
  // the normal solid bar on scroll — every other route keeps today's
  // static, always-cream nav untouched.
  const [scrolledPastHero] = useScrolledPastHero(isLanding && introDone);
  const overlay = isLanding && !scrolledPastHero;

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-cream text-charcoal">
        <AnimatePresence>
          {introPlaying && <IntroOverlay key="intro" onDone={() => setIntroDone(true)} />}
        </AnimatePresence>

        {!introPlaying && (
          <header
            className={`${isLanding ? "fixed inset-x-0 top-0 z-40" : "relative"} border-b transition-colors duration-300 ${
              overlay ? "border-transparent bg-transparent" : "border-black/10 bg-cream"
            }`}
          >
            <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
              <Link to="/" className="shrink-0" aria-label="NextSkill home">
                <motion.span layoutId="nextskill-logo" className="inline-block">
                  <NextSkillLogo
                    trigger="static"
                    fontSize="1.6rem"
                    fontWeight={600}
                    nStroke={0.045}
                    sStroke={0.04}
                    style={{ color: overlay ? "var(--color-background)" : "var(--color-brand)" }}
                    className="transition-colors duration-300"
                  />
                </motion.span>
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
        )}
        <main>
          <Outlet />
        </main>
      </div>
    </LayoutGroup>
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
