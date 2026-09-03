import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import TextRoll from "../components/TextRoll";
import AnimatedThemeToggler from "../components/AnimatedThemeToggler";

const navigationItems = [
  { name: "How It Works", href: "#how-it-works" },
  { name: "Features", href: "#features" },
  { name: "Skills We Track", href: "#skills" },
  { name: "Pricing", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Below lg, the nav links were only ever reachable at lg+ (hidden lg:flex)
  // — there was no mobile entry point to them at all. This adds one.
  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 flex h-20 w-full items-center border-b border-forest/5 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6">
        <a href="#top" className="font-display text-[22px] font-bold text-forest">
          NextSkill
        </a>

        <ul className="hidden flex-row gap-8 lg:flex">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <a href={item.href}>
                <TextRoll
                  className="text-sm font-semibold uppercase tracking-wide text-forest"
                  hoverColorClassName="text-periwinkle"
                >
                  {item.name}
                </TextRoll>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <AnimatedThemeToggler />
          <Link to="/login" className="hidden text-sm font-semibold text-forest/70 hover:text-forest sm:block">
            Log in
          </Link>
          <Link
            to="/signup"
            className="hidden h-11 items-center justify-center rounded-full bg-periwinkle px-5 text-sm font-semibold text-forest transition-transform hover:scale-[1.03] lg:flex"
          >
            Get Started Free
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/5 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-forest/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-cream px-6 py-6 shadow-[-16px_0_40px_-20px_rgba(20,38,28,0.4)] lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold text-forest">Menu</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-forest/60 hover:bg-forest/5 hover:text-forest"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <ul className="mt-8 flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3 py-3 text-sm font-semibold uppercase tracking-wide text-forest/80 transition-colors hover:bg-forest/5 hover:text-forest"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3 border-t border-forest/10 pt-6">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-full border border-forest/20 text-sm font-semibold text-forest"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-full bg-periwinkle text-sm font-semibold text-forest"
                >
                  Get Started Free
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
