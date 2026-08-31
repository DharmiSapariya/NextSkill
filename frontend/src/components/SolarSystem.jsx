import React, { useState } from "react";
import { cn } from "../lib/cn";

// Ported from a TSX SolarSystem component (3D-tilted orbit rings with
// billboard-cancelling labeled cards) and adapted: JSX instead of TSX,
// no Next.js "use client"/next-themes, recolored from the source's
// dark teal/purple palette to the brand tokens, and mounted with
// content describing NextSkill's actual pipeline instead of tech logos.
export const SolarSystem = React.forwardRef(
  (
    {
      centerLogo,
      centerLogoAlt = "NextSkill engine",
      orbits,
      isPaused = false,
      speedMultiplier = 1,
      className,
      ...props
    },
    ref
  ) => {
    const [hoveredId, setHoveredId] = useState(null);

    const dustItems = [
      { delay: "-4s", radius: "140px", color: "var(--lime)" },
      { delay: "-11s", radius: "200px", color: "var(--periwinkle)" },
      { delay: "-19s", radius: "260px", color: "var(--lime)" },
      { delay: "-7s", radius: "170px", color: "var(--periwinkle)" },
      { delay: "-23s", radius: "260px", color: "var(--lime)" },
    ];

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-center justify-center w-full max-w-[940px] h-[320px] md:h-[420px] [perspective:1200px] select-none overflow-visible",
          className
        )}
        {...props}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --radius-inner: 130px;
            --radius-outer: 220px;
          }
          @media (max-width: 768px) {
            :root {
              --radius-inner: 85px;
              --radius-outer: 145px;
            }
          }
          @media (max-width: 480px) {
            :root {
              --radius-inner: 62px;
              --radius-outer: 105px;
            }
          }
          @keyframes solar-orbitMove {
            0% { transform: translate(-50%, -50%) rotateZ(0deg) translateX(var(--orbit-radius)); }
            100% { transform: translate(-50%, -50%) rotateZ(-360deg) translateX(var(--orbit-radius)); }
          }
          @keyframes solar-billboardCancel {
            0% { transform: translate(-50%, -50%) rotateZ(0deg) rotateY(10deg) rotateX(-65deg); }
            100% { transform: translate(-50%, -50%) rotateZ(360deg) rotateY(10deg) rotateX(-65deg); }
          }
          @keyframes solar-sun-pulse {
            0% { transform: scale(0.92); opacity: 0.6; }
            100% { transform: scale(1.08); opacity: 1; }
          }
          @keyframes solar-spin-cw {
            0% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(0deg); }
            100% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(360deg); }
          }
          @keyframes solar-spin-ccw {
            0% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(0deg); }
            100% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(-360deg); }
          }
          .solar-orbit-anim {
            animation: solar-orbitMove var(--orbit-duration) linear infinite;
            animation-play-state: var(--orbit-play-state);
          }
          .solar-billboard-anim {
            animation: solar-billboardCancel var(--orbit-duration) linear infinite;
            animation-play-state: var(--orbit-play-state);
          }
          .solar-sun-pulse-anim { animation: solar-sun-pulse 4s ease-in-out infinite alternate; }
          .solar-spin-cw-anim { animation: solar-spin-cw 20s linear infinite; }
          .solar-spin-ccw-anim { animation: solar-spin-ccw 30s linear infinite; }
          .solar-logo-card {
            position: absolute;
            left: 50%;
            top: 50%;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0.45rem 0.9rem;
            background: rgba(30, 58, 43, 0.92);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(250, 253, 238, 0.12);
            border-radius: 100px;
            font-weight: 600;
            color: var(--cream-on-dark);
            white-space: nowrap;
            user-select: none;
            cursor: default;
            pointer-events: auto;
            transition: border-color 0.3s, background 0.3s, box-shadow 0.3s, scale 0.3s;
            box-shadow: 0 4px 18px rgba(20, 38, 28, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }
        `,
          }}
        />

        <div
          className="absolute w-[280px] h-[280px] md:w-[560px] md:h-[560px] flex items-center justify-center"
          style={{ transform: "rotateX(65deg) rotateY(-10deg)", transformStyle: "preserve-3d" }}
        >
          <div
            className="absolute w-[80px] h-[80px] md:w-[100px] md:h-[100px] flex items-center justify-center z-20 pointer-events-none"
            style={{ transform: "rotateY(10deg) rotateX(-65deg)", transformStyle: "preserve-3d" }}
          >
            <div className="solar-sun-pulse-anim absolute z-10 h-[70px] w-[70px] rounded-full bg-lime/25 blur-md md:h-[92px] md:w-[92px]" />

            <div className="relative z-20 flex h-11 w-11 items-center justify-center rounded-full border-2 border-lime/50 bg-forest p-2 shadow-[0_0_24px_rgba(239,248,122,0.35)] md:h-16 md:w-16">
              {centerLogo ?? (
                <span className="font-display text-sm font-bold text-cream md:text-lg" aria-label={centerLogoAlt}>
                  NS
                </span>
              )}
            </div>

            <div className="solar-spin-cw-anim absolute h-[88px] w-[88px] rounded-full border border-dashed border-lime/25 md:h-[112px] md:w-[112px]" />
            <div className="solar-spin-ccw-anim absolute h-[118px] w-[118px] rounded-full border border-dashed border-periwinkle/20 md:h-[148px] md:w-[148px]" />
          </div>

          {dustItems.map((dust, idx) => (
            <div
              key={idx}
              className="solar-orbit-anim absolute left-1/2 top-1/2 h-1 w-1 rounded-full opacity-40 pointer-events-none"
              style={{
                background: dust.color,
                boxShadow: `0 0 6px ${dust.color}`,
                animationDelay: dust.delay,
                "--orbit-radius": dust.radius,
                "--orbit-duration": `${24 / speedMultiplier}s`,
                "--orbit-play-state": isPaused ? "paused" : "running",
              }}
            />
          ))}

          {orbits.map((orbit) => (
            <React.Fragment key={orbit.id}>
              <div
                className="absolute rounded-full border border-dashed border-forest/20 pointer-events-none"
                style={{
                  width: `calc(2 * ${orbit.radiusClass})`,
                  height: `calc(2 * ${orbit.radiusClass})`,
                }}
              />

              {orbit.items.map((item, idx, arr) => {
                const delayValue = -(orbit.speed / arr.length) * idx;
                const durationValue = orbit.speed / speedMultiplier;
                const isHovered = hoveredId === item.id;
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    className="solar-orbit-anim absolute left-1/2 top-1/2 h-0 w-0 pointer-events-none"
                    style={{
                      animationDelay: `${delayValue}s`,
                      "--orbit-radius": orbit.radiusClass,
                      "--orbit-duration": `${durationValue}s`,
                      "--orbit-play-state": isPaused ? "paused" : "running",
                      zIndex: isHovered ? 30 : 10,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="solar-logo-card solar-billboard-anim"
                      style={{
                        animationDelay: `${delayValue}s`,
                        "--orbit-duration": `${durationValue}s`,
                        "--orbit-play-state": isPaused ? "paused" : "running",
                        borderColor: isHovered ? item.color : undefined,
                        boxShadow: isHovered
                          ? `0 0 18px rgba(20,38,28,0.5), 0 0 14px ${item.color}55`
                          : undefined,
                        scale: isHovered ? 1.06 : 1,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                      <span className="text-[11px] tracking-tight md:text-[12px]">{item.label}</span>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
);

SolarSystem.displayName = "SolarSystem";
