import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { Search, Bookmark, Store, MapPin, User as UserIcon, Bot, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  currentUser: User | null;
  locationCity: string;
  onDetectLocation: () => void;
  onOpenSymptomChecker?: () => void;
}


const navItems = [
  { id: 'userView', label: 'Find Medicine', icon: Search },
  { id: 'savedView', label: 'Reservations', icon: Bookmark },
  { id: 'pharmacyView', label: 'Pharmacy Portal', icon: Store },
  { id: 'clinicView', label: 'Clinic Panel', icon: MapPin },
];


export const Header: React.FC<HeaderProps> = ({
  activeScreen, setActiveScreen, currentUser, locationCity, onDetectLocation, onOpenSymptomChecker
}) => {
  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="h-18 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between gap-6"
    >
      {/* Logo */}
      <motion.div
        onClick={() => setActiveScreen('userView')}
        className="flex items-center gap-3 cursor-pointer min-w-[200px]"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#173d57] to-[#235274] text-white grid place-items-center font-black text-lg shadow-md shadow-[#173d57]/20"
        >
          M
        </motion.div>
        <div>
          <b className="block text-base tracking-tight leading-none text-slate-900">MedFind</b>
          <small className="block text-slate-500 text-[10px] mt-0.5">Know it's available.</small>
        </div>
      </motion.div>

      {/* Nav */}
      <nav className="hidden md:flex gap-1 flex-1 max-w-md">
        {navItems.map(({ id, label, icon: Icon }, idx) => {
          const isClinic = id === 'clinicView';
          return (
            <motion.button
              key={id}
              onClick={() => setActiveScreen(id)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeScreen === id ? 'text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }${isClinic ? ' bg-emerald-50 border-emerald-200' : ''}`}
              whileHover={{ scale: 1.03, borderColor: isClinic ? '#173d57' : undefined }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.07, duration: 0.4, ease: 'easeOut' }}
            >
              {activeScreen === id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-slate-200 rounded-xl"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={14} /> {label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {onOpenSymptomChecker && (
          <motion.button
            onClick={onOpenSymptomChecker}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#173d57] text-white text-xs font-bold shadow-md shadow-emerald-600/20 border border-emerald-400/30 transition-all"
          >
            <Bot size={15} />
            <span>AI Doctor</span>
            <Sparkles size={11} className="text-amber-300" />
          </motion.button>
        )}

        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="hidden sm:inline-block bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full px-2.5 py-1 uppercase tracking-wider"
        >
          Live API
        </motion.span>

        <motion.button
          onClick={onDetectLocation}
          whileHover={{ scale: 1.05, borderColor: '#94a3b8' }}
          whileTap={{ scale: 0.95 }}
          className="border border-slate-200 bg-white text-slate-700 text-xs rounded-xl px-3 py-2 flex items-center gap-1.5 transition-colors"
        >
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MapPin size={13} className="text-emerald-600" />
          </motion.span>
          <span>{locationCity}</span>
        </motion.button>

        <motion.button
          onClick={() => setActiveScreen(currentUser ? 'profileView' : 'loginView')}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.96 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md ${
            currentUser
              ? 'border border-slate-300 bg-white text-slate-900'
              : 'bg-gradient-to-r from-[#173d57] to-[#235274] text-white shadow-[#173d57]/25'
          }`}
        >
          <UserIcon size={14} />
          {currentUser ? (currentUser.displayName || currentUser.email?.split('@')[0]) : 'Sign In'}
        </motion.button>
      </div>
    </motion.header>
  );
};

