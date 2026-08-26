import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'firebase/auth';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PharmacyCard } from './components/PharmacyCard';
import { InventoryManager } from './components/InventoryManager';
import { QueueManager } from './components/QueueManager';
import { ReserveModal } from './components/ReserveModal';
import { apiService, Pharmacy, InventoryItem, ReservationRequest } from './services/api';
import { getCurrentUserLocation, LocationCoordinates } from './services/geo';
import { onAuthChange, loginWithEmail, registerWithEmail, loginWithGoogle, logoutUser } from './firebase';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState('userView');
  const [medicine, setMedicine] = useState('Paracetamol 500 mg');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<ReservationRequest[]>([]);
  
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [activeReservation, setActiveReservation] = useState<{ id: string; medicine: string; qty: number; pharmacy: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [location, setLocation] = useState<LocationCoordinates>({ latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru' });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Auth Forms State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Auth State Listener
  useEffect(() => {
    onAuthChange((user) => setCurrentUser(user));
  }, []);

  // Fetch Data Function
  const loadData = async (medQuery = medicine, userLoc = location) => {
    const pData = await apiService.getPharmacies(medQuery, userLoc.latitude, userLoc.longitude);
    setPharmacies(pData);

    const iData = await apiService.getInventory();
    setInventory(iData);

    const rData = await apiService.getRequests();
    setRequests(rData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDetectLocation = async () => {
    showToast('Detecting location via browser Geolocation API...');
    const loc = await getCurrentUserLocation();
    setLocation(loc);
    await loadData(medicine, loc);
    showToast(`Updated nearby stock for ${loc.city || 'your area'}`);
  };

  const handleSearch = async (query: string) => {
    setMedicine(query);
    const pData = await apiService.getPharmacies(query, location.latitude, location.longitude);
    setPharmacies(pData);
  };

  const handleConfirmReservation = async (qty: number) => {
    if (!selectedPharmacy) return;
    const resId = 'MF' + Math.floor(1000 + Math.random() * 9000);
    const payload = { id: resId, medicine, qty, pharmacy: selectedPharmacy.name };

    await apiService.createReservation(payload);
    setActiveReservation(payload);
    setSelectedPharmacy(null);
    showToast(`Reservation ${resId} confirmed`);
    setActiveScreen('savedView');
    loadData();
  };

  const handleUpdateStock = async (id: string) => {
    await apiService.updateStock(id);
    showToast('Stock count updated');
    loadData();
  };

  const handleConfirmRequest = async (id: string) => {
    await apiService.confirmRequest(id);
    showToast(`Reservation ${id} confirmed`);
    loadData();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithEmail(emailInput, passwordInput);
      showToast('Signed in successfully!');
      setActiveScreen('userView');
    } catch (err: any) {
      showToast('Login error: ' + (err.message || err.code));
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerWithEmail(emailInput, passwordInput);
      showToast('Account registered successfully!');
      setActiveScreen('userView');
    } catch (err: any) {
      showToast('Registration error: ' + (err.message || err.code));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      showToast('Signed in with Google!');
      setActiveScreen('userView');
    } catch (err: any) {
      showToast('Google Auth error: ' + (err.message || err.code));
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    showToast('Signed out');
    setActiveScreen('userView');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <SplashScreen />

      <Header
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        currentUser={currentUser}
        locationCity={location.city || 'Bengaluru'}
        onDetectLocation={handleDetectLocation}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Animated screen transitions via Framer Motion */}
        <AnimatePresence mode="wait">
        {activeScreen === 'userView' && (
          <motion.section
            key="userView"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Hero onSearch={handleSearch} />

            <div className="mt-12">
              <div className="flex justify-between items-end gap-4 mb-4">
                <div>
                  <span className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase">
                    NEARBY RESULTS
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Pharmacies with {medicine}
                  </h2>
                </div>
              </div>

              <div className="text-xs text-slate-500 mb-6">
                {pharmacies.length} nearby pharmacies · Real-time stock reporting active
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pharmacies.map((p, i) => (
                  <PharmacyCard
                    key={p.id || i}
                    pharmacy={p}
                    medicine={medicine}
                    index={i}
                    onReserve={() => setSelectedPharmacy(p)}
                    onToast={showToast}
                  />
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {activeScreen === 'savedView' && (
          <motion.section
            key="savedView"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-6">
              <span className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase">
                YOUR ACTIVITY
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Reservations</h1>
              <p className="text-xs text-slate-500">Track your active 30-minute medicine holds.</p>
            </div>

            <div className="bg-[#173d57] text-white rounded-3xl p-6 flex justify-between items-end mb-6 shadow-xl">
              <div>
                <span className="text-[10px] text-slate-300 font-bold tracking-widest uppercase">ACTIVE RESERVATION</span>
                <strong className="block text-3xl font-black mt-1">
                  {activeReservation ? activeReservation.id : 'No active reservation'}
                </strong>
              </div>
              <div className="border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold">
                {activeReservation ? 'Confirmed • Ready for pickup' : '—'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              {activeReservation ? (
                <div className="space-y-3 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between py-2">
                    <b className="text-sm font-bold text-slate-900">{activeReservation.medicine}</b>
                    <span className="text-slate-600 font-medium">Quantity {activeReservation.qty}</span>
                  </div>
                  <div className="flex justify-between py-2 pt-3">
                    <b className="font-bold text-slate-900">{activeReservation.pharmacy}</b>
                    <span className="text-slate-600 font-medium">Hold for 30 minutes</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <strong className="block text-slate-900 text-base mb-1">No active reservation yet.</strong>
                  Search for a medicine and reserve it from a nearby pharmacy.
                </div>
              )}
            </div>
          </motion.section>
        )}

        {activeScreen === 'pharmacyView' && (
          <motion.section
            key="pharmacyView"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="flex justify-between items-end gap-4">
              <div>
                <span className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase">
                  PHARMACY PORTAL
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">CityCare Pharmacy</h1>
              </div>
              <span className="bg-emerald-50 text-emerald-700 font-extrabold text-xs px-3.5 py-1.5 rounded-full">
                ● Open until 10:30 PM
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold block">Listed medicines</span>
                <b className="text-3xl font-extrabold text-slate-900 block my-1">{inventory.length}</b>
                <small className="text-slate-400 text-[10px]">in inventory</small>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold block">Low stock</span>
                <b className="text-3xl font-extrabold text-slate-900 block my-1">
                  {inventory.filter(x => x.stock <= 2).length}
                </b>
                <small className="text-slate-400 text-[10px]">need attention</small>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold block">Pending reservations</span>
                <b className="text-3xl font-extrabold text-slate-900 block my-1">
                  {requests.filter(x => x.status === 'Pending').length}
                </b>
                <small className="text-slate-400 text-[10px]">awaiting action</small>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold block">Last inventory sync</span>
                <b className="text-3xl font-extrabold text-slate-900 block my-1">4 min</b>
                <small className="text-slate-400 text-[10px]">ago</small>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InventoryManager
                items={inventory}
                onUpdateStock={handleUpdateStock}
                onRefresh={loadData}
              />
              <QueueManager
                requests={requests}
                onConfirm={handleConfirmRequest}
              />
            </div>
          </motion.section>
        )}

        {activeScreen === 'loginView' && (
          <motion.section
            key="loginView"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md mx-auto py-12"
          >
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
              <span className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase">ACCOUNT ACCESS</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Sign In to MedFind</h2>
              <p className="text-xs text-slate-500 mb-6">Access your medicine reservations and store inventory.</p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Email Address</label>
                  <motion.input
                    whileFocus={{ borderColor: '#173d57', boxShadow: '0 0 0 3px rgba(23,61,87,0.12)' }}
                    type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Password</label>
                  <motion.input
                    whileFocus={{ borderColor: '#173d57', boxShadow: '0 0 0 3px rgba(23,61,87,0.12)' }}
                    type="password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <motion.button type="submit" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                  className="w-full bg-gradient-to-r from-[#173d57] to-[#235274] text-white font-bold text-xs py-3 rounded-xl shadow-md mt-2"
                >
                  Sign In with Email
                </motion.button>

                <motion.button type="button" onClick={handleGoogleSignIn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  Sign In with Google
                </motion.button>
              </form>

              <div className="text-center text-xs text-slate-500 mt-6">
                Don't have an account?{' '}
                <button onClick={() => setActiveScreen('registerView')} className="text-[#173d57] font-bold hover:underline">Register here</button>
              </div>
            </div>
          </motion.section>
        )}

        {activeScreen === 'registerView' && (
          <motion.section
            key="registerView"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md mx-auto py-12"
          >
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
              <span className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase">CREATE ACCOUNT</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Join MedFind</h2>
              <p className="text-xs text-slate-500 mb-6">Create an account to reserve medicine and sync inventory.</p>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Email Address</label>
                  <motion.input
                    whileFocus={{ borderColor: '#173d57', boxShadow: '0 0 0 3px rgba(23,61,87,0.12)' }}
                    type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Password</label>
                  <motion.input
                    whileFocus={{ borderColor: '#173d57', boxShadow: '0 0 0 3px rgba(23,61,87,0.12)' }}
                    type="password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <motion.button type="submit" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                  className="w-full bg-gradient-to-r from-[#173d57] to-[#235274] text-white font-bold text-xs py-3 rounded-xl shadow-md mt-2"
                >
                  Register Account
                </motion.button>
              </form>

              <div className="text-center text-xs text-slate-500 mt-6">
                Already have an account?{' '}
                <button onClick={() => setActiveScreen('loginView')} className="text-[#173d57] font-bold hover:underline">Sign In here</button>
              </div>
            </div>
          </motion.section>
        )}

        {activeScreen === 'profileView' && currentUser && (
          <motion.section
            key="profileView"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl mx-auto py-8"
          >
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-[#173d57] to-[#235274] text-white grid place-items-center text-2xl font-black shadow-lg"
                >
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </motion.div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{currentUser.displayName || currentUser.email?.split('@')[0]}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{currentUser.email}</p>
                  <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2.5 py-1 rounded-full mt-2 inline-block">Firebase Verified User</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Firebase Auth</span><b className="text-emerald-600">✓ Active Session</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Node.js / Express API</span><b className="text-[#173d57]">✓ Connected (Port 5000)</b></div>
              </div>

              <div className="flex gap-3">
                <motion.button onClick={handleLogout} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl"
                >Log Out</motion.button>
                <motion.button onClick={() => setActiveScreen('userView')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 border border-slate-200 text-slate-900 font-bold text-xs py-3 rounded-xl hover:bg-slate-50"
                >Back to Search</motion.button>
              </div>
            </div>
          </motion.section>
        )}
        </AnimatePresence>
      </main>

      {/* Reservation Modal */}
      <ReserveModal
        pharmacy={selectedPharmacy}
        medicine={medicine}
        onClose={() => setSelectedPharmacy(null)}
        onConfirm={handleConfirmReservation}
      />

      {/* Animated Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="fixed right-6 bottom-6 bg-slate-900 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2"
          >
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.4 }}>✓</motion.span>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
