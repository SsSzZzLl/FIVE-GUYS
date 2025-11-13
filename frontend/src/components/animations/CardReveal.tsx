import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { RARITY_STYLE_MAP, type Rarity } from "@/utils/rarity";

interface CardRevealProps {
  visible: boolean;
  rarity: Rarity;
  children: ReactNode;
}

export default function CardReveal({ visible, rarity, children }: CardRevealProps) {
  const style = RARITY_STYLE_MAP[rarity];

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="reveal"
          initial={{ opacity: 0, scale: 0.7, rotateX: -12 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.75 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative rounded-[26px] border-4 ${style.borderColor} ${style.glow} bg-[#1B1636]/80 p-6`}
        >
          <motion.div initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ duration: 0.7 }}>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

