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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognitionClass = SpeechRecognition || null;
    this.activeRecognition = null;
    this.isListening = false;
  }

  isSupported() {
    return !!this.recognitionClass;
  }

  startListening({ language = 'en', onResult, onError, onStart, onEnd }) {
    if (!this.recognitionClass) {
      if (onError) onError(new Error("Browser speech recognition is not supported in this browser."));
      return;
    }

    try {
      this.stopListening();

      this.activeRecognition = new this.recognitionClass();
      this.activeRecognition.continuous = false;
      this.activeRecognition.interimResults = true;
      this.activeRecognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      this.activeRecognition.onstart = () => {
        this.isListening = true;
        if (onStart) onStart();
      };

      this.activeRecognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (onResult) {
          const isFinal = event.results[event.results.length - 1].isFinal;
          onResult(transcript, isFinal);
        }
      };

      this.activeRecognition.onerror = (event) => {
        console.warn('[Speech Error]', event.error);
        this.isListening = false;
        if (onError) onError(event);
      };

      this.activeRecognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd();
      };

      this.activeRecognition.start();
    } catch (err) {
      this.isListening = false;
      if (onError) onError(err);
    }
  }

  stopListening() {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.activeRecognition = null;
      this.isListening = false;
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
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95; // Clear natural cadence for patients

      // Attempt to pick a natural regional voice if installed
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => language === 'hi' ? v.lang.includes('hi') : (v.lang.includes('en-IN') || v.lang.includes('en-GB')));
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

// Default export is initialized browser provider
export const defaultVoiceProvider = new BrowserSpeechProvider();
