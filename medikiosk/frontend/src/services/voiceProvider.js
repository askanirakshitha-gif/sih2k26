/**
 * Voice Provider Abstraction Architecture
 * Enables seamless switching between Browser Web Speech API and Indian language
 * government engines (Bhashini / Indian Neural Voice TTS).
 * 
 * - English & Hindi: Native browser Web Speech API (speechSynthesis & SpeechRecognition)
 *   runs immediately and natively without network latency.
 * - Kannada (kn): Windows Chrome has no Kannada voice; dynamically routes through
 *   the backend Indian Neural TTS engine (/api/bhashini/tts?language=kn).
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
 * with High-Fidelity Indian Neural TTS Fallback for Regional Languages (Kannada).
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
    this.currentUtterance = null;
    this.currentAudio = null;
    this.currentBlobUrl = null;
    this.speechSessionId = 0;
    
    // Pre-load voices to avoid the Chrome empty voices array bug
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
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
    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    const cleanLang = (language || 'en').toLowerCase().slice(0, 2);
    const trimmed = text.trim();

    // 1. Kannada Handling:
    // Windows/Chrome lacks a native Kannada TTS voice.
    // If no Kannada voice is available in the browser, route to Indian Neural TTS backend.
    if (cleanLang === 'kn') {
      const voices = typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis.getVoices() || []
        : [];
      const hasNativeKannada = voices.some(v => {
        const vl = (v.lang || '').toLowerCase();
        const vn = (v.name || '').toLowerCase();
        return vl.startsWith('kn') || vn.includes('kannada') || vn.includes('sapna') || vn.includes('gagan');
      });

      if (!hasNativeKannada) {
        this.speakViaBackendTTS(trimmed, 'kn', onEnd, onError);
        return;
      }
    }

    // 2. English & Hindi Handling (and Kannada if voice is available in browser):
    // Use the original repository implementation with window.speechSynthesis
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      if (onError) onError(new Error('Speech synthesis not supported'));
      return;
    }

    try {
      this.cancelSpeech();

      // Ensure any paused synthesis state is resumed (fixes Chrome speech hang bug)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(trimmed);
      this.currentUtterance = utterance; // Prevent Chrome garbage collection bug
      utterance.lang = cleanLang === 'hi' ? 'hi-IN' : cleanLang === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices() || [];
      const matchVoice = voices.find(v => {
        const vl = (v.lang || '').toLowerCase();
        const vn = (v.name || '').toLowerCase();
        if (cleanLang === 'hi') return vl.startsWith('hi') || vn.includes('hindi') || vn.includes('swara') || vn.includes('kalpana');
        if (cleanLang === 'kn') return vl.startsWith('kn') || vn.includes('kannada');
        return vl.includes('en-in') || vl.includes('en-gb') || vl.includes('india') || vn.includes('neerja') || vl.startsWith('en');
      });

      if (matchVoice) {
        utterance.voice = matchVoice;
      } else {
        const fallbackVoice = voices.find(v => {
          const vl = (v.lang || '').toLowerCase();
          const vn = (v.name || '').toLowerCase();
          return (vl.includes('google') || vn.includes('natural')) && vl.includes(cleanLang === 'hi' ? 'hi' : 'en');
        });
        if (fallbackVoice) {
          utterance.voice = fallbackVoice;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[SpeechSynthesis notice]', e.error);
          if (onError) onError(e);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[TTS Error]', err);
      if (onError) onError(err);
    }
  }

  speakViaBackendTTS(text, language = 'kn', onEnd, onError) {
    this.cancelSpeech();
    const sessionId = ++this.speechSessionId;
    const streamUrl = `/api/bhashini/tts?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}&gender=female`;

    fetch(streamUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Backend TTS responded with HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (this.speechSessionId !== sessionId) return;
        const blobUrl = URL.createObjectURL(blob);
        this.currentBlobUrl = blobUrl;
        const audio = new Audio(blobUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          if (this.speechSessionId === sessionId) {
            this.cleanupAudio();
            if (onEnd) onEnd();
          }
        };

        audio.onerror = (e) => {
          if (this.speechSessionId === sessionId) {
            console.warn('[Kannada Audio playback error]', e);
            this.cleanupAudio();
            if (onError) onError(e);
          }
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err?.name !== 'AbortError') {
              console.warn('[Kannada Audio Play error]', err);
              if (this.speechSessionId === sessionId) {
                this.cleanupAudio();
                if (onError) onError(err);
              }
            }
          });
        }
      })
      .catch(err => {
        if (this.speechSessionId === sessionId) {
          console.warn('[Kannada TTS fetch error]', err);
          this.cleanupAudio();
          if (onError) onError(err);
        }
      });
  }

  cleanupAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.currentBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch (e) {}
      this.currentBlobUrl = null;
    }
  }

  cancelSpeech() {
    this.speechSessionId++;
    this.cleanupAudio();
    this.currentUtterance = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

// User-gesture audio unlocker: unlocks HTML5 audio autoplay policy on first touch or click
let audioUnlocked = false;
export function unlockAudio() {
  if (audioUnlocked || typeof window === 'undefined') return;
  try {
    const dummy = new Audio();
    dummy.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    dummy.volume = 0.01;
    const p = dummy.play();
    if (p) {
      p.then(() => {
        audioUnlocked = true;
        dummy.pause();
      }).catch(() => {});
    }
  } catch (e) {}
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch (e) {}
  }
  audioUnlocked = true;
}

if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'keydown'];
  const onUserInteraction = () => {
    unlockAudio();
    unlockEvents.forEach(ev => window.removeEventListener(ev, onUserInteraction));
  };
  unlockEvents.forEach(ev => window.addEventListener(ev, onUserInteraction, { passive: true }));
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
