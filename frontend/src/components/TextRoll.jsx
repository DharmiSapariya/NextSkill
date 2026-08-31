import { motion } from "framer-motion";
import { cn } from "../lib/cn";

const STAGGER = 0.025;

// Ported from Skiper58's nav TextRoll — shrunk from its display-scale
// demo (text-4xl/5xl, vertical stack, blurred pill) down to nav scale:
// small uppercase links in a horizontal row, no pill wrapper. The
// hover roll-up-and-in mechanic itself is unchanged.
export default function TextRoll({ children, className, hoverColorClassName = "text-periwinkle" }) {
  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      className={cn("relative block overflow-hidden", className)}
      style={{ lineHeight: 0.95 }}
    >
      <div>
        {children.split("").map((l, i) => {
          const delay = STAGGER * i;
          return (
            <motion.span
              variants={{ initial: { y: 0 }, hovered: { y: "-100%" } }}
              transition={{ ease: "easeInOut", delay }}
              className="inline-block"
              key={i}
            >
              {l === " " ? " " : l}
            </motion.span>
          );
        })}
      </div>
      <div className={cn("absolute inset-0", hoverColorClassName)}>
        {children.split("").map((l, i) => {
          const delay = STAGGER * i;
          return (
            <motion.span
              variants={{ initial: { y: "100%" }, hovered: { y: 0 } }}
              transition={{ ease: "easeInOut", delay }}
              className="inline-block"
              key={i}
            >
              {l === " " ? " " : l}
            </motion.span>
          );
        })}
      </div>
    </motion.span>
  );
}
