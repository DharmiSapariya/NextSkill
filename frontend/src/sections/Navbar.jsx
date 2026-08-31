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
          <a
            href="#pricing"
            className="flex h-11 items-center justify-center rounded-full bg-periwinkle px-5 text-sm font-semibold text-forest transition-transform hover:scale-[1.03]"
          >
            Get Started Free
          </a>
        </div>
      </div>
    </header>
  );
}
