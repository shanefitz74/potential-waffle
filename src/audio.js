function safeContext() {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  return new AudioContext();
}

function clampVolume(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(1, Math.max(0, numeric));
}

function playOsc(context, destination, frequency, duration, type = "sine") {
  if (!context || !destination) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  osc.connect(gain).connect(destination);
  osc.start();
  osc.stop(context.currentTime + duration + 0.05);
}

export function createAudioManager({ enabled = true, volume = 1 } = {}) {
  const context = safeContext();
  const supported = Boolean(context);
  const masterGain = context ? context.createGain() : null;
  let volumeLevel = clampVolume(volume);
  let active = Boolean(enabled) && supported;
  let wakaToggle = false;

  if (masterGain && context) {
    masterGain.gain.value = active ? volumeLevel : 0;
    masterGain.connect(context.destination);
  }

  function ensureRunning() {
    if (context?.state === "suspended") {
      context.resume();
    }
  }

  return {
    setEnabled(value) {
      active = Boolean(value) && Boolean(context);
      if (masterGain && context) {
        masterGain.gain.setValueAtTime(active ? volumeLevel : 0, context.currentTime);
      }
    },
    setVolume(value) {
      volumeLevel = clampVolume(value);
      if (masterGain && context && active) {
        masterGain.gain.setValueAtTime(volumeLevel, context.currentTime);
      }
    },
    getVolume() {
      return volumeLevel;
    },
    isEnabled() {
      return active;
    },
    isSupported() {
      return supported;
    },
    playPellet() {
      if (!active) return;
      ensureRunning();
      wakaToggle = !wakaToggle;
      const frequency = wakaToggle ? 420 : 380;
      playOsc(context, masterGain, frequency, 0.08, "square");
    },
    playPowerPellet() {
      if (!active) return;
      ensureRunning();
      [320, 380, 420].forEach((freq) => {
        playOsc(context, masterGain, freq, 0.12, "sawtooth");
      });
    },
    playGhostCapture(combo) {
      if (!active) return;
      ensureRunning();
      const base = 200;
      playOsc(context, masterGain, base + combo * 60, 0.2, "triangle");
    },
    playDeath() {
      if (!active) return;
      ensureRunning();
      playOsc(context, masterGain, 160, 0.6, "sawtooth");
    },
    playFruit() {
      if (!active) return;
      ensureRunning();
      playOsc(context, masterGain, 600, 0.2, "square");
    },
  };
}
