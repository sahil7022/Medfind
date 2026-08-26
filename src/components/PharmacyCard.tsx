import React from 'react';
import { motion } from 'framer-motion';
import { Pharmacy } from '../services/api';
import { Navigation, Clock, DollarSign, Package, Star, MapPin } from 'lucide-react';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  medicine: string;
  onReserve: () => void;
  onToast: (msg: string) => void;
  index?: number;
}

export const PharmacyCard: React.FC<PharmacyCardProps> = ({
  pharmacy, medicine, onReserve, onToast, index = 0
}) => {
  const isOut = !pharmacy.stock || pharmacy.open === 'Closed';

  const stateBadge = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warn: 'bg-amber-50 text-amber-700 border-amber-100',
    out:  'bg-rose-50 text-rose-700 border-rose-100',
  }[pharmacy.state] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  const stateLabel =
    pharmacy.state === 'good' ? `✓ ${pharmacy.stock} available`
    : pharmacy.state === 'warn' ? `⚠ ${pharmacy.stock} left`
    : '✗ Out of stock';

  // Build a Google Maps directions URL using lat/lng or name
  const mapsUrl = pharmacy.lat && pharmacy.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}&destination_place_id=${pharmacy.id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pharmacy.name + ' ' + (pharmacy.address || ''))}`;

  const stats = [
    { icon: Package,    label: 'Stock',     value: pharmacy.stock ? `${pharmacy.stock} units` : 'Unavailable' },
    { icon: Clock,      label: 'Confirmed', value: pharmacy.fresh },
    { icon: DollarSign, label: 'Price',     value: pharmacy.price },
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(23,61,87,0.12)' }}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-shadow"
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.07 + 0.15 }}
            className="text-base font-extrabold text-slate-900 tracking-tight truncate"
          >
            {pharmacy.name}
          </motion.h3>

          {/* Address from Google Places */}
          {pharmacy.address && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <MapPin size={10} className="text-emerald-500 shrink-0" />
              {pharmacy.address}
            </p>
          )}

          {/* Distance & open status */}
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{pharmacy.distance}</span>
            {' · '}
            <span className={pharmacy.open === 'Closed' ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
              {pharmacy.open}
            </span>
          </p>

          {/* Google rating */}
          {pharmacy.rating != null && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-bold text-slate-700">{pharmacy.rating.toFixed(1)}</span>
              {pharmacy.totalRatings != null && (
                <span className="text-[10px] text-slate-400">({pharmacy.totalRatings.toLocaleString()})</span>
              )}
            </div>
          )}
        </div>

        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.07 + 0.2, type: 'spring', stiffness: 400, damping: 20 }}
          className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full whitespace-nowrap border ${stateBadge}`}
        >
          {stateLabel}
        </motion.span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 my-4">
        {stats.map(({ icon: Icon, label, value }, si) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 + 0.22 + si * 0.06 }}
            whileHover={{ scale: 1.04, backgroundColor: '#f8fafc' }}
            className="bg-slate-50 p-2.5 rounded-xl cursor-default transition-colors"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Icon size={11} className="text-slate-400" />
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
            </div>
            <b className="text-xs font-bold text-slate-900 block">{value}</b>
          </motion.div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.03, backgroundColor: '#f8fafc' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onToast('Opening Google Maps directions...')}
          className="flex-1 border border-slate-200 text-slate-900 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <Navigation size={13} /> Directions
        </motion.a>

        <motion.button
          disabled={isOut}
          onClick={onReserve}
          whileHover={!isOut ? { scale: 1.03, y: -1 } : {}}
          whileTap={!isOut ? { scale: 0.97 } : {}}
          className={`flex-1 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 ${
            isOut
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#173d57] to-[#235274] text-white shadow-md shadow-[#173d57]/25'
          }`}
        >
          {isOut ? 'Unavailable' : '⚡ Reserve'}
        </motion.button>
      </div>
    </motion.article>
  );
};
