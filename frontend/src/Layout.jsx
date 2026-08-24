import { Link, NavLink, Outlet } from "react-router-dom";
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

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header className="border-b border-black/10">
        <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
          <Link to="/" className="font-bold text-lg text-forest">
            NextSkill
          </Link>
          <div className="flex flex-1 flex-wrap gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? "font-semibold text-forest" : "text-charcoal/70 hover:text-charcoal"
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-3 text-sm">
              <Link to="/account" className="text-charcoal/70 hover:text-charcoal">
                {profile?.email ?? "My Account"}
              </Link>
              {profile?.is_admin && (
                <Link to="/admin" className="text-charcoal/70 hover:text-charcoal">
                  Admin
                </Link>
              )}
              <button onClick={logout} className="text-charcoal/50 hover:text-charcoal">
                Log out
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-forest">
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
