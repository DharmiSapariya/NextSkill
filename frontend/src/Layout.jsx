import { useEffect, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "./lib/AuthContext";
import { IntroContext } from "./lib/IntroContext";
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

  // Whether the big wordmark's fold-in in Hero has finished and shrunk
  // into this corner spot yet. Starts false only on the landing page —
  // everywhere else the nav's small logo is just always there. Hero
  // (three levels down, past the router's Outlet) reads and flips this
  // via IntroContext so the two can share one framer-motion layoutId.
  const [introDone, setIntroDone] = useState(!isLanding);

  // Only the landing page's nav overlays its (dark) hero and morphs into
  // the normal solid bar — every other route keeps today's static,
  // always-cream nav untouched. On the landing page it flips to solid the
  // instant the hero finishes its slide-out (not tied to actual scroll
  // position — the hero collapses out of the way on its own), with a
  // plain scroll-position fallback in case someone scrolls past before
  // the intro even finishes.
  const [scrolledPastHero] = useScrolledPastHero(isLanding);
  const overlay = isLanding && !introDone && !scrolledPastHero;

  // The full link row plus the login/account block doesn't fit next to the
  // logo below ~md width — it used to just wrap, which pushed "Log in /
  // Sign up" into the middle of a stacked link column. Below md it's a
  // hamburger toggle instead; closes itself on every route change so it
  // never stays open across a navigation.
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <IntroContext.Provider value={{ introDone, setIntroDone }}>
      <LayoutGroup>
        <div className="min-h-screen bg-cream text-charcoal">
          <header
            className={`${isLanding ? "fixed inset-x-0 top-0 z-40" : "relative"} border-b transition-colors duration-300 ${
              overlay ? "border-transparent bg-transparent" : "border-black/10 bg-cream"
            }`}
          >
            <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
              <Link to="/" className="block min-w-[70px] shrink-0" aria-label="NextSkill home">
                {introDone && (
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
                )}
              </Link>
              <div className="hidden flex-1 flex-wrap gap-4 text-sm md:flex">
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
              <div className="hidden md:block">
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
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className={`ml-auto flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300 md:hidden ${
                  overlay ? "text-cream" : "text-charcoal"
                }`}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </nav>

            {mobileOpen && (
              <div
                className={`flex flex-col gap-1 border-t px-6 py-4 text-sm md:hidden ${
                  overlay ? "border-cream/15 bg-forest" : "border-black/10 bg-cream"
                }`}
              >
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `rounded-lg px-2 py-2 transition-colors duration-300 ${
                        isActive
                          ? overlay
                            ? "font-semibold text-cream"
                            : "font-semibold text-forest"
                          : overlay
                            ? "text-cream/70"
                            : "text-charcoal/70"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className={`mt-2 border-t pt-3 ${overlay ? "border-cream/15" : "border-black/10"}`}>
                  {isLoggedIn ? (
                    <div className={`flex flex-col gap-2 px-2 ${overlay ? "text-cream/70" : "text-charcoal/70"}`}>
                      <Link to="/account">{profile?.email ?? "My Account"}</Link>
                      {profile?.is_admin && <Link to="/admin">Admin</Link>}
                      <button onClick={logout} className="text-left">
                        Log out
                      </button>
                    </div>
                  ) : (
                    <Link to="/login" className={`block px-2 font-semibold ${overlay ? "text-cream" : "text-forest"}`}>
                      Log in / Sign up
                    </Link>
                  )}
                </div>
              </div>
            )}
          </header>
          <main>
            <Outlet />
          </main>
        </div>
      </LayoutGroup>
    </IntroContext.Provider>
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
