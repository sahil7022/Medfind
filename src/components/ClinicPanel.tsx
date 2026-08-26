import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import { apiService, Pharmacy, InventoryItem, ReservationRequest } from '../services/api';
import { X, User } from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

interface ClinicPanelProps {
  clinicId: string;
  clinicName: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}

const CLINIC_STATUSES = [
  { id: 'inventory', title: 'Inventory', description: 'Manage medicine stock' },
  { id: 'reservations', title: 'Reservation Queue', description: 'View pending reservations' },
  { id: 'analytics', title: 'Analytics', description: 'Clinic performance metrics' },
  { id: 'settings', title: 'Settings', description: 'Clinic configuration' },
];

export const ClinicPanel: React.FC<ClinicPanelProps> = ({
  clinicId, clinicName, onClose, onToast
}) => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<ReservationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const listRef = useAutoAnimate<HTMLDivElement>();

  // Physics-based spring count-up for the analytics numbers
  const { prescriptions, activeRes, fulfillment } = useSpring({
    prescriptions: 128,
    activeRes: requests.length || 24,
    fulfillment: 12,
    config: { tension: 180, friction: 18 },
    delay: 150,
  });

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const [pData, iData, rData] = await Promise.all([
          apiService.getPharmacies('', undefined, undefined),
          apiService.getInventory(),
          apiService.getRequests(),
        ]);
        if (!cancelled) {
          setPharmacies(pData);
          setInventory(iData);
          setRequests(rData);
        }
      } catch (err) {
        console.warn('ClinicPanel data load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [clinicId]);

  const handleConfirmReservation = async (id: string) => {
    try {
      await apiService.confirmRequest(id);
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: 'Confirmed' } : r)));
      onToast(`Reservation ${id} confirmed`);
    } catch (err: any) {
      onToast(err.message || `Could not confirm reservation ${id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        {/* Clinic Tabs */}
        <div className="border-b border-slate-200">
          <div className="grid grid-cols-4 border-b border-slate-200">
            {CLINIC_STATUSES.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-slate-900 border-b-2 border-emerald-600 bg-white'
                    : 'text-slate-500 hover:text-slate-700 bg-transparent'
                }`}
              >
                <span className="font-semibold">{tab.title}</span>
                <span className="text-[10px] text-slate-400 block text-xs">{tab.description}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Main Content Sections */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 gap-6 pt-6">
            {/* Pharmacies Grid */}
            <motion.div
              key="pharmacies"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {pharmacies.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-semibold text-slate-900 mb-2">{p.name}</h3>
                  <p className="text-xs text-slate-500 mb-2">{p.address || 'Address not available'}</p>
                  <p className="text-sm font-bold">
                    {p.state === 'good' ? `Stock: ${p.stock}` : p.state === 'warn' ? `⚠ ${p.stock} left` : '✗ Out of stock'}
                  </p>
                  <motion.button
                    onClick={() => onToast(`Viewing ${p.name} details...`)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-3 w-full text-xs font-bold text-emerald-600 py-2 rounded-bg transition-colors"
                  >
                    View Details
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>

            {/* Inventory Table */}
            <motion.div
              key="inventory-table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm"
            >
              <h3 className="text-semibold text-slate-900 mb-4">Current Inventory</h3>
              <div className="divide-y divide-slate-100">
                {inventory.map((x, i) => (
                  <motion.div
                    key={x.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-3 flex items-center justify-between text-xs gap-4"
                  >
                    <span className="font-bold text-slate-900">{x.name}</span>
                    <span className="text-slate-400">{x.stock} {x.unit}</span>
                    <span className={x.state === 'warn' ? 'text-amber-600' : 'text-emerald-600'}>
                      {x.state}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <motion.div
            key="reservations-queue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="text-semibold text-slate-900 mb-4">Pending Reservations</h3>
            {requests.length === 0 ? (
              <p className="text-slate-500">No pending reservations</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="py-3 flex items-center justify-between text-xs gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-extrabold text-slate-900">{r.id}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">
                          <User size={10} className="text-emerald-600" />
                          {r.patientName || 'Patient'}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px] block">{r.item}</span>
                    </div>

                    <motion.button
                      onClick={() => handleConfirmReservation(r.id)}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.93 }}
                      className={`font-bold px-3.5 py-1.5 rounded-xl transition-colors text-xs ${
                        r.status === 'Pending' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 text-slate-700'
                      }`}
                    >
                      {r.status === 'Pending' ? 'Confirm' : 'Open'}
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="text-semibold text-slate-900 mb-4">Clinic Analytics</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Total Prescriptions</p>
                <animated.p className="text-3xl font-black text-emerald-800">{prescriptions.to(n => Math.round(n))}</animated.p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Active Reservations</p>
                <animated.p className="text-3xl font-black text-slate-900">{activeRes.to(n => Math.round(n))}</animated.p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Avg Fulfillment Time</p>
                <animated.p className="text-3xl font-black text-amber-800">{fulfillment.to(n => `${Math.round(n)} min`)}</animated.p>
              </div>
              <div className="bg-rose-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Customer Rating</p>
                <p className="text-3xl font-black text-rose-800">4.8</p>
              </div>
            </div>
            <div className="h-8 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                style={{ width: '75%' }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Stock freshness: 85% confirmed within 15 minutes</p>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="text-semibold text-slate-900 mb-4">Clinic Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Clinic Name</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => onToast(`Updating clinic name to: ${e.target.value}`)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Operating Hours</label>
                <input
                  type="text"
                  value="Open until 10:30 PM"
                  onChange={(e) => onToast('Hours updated')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value="+91 98765 43210"
                  onChange={(e) => onToast('Contact updated')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <button
                onClick={() => onToast('Settings saved successfully!')}
                className="w-full bg-gradient-to-r from-[#173d57] to-[#235274] text-white font-bold py-3 rounded-xl shadow-md mt-3 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16 text-slate-500 text-xs font-semibold">Loading clinic data...</div>
        )}

        {/* Empty State */}
        {!loading && pharmacies.length === 0 && inventory.length === 0 && requests.length === 0 && activeTab !== 'settings' && (
          <motion.div
            className="text-center py-20 text-slate-500"
          >
            <motion.span
              initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center"
            >
              <X size={48} className="text-emerald-300" />
            </motion.span>
            <p>No data available for {clinicName}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Close Button */}
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.15, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-100 text-slate-500 text-xl grid place-items-center hover:text-slate-900 transition-colors"
      >
        <X size={18} />
      </motion.button>
    </motion.div>
  );
};