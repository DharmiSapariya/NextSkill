import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// A direct structural adaptation of Skiper UI's "Skiper 19" — same
// mechanic as skiperui.com/v1/skiper19 (by @gurvinder-singh02): a tall
// section, a heading + subtext block near the top with an SVG line
// growing beside it as you scroll (pathLength driven off scrollYProgress,
// strokeDashoffset doing the actual draw), and a giant wordmark block
// that the long scroll carries into view underneath. The line itself is
// Skiper 19's own artwork (their `d` path, kept verbatim below), just
// recolored to NextSkill's palette instead of their lime-on-cream.
//
// Skiper 19 — React + framer motion, inspired by and adapted from
// https://comgio.ai/, MIT-style free tier requiring attribution to
// Skiper UI (https://skiperui.com), author @gurvinder-singh02
// (https://gxuri.me). This is our own remix of their pattern —
// NextSkill copy, palette and closing block — not a verbatim reuse.
export default function ScrollStroke() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  return (
    <section
      ref={containerRef}
      className="relative mx-auto flex h-[350vh] w-full flex-col items-center overflow-hidden bg-cream px-4 text-charcoal"
    >
      <div className="relative mt-32 flex w-fit flex-col items-center justify-center gap-5 text-center sm:mt-48">
        <h1 className="relative z-10 font-display text-6xl font-semibold tracking-[-0.03em] sm:text-8xl">
          The Skills You Have <br /> Meet The Job <br /> You Actually Want
        </h1>
        <p className="relative z-10 max-w-2xl font-sans text-lg font-medium text-charcoal/60 sm:text-xl">
          Scroll down to watch the gap close
        </p>

        <LinePath className="absolute -right-[45%] top-0 z-0 sm:-right-[38%]" scrollYProgress={scrollYProgress} />
      </div>

      <div className="w-full translate-y-[200vh] rounded-[2.5rem] bg-forest pb-14 text-cream">
        <h2 className="mt-10 text-center font-display text-[15.5vw] font-bold leading-[0.9] tracking-tighter lg:text-[14vw]">
          nextskill.
        </h2>
        <div className="mt-24 flex w-full flex-col items-start gap-8 px-6 font-sans font-medium uppercase tracking-wide lg:mt-16 lg:flex-row lg:justify-between lg:px-16">
          <div className="flex w-full items-center justify-between gap-12 lg:w-fit lg:justify-center">
            <p className="w-fit text-sm">
              free <br /> to start
            </p>
            <p className="w-fit text-right text-sm lg:text-left">
              no credit card <br /> ever required
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-12 lg:w-fit lg:justify-center">
            <p className="w-fit text-sm">
              live data <br /> refreshed daily
            </p>
            <p className="w-fit text-right text-sm lg:text-left">
              under 2 minutes <br /> to your first map
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Skiper 19's own doodle-stroke artwork, kept verbatim — only the
// stroke color changes below.
const SKIPER_PATH_D =
  "M876.605 394.131C788.982 335.917 696.198 358.139 691.836 416.303C685.453 501.424 853.722 498.43 941.95 409.714C1016.1 335.156 1008.64 186.907 906.167 142.846C807.014 100.212 712.699 198.494 789.049 245.127C889.053 306.207 986.062 116.979 840.548 43.3233C743.932 -5.58141 678.027 57.1682 672.279 112.188C666.53 167.208 712.538 172.943 736.353 163.088C760.167 153.234 764.14 120.924 746.651 93.3868C717.461 47.4252 638.894 77.8642 601.018 116.979C568.164 150.908 557 201.079 576.467 246.924C593.342 286.664 630.24 310.55 671.68 302.614C756.114 286.446 729.747 206.546 681.86 186.442C630.54 164.898 492 209.318 495.026 287.644C496.837 334.494 518.402 366.466 582.455 367.287C680.013 368.538 771.538 299.456 898.634 292.434C1007.02 286.446 1192.67 309.384 1242.36 382.258C1266.99 418.39 1273.65 443.108 1247.75 474.477C1217.32 511.33 1149.4 511.259 1096.84 466.093C1044.29 420.928 1029.14 380.576 1033.97 324.172C1038.31 273.428 1069.55 228.986 1117.2 216.384C1152.2 207.128 1188.29 213.629 1194.45 245.127C1201.49 281.062 1132.22 280.104 1100.44 272.673C1065.32 264.464 1044.22 234.837 1032.77 201.413C1019.29 162.061 1029.71 131.126 1056.44 100.965C1086.19 67.4032 1143.96 54.5526 1175.78 86.1513C1207.02 117.17 1186.81 143.379 1156.22 166.691C1112.57 199.959 1052.57 186.238 999.784 155.164C957.312 130.164 899.171 63.7054 931.284 26.3214C952.068 2.12513 996.288 3.87363 1007.22 43.58C1018.15 83.2749 1003.56 122.644 975.969 163.376C948.377 204.107 907.272 255.122 913.558 321.045C919.727 385.734 990.968 497.068 1063.84 503.35C1111.46 507.456 1166.79 511.984 1175.68 464.527C1191.52 379.956 1101.26 334.985 1030.29 377.017C971.109 412.064 956.297 483.647 953.797 561.655C947.587 755.413 1197.56 941.828 936.039 1140.66C745.771 1285.32 321.926 950.737 134.536 1202.19C-6.68295 1391.68 -53.4837 1655.38 131.935 1760.5C478.381 1956.91 1124.19 1515 1201.28 1997.83C1273.66 2451.23 100.805 1864.7 303.794 2668.89";

const LinePath = ({ className, scrollYProgress }) => {
  const pathLength = useTransform(scrollYProgress, [0, 1], [0.5, 1]);
  const strokeDashoffset = useTransform(pathLength, (value) => 1 - value);

  return (
    <svg
      width="1278"
      height="2319"
      viewBox="0 0 1278 2319"
      fill="none"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <motion.path
        d={SKIPER_PATH_D}
        stroke="#1E3A2B"
        strokeWidth="20"
        style={{ pathLength, strokeDashoffset, opacity: 0.12 }}
      />
      <motion.path d={SKIPER_PATH_D} stroke="#EFF87A" strokeWidth="20" style={{ pathLength, strokeDashoffset }} />
    </svg>
  );
};
