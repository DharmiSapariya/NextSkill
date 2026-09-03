import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/cn";

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

function NavSection({ title, links }) {
  return (
    <div>
      <span className="px-3 font-kicker text-[10px] uppercase tracking-widest text-forest/40">{title}</span>
      <ul className="mt-2 flex flex-col gap-0.5">
        {links.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-forest text-cream" : "text-forest/70 hover:bg-forest/5 hover:text-forest"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-forest/10 bg-white/40 px-4 py-6">
        <a href="/" className="px-3 font-display text-xl font-bold text-forest">
          NextSkill
        </a>

        <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto">
          <NavSection title="Analyze" links={analyzeLinks} />
          <NavSection title="Explore" links={exploreLinks} />
          <NavSection title="Account" links={accountLinks} />
          {user?.is_admin && <NavSection title="Admin" links={adminLinks} />}
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-forest/10 bg-cream px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-cream">
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

      <main className="min-w-0 flex-1 px-8 py-10 md:px-12">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
