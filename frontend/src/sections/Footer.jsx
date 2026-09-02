const productLinks = [
  { name: "How It Works", href: "#how-it-works" },
  { name: "Features", href: "#features" },
  { name: "Skills We Track", href: "#skills" },
  { name: "Pricing", href: "#pricing" },
];

const companyLinks = [
  { name: "FAQ", href: "#faq" },
  { name: "GitHub", href: "https://github.com/dharmisapariya/nextskill" },
];

const legalLinks = [
  { name: "Terms of Service", href: "#top" },
  { name: "Privacy Policy", href: "#top" },
];

export default function Footer() {
  return (
    <footer className="bg-periwinkle px-6 pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-10 pb-12 md:grid-cols-5">
          <div className="col-span-2">
            <a href="#top" className="font-display text-2xl font-bold text-forest">
              NextSkill
            </a>
            <p className="mt-3 max-w-xs text-sm text-forest/70">
              Evidence-based career intelligence — every recommendation traces back to a real
              job posting.
            </p>
            <div className="mt-5 flex gap-4">
              <a
                href="https://github.com/dharmisapariya/nextskill"
                aria-label="GitHub"
                className="transition-opacity hover:opacity-70"
              >
                <img src="https://cdn.simpleicons.org/github/1E3A2B" alt="" width={20} height={20} />
              </a>
              <a href="#top" aria-label="LinkedIn" className="transition-opacity hover:opacity-70">
                <img src="https://cdn.simpleicons.org/linkedin/1E3A2B" alt="" width={20} height={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-kicker text-xs uppercase tracking-widest text-forest/50">Product</h3>
            <ul className="mt-4 space-y-3 text-sm text-forest/80">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="transition-colors hover:text-forest">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-kicker text-xs uppercase tracking-widest text-forest/50">Company</h3>
            <ul className="mt-4 space-y-3 text-sm text-forest/80">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="transition-colors hover:text-forest">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-kicker text-xs uppercase tracking-widest text-forest/50">Legal</h3>
            <ul className="mt-4 space-y-3 text-sm text-forest/80">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="transition-colors hover:text-forest">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-forest/15 py-6 text-xs text-forest/60 md:flex-row">
          <span>&copy; {new Date().getFullYear()} NextSkill. All rights reserved.</span>
          <span className="rounded-full border border-forest/20 bg-cream px-3 py-1 font-semibold text-forest">
            Free forever for individuals
          </span>
        </div>
      </div>
    </footer>
  );
}
