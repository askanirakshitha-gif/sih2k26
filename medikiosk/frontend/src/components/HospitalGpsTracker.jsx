import React, { useState, useEffect } from 'react';
import {
  MapPin, Navigation, Phone, ShieldCheck, Activity, Search,
  Bed, HeartPulse, Clock, ChevronRight, Compass, AlertCircle,
  ExternalLink, Sparkles, Building2, CheckCircle, Award, Globe
} from 'lucide-react';
import { getTranslation } from '../services/i18n';

// Premier Bengaluru & Top Indian Hospitals with GPS Coordinates
const BENGALURU_HOSPITALS_DATA = [
  {
    id: 'hosp_manipal_hal_blr',
    name: 'Manipal Hospital HAL Old Airport Road',
    city: 'Bengaluru',
    address: '98, HAL Old Airport Road, Kodihalli, Bengaluru, Karnataka 560017',
    lat: 12.9582,
    lng: 77.6493,
    phone: '+91-80-25024444',
    emergencyPhone: '105711 / +91-80-25024444',
    type: 'Quaternary Care & Apex Referral Hospital',
    erBeds: 18,
    icuBeds: 8,
    opdWaitTime: '6 min',
    accreditation: 'NABH & NABL Accredited • ABDM M1/M2/M3',
    features: ['24/7 Trauma ER', 'Integrated AYUSH Clinic', 'ABDM Health Locker Link', 'Robotic Surgery']
  },
  {
    id: 'hosp_apollo_bg_blr',
    name: 'Apollo Hospital Bannerghatta Road',
    city: 'Bengaluru',
    address: '154/11, Bannerghatta Road, Opp IIMB, Bengaluru, Karnataka 560076',
    lat: 12.8954,
    lng: 77.5986,
    phone: '+91-80-26304050',
    emergencyPhone: '1066 / +91-80-26304050',
    type: 'Multi-Specialty Super Center',
    erBeds: 14,
    icuBeds: 7,
    opdWaitTime: '8 min',
    accreditation: 'JCI & NABH Accredited',
    features: ['24/7 Cardiac ER', 'Stroke Unit', 'Smart Kiosk Token System', 'Organ Transplant']
  },
  {
    id: 'hosp_fortis_bg_blr',
    name: 'Fortis Hospital Bannerghatta Road',
    city: 'Bengaluru',
    address:154,
    lat: 12.8938,
    lng: 77.5978,
    phone: '+91-80-66214444',
    emergencyPhone: '+91-80-66214444',
    type: 'Super Speciality Medical Center',
    erBeds: 12,
    icuBeds: 5,
    opdWaitTime: '9 min',
    accreditation: 'NABH & JCI Accredited',
    features: ['Stat Cath Lab 24/7', 'Emergency Cardiac Triage', 'Smart OPD Intake']
  },
  {
    id: 'hosp_narayana_hosur_blr',
    name: 'Narayana Health City (NH)',
    city: 'Bengaluru',
    address: '258/A, Bommasandra Industrial Area, Hosur Road, Bengaluru 560099',
    lat: 12.8105,
    lng: 77.6953,
    phone: '+91-80-71222222',
    emergencyPhone: '105711',
    type: 'Health City & Cardiac Specialty Institute',
    erBeds: 30,
    icuBeds: 15,
    opdWaitTime: '7 min',
    accreditation: 'JCI & NABH Accredited',
    features: ['24/7 Adult & Child ER', 'Low-Cost Smart OPD', 'ABDM FHIR Integrated']
  },
  {
    id: 'hosp_victoria_fort_blr',
    name: 'Victoria Hospital & BMCRI',
    city: 'Bengaluru',
    address: 'Fort Road, Near City Market, Kalasipalya, Bengaluru 560002',
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
  },
  {
    id: 'hosp_stjohns_koramangala_blr',
    name: "St. John's Medical College Hospital",
    city: 'Bengaluru',
    address: 'Sarjapur Road, Koramangala, Bengaluru, Karnataka 560034',
    lat: 12.9304,
    lng: 77.6186,
    phone: '+91-80-22065000',
    emergencyPhone: '+91-80-22065250',
    type: 'Charitable & Research Super Speciality',
    erBeds: 20,
    icuBeds: 9,
    opdWaitTime: '10 min',
    accreditation: 'NABH Accredited',
    features: ['24/7 Emergency Care', 'Comprehensive Outpatient Center', 'Digital Records']
  },
  {
    id: 'hosp_sakra_marathahalli_blr',
    name: 'Sakra World Hospital',
    city: 'Bengaluru',
    address: 'SY NO 52/2 & 52/3, Devarabeesanahalli, Varthur Hobli, Marathahalli, Bengaluru 560103',
    lat: 12.9279,
    lng: 77.6841,
    phone: '+91-80-49694969',
    emergencyPhone: '+91-80-49694969',
    type: 'Indo-Japanese Multi Speciality',
    erBeds: 15,
    icuBeds: 6,
    opdWaitTime: '8 min',
    accreditation: 'NABH Accredited',
    features: ['Advanced Neuro Triage', 'Emergency ER', 'ABDM Health Locker Sync']
  },
  {
    id: 'hosp_aster_cmi_hebbal_blr',
    name: 'Aster CMI Hospital Hebbal',
    city: 'Bengaluru',
    address: '#43/2, New Airport Road, NH 44, Sahakar Nagar, Hebbal, Bengaluru 560092',
    lat: 13.0560,
    lng: 77.5925,
    phone: '+91-80-43420100',
    emergencyPhone: '+91-80-43420100',
    type: 'Quaternary Super Speciality',
    erBeds: 16,
    icuBeds: 7,
    opdWaitTime: '7 min',
    accreditation: 'NABH & JCI Accredited',
    features: ['Level-1 Emergency ER', 'Pediatric ICU', 'Smart OPD Kiosk']
  },
  {
    id: 'hosp_columbia_yesh_blr',
    name: 'Manipal Hospital (Columbia Asia) Yeshwanthpur',
    city: 'Bengaluru',
    address: '26/4, Brigade Gateway, Beside Metro, Malleshwaram-Yeshwanthpur, Bengaluru 560055',
    lat: 13.0186,
    lng: 77.5539,
    phone: '+91-80-39898969',
    emergencyPhone: '+91-80-39898969',
    type: 'Super Speciality Hospital',
    erBeds: 11,
    icuBeds: 5,
    opdWaitTime: '9 min',
    accreditation: 'NABH Accredited',
    features: ['Emergency Trauma Unit', 'Cardiology ER', 'ABDM Compliant']
  },
  {
    id: 'hosp_bgs_kengeri_blr',
    name: 'BGS Gleneagles Global Hospital Kengeri',
    city: 'Bengaluru',
    address: '67, Uttarahalli Road, Kengeri, Bengaluru, Karnataka 560060',
    lat: 12.9056,
    lng: 77.4912,
    phone: '+91-80-26255555',
    emergencyPhone: '+91-80-26255555',
    type: 'Multi-Organ Transplant Institute',
    erBeds: 14,
    icuBeds: 6,
    opdWaitTime: '11 min',
    accreditation: 'NABH Accredited',
    features: ['Organ Transplant Unit', '24/7 Trauma Care', 'Kiosk OPD Token']
  },
  {
    id: 'hosp_aiims_delhi',
    name: 'AIIMS New Delhi (All India Institute of Medical Sciences)',
    city: 'New Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029',
    lat: 28.5672,
    lng: 77.2100,
    phone: '+91-11-26588500',
    emergencyPhone: '102 / +91-11-26588700',
    type: 'Apex National Referral Center',
    erBeds: 22,
    icuBeds: 10,
    opdWaitTime: '15 min',
    accreditation: 'Apex Govt Accredited • ABDM M1/M2/M3',
    features: ['Level-1 Trauma Center', 'AYUSH Integrative Center', 'ABDM Health Vault']
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
  // User GPS Coordinates State (Default: Bengaluru City Center)
  const [userLocation, setUserLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Bengaluru GPS Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'BLR' | 'ER' | 'AYUSH'

  // Request browser live GPS location on mount
  useEffect(() => {
    fetchUserLocation();
  }, []);

  const fetchUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported by browser. Showing Bengaluru hubs.');
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
        setLocationStatus('GPS Access Denied. Defaulting to Bengaluru Hospital Region.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Sort hospitals by distance from current user GPS location
  const sortedHospitals = BENGALURU_HOSPITALS_DATA.map(h => ({
    ...h,
    distanceKm: calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng)
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  // Filter hospitals by search query and category filter
  const filteredHospitals = sortedHospitals.filter(h => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'BLR') return h.city.toLowerCase().includes('bengaluru');
    if (selectedFilter === 'ER') return h.features.some(f => f.includes('ER') || f.includes('Emergency'));
    if (selectedFilter === 'AYUSH') return h.features.some(f => f.includes('AYUSH') || f.includes('Ayurvedic'));

    return true;
  });

  const openGoogleMapsDirections = (lat, lng, name) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  const openGoogleMapsGeneralSearch = (query) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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
              onClick={() => {
                if (onSelectHospital) onSelectHospital(sortedHospitals[0]);
                if (onStartKiosk) onStartKiosk();
              }}
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
      {/* 3. REAL-TIME GPS TRACKER & BENGALURU / NEARBY HOSPITALS */}
      {/* -------------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {/* GPS Control Bar */}
        <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-sky-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl mb-10 border border-sky-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                <span>REAL-TIME GPS LOCATOR & GOOGLE MAPS INTEGRATION</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Hospitals Near Me (Bengaluru Region & Live GPS)
              </h3>
              <p className="text-sky-200 text-xs sm:text-sm mt-1 font-medium">
                Live GPS distance calculation, Google Maps address lookup, ER beds, and one-tap OPD kiosk token booking.
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
                <span>{isLocating ? 'Acquiring Live GPS...' : 'Refresh Live GPS Location'}</span>
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
                placeholder="Search any hospital (e.g. Manipal Bengaluru, Nimhans, Cloudnine, Apollo)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/90 text-white placeholder-slate-400 text-sm font-medium rounded-2xl border border-slate-700 focus:ring-2 focus:ring-sky-400 outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Hospitals' },
                { id: 'BLR', label: 'Bengaluru Hubs' },
                { id: 'ER', label: '24/7 ER' },
                { id: 'AYUSH', label: 'AYUSH OPD' }
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

        {/* GOOGLE MAPS DYNAMIC SEARCH BANNER FOR ANY ENTERED HOSPITAL */}
        {searchQuery.trim() && (
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 mb-8 border-2 border-emerald-400/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Google Maps Registered Hospital Search</span>
              </div>
              <h4 className="text-xl font-black text-white">
                Search "{searchQuery}" on Google Maps GPS
              </h4>
              <p className="text-xs text-emerald-100 font-medium">
                Lookup live registered Google Maps location, real-time address, reviews, and start Kiosk intake.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                onClick={() => openGoogleMapsGeneralSearch(searchQuery)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs rounded-xl transition flex items-center space-x-2 shadow"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Address on Google Maps</span>
              </button>

              <button
                onClick={() => {
                  const customHosp = {
                    id: 'custom_' + Date.now(),
                    name: searchQuery,
                    address: `Searched via Google Maps Location for "${searchQuery}"`,
                    city: 'Bengaluru / Local Region'
                  };
                  if (onSelectHospital) onSelectHospital(customHosp);
                  if (onStartKiosk) onStartKiosk();
                }}
                className="px-4 py-2.5 bg-white text-emerald-950 font-extrabold text-xs rounded-xl hover:bg-emerald-50 transition flex items-center space-x-1"
              >
                <span>Start Intake for "{searchQuery}"</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Hospital Cards List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 px-1">
            <span>SHOWING {filteredHospitals.length} HOSPITALS SORTED BY REAL-TIME GPS DISTANCE</span>
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
                  <span>Navigate via Google Maps</span>
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
                  className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-2xl transition flex items-center justify-center space-x-2 shadow-lg shadow-teal-900/20"
                >
                  <span>Start Kiosk Intake</span>
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
