/**
 * Voice Provider Abstraction Architecture
 * Enables seamless switching between Browser Web Speech API and future Indian language
 * government engines such as Bhashini or AI4Bharat.
 */

export class VoiceProvider {
  constructor() {
    if (new.target === VoiceProvider) {
      throw new TypeError("Cannot construct Abstract VoiceProvider directly.");
    }
  }

  isSupported() {
    throw new Error("Method 'isSupported()' must be implemented.");
  }

  startListening(options) {
    throw new Error("Method 'startListening()' must be implemented.");
  }

  stopListening() {
    throw new Error("Method 'stopListening()' must be implemented.");
  }

  speak(text, options) {
    throw new Error("Method 'speak()' must be implemented.");
  }

  cancelSpeech() {
    throw new Error("Method 'cancelSpeech()' must be implemented.");
  }
}

/**
 * Browser Web Speech API Provider (SpeechRecognition & SpeechSynthesis)
 */
export class BrowserSpeechProvider extends VoiceProvider {
  constructor() {
    super();
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
      : null;
    this.recognitionClass = SpeechRecognition;
    this.activeRecognition = null;
    this.isListening = false;
  }

  isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  startListening({ language = 'en', onResult, onError, onStart, onEnd }) {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) {
        onError({
          error: 'not-supported',
          message: 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or type your response.'
        });
      }
      return;
    }

    try {
      this.stopListening();
      this.isListening = true;

      const recognition = new SpeechRecognition();
      this.activeRecognition = recognition;
      recognition.continuous = false; // continuous = false guarantees clean onend & instant response
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Regional language mapping for Indian OPD Kiosk (English, Hindi, Kannada)
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';

      recognition.onstart = () => {
        this.isListening = true;
        if (onStart) onStart();
      };

      recognition.onresult = (event) => {
        let transcript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }

        const trimmed = transcript.trim();
        if (onResult && trimmed) {
          onResult(trimmed, isFinal);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[Speech Recognition Error]', event.error);
        if (event.error === 'no-speech') {
          // Normal silence timeout, end cleanly
          this.isListening = false;
          if (onEnd) onEnd();
          return;
        }

        this.isListening = false;
        let msg = `Microphone notice: ${event.error}`;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          msg = 'Microphone access was blocked. Please allow microphone permission in the browser address bar.';
        } else if (event.error === 'network') {
          msg = 'Speech recognition network error. Please check your internet connection.';
        } else if (event.error === 'audio-capture') {
          msg = 'Microphone hardware is busy or unavailable.';
        }

        if (onError) onError({ error: event.error, message: msg });
      };

      recognition.onend = () => {
        this.isListening = false;
        this.activeRecognition = null;
        if (onEnd) onEnd();
      };

      recognition.start();
    } catch (err) {
      console.warn('[Speech Recognition Start Exception]', err);
      this.isListening = false;
      this.activeRecognition = null;
      if (onError) onError({ error: 'start-failed', message: err.message || 'Microphone activation failed.' });
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch (e) {
        // Ignore abort error
      }
      this.activeRecognition = null;
    }
  }

  speak(text, { language = 'en', onEnd, onError } = {}) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    try {
      this.cancelSpeech();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.rate = 0.95; // Clear natural cadence for patients

      // Attempt to pick a natural regional voice if installed
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => {
        if (language === 'hi') return v.lang.includes('hi');
        if (language === 'kn') return v.lang.includes('kn');
        return v.lang.includes('en-IN') || v.lang.includes('en-GB');
      });
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      if (onEnd) utterance.onend = onEnd;
      if (onError) utterance.onerror = onError;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[TTS Error]', err);
      if (onError) onError(err);
    }
  }

  cancelSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

/**
 * Placeholder / Interface for Government Bhashini ASR/TTS Integration
 * In future production deployment, API keys and endpoints from MeitY Bhashini are configured here.
 */
export class BhashiniProvider extends VoiceProvider {
  constructor(apiKey = '', userId = '') {
    super();
    this.apiKey = apiKey;
    this.userId = userId;
    this.isConfigured = !!apiKey;
  }

  isSupported() {
    return this.isConfigured;
  }

  async startListening({ language = 'hi', onResult, onError }) {
    console.log('[BhashiniProvider] Starting audio stream to Bhashini WebSocket...');
    if (!this.isConfigured) {
      console.info('[BhashiniProvider] Falling back to BrowserSpeechProvider (no Bhashini key set).');
    }
  }

  stopListening() {
    console.log('[BhashiniProvider] Stopping audio stream.');
  }

  async speak(text, { language = 'hi' }) {
    console.log(`[BhashiniProvider] Synthesizing TTS via Bhashini pipeline for text: "${text.substring(0, 30)}..."`);
  }

  cancelSpeech() {
    // Cancel remote stream
  }
}

// Audio chime feedback for voice activation & completion
export const playAudioChime = (type = 'start') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'start') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    }
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Ignore audio context autoplay restrictions
  }
};

// Default export is initialized browser provider
export const defaultVoiceProvider = new BrowserSpeechProvider();
