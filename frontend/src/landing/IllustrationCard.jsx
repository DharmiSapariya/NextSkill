import { motion } from "framer-motion";

// A consistent frame for the recolored DrawKit illustrations: reveals
// with a soft rise-and-settle on scroll, then idles with a slow float so
// nothing on the page sits completely still. `delay` staggers siblings in
// a grid; `float` can be turned off for illustrations used somewhere the
// motion would compete with something busier (e.g. the scroll-stroke
// section).
export default function IllustrationCard({ src, alt, delay = 0, float = true, className = "" }) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.img
        src={src}
        alt={alt}
        className="h-full w-full object-contain drop-shadow-[0_18px_36px_rgba(30,58,43,0.14)]"
        animate={float ? { y: [0, -10, 0] } : undefined}
        transition={float ? { duration: 5.5 + delay, repeat: Infinity, ease: "easeInOut" } : undefined}
        draggable={false}
      />
    </motion.div>
  );
}
