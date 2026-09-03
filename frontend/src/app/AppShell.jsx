import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Target,
  FileUp,
  Gauge,
  Briefcase,
  Bookmark,
  TrendingUp,
  Tags,
  GitBranch,
  Share2,
  Building2,
  History,
  Settings,
  ShieldCheck,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { cn } from "../lib/cn";

const AVATAR_COLORS = ["var(--periwinkle)", "var(--lime)", "var(--coral)", "var(--sky)", "var(--amber)", "var(--violet)"];

function avatarColor(email) {
  let hash = 0;
  for (let i = 0; i < (email || "").length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const analyzeLinks = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/report", label: "Skill-Gap Report", icon: Target },
  { to: "/app/resume", label: "Resume Upload", icon: FileUp },
  { to: "/app/match", label: "Match & Salary", icon: Gauge },
];

const exploreLinks = [
  { to: "/app/jobs", label: "Jobs", icon: Briefcase },
  { to: "/app/saved-jobs", label: "Saved Jobs", icon: Bookmark },
  { to: "/app/trends", label: "Trends", icon: TrendingUp },
  { to: "/app/skills", label: "Skills", icon: Tags },
  { to: "/app/roles", label: "Role Graph", icon: GitBranch },
  { to: "/app/skill-graph", label: "Skill Graph", icon: Share2 },
  { to: "/app/companies", label: "Companies", icon: Building2 },
];

const accountLinks = [
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const adminLinks = [
  { to: "/app/admin", label: "Admin Stats", icon: ShieldCheck, end: true },
  { to: "/app/admin/users", label: "Manage Users", icon: Users },
];

function NavSection({ title, links, badges, onNavigate }) {
  return (
    <div>
      <span className="px-3 font-kicker text-[10px] uppercase tracking-widest text-forest/40">{title}</span>
      <ul className="mt-2 flex flex-col gap-0.5">
        {links.map(({ to, label, icon: Icon, end }) => {
          const badge = badges?.[to];
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-cream" : "text-forest/70 hover:bg-forest/5 hover:text-forest"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-xl bg-forest"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4 shrink-0" />
                    <span className="relative z-10 flex-1">{label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "relative z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                          isActive ? "bg-cream/25 text-cream" : "bg-lime text-forest"
                        )}
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [hasDigest, setHasDigest] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    api.getSavedJobs({ limit: 1 }).then((res) => setSavedCount(res.total)).catch(() => {});
    api.getDigest().then((res) => setHasDigest((res.changes?.length ?? 0) > 0)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const badges = { "/app/saved-jobs": savedCount, "/app": hasDigest ? 1 : 0 };

  return (
    <div className="flex min-h-screen bg-cream">
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-forest/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-forest/10 bg-white/95 px-4 py-6 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:bg-white/40",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="px-3 font-display text-xl font-bold text-forest">
            NextSkill
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-full p-1.5 text-forest/50 hover:bg-forest/5 hover:text-forest lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto">
          <NavSection title="Analyze" links={analyzeLinks} badges={badges} onNavigate={() => setMobileOpen(false)} />
          <NavSection title="Explore" links={exploreLinks} badges={badges} onNavigate={() => setMobileOpen(false)} />
          <NavSection title="Account" links={accountLinks} onNavigate={() => setMobileOpen(false)} />
          {user?.is_admin && <NavSection title="Admin" links={adminLinks} onNavigate={() => setMobileOpen(false)} />}
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-forest/10 bg-cream px-3 py-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-forest"
            style={{ backgroundColor: avatarColor(user?.email) }}
          >
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-forest">{user?.email}</p>
            <p className="text-[11px] capitalize text-forest/50">{user?.tier} plan</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-forest/50 transition-colors hover:bg-forest/10 hover:text-forest"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-forest/10 bg-cream/90 px-4 py-3 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-full p-1.5 text-forest hover:bg-forest/5"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-lg font-bold text-forest">NextSkill</span>
        </div>

        <main className="min-w-0 px-6 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
