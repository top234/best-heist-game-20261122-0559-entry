// Synthesised WebAudio sounds for The Gilded Vault: no audio files, no
// network. Everything is a short oscillator/noise envelope built on demand.
// The context is created on the first user gesture (browsers block it before).

export function createAudio() {
  let ctx = null;

  function ensure() {
    if (ctx === null) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, slideTo) {
    const c = ensure();
    if (c === null) return;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    amp.gain.setValueAtTime(gain, c.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(amp).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  }

  function noise(dur, gain, freq) {
    const c = ensure();
    if (c === null) return;
    const len = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const amp = c.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(c.destination);
    src.start();
  }

  return {
    unlock() { ensure(); },
    step() { noise(0.05, 0.05, 500); },
    pickup() { tone(660, 0.12, 'sine', 0.12); setTimeout(() => tone(990, 0.18, 'sine', 0.12), 90); },
    coin() { tone(1900, 0.08, 'triangle', 0.1, 2400); noise(0.06, 0.08, 4000); },
    alarm() { tone(520, 0.35, 'square', 0.06, 780); },
    caught() { tone(220, 0.5, 'sawtooth', 0.1, 110); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.12), i * 130));
    },
  };
}
