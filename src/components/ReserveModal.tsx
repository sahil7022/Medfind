import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import { Pharmacy } from '../services/api';
import { X, Minus, Plus, Timer } from 'lucide-react';

interface ReserveModalProps {
  pharmacy: Pharmacy | null;
  medicine: string;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

export const ReserveModal: React.FC<ReserveModalProps> = ({
  pharmacy, medicine, onClose, onConfirm
}) => {
  const [qty, setQty] = useState(1);

  /* React Spring — animated qty number */
  const { number } = useSpring({ number: qty, config: { tension: 280, friction: 22 } });

  return (
    <AnimatePresence>
      {pharmacy && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[98]"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="fixed inset-0 grid place-items-center p-4 z-[99] pointer-events-none"
          >
            <div className="w-full max-w-md bg-white rounded-3xl p-7 relative shadow-2xl pointer-events-auto">
              {/* Close button */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.15, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </motion.button>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Timer size={14} className="text-emerald-600" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                    Reserve for pickup
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{medicine}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {pharmacy.name} · {pharmacy.distance} · {pharmacy.stock} available
                </p>
              </motion.div>

              {/* Qty control */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="text-xs font-bold text-slate-900 block mt-5 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
                    whileTap={{ scale: 0.88 }}
                    className="w-11 h-11 border border-slate-200 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <Minus size={16} />
                  </motion.button>

                  {/* React Spring animated number */}
                  <animated.div className="w-20 h-11 border border-slate-200 rounded-xl flex items-center justify-center font-black text-xl text-slate-900">
                    {number.to(n => Math.round(n))}
                  </animated.div>

                  <motion.button
                    onClick={() => setQty(Math.min(10, qty + 1))}
                    whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
                    whileTap={{ scale: 0.88 }}
                    className="w-11 h-11 border border-slate-200 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
              </motion.div>

              {/* Info row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="bg-slate-50 rounded-xl p-4 mt-5 space-y-2 text-xs"
              >
                {[
                  { label: 'Hold period', value: '30 minutes' },
                  { label: 'Pickup', value: 'In-store' },
                  { label: 'Price (est)', value: `${pharmacy.price} × ${qty}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <b className="font-bold text-slate-900">{value}</b>
                  </div>
                ))}
              </motion.div>

              {/* Confirm button */}
              <motion.button
                onClick={() => onConfirm(qty)}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="w-full bg-gradient-to-r from-[#173d57] to-[#235274] text-white font-bold py-3.5 rounded-xl mt-5 shadow-lg shadow-[#173d57]/20 text-sm"
              >
                ⚡ Confirm reservation
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

