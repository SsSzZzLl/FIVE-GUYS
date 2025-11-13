import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface PackOpeningProps {
  isActive: boolean;
  children: ReactNode;
}

export default function PackOpening({ isActive, children }: PackOpeningProps) {
  return (
    <AnimatePresence>
      {isActive ? (
        <motion.div
          key="pack"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-lg"
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 24px rgba(143,95,255,0.35)",
                "0 0 34px rgba(143,95,255,0.65)",
                "0 0 24px rgba(143,95,255,0.35)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="rounded-[28px] border border-neonPrimary/60 bg-gradient-to-br from-[#221B46] to-[#0F0C1E] p-10"
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

