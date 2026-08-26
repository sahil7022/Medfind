import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';

interface HeroProps {
  onSearch: (query: string) => void;
}

const CHIPS = ['Paracetamol 500 mg', 'Azithromycin 500 mg', 'Cetirizine 10 mg'];

const WHY_ITEMS = [
  { title: 'Stock freshness', desc: 'Know exactly how recently the pharmacy confirmed item availability in store.' },
  { title: 'Reserve before you go', desc: 'Hold medicine for 30 mins to avoid traveling to an out-of-stock pharmacy.' },
];

export const Hero: React.FC<HeroProps> = ({ onSearch }) => {
  const [inputVal, setInputVal] = useState('Paracetamol 500 mg');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(inputVal.trim() || 'Paracetamol 500 mg');
  };

  const handleChipClick = (med: string) => {
    setInputVal(med);
    onSearch(med);
  };

  /* ── Framer variants ── */
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  };
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-12"
    >
      {/* Left column */}
      <div className="lg:col-span-7 py-2">
        <motion.span variants={fadeUp} className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase flex items-center gap-1.5">
          <Sparkles size={12} /> Real-time Medicine Availability
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight mt-2 mb-4"
        >
          Find it{' '}
          <motion.span
            className="text-transparent bg-clip-text bg-gradient-to-r from-[#173d57] to-emerald-500"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            style={{ backgroundSize: '200% 200%' }}
          >
            before
          </motion.span>{' '}
          you travel.
        </motion.h1>

        <motion.p variants={fadeUp} className="text-slate-600 text-base leading-relaxed max-w-xl mb-6">
          Search nearby pharmacies, verify live stock count, and reserve your medicine for 30 minutes before heading out.
        </motion.p>

        {/* Search bar */}
        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit}
          animate={focused ? { boxShadow: '0 0 0 3px rgba(23,61,87,0.18)' } : { boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
          transition={{ duration: 0.25 }}
          className="h-14 max-w-2xl bg-white border border-slate-300 rounded-2xl flex items-center px-4 transition-colors"
          style={{ borderColor: focused ? '#173d57' : undefined }}
        >
          <motion.span animate={focused ? { color: '#173d57' } : { color: '#94a3b8' }} transition={{ duration: 0.2 }}>
            <Search size={20} className="mr-3 shrink-0" />
          </motion.span>
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search medicine, strength or form…"
            className="w-full bg-transparent text-sm focus:outline-none text-slate-900"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.04, backgroundPosition: '100% 50%' }}
            whileTap={{ scale: 0.96 }}
            className="h-10 px-6 bg-gradient-to-r from-[#173d57] to-[#235274] text-white font-bold text-sm rounded-xl shrink-0 shadow-md"
          >
            Search
          </motion.button>
        </motion.form>

        {/* Chips */}
        <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-4">
          <span className="font-semibold">Popular:</span>
          {CHIPS.map((med, i) => (
            <motion.button
              key={med}
              onClick={() => handleChipClick(med)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 380, damping: 22 }}
              whileHover={{ scale: 1.07, y: -2 }}
              whileTap={{ scale: 0.93 }}
              className="border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 text-slate-600 rounded-full px-3 py-1.5 transition-colors text-xs font-medium"
            >
              {med}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Right card */}
      <motion.aside
        variants={fadeUp}
        whileHover={{ y: -4, boxShadow: '0 24px 48px rgba(23,61,87,0.25)' }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="lg:col-span-5 bg-gradient-to-br from-[#173d57] to-[#0f2b3e] text-white rounded-3xl p-7 shadow-xl flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-center text-[11px] font-bold tracking-widest text-slate-400 mb-4 uppercase">
            <span>WHY MEDFIND</span>
            <motion.i
              className="w-2.5 h-2.5 rounded-full bg-emerald-400 block"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {WHY_ITEMS.map(({ title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
              className="border-t border-white/10 pt-4 mt-4"
            >
              <strong className="text-white text-sm font-bold block mb-1">{title}</strong>
              <p className="text-slate-300 text-xs leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="border-t border-white/10 pt-4 mt-4"
        >
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Simple flow</span>
          {['Search', 'Verify', 'Reserve', 'Pick up'].map((step, i) => (
            <motion.span
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 + i * 0.08 }}
              className="text-xs text-slate-100 font-bold"
            >
              {step}{i < 3 ? ' → ' : ''}
            </motion.span>
          ))}
        </motion.div>
      </motion.aside>
    </motion.div>
  );
};

