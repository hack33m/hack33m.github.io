// ===== Neon Sounds - Web Audio API Sound Effects =====
const NeonSounds = (() => {
  let ctx = null;
  let enabled = true;
  let volume = 0.3;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(fn) {
    if (!enabled) return;
    try { fn(getCtx()); } catch(e) {}
  }

  // --- Basic building blocks ---
  function osc(ac, type, freq, start, dur, vol) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime((vol || 1) * volume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g).connect(ac.destination);
    o.start(start);
    o.stop(start + dur);
  }

  function noise(ac, start, dur, vol) {
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime((vol || 0.3) * volume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(g).connect(ac.destination);
    src.start(start);
    src.stop(start + dur);
  }

  // --- Sound Effects ---

  // Bounce/jump - kort uppåt-sweep
  function jump() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(250, t);
      o.frequency.exponentialRampToValueAtTime(600, t + 0.12);
      g.gain.setValueAtTime(0.25 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.15);
    });
  }

  // Bounce on platform - mjukt "boing"
  function bounce() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(500, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(350, t + 0.15);
      g.gain.setValueAtTime(0.3 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  }

  // Collect/eat - "pling"
  function collect() {
    play(ac => {
      const t = ac.currentTime;
      osc(ac, 'sine', 600, t, 0.08, 0.3);
      osc(ac, 'sine', 900, t + 0.06, 0.1, 0.25);
    });
  }

  // Coin/cha-ching
  function coin() {
    play(ac => {
      const t = ac.currentTime;
      osc(ac, 'sine', 1200, t, 0.06, 0.2);
      osc(ac, 'sine', 1600, t + 0.05, 0.08, 0.25);
      osc(ac, 'sine', 2000, t + 0.1, 0.1, 0.15);
    });
  }

  // Click - kort klick-ljud
  function click() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(800, t);
      o.frequency.exponentialRampToValueAtTime(400, t + 0.04);
      g.gain.setValueAtTime(0.2 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.06);
    });
  }

  // Powerup - stigande arpeggio
  function powerup() {
    play(ac => {
      const t = ac.currentTime;
      osc(ac, 'sine', 400, t, 0.1, 0.2);
      osc(ac, 'sine', 600, t + 0.08, 0.1, 0.2);
      osc(ac, 'sine', 800, t + 0.16, 0.1, 0.2);
      osc(ac, 'sine', 1200, t + 0.24, 0.15, 0.25);
    });
  }

  // Shoot - laser pew
  function shoot() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.1);
      g.gain.setValueAtTime(0.15 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.12);
    });
  }

  // Hit/damage - kort brum
  function hit() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      g.gain.setValueAtTime(0.25 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.2);
      noise(ac, t, 0.1, 0.2);
    });
  }

  // Enemy kill - poff
  function kill() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(400, t);
      o.frequency.exponentialRampToValueAtTime(100, t + 0.12);
      g.gain.setValueAtTime(0.2 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.15);
      noise(ac, t, 0.08, 0.15);
    });
  }

  // Death/game over - nedåt-sweep + noise
  function death() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.5);
      g.gain.setValueAtTime(0.3 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.6);
      noise(ac, t, 0.3, 0.2);
    });
  }

  // Crash - hårt smäll
  function crash() {
    play(ac => {
      const t = ac.currentTime;
      noise(ac, t, 0.3, 0.4);
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
      g.gain.setValueAtTime(0.3 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.35);
    });
  }

  // Break - kross-ljud
  function breakSound() {
    play(ac => {
      const t = ac.currentTime;
      noise(ac, t, 0.15, 0.25);
      osc(ac, 'sine', 300, t, 0.05, 0.15);
      osc(ac, 'sine', 200, t + 0.04, 0.06, 0.1);
    });
  }

  // Boost - whoosh uppåt
  function boost() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(1000, t + 0.2);
      g.gain.setValueAtTime(0.2 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.25);
      noise(ac, t + 0.05, 0.15, 0.1);
    });
  }

  // Merge/combine - 2048 merge
  function merge() {
    play(ac => {
      const t = ac.currentTime;
      osc(ac, 'sine', 500, t, 0.08, 0.2);
      osc(ac, 'sine', 700, t + 0.05, 0.1, 0.15);
    });
  }

  // Big merge - högre ton
  function bigMerge() {
    play(ac => {
      const t = ac.currentTime;
      osc(ac, 'sine', 600, t, 0.08, 0.2);
      osc(ac, 'sine', 900, t + 0.05, 0.08, 0.2);
      osc(ac, 'sine', 1200, t + 0.1, 0.12, 0.25);
    });
  }

  // Slide - kort swoosh
  function slide() {
    play(ac => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.06);
      g.gain.setValueAtTime(0.1 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.08);
    });
  }

  // Drift - continuous-like screech
  function drift() {
    play(ac => {
      const t = ac.currentTime;
      noise(ac, t, 0.1, 0.1);
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(100 + Math.random() * 50, t);
      g.gain.setValueAtTime(0.08 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.1);
    });
  }

  // Wave complete - fanfare
  function fanfare() {
    play(ac => {
      const t = ac.currentTime;
      osc(ac, 'sine', 523, t, 0.15, 0.2);
      osc(ac, 'sine', 659, t + 0.12, 0.15, 0.2);
      osc(ac, 'sine', 784, t + 0.24, 0.15, 0.2);
      osc(ac, 'sine', 1047, t + 0.36, 0.25, 0.3);
    });
  }

  // Win - happy jingle
  function win() {
    play(ac => {
      const t = ac.currentTime;
      const notes = [523, 587, 659, 784, 880, 1047];
      notes.forEach((f, i) => {
        osc(ac, 'sine', f, t + i * 0.1, 0.15, 0.2);
      });
    });
  }

  // Combo - quick ascending
  function combo(level) {
    play(ac => {
      const t = ac.currentTime;
      const base = 400 + (level || 1) * 100;
      osc(ac, 'sine', base, t, 0.06, 0.2);
      osc(ac, 'sine', base * 1.25, t + 0.04, 0.08, 0.15);
    });
  }

  // Upgrade buy - ka-ching
  function upgrade() {
    play(ac => {
      const t = ac.currentTime;
      osc(ac, 'sine', 800, t, 0.05, 0.15);
      osc(ac, 'sine', 1000, t + 0.04, 0.05, 0.15);
      osc(ac, 'sine', 1400, t + 0.08, 0.05, 0.2);
      osc(ac, 'sine', 1800, t + 0.12, 0.1, 0.2);
    });
  }

  return {
    jump, bounce, collect, coin, click, powerup, shoot, hit, kill,
    death, crash, breakSound, boost, merge, bigMerge, slide, drift,
    fanfare, win, combo, upgrade,
    setVolume: (v) => { volume = v; },
    setEnabled: (e) => { enabled = e; },
    init: () => { getCtx(); } // call on first user interaction
  };
})();
