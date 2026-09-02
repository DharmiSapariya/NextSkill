import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";

// Ported from Skiper54's Carousel_006 (shadcn Carousel + embla, clip-path
// reveal on the active slide) — dropped "use client"/TS, swapped the
// reference's illustration-showcase images/titles for feature cards
// (image + title + short description), and recolored from its neutral
// black/white/gray palette to the brand tokens.
export default function Carousel006({ items, className, loop = true }) {
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      className={cn("w-full", className)}
      opts={{ loop, slidesToScroll: 1, align: "start" }}
    >
      <CarouselContent className="flex h-[440px] w-full">
        {items.map((item, index) => (
          <CarouselItem
            key={item.title}
            className="relative flex h-[76%] w-full basis-[85%] items-center justify-center sm:basis-[60%] md:basis-[42%] lg:basis-[32%]"
          >
            <motion.div
              initial={false}
              animate={{
                clipPath:
                  current !== index
                    ? "inset(15% 0 15% 0 round 1.5rem)"
                    : "inset(0 0 0 0 round 1.5rem)",
              }}
              className="h-full w-full overflow-hidden rounded-3xl border border-forest/10 bg-cream"
            >
              <div className="relative flex h-full w-full items-center justify-center">
                <img
                  src={item.illustration}
                  alt=""
                  className="h-[70%] w-[70%] object-contain"
                />
              </div>
            </motion.div>
            <div
              className={cn(
                "absolute bottom-0 left-0 flex w-full translate-y-[calc(100%+12px)] flex-col items-center px-3 text-center transition-opacity duration-300",
                current === index ? "opacity-100" : "opacity-60"
              )}
            >
              <span className="font-display text-base font-bold text-forest">{item.title}</span>
              <span className="mt-1 text-xs text-forest/70">{item.description}</span>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="mt-8 flex w-full items-center justify-center gap-6">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => api?.scrollPrev()}
          className="rounded-full bg-forest/10 p-2 transition-colors hover:bg-forest/20"
        >
          <ChevronLeft className="h-5 w-5 text-forest" />
        </button>

        <div className="flex items-center justify-center gap-2">
          {items.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                current === index ? "bg-forest" : "bg-forest/20"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Next slide"
          onClick={() => api?.scrollNext()}
          className="rounded-full bg-forest/10 p-2 transition-colors hover:bg-forest/20"
        >
          <ChevronRight className="h-5 w-5 text-forest" />
        </button>
      </div>
    </Carousel>
  );
}
