import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";
import { Button } from "../app/ui";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, error, logoutLocationKey, refreshUser, logout } = useAuth();
  const location = useLocation();

  if (loading && !user) {
    return (
      <div role="status" aria-label="Checking your session" className="flex h-screen items-center justify-center bg-cream">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6">
        <section className="w-full max-w-md rounded-2xl border border-forest/15 p-6 text-center sm:p-8">
          <div role="alert">
            <h1 className="font-display text-2xl font-bold text-ink">Profile unavailable</h1>
            <p className="mt-2 text-sm text-ink/80">{error}</p>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button onClick={refreshUser}>Try again</Button>
            <Button variant="secondary" onClick={logout}>Log out</Button>
          </div>
        </section>
      </main>
    );
  }

  if (logoutLocationKey === location.key) return <Navigate to="/" replace />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
