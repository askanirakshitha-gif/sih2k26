import React, { useState } from 'react';
import { AlertOctagon, PhoneCall, BellRing, X, ArrowRight, Loader2 } from 'lucide-react';

export default function RedFlagModal({ 
  isOpen = false, 
  redFlags = [], 
  onClose, 
  onConfirmAndContinue, 
  language = 'en' 
}) {
  const [isAlerting, setIsAlerting] = useState(false);

  if (!isOpen || !redFlags || redFlags.length === 0) return null;

  const handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onClose) onClose();
  };

  const handleAlertStaffAndContinue = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsAlerting(true);

    // Provide a brief tactile acknowledgment before closing and proceeding
    setTimeout(() => {
      setIsAlerting(false);
      if (onConfirmAndContinue) {
        onConfirmAndContinue();
      } else if (onClose) {
        onClose();
      }
    }, 250);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose(e);
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border-4 border-red-500 text-slate-900 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Alert Icon & Close X */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 border-2 border-red-300 flex items-center justify-center text-red-600 shrink-0 animate-bounce">
              <AlertOctagon className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs uppercase font-black tracking-widest text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                {language === 'hi' ? 'क्लिनिकल सुरक्षा सूचना' : language === 'kn' ? 'ವೈದ್ಯಕೀಯ ಸುರಕ್ಷತಾ ಸೂಚನೆ' : 'Clinical Safety Notice'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {language === 'hi' ? 'महत्वपूर्ण चेतावनी संकेत' : language === 'kn' ? 'ಪ್ರಮುಖ ಎಚ್ಚರಿಕೆ ಸೂಚನೆ' : 'Potential Warning Sign Detected'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            title={language === 'hi' ? 'बंद करें' : language === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close'}
          >
            <X className="w-6 h-6" />
          </button>
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
                  {language === 'hi' ? 'चिकित्सीय कारण:' : language === 'kn' ? 'ವೈದ್ಯಕೀಯ ಕಾರಣ:' : 'Medical Rationale:'} {rf.rationale}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Action Directives */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
          <h4 className="font-bold text-amber-900 text-sm flex items-center space-x-2">
            <BellRing className="w-4 h-4 text-amber-700 mr-1" />
            {language === 'hi' ? 'कृपया यह कदम उठाएं:' : language === 'kn' ? 'ದಯವಿಟ್ಟು ಈ ಕ್ರಮ ಕೈಗೊಳ್ಳಿ:' : 'Immediate Protocol:'}
          </h4>
          <ul className="text-xs sm:text-sm text-amber-800 mt-2 space-y-1.5 list-disc list-inside">
            <li>
              {language === 'hi'
                ? 'अस्पताल ट्राइएज नर्स एवं डॉक्टर वर्कस्टेशन को स्वतः उच्च-प्राथमिकता अलर्ट भेजा जा रहा है।'
                : language === 'kn'
                ? 'ಆಸ್ಪತ್ರೆ ಟ್ರಯೇಜ್ ನರ್ಸ್ ಮತ್ತು ವೈದ್ಯರ ವರ್ಕ್‌ಸ್ಟೇಷನ್‌ಗೆ ಸ್ವಯಂಚಾಲಿತ ಉನ್ನತ ಆದ್ಯತೆಯ ಎಚ್ಚರಿಕೆ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ.'
                : 'Emergency triage flag has been dispatched to attending physician OPD Room 4.'}
            </li>
            <li>
              {language === 'hi'
                ? 'आगे के शेष सभी प्रश्नों के उत्तर देना जारी रखें ताकि डॉक्टर को आपकी पूरी केस हिस्ट्री मिल सके।'
                : language === 'kn'
                ? 'ದಯವಿಟ್ಟು ಉಳಿದ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸುವುದನ್ನು ಮುಂದುವರಿಸಿ, ಇದರಿಂದ ವೈದ್ಯರಿಗೆ ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಮಾಹಿತಿ ಲಭ್ಯವಿರುತ್ತದೆ.'
                : 'Please proceed with answering the remaining clinical questions so the physician has your complete history.'}
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            disabled={isAlerting}
            onClick={handleAlertStaffAndContinue}
            className="w-full sm:flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-lg rounded-2xl shadow-lg transition transform active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-75 cursor-pointer"
          >
            {isAlerting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{language === 'hi' ? 'स्टाफ को अलर्ट भेजा गया / आगे बढ़ रहे हैं...' : language === 'kn' ? 'ಸಿಬ್ಬಂದಿಗೆ ತಿಳಿಸಲಾಗಿದೆ / ಮುಂದುವರಿಯಲಾಗುತ್ತಿದೆ...' : 'Staff Alerted! Continuing...'}</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-5 h-5" />
                <span>{language === 'hi' ? 'स्टाफ को सूचित किया / प्रश्न जारी रखें' : language === 'kn' ? 'ಸಿಬ್ಬಂದಿಗೆ ತಿಳಿಸಲಾಗಿದೆ / ಮುಂದುವರಿಯಿರಿ' : 'Alert Staff & Continue'}</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
