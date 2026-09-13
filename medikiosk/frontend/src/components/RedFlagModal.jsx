import React from 'react';
import { AlertOctagon, PhoneCall, CheckCircle2, BellRing } from 'lucide-react';

export default function RedFlagModal({ redFlags = [], onClose, language = 'en' }) {
  if (!redFlags || redFlags.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border-4 border-red-500 text-slate-900">
        
        {/* Header Alert Icon */}
        <div className="flex items-center space-x-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-red-100 border-2 border-red-300 flex items-center justify-center text-red-600 shrink-0 animate-bounce">
            <AlertOctagon className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs uppercase font-black tracking-widest text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              Clinical Safety Notice
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              {language === 'hi' ? 'महत्वपूर्ण चेतावनी संकेत' : 'Potential Warning Sign Detected'}
            </h2>
          </div>
        </div>

        {/* Warning Messages */}
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl mb-6 space-y-3">
          {redFlags.map((rf, idx) => (
            <div key={idx} className="text-slate-800">
              <p className="font-bold text-red-900 text-base leading-snug">
                {rf.message || rf.ruleName || 'Clinical sign requires emergency review'}
              </p>
              {rf.rationale && (
                <p className="text-xs text-red-700 mt-1 font-medium italic">
                  Medical Rationale: {rf.rationale}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Action Directives */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
          <h4 className="font-bold text-amber-900 text-sm flex items-center space-x-2">
            <BellRing className="w-4 h-4 text-amber-700 mr-1" />
            {language === 'hi' ? 'कृपया यह कदम उठाएं:' : 'Immediate Actions:'}
          </h4>
          <ul className="text-xs sm:text-sm text-amber-800 mt-2 space-y-1.5 list-disc list-inside">
            <li>
              {language === 'hi'
                ? 'नजदीकी अस्पताल स्टाफ या ओपीडी नर्स को तुरंत सूचित करें।'
                : 'Please notify the hospital triage nurse or OPD assistant immediately.'}
            </li>
            <li>
              {language === 'hi'
                ? 'यह सिस्टम कोई अंतिम बीमारी तय नहीं करता; यह केवल डॉक्टर को तत्काल ध्यान देने के लिए सूचित करता है।'
                : 'This is a safety screening flag to alert the attending physician, not a definitive diagnosis.'}
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onClose}
            className="w-full sm:flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-lg rounded-2xl shadow-lg transition transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <PhoneCall className="w-5 h-5" />
            <span>{language === 'hi' ? 'स्टाफ को सूचित किया / आगे बढ़ें' : 'Alert Staff & Continue'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
