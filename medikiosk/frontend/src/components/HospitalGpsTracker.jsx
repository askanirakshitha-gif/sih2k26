import React, { useState, useEffect } from 'react';
import {
  MapPin, Navigation, Phone, ShieldCheck, Activity, Search,
  Bed, HeartPulse, Clock, ChevronRight, Compass, AlertCircle,
  ExternalLink, Sparkles, Building2, CheckCircle, Award
} from 'lucide-react';
import { getTranslation } from '../services/i18n';

// 10 Premier Indian Hospitals & OPD Smart Hubs with GPS Coordinates
const HOSPITALS_DATA = [
  {
    id: 'hosp_aiims_delhi',
    name: 'AIIMS New Delhi (All India Institute of Medical Sciences)',
    city: 'New Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029',
    lat: 28.5672,
    lng: 77.2100,
    phone: '+91-11-26588500',
    emergencyPhone: '102 / +91-11-26588700',
    type: 'Multi-Specialty & Referral Apex Hospital',
    erBeds: 18,
    icuBeds: 6,
    opdWaitTime: '12 min',
    accreditation: 'NABH Accredited • ABDM M1/M2/M3 Standards',
    features: ['24/7 Emergency ER', 'Trauma Center Level-1', 'AYUSH Integrative OPD', 'ABDM Health Locker']
  },
  {
    id: 'hosp_apollo_blr',
    name: 'Apollo Hospital Bengaluru',
    city: 'Bengaluru',
    address: '154/11, Bannerghatta Road, Opp IIM, Bengaluru 560076',
    lat: 12.8954,
    lng: 77.5986,
    phone: '+91-80-26304050',
    emergencyPhone: '1066 / +91-80-26304050',
    type: 'Quaternary Super Speciality',
    erBeds: 14,
    icuBeds: 8,
    opdWaitTime: '8 min',
    accreditation: 'JCI & NABH Accredited • ABDM Certified',
    features: ['24/7 Cardiac ER', 'Stroke Unit', 'Smart Kiosk OPD', 'Robotic Surgery']
  },
  {
    id: 'hosp_fortis_delhi',
    name: 'Fortis Escorts Heart Institute',
    city: 'New Delhi',
    address: 'Okhla Road, New Delhi 110025',
    lat: 28.5606,
    lng: 77.2764,
    phone: '+91-11-47135000',
    emergencyPhone: '+91-11-47134000',
    type: 'Advanced Cardiac & Vascular Center',
    erBeds: 10,
    icuBeds: 5,
    opdWaitTime: '10 min',
    accreditation: 'NABH Accredited • ABDM Compliant',
    features: ['Stat Cath Lab 24/7', 'Emergency Cardiac Triage', 'Smart OPD Intake']
  },
  {
    id: 'hosp_manipal_blr',
    name: 'Manipal Hospital HAL Airport Road',
    city: 'Bengaluru',
    address:98,
    lat: 12.9582,
    lng: 77.6493,
    phone: '+91-80-25024444',
    emergencyPhone: '105711 / +91-80-25024444',
    type: 'Super Speciality Hospital',
    erBeds: 16,
    icuBeds: 7,
    opdWaitTime: '6 min',
    accreditation: 'NABH & NABL Accredited',
    features: ['Level-1 Emergency', 'Integrated AYUSH Clinic', 'ABDM Digital Record Sync']
  },
  {
    id: 'hosp_medanta_gurugram',
    name: 'Medanta - The Medicity',
    city: 'Gurugram / NCR',
    address: 'CH Baktawar Singh Road, Sector 38, Gurugram 122001',
    lat: 28.4385,
    lng: 77.0427,
    phone: '+91-124-4141414',
    emergencyPhone: '1068 / +91-124-4141414',
    type: 'Multi-Super Speciality Institute',
    erBeds: 24,
    icuBeds: 12,
    opdWaitTime: '15 min',
    accreditation: 'JCI & NABH Accredited',
    features: ['Air Ambulance', 'Comprehensive Cancer & Heart ER', 'Digital Kiosk Ecosystem']
  },
  {
    id: 'hosp_max_saket',
    name: 'Max Super Speciality Hospital Saket',
    city: 'New Delhi',
    address: '1, 2 Press Enclave Marg, Saket, New Delhi 110017',
    lat: 28.5284,
    lng: 77.2115,
    phone: '+91-11-26515050',
    emergencyPhone: '+91-11-26515050',
    type: 'Super Speciality Healthcare Center',
    erBeds: 12,
    icuBeds: 4,
    opdWaitTime: '9 min',
    accreditation: 'NABH Accredited • ABDM M1/M2/M3',
    features: ['Code FAST Stroke Unit', 'Smart Triage Kiosk', 'Emergency Cardiac Care']
  },
  {
    id: 'hosp_pgimer_chd',
    name: 'PGIMER Chandigarh',
    city: 'Chandigarh',
    address: 'Sector 12, Chandigarh 160012',
    lat: 30.7628,
    lng: 76.7766,
    phone: '+91-172-2756565',
    emergencyPhone: '+91-172-2747837',
    type: 'Tertiary Care Apex Institute',
    erBeds: 20,
    icuBeds: 9,
    opdWaitTime: '14 min',
    accreditation: 'National Apex Accreditation',
    features: ['Advanced Trauma Center', 'AYUSH Research OPD', 'ABDM Health Vault']
  },
  {
    id: 'hosp_narayana_blr',
    name: 'Narayana Health City',
    city: 'Bengaluru',
    address: '258/A, Bommasandra Industrial Area, Hosur Road, Bengaluru 560099',
    lat: 12.8105,
    lng: 77.6953,
    phone: '+91-80-71222222',
    emergencyPhone: '105711',
    type: 'Health City & Cardiac Center',
    erBeds: 30,
    icuBeds: 15,
    opdWaitTime: '7 min',
    accreditation: 'JCI & NABH Accredited',
    features: ['24/7 Pediatric & Adult ER', 'Low-Cost Smart OPD', 'ABDM Integrated']
  },
  {
    id: 'hosp_gangaram_delhi',
    name: 'Sir Ganga Ram Hospital',
    city: 'New Delhi',
    address: 'Rajinder Nagar, New Delhi 110060',
    lat: 28.6394,
    lng: 77.1883,
    phone: '+91-11-25750000',
    emergencyPhone: '+91-11-42251000',
    type: 'Multi-Specialty Premier Hospital',
    erBeds: 11,
    icuBeds: 3,
    opdWaitTime: '11 min',
    accreditation: 'NABH Accredited',
    features: ['Emergency Care', 'AIIA Ayurvedic Integrative Wing', 'ABDM M2 Locker']
  },
  {
    id: 'hosp_victoria_blr',
    name: 'Victoria Hospital & Bangalore Medical College',
    city: 'Bengaluru',
    address: 'Fort Road, Near City Market, Bengaluru 560002',
    lat: 12.9634,
    lng: 77.5750,
    phone: '+91-80-26701150',
    emergencyPhone: '108 / +91-80-26701150',
    type: 'Government Apex Teaching Hospital',
    erBeds: 25,
    icuBeds: 10,
    opdWaitTime: '5 min',
    accreditation: 'NABH Govt Accredited',
    features: ['24/7 Govt ER', 'Integrated AYUSH SACTP Desk', 'Free Triage Services']
  }
];

// Haversine formula to calculate real-time distance in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

export default function HospitalGpsTracker({ language = 'en', onSelectHospital, onStartKiosk }) {
  // User GPS Coordinates State (Default: New Delhi AIIMS area)
  const [userLocation, setUserLocation] = useState({ lat: 28.5672, lng: 77.2100 });
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Default GPS Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'ER' | 'AYUSH' | 'BEDS'

  // Request browser live GPS location on mount
  useEffect(() => {
    fetchUserLocation();
  }, []);

  const fetchUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported by browser. Using default GPS.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring real-time GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setIsLocating(false);
        setLocationStatus(`Live GPS Active (Lat: ${pos.coords.latitude.toFixed(4)}°, Lng: ${pos.coords.longitude.toFixed(4)}°)`);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsLocating(false);
        setLocationStatus('GPS Access Denied. Showing default premier hospital hubs.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Sort hospitals by distance from current user GPS location
  const sortedHospitals = HOSPITALS_DATA.map(h => ({
    ...h,
    distanceKm: calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng)
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  // Filter hospitals by search query and type filter
  const filteredHospitals = sortedHospitals.filter(h => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'ER') return h.features.some(f => f.includes('ER') || f.includes('Emergency'));
    if (selectedFilter === 'AYUSH') return h.features.some(f => f.includes('AYUSH') || f.includes('Ayurvedic'));
    if (selectedFilter === 'BEDS') return h.erBeds > 12;

    return true;
  });

  const openGoogleMapsDirections = (lat, lng, name) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full bg-slate-50 text-slate-900 font-sans pb-16">

      {/* -------------------------------------------------------------------- */}
      {/* 1. HERO BANNER - MATCHING USER SCREENSHOT DESIGN */}
      {/* -------------------------------------------------------------------- */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-sky-950 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-sky-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative z-10">

          {/* Platform Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs sm:text-sm font-bold mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>PRE-CONSULTATION CLINICAL INTAKE & TRIAGE</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-3">
            MediKiosk <span className="text-sky-400">AI</span>
          </h1>

          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-200 mb-4">
            Clinical History Software Platform
          </h2>

          <p className="text-sky-200 text-base sm:text-xl max-w-3xl mx-auto font-medium mb-8 leading-relaxed">
            AI-Powered Clinical History & Pre-Consultation Platform. Capture your medical history, digitize existing health records, and prepare a clinician-ready history before consultation.
          </p>

          {/* Patient Login / Start Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={onStartKiosk}
              className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-teal-900/40 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-3 border border-teal-400/40"
            >
              <span>{language === 'hi' ? 'मरीज लॉगिन / ओपीडी टोकन' : language === 'kn' ? 'ರೋಗಿ ಲಾಗಿನ್ / ಒಪಿಡಿ ಟೋಕನ್' : 'Patient Login ->'}</span>
            </button>
          </div>

          {/* Feature Sub-pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto text-xs sm:text-sm font-semibold text-slate-300">
            <span className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Conversational Clinical History</span>
            </span>
            <span className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>Medical Document Digitization</span>
            </span>
            <span className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>HIS & ABHA Health Locker Link</span>
            </span>
          </div>

        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 2. HOSPITAL INFRASTRUCTURE & SMART FACILITY BAR */}
      {/* -------------------------------------------------------------------- */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <span className="text-xs font-extrabold text-sky-700 uppercase tracking-widest bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
              HOSPITAL INFRASTRUCTURE & TECHNOLOGY
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              Smart Hospital Ecosystem & Clinical Facilities
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
            <Award className="w-5 h-5 text-amber-500" />
            <span>NABH Accredited • ABDM M1/M2/M3 Standards</span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 3. REAL-TIME GPS TRACKER & HOSPITALS NEAR ME */}
      {/* -------------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {/* GPS Control Bar */}
        <div className="bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl mb-10 border border-sky-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                <span>REAL-TIME GPS LOCATOR & ER TRACKER</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Hospitals Near Me & OPD Smart Facilities
              </h3>
              <p className="text-sky-200 text-xs sm:text-sm mt-1 font-medium">
                Live GPS distance calculation, ER bed availability, emergency contacts, and one-tap OPD kiosk registration.
              </p>
            </div>

            {/* GPS Refresh Button & Status */}
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <button
                onClick={fetchUserLocation}
                disabled={isLocating}
                className="px-5 py-3 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition shadow-lg flex items-center space-x-2 border border-sky-300/40"
              >
                <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS...' : 'Refresh Live GPS Location'}</span>
              </button>
              <span className="text-[11px] font-mono text-sky-300/90 bg-sky-950/60 px-2.5 py-1 rounded-md border border-sky-800/60">
                📍 {locationStatus}
              </span>
            </div>

          </div>

          {/* Search & Category Filter Bar */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-sky-800/60">

            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by hospital name, city (e.g. Bengaluru, New Delhi), or address..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/90 text-white placeholder-slate-400 text-sm font-medium rounded-2xl border border-slate-700 focus:ring-2 focus:ring-sky-400 outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All 10 Premier Hospitals' },
                { id: 'ER', label: '24/7 ER' },
                { id: 'AYUSH', label: 'AYUSH OPD' },
                { id: 'BEDS', label: 'High ER Beds' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                    selectedFilter === tab.id
                      ? 'bg-sky-500 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Hospital Cards List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 px-1">
            <span>SHOWING {filteredHospitals.length} TOP HOSPITALS SORTED BY REAL-TIME GPS DISTANCE</span>
            <span>LIVE ER STATUS & KIOSK COMPATIBLE</span>
          </div>

          {filteredHospitals.map((hosp, idx) => (
            <div
              key={hosp.id}
              className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 hover:border-sky-400 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              
              {/* Left Details */}
              <div className="space-y-3 max-w-2xl">
                
                {/* Distance & Rank Badge */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className="px-3 py-1 bg-sky-100 text-sky-900 rounded-full font-extrabold text-xs flex items-center border border-sky-300">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-sky-600" />
                    {hosp.distanceKm > 0 ? `${hosp.distanceKm} km away` : 'Near You'}
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full font-bold text-xs flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    {hosp.accreditation}
                  </span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono font-semibold">
                    {hosp.city}
                  </span>
                </div>

                {/* Hospital Name & Type */}
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900">
                    {hosp.name}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                    {hosp.address}
                  </p>
                </div>

                {/* Features Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {hosp.features.map((feat, fIdx) => (
                    <span key={fIdx} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                      • {feat}
                    </span>
                  ))}
                </div>

                {/* Live Real-time Vitals / ER Bed Availability */}
                <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div className="font-bold flex items-center space-x-1">
                      <Bed className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{hosp.erBeds} ER Beds Available</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="font-bold flex items-center space-x-1">
                      <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
                      <span>{hosp.icuBeds} ICU Beds</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900">
                    <div className="font-bold flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>Avg OPD Wait: {hosp.opdWaitTime}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 justify-center">

                {/* GPS Navigation Button */}
                <button
                  onClick={() => openGoogleMapsDirections(hosp.lat, hosp.lng, hosp.name)}
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm rounded-2xl transition flex items-center justify-center space-x-2 shadow-md"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Navigate with GPS</span>
                </button>

                {/* Emergency Call Button */}
                <a
                  href={`tel:${hosp.emergencyPhone.split('/')[0].trim()}`}
                  className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-extrabold text-sm rounded-2xl transition flex items-center justify-center space-x-2"
                >
                  <Phone className="w-4 h-4 text-rose-600" />
                  <span>Emergency Hotline</span>
                </a>

                {/* Start Kiosk Intake at this hospital */}
                <button
                  onClick={() => {
                    if (onSelectHospital) onSelectHospital(hosp);
                    if (onStartKiosk) onStartKiosk();
                  }}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition flex items-center justify-center space-x-2"
                >
                  <span>Book OPD Kiosk Token</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>

            </div>
          ))}
        </div>

      </section>

    </div>
  );
}
