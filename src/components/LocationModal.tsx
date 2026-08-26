import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Navigation, X, Check, Sparkles } from 'lucide-react';
import { apiService } from '../services/api';
import { LocationCoordinates } from '../services/geo';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationCoordinates;
  onSelectLocation: (loc: LocationCoordinates) => void;
  onToast: (msg: string) => void;
}

const POPULAR_CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen, onClose, currentLocation, onSelectLocation, onToast
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleDetect = async () => {
    setIsGeolocating(true);
    setErrorMsg('');
    onToast('Fetching location via Google Maps API...');

    try {
      const loc = await apiService.geolocateWithGoogleMaps();
      onSelectLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: loc.city || 'Google Maps Location'
      });
      onToast(`📍 Location set to: ${loc.city}`);
      onClose();
    } catch (e: any) {
      setErrorMsg('Failed to detect via Google Maps. Please type your city below.');
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleGeocodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setIsSearching(true);
    setErrorMsg('');
    onToast(`Searching Google Maps for "${searchInput}"...`);

    const result = await apiService.geocodeAddress(searchInput.trim());

    if (result) {
      onSelectLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.formattedAddress.split(',')[0] || searchInput
      });
      onToast(`📍 Location updated to: ${result.formattedAddress}`);
      onClose();
    } else {
      setErrorMsg(`Could not find "${searchInput}" on Google Maps. Try another city or locality.`);
    }
    setIsSearching(false);
  };

  const handleSelectCity = (city: { name: string; lat: number; lng: number }) => {
    onSelectLocation({
      latitude: city.lat,
      longitude: city.lng,
      city: city.name
    });
    onToast(`📍 Switched location to ${city.name}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 z-10 space-y-5"
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-emerald-600 uppercase flex items-center gap-1">
                  <Sparkles size={11} /> GOOGLE MAPS LOCATION
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  Select Search Location
                </h2>
                <p className="text-xs text-slate-500">
                  Find medicine availability in any city or neighborhood.
                </p>
              </div>

              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-slate-500 hover:text-slate-900"
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Google Geolocation Button */}
            <motion.button
              onClick={handleGoogleDetect}
              disabled={isGeolocating}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-gradient-to-r from-[#173d57] to-[#235274] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-lg shadow-[#173d57]/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center text-emerald-300">
                  <Navigation size={18} className={isGeolocating ? 'animate-spin' : ''} />
                </div>
                <div className="text-left">
                  <b className="text-xs block">Auto-detect via Google Maps</b>
                  <span className="text-[10px] text-slate-300">Uses Google Geolocation & Reverse Geocode API</span>
                </div>
              </div>
              <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                {isGeolocating ? 'Detecting...' : 'Detect'}
              </span>
            </motion.button>

            {/* Address Search Bar */}
            <form onSubmit={handleGeocodeSearch} className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Or search city / locality on Google Maps:
              </label>
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="e.g. Koramangala, Indiranagar, Bandra..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#173d57] rounded-xl pl-9 pr-24 py-2.5 text-xs text-slate-900 focus:outline-none"
                />
                <motion.button
                  type="submit"
                  disabled={isSearching}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="absolute right-1.5 bg-[#173d57] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg"
                >
                  {isSearching ? 'Searching...' : 'Search Map'}
                </motion.button>
              </div>
            </form>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                {errorMsg}
              </p>
            )}

            {/* Quick Cities */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                Popular Metro Cities
              </span>
              <div className="grid grid-cols-3 gap-2">
                {POPULAR_CITIES.map((city) => {
                  const isSelected = currentLocation.city === city.name;
                  return (
                    <motion.button
                      key={city.name}
                      onClick={() => handleSelectCity(city)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{city.name}</span>
                      {isSelected && <Check size={13} className="text-emerald-600" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
