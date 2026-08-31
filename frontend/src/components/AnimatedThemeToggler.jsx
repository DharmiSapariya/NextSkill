import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Simplified from the spec's multi-variant version (no next-themes —
// this app isn't on Next.js, so theme + persistence is owned locally
// via localStorage) — keeps the circle clip-path view-transition reveal,
// which is the actual point of the component.
export default function AnimatedThemeToggler({ className = "" }) {
  const buttonRef = useRef(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggle = async () => {
    const next = !isDark;
    const button = buttonRef.current;

    if (!document.startViewTransition || !button || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsDark(next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return;
    }

    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => {
      setIsDark(next);
      localStorage.setItem("theme", next ? "dark" : "light");
    });

    await transition.ready;
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
      { duration: 400, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
    );
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`flex h-9 w-9 items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/5 dark:text-cream-on-dark ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
