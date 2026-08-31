import CrowdCanvas from "../components/CrowdCanvas";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-periwinkle pt-20">
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <h2 className="font-display text-[clamp(3rem,9vw,7rem)] font-extrabold leading-none tracking-[-0.03em] text-forest">
          NextSkill
        </h2>
        <div className="relative mx-auto mt-2 h-16 max-w-md">
          <img
            src="/doodles/three.png"
            alt=""
            className="pointer-events-none absolute left-1/4 top-0 hidden w-24 md:block"
          />
          <span className="absolute right-1/4 top-6 hidden rounded-full border border-forest/30 bg-cream px-4 py-1.5 text-xs font-semibold text-forest md:block">
            free forever
          </span>
        </div>
      </div>

      <div className="relative mt-12 h-64 md:h-80">
        <CrowdCanvas src="/crowd/peeps-strip.png" rows={21} cols={1} className="absolute inset-0 h-full w-full" />
      </div>

      <div className="relative mt-12 border-t border-forest/15 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-forest md:flex-row">
          <div className="flex gap-6">
            <a href="#top" className="hover:underline">Terms of Service</a>
            <a href="#top" className="hover:underline">Privacy</a>
          </div>
          <div className="text-center">
            <span className="font-display font-bold">NextSkill</span>
            <span className="ml-2 text-forest/60">Evidence-based career intelligence.</span>
          </div>
          <div className="flex gap-4">
            <a href="https://github.com/dharmisapariya/nextskill" aria-label="GitHub" className="hover:opacity-70">
              <img src="https://cdn.simpleicons.org/github/1E3A2B" alt="" width={20} height={20} />
            </a>
            <a href="#top" aria-label="LinkedIn" className="hover:opacity-70">
              <img src="https://cdn.simpleicons.org/linkedin/1E3A2B" alt="" width={20} height={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
