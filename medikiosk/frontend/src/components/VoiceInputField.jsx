import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Check, Sparkles, X } from 'lucide-react';
import { defaultVoiceProvider, playAudioChime } from '../services/voiceProvider';
import VoiceWaveform from './VoiceWaveform';

export default function VoiceInputField({
  id,
  label,
  subtitle,
  value = '',
  onChange,
  placeholder = '',
  type = 'text',
  rows = 2,
  language = 'en',
  chips = [],
  allowMultiple = true,
  required = false,
  className = ''
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Read the label & prompt aloud for patients who cannot read
  const handleReadPromptAloud = () => {
    if (isSpeakingPrompt) {
      defaultVoiceProvider.cancelSpeech();
      setIsSpeakingPrompt(false);
      return;
    }

    const textToRead = `${label}. ${subtitle || ''}`;
    setIsSpeakingPrompt(true);
    defaultVoiceProvider.speak(textToRead, {
      language,
      onEnd: () => setIsSpeakingPrompt(false),
      onError: () => setIsSpeakingPrompt(false)
    });
  };

  // Toggle Voice Input for patients who cannot write
  const toggleListening = () => {
    if (isListening) {
      defaultVoiceProvider.stopListening();
      setIsListening(false);
      setInterimTranscript('');
      playAudioChime('success');
      return;
    }

    defaultVoiceProvider.cancelSpeech();
    setIsSpeakingPrompt(false);
    playAudioChime('start');
    setIsListening(true);
    setInterimTranscript('');

    defaultVoiceProvider.startListening({
      language,
      onStart: () => {
        setIsListening(true);
      },
      onResult: (spokenText, isFinal) => {
        setInterimTranscript(spokenText);

        if (isFinal) {
          handleSpokenText(spokenText);
          playAudioChime('success');
          setIsListening(false);
          setInterimTranscript('');
        }
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
      onError: (err) => {
        console.warn('Voice input error in VoiceInputField:', err);
        setIsListening(false);
        setInterimTranscript('');
      }
    });
  };

  // Handle final transcribed spoken text
  const handleSpokenText = (rawSpoken) => {
    const spoken = rawSpoken.trim();
    if (!spoken) return;

    let newValue = value ? `${value}, ${spoken}` : spoken;

    // Smart chip matching: if spoken text matches any chips, auto-select them!
    if (chips && chips.length > 0) {
      const lower = spoken.toLowerCase();
      chips.forEach((chip) => {
        const textEn = (chip.text_en || chip.label || '').toLowerCase();
        const textHi = (chip.text_hi || '').toLowerCase();
        const textKn = (chip.text_kn || '').toLowerCase();
        const val = chip.value || chip.id || chip.label;

        const isMatched =
          (textEn && lower.includes(textEn)) ||
          (textHi && lower.includes(textHi)) ||
          (textKn && lower.includes(textKn)) ||
          lower.includes(val.toLowerCase());

        if (isMatched) {
          if (allowMultiple) {
            const currentList = value
              ? value.split(',').map((s) => s.trim()).filter(Boolean)
              : [];
            if (!currentList.some((item) => item.toLowerCase() === val.toLowerCase())) {
              currentList.push(val);
              newValue = currentList.join(', ');
            }
          } else {
            newValue = val;
          }
        }
      });
    }

    if (onChange) {
      onChange(newValue);
    }
  };

  // Toggle quick-select chip
  const handleToggleChip = (chipVal) => {
    if (!allowMultiple) {
      if (value.toLowerCase() === chipVal.toLowerCase()) {
        onChange('');
      } else {
        onChange(chipVal);
      }
      return;
    }

    const currentList = value
      ? value.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const index = currentList.findIndex(
      (item) => item.toLowerCase() === chipVal.toLowerCase()
    );

    if (index >= 0) {
      currentList.splice(index, 1);
    } else {
      // If choosing 'None' / 'कोई नहीं', clear others
      if (chipVal.toLowerCase().includes('none') || chipVal.includes('कोई नहीं') || chipVal.includes('ಯಾವುದೂ ಇಲ್ಲ')) {
        onChange(chipVal);
        return;
      } else {
        // Remove 'None' if another chip selected
        const filtered = currentList.filter(
          (c) =>
            !c.toLowerCase().includes('none') &&
            !c.includes('कोई नहीं') &&
            !c.includes('ಯಾವುದೂ ಇಲ್ಲ')
        );
        filtered.push(chipVal);
        onChange(filtered.join(', '));
        return;
      }
    }

    onChange(currentList.join(', '));
  };

  const isChipSelected = (chipVal) => {
    if (!value) return false;
    const currentList = value.split(',').map((s) => s.trim().toLowerCase());
    return currentList.includes(chipVal.toLowerCase());
  };

  const getChipLabel = (chip) => {
    if (language === 'hi' && chip.text_hi) return chip.text_hi;
    if (language === 'kn' && chip.text_kn) return chip.text_kn;
    return chip.text_en || chip.label || chip.value;
  };

  const speakBtnLabel =
    language === 'hi' ? 'सुनें' : language === 'kn' ? 'ಆಲಿಸಿ' : 'Listen';
  const micBtnLabel =
    language === 'hi' ? 'बोलकर बताएं' : language === 'kn' ? 'ಮಾತನಾಡಿ' : 'Tap to Speak';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label and Audio Listen Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label htmlFor={id} className="text-xs sm:text-sm font-bold text-slate-800 flex items-center">
            <span>{label}</span>
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        </div>

        {/* Listen (TTS) button for patients who cannot read */}
        <button
          type="button"
          onClick={handleReadPromptAloud}
          title={speakBtnLabel}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            isSpeakingPrompt
              ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse ring-2 ring-amber-300'
              : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>{speakBtnLabel}</span>
        </button>
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
      )}

      {/* Quick Chips (if provided) */}
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chips.map((chip) => {
            const chipVal = chip.value || chip.id || chip.label;
            const selected = isChipSelected(chipVal);
            return (
              <button
                key={chipVal}
                type="button"
                onClick={() => handleToggleChip(chipVal)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
                  selected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
                }`}
              >
                {selected && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{getChipLabel(chip)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input container with prominent "Tap to Speak" button */}
      <div className="relative flex items-center">
        {type === 'textarea' ? (
          <textarea
            id={id}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 pr-32 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm bg-white resize-none shadow-xs"
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 pr-32 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm bg-white shadow-xs"
          />
        )}

        {/* Action Buttons: Clear & Tap to Speak */}
        <div className="absolute right-2 flex items-center space-x-1.5">
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Big Accessible Tap-to-Speak Button for patients who cannot write */}
          <button
            type="button"
            onClick={toggleListening}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition shadow-xs ${
              isListening
                ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-300'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5 shrink-0" />
                <span>{language === 'hi' ? 'समाप्त' : language === 'kn' ? 'ಮುಕ್ತಾಯ' : 'Done'}</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span>{micBtnLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Recording Waveform & Interim Transcription Banner */}
      {isListening && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-red-900 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
            <span className="font-bold">
              {language === 'hi'
                ? 'सुन रहे हैं... कृपया बोलें'
                : language === 'kn'
                ? 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... ಮಾತನಾಡಿ'
                : 'Listening... Speak clearly'}
            </span>
            {interimTranscript && (
              <span className="italic text-slate-700 font-medium ml-2">
                "{interimTranscript}"
              </span>
            )}
          </div>
          <VoiceWaveform isListening={isListening} />
        </div>
      )}
    </div>
  );
}
