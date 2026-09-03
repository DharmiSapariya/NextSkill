import { Check } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <Icon className="h-9 w-9 text-forest" />
        {service.badge && (
          <span className="rounded-full bg-forest/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-forest">
            {service.badge}
          </span>
        )}
      </div>
      <h3 className="mt-6 font-display text-2xl font-bold">{service.title}</h3>
      <p className="mt-1 font-display text-lg font-semibold text-forest/80">{service.price}</p>
      <p className="mt-4 text-sm text-forest/80">{service.description}</p>

      {service.features?.length > 0 && (
        <ul className="mt-5 flex flex-1 flex-col gap-2.5">
          {service.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-forest/80">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forest/15">
                <Check className="h-2.5 w-2.5 text-forest" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      )}

      <a
        href={service.href}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-forest px-6 py-3 text-sm font-semibold text-cream transition-transform hover:scale-[1.02]"
      >
        {service.cta}
      </a>
    </div>
  );
}
