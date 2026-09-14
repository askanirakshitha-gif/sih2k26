/**
 * Emergency Alert Synchronization Service
 * Provides real-time event broadcasting (via BroadcastChannel and CustomEvents)
 * and localStorage persistence for hospital red-flag emergency triage alerts.
 * Enables instant alert synchronization between Patient Kiosk and Doctor Workstation
 * even when running across multiple browser tabs or windows.
 */

const CHANNEL_NAME = 'medikiosk_emergency_channel';
const STORAGE_KEY = 'medikiosk_emergency_alerts';
const LAST_ALERT_KEY = 'medikiosk_last_active_alert';

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[alertSync] BroadcastChannel not supported:', e);
}

/**
 * Play a gentle two-tone hospital emergency alert chime using Web Audio API
 */
export function playAlertChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.22);            // A5
    playTone(1174.66, now + 0.18, 0.35); // D6
    playTone(1760, now + 0.40, 0.45);    // A6
  } catch (err) {
    console.warn('[alertSync] Audio alert playback failed:', err);
  }
}

/**
 * Dispatch an emergency alert when a red flag is detected or confirmed at the kiosk
 */
export function dispatchEmergencyAlert(alertData) {
  const alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId: alertData.sessionId,
    opdToken: alertData.opdToken || 'OPD-101',
    patientName: alertData.patientName || 'Patient',
    age: alertData.age,
    gender: alertData.gender,
    redFlags: alertData.redFlags || [],
    painSeverity: alertData.painSeverity,
    clinicalSystem: alertData.clinicalSystem || 'allopathy',
    timestamp: new Date().toISOString(),
    acknowledged: false,
    staffAlertedAtKiosk: true
  };

  // 1. Save to localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = getStoredAlerts();
      // Prevent duplicate alert for the same session if already active
      const filtered = existing.filter(a => a.sessionId !== alert.sessionId);
      const updated = [alert, ...filtered].slice(0, 20); // Keep latest 20
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.localStorage.setItem(LAST_ALERT_KEY, JSON.stringify(alert));
    }
  } catch (e) {
    console.warn('[alertSync] localStorage save failed:', e);
  }

  // 2. Broadcast across tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'EMERGENCY_RED_FLAG_ALERT', alert });
    } catch (e) {
      console.warn('[alertSync] BroadcastChannel post failed:', e);
    }
  }

  // 3. Dispatch window event for same-tab reactive listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('medikiosk-emergency-alert', { detail: alert }));
  }

  return alert;
}

/**
 * Retrieve all stored alerts
 */
export function getStoredAlerts() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Retrieve only active (unacknowledged) alerts
 */
export function getUnacknowledgedAlerts() {
  return getStoredAlerts().filter(a => !a.acknowledged);
}

/**
 * Mark an alert as acknowledged by the attending doctor
 */
export function acknowledgeAlert(alertIdOrSessionId) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const alerts = getStoredAlerts().map(a => {
        if (a.id === alertIdOrSessionId || a.sessionId === alertIdOrSessionId) {
          return { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() };
        }
        return a;
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    }

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ALERT_ACKNOWLEDGED', id: alertIdOrSessionId });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('medikiosk-alert-acknowledged', { detail: { id: alertIdOrSessionId } }));
    }
  } catch (e) {
    console.warn('[alertSync] Acknowledge alert failed:', e);
  }
}

/**
 * Subscribe to real-time emergency alert events
 * @param {Function} onAlert Callback when a new emergency alert arrives
 * @param {Function} onAck Callback when an alert is acknowledged
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToEmergencyAlerts(onAlert, onAck) {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcastMessage = (event) => {
    if (!event.data) return;
    if (event.data.type === 'EMERGENCY_RED_FLAG_ALERT' && onAlert) {
      onAlert(event.data.alert);
    } else if (event.data.type === 'ALERT_ACKNOWLEDGED' && onAck) {
      onAck(event.data.id);
    }
  };

  const handleCustomEvent = (e) => {
    if (onAlert && e.detail) {
      onAlert(e.detail);
    }
  };

  const handleAckCustomEvent = (e) => {
    if (onAck && e.detail) {
      onAck(e.detail.id);
    }
  };

  const handleStorageEvent = (e) => {
    if (e.key === LAST_ALERT_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (onAlert) onAlert(parsed);
      } catch (err) {
        console.warn('[alertSync] Storage event parse error:', err);
      }
    } else if (e.key === STORAGE_KEY && onAck) {
      onAck(null);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }
  window.addEventListener('medikiosk-emergency-alert', handleCustomEvent);
  window.addEventListener('medikiosk-alert-acknowledged', handleAckCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener('medikiosk-emergency-alert', handleCustomEvent);
    window.removeEventListener('medikiosk-alert-acknowledged', handleAckCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
