import { motion } from "framer-motion";

export default function AnnouncementBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-9 w-full items-center justify-center bg-forest px-4 text-center"
    >
      <p className="text-[13px] text-cream-on-dark">
        Free for individuals — every recommendation traces back to a real job posting.
      </p>
    </motion.div>
  );
}
