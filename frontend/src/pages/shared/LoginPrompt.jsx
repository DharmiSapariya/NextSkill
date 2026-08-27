import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";

// In-page auth gate for endpoints that need a token (/recommend,
// /match-score, /predict-salary, /auth/me/resume) — these routes aren't
// behind RequireAuth at the router level since a logged-out visitor should
// still see the page shell and understand what it does, just with a
// concrete next step instead of a silent 401.
export default function LoginPrompt({ feature }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-forest/15 bg-periwinkle/15 px-6 py-8">
      <LockKeyhole className="h-5 w-5 text-forest" />
      <p className="font-sans text-sm text-charcoal/70">
        {feature} uses your saved skill profile and needs an account.
      </p>
      <Link
        to="/login"
        className="rounded-full bg-forest px-5 py-2.5 font-sans text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5"
      >
        Log in / Sign up
      </Link>
    </div>
  );
}
