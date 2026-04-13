/**
 * Procedural sound types that can be generated via Web Audio API oscillators.
 * These serve as development placeholders until real audio assets are provided.
 */
export enum ProceduralSoundType {
  // UI
  CLICK = 'click',
  HOVER = 'hover',
  MODAL_OPEN = 'modal_open',
  MODAL_CLOSE = 'modal_close',
  TAB_SWITCH = 'tab_switch',
  ERROR = 'error',
  SUCCESS = 'success',
  NOTIFICATION = 'notification',

  // Resources
  COIN_CLINK = 'coin_clink',

  // Building
  BUILDING_PLACE = 'building_place',
  BUILDING_CONSTRUCT = 'building_construct',
  DEMOLISH = 'demolish',

  // Hero
  LEVEL_UP = 'level_up',
  FAREWELL = 'farewell',

  // Expedition
  HORN_BLAST = 'horn_blast',
  ARRIVAL = 'arrival',

  // Combat
  SWORD_SWING = 'sword_swing',
  MAGIC_CAST = 'magic_cast',
  BOW_SHOT = 'bow_shot',
  HIT_IMPACT = 'hit_impact',
  HEAL = 'heal',
  VICTORY_FANFARE = 'victory_fanfare',
  DEFEAT = 'defeat',
  CRITICAL_HIT = 'critical_hit',

  // Notifications
  FANFARE = 'fanfare',
  STINGER = 'stinger',
  ACHIEVEMENT = 'achievement',
}

/**
 * Generates placeholder sounds using the Web Audio API.
 * Every sound is synthesized from oscillators + noise + envelopes,
 * so no external audio files are needed.
 */
export class ProceduralAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    // Resume if suspended (autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play a procedural sound effect.
   */
  play(type: ProceduralSoundType, volume = 0.5): void {
    const ctx = this.getContext();
    if (!ctx) return;

    switch (type) {
      case ProceduralSoundType.CLICK:
        this.playClickSound(ctx, volume);
        break;
      case ProceduralSoundType.HOVER:
        this.playHoverSound(ctx, volume);
        break;
      case ProceduralSoundType.MODAL_OPEN:
        this.playModalOpenSound(ctx, volume);
        break;
      case ProceduralSoundType.MODAL_CLOSE:
        this.playModalCloseSound(ctx, volume);
        break;
      case ProceduralSoundType.TAB_SWITCH:
        this.playTabSwitchSound(ctx, volume);
        break;
      case ProceduralSoundType.ERROR:
        this.playErrorSound(ctx, volume);
        break;
      case ProceduralSoundType.SUCCESS:
        this.playSuccessSound(ctx, volume);
        break;
      case ProceduralSoundType.NOTIFICATION:
        this.playNotificationSound(ctx, volume);
        break;
      case ProceduralSoundType.COIN_CLINK:
        this.playCoinSound(ctx, volume);
        break;
      case ProceduralSoundType.BUILDING_PLACE:
        this.playBuildingPlaceSound(ctx, volume);
        break;
      case ProceduralSoundType.BUILDING_CONSTRUCT:
        this.playConstructSound(ctx, volume);
        break;
      case ProceduralSoundType.DEMOLISH:
        this.playDemolishSound(ctx, volume);
        break;
      case ProceduralSoundType.LEVEL_UP:
        this.playLevelUpSound(ctx, volume);
        break;
      case ProceduralSoundType.FAREWELL:
        this.playFarewellSound(ctx, volume);
        break;
      case ProceduralSoundType.HORN_BLAST:
        this.playHornBlastSound(ctx, volume);
        break;
      case ProceduralSoundType.ARRIVAL:
        this.playArrivalSound(ctx, volume);
        break;
      case ProceduralSoundType.SWORD_SWING:
        this.playSwordSwingSound(ctx, volume);
        break;
      case ProceduralSoundType.MAGIC_CAST:
        this.playMagicCastSound(ctx, volume);
        break;
      case ProceduralSoundType.BOW_SHOT:
        this.playBowShotSound(ctx, volume);
        break;
      case ProceduralSoundType.HIT_IMPACT:
        this.playHitImpactSound(ctx, volume);
        break;
      case ProceduralSoundType.HEAL:
        this.playHealSound(ctx, volume);
        break;
      case ProceduralSoundType.VICTORY_FANFARE:
        this.playVictoryFanfareSound(ctx, volume);
        break;
      case ProceduralSoundType.DEFEAT:
        this.playDefeatSound(ctx, volume);
        break;
      case ProceduralSoundType.CRITICAL_HIT:
        this.playCriticalHitSound(ctx, volume);
        break;
      case ProceduralSoundType.FANFARE:
        this.playFanfareSound(ctx, volume);
        break;
      case ProceduralSoundType.STINGER:
        this.playStingerSound(ctx, volume);
        break;
      case ProceduralSoundType.ACHIEVEMENT:
        this.playAchievementSound(ctx, volume);
        break;
    }
  }

  // ── Ambient/Loop Sounds ────────────────────────────────────

  /**
   * Play a continuous ambient drone with two frequencies.
   * Returns a stop function.
   */
  playDrone(freq1: number, freq2: number, volume: number): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
    gain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
    osc1.connect(gain);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq2, ctx.currentTime);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start();

    // Slow LFO modulation for movement
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(3, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start();

    return () => {
      const now = ctx.currentTime;
      gain.gain.linearRampToValueAtTime(0, now + 1);
      gain2.gain.linearRampToValueAtTime(0, now + 1);
      setTimeout(() => {
        try { osc1.stop(); } catch { /* ok */ }
        try { osc2.stop(); } catch { /* ok */ }
        try { lfo.stop(); } catch { /* ok */ }
      }, 1200);
    };
  }

  /**
   * Play a continuous rain noise loop. Returns stop function.
   */
  playRainLoop(volume: number): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    // Brown noise filtered for rain-like sound
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    return () => {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => {
        try { source.stop(); } catch { /* ok */ }
      }, 600);
    };
  }

  /**
   * Play a continuous wind noise loop. Returns stop function.
   */
  playWindLoop(volume: number): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);

    // LFO to modulate filter for wind gusts
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(200, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    return () => {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => {
        try { source.stop(); } catch { /* ok */ }
        try { lfo.stop(); } catch { /* ok */ }
      }, 600);
    };
  }

  /**
   * Play bird chirp ambient. Returns stop function.
   */
  playBirdAmbient(volume: number): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    let active = true;
    const playChirp = (): void => {
      if (!active) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const baseFreq = 2000 + Math.random() * 2000;
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, now + 0.05);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // Schedule next chirp
      if (active) {
        setTimeout(playChirp, 2000 + Math.random() * 5000);
      }
    };

    setTimeout(playChirp, 500 + Math.random() * 2000);

    return () => {
      active = false;
    };
  }

  /**
   * Play fire crackle ambient. Returns stop function.
   */
  playFireCrackle(volume: number): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    let active = true;
    const playCrackle = (): void => {
      if (!active) return;
      const now = ctx.currentTime;

      // Short burst of filtered noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.05);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000 + Math.random() * 3000, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * (0.1 + Math.random() * 0.2), now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);

      if (active) {
        setTimeout(playCrackle, 50 + Math.random() * 200);
      }
    };

    playCrackle();

    return () => {
      active = false;
    };
  }

  /**
   * Play a thunder crack.
   */
  playThunder(volume: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Low rumble using noise
    const bufferSize = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.005 * white) / 1.005;
      lastOut = data[i];
      data[i] *= 20;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + 2);
  }

  // ── One-shot SFX ───────────────────────────────────────────

  private playClickSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playHoverSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  private playModalOpenSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playModalCloseSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playTabSwitchSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(700, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private playErrorSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Two descending tones
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(400 - i * 100, now + i * 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(vol * 0.15, now + i * 0.12 + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.1);
    }
  }

  private playSuccessSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Two ascending tones
    const notes = [523, 659]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(vol * 0.2, now + i * 0.1 + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.15);
    });
  }

  private playNotificationSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Bright double-ping
    const notes = [880, 1100];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(vol * 0.2, now + i * 0.08 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  private playCoinSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Metallic clink
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playBuildingPlaceSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Thud + slight ring
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playConstructSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Rapid hammer taps
    for (let i = 0; i < 3; i++) {
      const bufSize = Math.floor(ctx.sampleRate * 0.03);
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufSize; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / bufSize);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.05);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now + i * 0.12);
    }
  }

  private playDemolishSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Low crash/rumble
    const bufSize = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      data[i] = (last + 0.01 * w) / 1.01;
      last = data[i];
      data[i] *= 10;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  private playLevelUpSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Ascending arpeggio: C5, E5, G5, C6
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(vol * 0.2, now + i * 0.1 + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  private playFarewellSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Descending minor third
    const notes = [440, 349];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.2);
      gain.gain.linearRampToValueAtTime(vol * 0.15, now + i * 0.2 + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.2 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.4);
    });
  }

  private playHornBlastSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Brass-like tone with vibrato
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(330, now + 0.1);
    osc.frequency.setValueAtTime(330, now + 0.6);

    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(5, now);
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(5, now);
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);
    vibrato.start(now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.3, now + 0.05);
    gain.gain.setValueAtTime(vol * 0.3, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
    vibrato.stop(now + 0.8);
  }

  private playArrivalSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Cheerful ascending phrase
    const notes = [392, 494, 587, 784]; // G4 B4 D5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(vol * 0.18, now + i * 0.08 + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    });
  }

  private playSwordSwingSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Whoosh: filtered noise sweep
    const bufSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.linearRampToValueAtTime(4000, now + 0.1);
    filter.Q.setValueAtTime(2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  private playMagicCastSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Shimmer: rising sine with harmonics
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(600, now);
    osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  private playBowShotSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Twang + whoosh
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  private playHitImpactSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Short noise burst + low thud
    const bufSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);

    // Low thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(vol * 0.3, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(thudGain);
    thudGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playHealSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Gentle ascending shimmer
    const notes = [523, 659, 784]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(vol * 0.15, now + i * 0.12 + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
  }

  private playVictoryFanfareSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Triumphant major chord arpeggio
    const notes = [262, 330, 392, 523, 659, 784]; // C4 E4 G4 C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(vol * 0.2, now + i * 0.08 + 0.01);
      gain.gain.linearRampToValueAtTime(vol * 0.15, now + i * 0.08 + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.6);
    });
  }

  private playDefeatSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Descending minor progression
    const notes = [330, 277, 233, 196]; // E4 C#4 Bb3 G3
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.25);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.25);
      gain.gain.linearRampToValueAtTime(vol * 0.15, now + i * 0.25 + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.25 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.25);
      osc.stop(now + i * 0.25 + 0.4);
    });
  }

  private playCriticalHitSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Impact + high ring
    this.playHitImpactSound(ctx, vol * 1.2);

    // Add metallic ring on top
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(1500, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playFanfareSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Short trumpet-like fanfare
    const notes = [392, 494, 587]; // G4 B4 D5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(vol * 0.12, now + i * 0.12 + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.2);
    });
  }

  private playStingerSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Attention-grabbing musical phrase
    const notes = [659, 784, 880, 1047]; // E5 G5 A5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(vol * 0.2, now + i * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.15);
    });
  }

  private playAchievementSound(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Grand ascending chord with sustain
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(vol * 0.18, now + i * 0.06 + 0.02);
      gain.gain.setValueAtTime(vol * 0.15, now + i * 0.06 + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.06 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.8);
    });
  }

  /**
   * Dispose of the audio context.
   */
  destroy(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
