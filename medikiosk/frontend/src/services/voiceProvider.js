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

  async startListening({ language = 'en', onResult, onError, onStart, onEnd }) {
    if (!this.recognitionClass && !navigator.mediaDevices?.getUserMedia) {
      if (onError) onError(new Error("Browser microphone audio capture is not supported."));
      return;
    }

    try {
      this.stopListening();
      this.isListening = true;

      // 1. Acoustic Hardware Noise Cancellation Stream (Echo Cancellation & Noise Suppression)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (permissionErr) {
          // Seamless fallthrough: do NOT block speech recognition if getUserMedia is restricted
          console.info('[Mic Hardware Stream Fallthrough]', permissionErr);
        }
      }

      if (this.recognitionClass) {
        this.activeRecognition = new this.recognitionClass();
        this.activeRecognition.continuous = true;
        this.activeRecognition.interimResults = true;
        this.activeRecognition.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';

        this.activeRecognition.onstart = () => {
          this.isListening = true;
          if (onStart) onStart();
        };

        this.activeRecognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (onResult && transcript) {
            const isFinal = event.results[event.results.length - 1].isFinal;
            onResult(transcript, isFinal);
          }
        };

        this.activeRecognition.onerror = (event) => {
          console.warn('[Speech Recognition Error]', event.error);
          if (event.error === 'no-speech') {
            // Silence detected, keep listening if active
            return;
          }
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            this.isListening = false;
            if (onError) onError({ error: 'not-allowed', message: 'Microphone access is blocked by browser security.' });
          } else if (onError) {
            onError(event);
          }
        };

        this.activeRecognition.onend = () => {
          // If still marked as listening, auto-restart (continuous resilience)
          if (this.isListening && this.activeRecognition) {
            try {
              this.activeRecognition.start();
              return;
            } catch (e) {
              // Ignore restart error
            }
          }
          this.isListening = false;
          if (onEnd) onEnd();
        };

        this.activeRecognition.start();
      } else {
        if (onStart) onStart();
      }
    } catch (err) {
      this.isListening = false;
      if (onError) onError(err);
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.activeRecognition = null;
    }
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        // Ignore track stop
      }
      this.audioStream = null;
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

// Default export is initialized browser provider
export const defaultVoiceProvider = new BrowserSpeechProvider();
