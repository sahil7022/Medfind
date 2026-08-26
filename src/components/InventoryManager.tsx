import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { InventoryItem } from '../services/api';
import { RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';

interface InventoryManagerProps {
  items: InventoryItem[];
  onUpdateStock: (id: string) => void;
  onRefresh: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  items, onUpdateStock, onRefresh
}) => {
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
    >
      <div className="flex justify-between items-end mb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
            <TrendingUp size={11} /> Inventory
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">Current stock</h2>
        </div>
        <motion.button
          onClick={onRefresh}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </motion.button>
      </div>

      <div ref={listRef} className="divide-y divide-slate-100">
        <AnimatePresence>
          {items.map((x, i) => (
            <motion.div
              key={x.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
              className="py-3 flex items-center justify-between text-xs gap-4"
            >
              <div className="flex-1 min-w-0">
                <b className="font-bold text-slate-900 block truncate">{x.name}</b>
                <span className="text-[11px] text-slate-500 block">Updated {x.fresh}</span>
              </div>

              <div className="text-center">
                <motion.b
                  key={x.stock}
                  initial={{ scale: 1.3, color: '#13865f' }}
                  animate={{ scale: 1, color: '#0f172a' }}
                  transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
                  className="font-black text-sm block"
                >
                  {x.stock}
                </motion.b>
                <span className="text-[11px] text-slate-400 block">{x.unit}</span>
              </div>

              <div>
                <motion.span
                  animate={x.state === 'warn' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{ duration: 1.5, repeat: x.state === 'warn' ? Infinity : 0, ease: 'easeInOut' }}
                  className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    x.state === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {x.state === 'warn' && <AlertTriangle size={9} />}
                  {x.state === 'warn' ? 'Low stock' : 'Available'}
                </motion.span>
              </div>

              <motion.button
                onClick={() => onUpdateStock(x.id)}
                whileHover={{ scale: 1.07, backgroundColor: '#f1f5f9' }}
                whileTap={{ scale: 0.93 }}
                className="border border-slate-200 text-slate-900 font-bold px-3 py-1.5 rounded-xl transition-colors text-xs"
              >
                Update
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

