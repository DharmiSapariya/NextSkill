import { Children } from "react";
import { cn } from "../lib/cn";

export function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 160,
  path = true,
  iconSize = 30,
  speed = 1,
  pathColor = "var(--periwinkle)",
}) {
  const calculatedDuration = duration / speed;

  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <circle
            className="opacity-40"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke={pathColor}
            strokeWidth="1"
          />
        </svg>
      )}
      {Children.map(children, (child, index) => {
        const angle = (360 / Children.count(children)) * index;
        return (
          <div
            style={{
              "--duration": calculatedDuration,
              "--radius": radius,
              "--angle": angle,
              "--icon-size": `${iconSize}px`,
              animationDelay: `${-delay}s`,
            }}
            className={cn(
              "absolute left-1/2 top-1/2 flex size-[var(--icon-size)] -translate-x-1/2 -translate-y-1/2 transform-gpu animate-orbit items-center justify-center rounded-full",
              { "[animation-direction:reverse]": reverse },
              className
            )}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}
