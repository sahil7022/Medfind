import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface SplashScreenProps {
  onFinish?: () => void;
}

// Easing as a cubic-bezier function — Framer Motion v11+ requires named easings
const ease = 'easeOut';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onFinish) setTimeout(onFinish, 600);
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, scale: 1.04, transition: { duration: 0.55, ease } }
  };

  const logoVariants: Variants = {
    hidden: { scale: 0.3, opacity: 0, rotate: -15 },
    visible: {
      scale: 1, opacity: 1, rotate: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }
    }
  };

  const fadeUp: Variants = {
    hidden: { y: 24, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease } }
  };

  const barVariants: Variants = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1, transition: { delay: 0.6, duration: 1.5, ease } }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-gradient-to-br from-[#0f1c2a] via-[#173d57] to-[#0a1a25] text-white grid place-items-center z-[9999] cursor-pointer"
          onClick={() => setVisible(false)}
        >
          {/* Background glow orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          <div className="flex flex-col items-center text-center z-10 px-6">
            {/* Logo */}
            <motion.div
              variants={logoVariants}
              initial="hidden"
              animate="visible"
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#13865f] to-emerald-400 text-white grid place-items-center text-4xl font-black shadow-2xl shadow-emerald-500/30 mb-5"
            >
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              >
                M
              </motion.span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3, duration: 0.5, ease }}
              className="text-5xl font-black tracking-tight text-white leading-none mb-2"
            >
              MedFind
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.42, duration: 0.5, ease }}
              className="text-slate-400 text-sm mb-2"
            >
              Know it's available before you travel.
            </motion.p>

            {/* Badges */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.54, duration: 0.5, ease }}
              className="flex gap-2 mb-7"
            >
              {['Real-time stock', 'Firebase Auth', 'PostgreSQL'].map((badge) => (
                <span key={badge} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10">
                  {badge}
                </span>
              ))}
            </motion.div>

            {/* Progress bar */}
            <motion.div className="w-44 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                variants={barVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full origin-left"
              />
            </motion.div>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.66, duration: 0.5, ease }}
              className="text-[10px] text-slate-500 mt-3 font-medium"
            >
              Click anywhere to skip
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

