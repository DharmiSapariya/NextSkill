import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Route guard mirroring dashboard/common.py's require_login() — redirects to
// /login instead of rendering a gated page for a logged-out visitor.
export default function RequireAuth({ children, adminOnly = false }) {
  const { isLoggedIn, profile } = useAuth();

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (adminOnly && profile && !profile.is_admin) return <Navigate to="/account" replace />;

  return children;
}
