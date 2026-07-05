// Singleton AudioContext — one instance for the entire app lifetime
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

const getCtx = (): AudioContext => {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(masterGain);
  }
  return ctx;
};

// MUST be called directly inside a user gesture handler (onClick, onTouchEnd)
// This is the only way Safari iOS allows AudioContext to resume
export const unlockAudio = async (): Promise<void> => {
  const context = getCtx();
  if (context.state === 'suspended') {
    await context.resume();
  }
  // Safari extra unlock: play a silent buffer
  const buffer = context.createBuffer(1, 1, 22050);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
};

export const playTick = (): void => {
  try {
    const context = getCtx();
    if (context.state !== 'running' || !sfxGain) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.frequency.value = 600 + Math.random() * 150;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.35, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.045);
    osc.start(context.currentTime);
    osc.stop(context.currentTime + 0.045);
  } catch (e) {
    // fail silently — never throw
  }
};

export const playWin = (): void => {
  try {
    const context = getCtx();
    if (context.state !== 'running' || !sfxGain) return;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(sfxGain!);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const startTime = context.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (e) {
    // fail silently
  }
};

export const playClick = (): void => {
  try {
    const context = getCtx();
    if (context.state !== 'running' || !sfxGain) return;
    const now = context.currentTime;
    
    // Digital Glass Click: Noise pulse + high sine
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    // fail silently
  }
};

export const playReveal = (): void => {
  try {
    const context = getCtx();
    if (context.state !== 'running' || !sfxGain) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(50, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.4);
    filter.Q.setValueAtTime(10, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.6);
  } catch (e) {}
};

export const playBack = (): void => {
  try {
    const context = getCtx();
    if (context.state !== 'running' || !sfxGain) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
};

export const playAchievementMajor = (): void => {
  playWin();
};

export const playAchievementMinor = (): void => {
  try {
    const context = getCtx();
    if (context.state !== 'running' || !sfxGain) return;
    const now = context.currentTime;
    [880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
      osc.connect(gain);
      gain.connect(sfxGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.4);
    });
  } catch (e) {}
};

export const playSparkle = (): void => {
  try {
    const context = getCtx();
    if (context.state !== 'running' || !sfxGain) return;
    const now = context.currentTime;
    const count = 3;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00];
    for (let i = 0; i < count; i++) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.type = 'sine';
        const freq = scale[Math.floor(Math.random() * scale.length)] * 2;
        osc.frequency.setValueAtTime(freq, now + (i * 0.05));
        gain.gain.setValueAtTime(0, now + (i * 0.05));
        gain.gain.linearRampToValueAtTime(0.1, now + (i * 0.05) + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.05) + 0.3);
        osc.start(now + (i * 0.05));
        osc.stop(now + (i * 0.05) + 0.4);
    }
  } catch (e) {}
};

export const playHover = (): void => {
    try {
        const context = getCtx();
        if (context.state !== 'running' || !sfxGain) return;
        const now = context.currentTime;
        const bufferSize = context.sampleRate * 0.02;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = context.createBufferSource();
        const noiseGain = context.createGain();
        const filter = context.createBiquadFilter();
        noise.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, now);
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.03, now + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(sfxGain);
        noise.start(now);
    } catch (e) {}
};

export const playStartup = (): void => {
    try {
        const context = getCtx();
        if (context.state !== 'running' || !sfxGain) return;
        const now = context.currentTime;
        const osc = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        osc.type = 'square';
        osc.frequency.setValueAtTime(50, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(20, now);
        filter.frequency.exponentialRampToValueAtTime(4000, now + 1.5);
        filter.Q.setValueAtTime(15, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 2.0);
    } catch (e) {}
};

export const playError = (): void => {
    try {
        const context = getCtx();
        if (context.state !== 'running' || !sfxGain) return;
        const now = context.currentTime;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {}
};

// Dummy music control as we use bgmManager
export const setMusicVolume = (_vol: number): void => {};
export const setSfxVolume = (vol: number): void => {
    if (sfxGain && ctx) {
        sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), ctx.currentTime, 0.1);
    }
};

let glideOsc: OscillatorNode | null = null;
let glideGain: GainNode | null = null;

export const startGlide = (): void => {
    try {
        const context = getCtx();
        if (context.state !== 'running' || !sfxGain) return;
        if (glideOsc) return;
        glideOsc = context.createOscillator();
        glideGain = context.createGain();
        glideOsc.type = 'sine';
        glideOsc.frequency.setValueAtTime(150, context.currentTime);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, context.currentTime);
        glideOsc.connect(filter);
        filter.connect(glideGain);
        glideGain.connect(sfxGain);
        glideOsc.start();
        glideGain.gain.setTargetAtTime(0.02, context.currentTime, 0.1);
    } catch (e) {}
};

export const updateGlide = (speed: number): void => {
    try {
        const context = getCtx();
        if (!glideOsc || !glideGain) return;
        const s = Math.min(1, Math.abs(speed) / 50);
        glideGain.gain.setTargetAtTime(0.02 + (s * 0.05), context.currentTime, 0.1);
        glideOsc.frequency.setTargetAtTime(150 + (s * 50), context.currentTime, 0.1);
    } catch (e) {}
};

export const stopGlide = (): void => {
    try {
        if (!glideGain || !glideOsc) return;
        const context = getCtx();
        glideGain.gain.setTargetAtTime(0, context.currentTime, 0.2);
        const oldOsc = glideOsc;
        setTimeout(() => {
            try { oldOsc.stop(); } catch(e) {}
        }, 300);
        glideOsc = null;
        glideGain = null;
    } catch (e) {}
};

export const init = (): void => {
    getCtx();
};

// Export as a default object for easier replacement of audioSynth
export const audioManager = {
    unlock: unlockAudio,
    tick: playTick,
    win: playWin,
    click: playClick,
    reveal: playReveal,
    back: playBack,
    achievementMajor: playAchievementMajor,
    achievementMinor: playAchievementMinor,
    sparkle: playSparkle,
    hover: playHover,
    startup: playStartup,
    error: playError,
    startGlide,
    updateGlide,
    stopGlide,
    setMusicVolume,
    setSfxVolume,
    init,
    playClick,
    playBack,
    playReveal,
    playWin,
    playSparkle,
    playAchievementMajor,
    playAchievementMinor,
    playHover,
    playStartup,
    playError,
    playLevelComplete: playAchievementMajor,
};
