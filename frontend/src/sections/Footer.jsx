import { ArrowRight, Mail, Sparkles } from "lucide-react";

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
    <footer className="bg-forest-2">
      <div className="bg-cream px-6 pb-24 pt-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-forest/10 bg-periwinkle px-8 py-14 text-center md:px-16">
          <img
            src="/illustrations/22n.png"
            alt=""
            className="pointer-events-none absolute -right-4 bottom-0 hidden w-44 select-none md:block"
          />
          <Sparkles className="pointer-events-none absolute left-10 top-8 hidden h-7 w-7 -rotate-12 text-lime md:block" />

          <span className="font-kicker text-xs uppercase tracking-widest text-forest/60">
            Get started
          </span>
          <h2 className="mx-auto mt-3 max-w-lg font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-forest">
            Ready to close your skill gap?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-forest/70">
            Get your free, evidence-backed skill-gap report in under two minutes — no credit card
            required.
          </p>

          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#top"
              className="flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-semibold text-cream transition-transform hover:scale-[1.03]"
            >
              Get Your Free Skill Report
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="flex h-12 items-center rounded-full border border-forest/30 px-7 text-sm font-semibold text-forest transition-colors hover:bg-forest/5"
            >
              See How It Works
            </a>
          </div>
        </div>
      </div>

      <div className="px-6 pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-10 pb-12 md:grid-cols-5">
            <div className="col-span-2">
              <a href="#top" className="font-display text-2xl font-bold text-cream-on-dark">
                NextSkill
              </a>
              <p className="mt-3 max-w-xs text-sm text-cream-on-dark/65">
                Evidence-based career intelligence — every recommendation traces back to a real
                job posting.
              </p>
              <div className="mt-5 flex gap-3">
                <a
                  href="https://github.com/dharmisapariya/nextskill"
                  aria-label="GitHub"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-on-dark/10 transition-colors hover:bg-cream-on-dark/20"
                >
                  <img src="https://cdn.simpleicons.org/github/FAFDEE" alt="" width={16} height={16} />
                </a>
                <a
                  href="#top"
                  aria-label="LinkedIn"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-on-dark/10 transition-colors hover:bg-cream-on-dark/20"
                >
                  <img src="https://cdn.simpleicons.org/linkedin/FAFDEE" alt="" width={16} height={16} />
                </a>
                <a
                  href="mailto:hello@nextskill.app"
                  aria-label="Email"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-on-dark/10 text-cream-on-dark transition-colors hover:bg-cream-on-dark/20"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-kicker text-xs uppercase tracking-widest text-cream-on-dark/45">
                Product
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-cream-on-dark/75">
                {productLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="transition-colors hover:text-cream-on-dark">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-kicker text-xs uppercase tracking-widest text-cream-on-dark/45">
                Company
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-cream-on-dark/75">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="transition-colors hover:text-cream-on-dark">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-kicker text-xs uppercase tracking-widest text-cream-on-dark/45">
                Legal
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-cream-on-dark/75">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="transition-colors hover:text-cream-on-dark">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-cream-on-dark/10 py-6 text-xs text-cream-on-dark/55 md:flex-row">
            <span>&copy; {new Date().getFullYear()} NextSkill. All rights reserved.</span>
            <span className="rounded-full border border-cream-on-dark/20 bg-cream-on-dark/10 px-3 py-1 font-semibold text-cream-on-dark">
              Free forever for individuals
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
