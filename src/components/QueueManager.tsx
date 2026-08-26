import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { ReservationRequest } from '../services/api';
import { CheckCircle, Clock } from 'lucide-react';

interface QueueManagerProps {
  requests: ReservationRequest[];
  onConfirm: (id: string) => void;
}

export const QueueManager: React.FC<QueueManagerProps> = ({ requests, onConfirm }) => {
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
    >
      <div className="mb-4">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
          <Clock size={11} /> Pickup Queue
        </span>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">Reservation requests</h2>
      </div>

      <div ref={listRef} className="divide-y divide-slate-100">
        <AnimatePresence>
          {requests.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
              className="py-3 flex items-center justify-between text-xs gap-4"
            >
              <div className="flex-1 min-w-0">
                <b className="font-bold text-slate-900 block">{r.id}</b>
                <span className="text-[11px] text-slate-500 block truncate">{r.item}</span>
              </div>

              <motion.div
                animate={r.status === 'Pending' ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
                transition={{ duration: 1.4, repeat: r.status === 'Pending' ? Infinity : 0 }}
              >
                <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                  r.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {r.status !== 'Pending' && <CheckCircle size={9} />}
                  {r.status}
                </span>
              </motion.div>

              <motion.button
                onClick={() => onConfirm(r.id)}
                whileHover={{ scale: 1.07, y: -1 }}
                whileTap={{ scale: 0.93 }}
                className={`font-bold px-3 py-1.5 rounded-xl transition-colors text-xs ${
                  r.status === 'Pending'
                    ? 'bg-gradient-to-r from-[#173d57] to-[#235274] text-white shadow-sm'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {r.status === 'Pending' ? 'Confirm' : 'Open'}
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

