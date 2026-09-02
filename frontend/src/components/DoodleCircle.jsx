import { cn } from "../lib/cn";

const DOODLES = {
  lime: "/doodles/eight.png",
  periwinkle: "/doodles/nine.png",
};

// Hand-drawn double-stroke ellipse doodle (design-assets/doodles), stretched
// to loosely circle the wrapped word — replaces the rough-notation
// action="circle" annotation. The image sits behind the text via DOM order
// + z-index (never negative z-index, which paints behind the section's own
// background instead of just behind the text).
export default function DoodleCircle({ children, color = "periwinkle", className }) {
  return (
    <span className={cn("relative inline-block px-2", className)}>
      <img
        src={DOODLES[color]}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[1.5em] w-full max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
      />
      <span className="relative z-10">{children}</span>
    </span>
  );
}
