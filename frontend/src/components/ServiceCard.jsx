import { cn } from "../lib/cn";

export default function ServiceCard({ service }) {
  const Icon = service.icon;
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl bg-gradient-to-br p-8 text-forest",
        service.gradient
      )}
    >
      <Icon className="h-9 w-9 text-forest" />
      <h3 className="mt-6 font-display text-2xl font-bold">{service.title}</h3>
      <p className="mt-1 font-display text-lg font-semibold text-forest/80">{service.price}</p>
      <p className="mt-4 flex-1 text-sm text-forest/80">{service.description}</p>
      <a
        href={service.href}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-forest px-6 py-3 text-sm font-semibold text-cream transition-transform hover:scale-[1.02]"
      >
        {service.cta}
      </a>
    </div>
  );
}
