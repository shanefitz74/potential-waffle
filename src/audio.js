import { SAMPLE_DATA } from "./audioSamples.js";

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

function decodeBase64Audio(base64) {
  if (typeof base64 !== "string" || base64.length === 0) {
    return null;
  }
  try {
    if (typeof atob === "function") {
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        buffer[i] = binary.charCodeAt(i);
      }
      return buffer.buffer;
    }
  } catch (error) {
    console.warn("Failed to decode audio sample", error);
    return null;
  }
  try {
    return Buffer.from(base64, "base64").buffer;
  } catch (error) {
    console.warn("Failed to decode audio sample in Node", error);
    return null;
  }
}

const SAMPLE_SETTINGS = {
  pellet: { rate: 1.05 },
  power: { rate: 0.95 },
  ghost: { rate: 1 },
  death: { rate: 0.92 },
  fruit: { rate: 1.1 },
};

export function createAudioManager({ enabled = true, volume = 1 } = {}) {
  const context = safeContext();
  const supported = Boolean(context);
  const masterGain = context ? context.createGain() : null;
  let volumeLevel = clampVolume(volume);
  let active = Boolean(enabled) && supported;
  const bufferPromises = new Map();

  if (masterGain && context) {
    masterGain.gain.value = active ? volumeLevel : 0;
    masterGain.connect(context.destination);
  }

  function ensureRunning() {
    if (context?.state === "suspended") {
      context.resume();
    }
  }

  function ensureBuffer(name) {
    if (!context) return null;
    if (!bufferPromises.has(name)) {
      const base64 = SAMPLE_DATA[name];
      if (!base64) {
        bufferPromises.set(name, Promise.resolve(null));
      } else {
        const decoded = decodeBase64Audio(base64);
        if (!decoded) {
          bufferPromises.set(name, Promise.resolve(null));
        } else {
          const promise = context
            .decodeAudioData(decoded.slice(0))
            .catch((error) => {
              console.warn("Failed to decode audio buffer", name, error);
              return null;
            });
          bufferPromises.set(name, promise);
        }
      }
    }
    return bufferPromises.get(name);
  }

  if (context) {
    Object.keys(SAMPLE_DATA).forEach((key) => {
      ensureBuffer(key);
    });
  }

  function playSample(name) {
    if (!active || !context || !masterGain) return;
    ensureRunning();
    const promise = ensureBuffer(name);
    promise?.then((buffer) => {
      if (!buffer || !active) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const options = SAMPLE_SETTINGS[name] ?? {};
      if (options.rate) {
        source.playbackRate.value = options.rate;
      }
      source.connect(masterGain);
      try {
        source.start();
      } catch (error) {
        console.warn("Failed to start audio source", name, error);
      }
    });
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
      playSample("pellet");
    },
    playPowerPellet() {
      playSample("power");
    },
    playGhostCapture(combo) {
      const playbackRate = 1 + Math.min(combo ?? 0, 4) * 0.08;
      if (context && masterGain && active) {
        const promise = ensureBuffer("ghost");
        promise?.then((buffer) => {
          if (!buffer || !active) return;
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = playbackRate;
          source.connect(masterGain);
          source.start();
        });
      }
    },
    playDeath() {
      playSample("death");
    },
    playFruit() {
      playSample("fruit");
    },
  };
}
