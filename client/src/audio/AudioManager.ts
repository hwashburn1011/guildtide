import * as Phaser from 'phaser';

/**
 * Audio categories for independent volume control.
 */
export enum AudioCategory {
  MASTER = 'master',
  MUSIC = 'music',
  SFX = 'sfx',
  AMBIENT = 'ambient',
  UI = 'ui',
}

export interface AudioSettings {
  volumes: Record<AudioCategory, number>;
  muted: Record<AudioCategory, boolean>;
  globalMute: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  volumes: {
    [AudioCategory.MASTER]: 0.8,
    [AudioCategory.MUSIC]: 0.6,
    [AudioCategory.SFX]: 0.7,
    [AudioCategory.AMBIENT]: 0.5,
    [AudioCategory.UI]: 0.6,
  },
  muted: {
    [AudioCategory.MASTER]: false,
    [AudioCategory.MUSIC]: false,
    [AudioCategory.SFX]: false,
    [AudioCategory.AMBIENT]: false,
    [AudioCategory.UI]: false,
  },
  globalMute: false,
};

const STORAGE_KEY = 'guildtide_audio_settings';

/**
 * Central audio controller. Manages volume, muting, categories, and
 * acts as the single point of contact for all audio playback.
 *
 * Designed to work with or without actual audio assets -- when assets
 * are missing it falls back to ProceduralAudio oscillator-based sounds.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private scene: Phaser.Scene | null = null;
  private settings: AudioSettings;
  private activeSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private categoryMap: Map<string, AudioCategory> = new Map();
  private webAudioContext: AudioContext | null = null;
  private listeners: Array<(settings: AudioSettings) => void> = [];

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Bind to a Phaser scene so we can use its sound manager.
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
    // Ensure Web Audio context is available for procedural sounds
    if (!this.webAudioContext) {
      try {
        this.webAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        // Web Audio not available -- silent fallback
      }
    }
  }

  getWebAudioContext(): AudioContext | null {
    return this.webAudioContext;
  }

  getScene(): Phaser.Scene | null {
    return this.scene;
  }

  // ── Volume Controls ────────────────────────────────────────

  getVolume(category: AudioCategory): number {
    return this.settings.volumes[category];
  }

  setVolume(category: AudioCategory, value: number): void {
    this.settings.volumes[category] = Phaser.Math.Clamp(value, 0, 1);
    this.applyVolumes();
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Compute effective volume for a category, factoring in master volume and mutes.
   */
  getEffectiveVolume(category: AudioCategory): number {
    if (this.settings.globalMute) return 0;
    if (this.settings.muted[AudioCategory.MASTER]) return 0;
    if (this.settings.muted[category]) return 0;
    return this.settings.volumes[AudioCategory.MASTER] * this.settings.volumes[category];
  }

  // ── Mute Controls ─────────────────────────────────────────

  isMuted(category: AudioCategory): boolean {
    return this.settings.muted[category];
  }

  isGlobalMute(): boolean {
    return this.settings.globalMute;
  }

  setMuted(category: AudioCategory, muted: boolean): void {
    this.settings.muted[category] = muted;
    this.applyVolumes();
    this.saveSettings();
    this.notifyListeners();
  }

  setGlobalMute(muted: boolean): void {
    this.settings.globalMute = muted;
    this.applyVolumes();
    this.saveSettings();
    this.notifyListeners();
  }

  toggleMute(category: AudioCategory): void {
    this.setMuted(category, !this.settings.muted[category]);
  }

  toggleGlobalMute(): void {
    this.setGlobalMute(!this.settings.globalMute);
  }

  // ── Playback ───────────────────────────────────────────────

  /**
   * Play a sound by key. Falls back gracefully if asset not loaded.
   */
  play(
    key: string,
    category: AudioCategory,
    config?: Phaser.Types.Sound.SoundConfig,
  ): Phaser.Sound.BaseSound | null {
    if (!this.scene) return null;

    const volume = this.getEffectiveVolume(category);
    const finalConfig: Phaser.Types.Sound.SoundConfig = {
      ...config,
      volume: volume * (config?.volume ?? 1),
    };

    try {
      // Check if the audio key is loaded
      if (!this.scene.cache.audio.exists(key)) {
        return null;
      }
      const sound = this.scene.sound.add(key, finalConfig);
      sound.play();
      this.activeSounds.set(key, sound);
      this.categoryMap.set(key, category);

      sound.once('complete', () => {
        this.activeSounds.delete(key);
        this.categoryMap.delete(key);
      });

      return sound;
    } catch {
      return null;
    }
  }

  /**
   * Play a looping sound (ambient, music).
   */
  playLoop(
    key: string,
    category: AudioCategory,
    config?: Phaser.Types.Sound.SoundConfig,
  ): Phaser.Sound.BaseSound | null {
    return this.play(key, category, { ...config, loop: true });
  }

  /**
   * Stop a currently playing sound by key.
   */
  stop(key: string): void {
    const sound = this.activeSounds.get(key);
    if (sound) {
      sound.stop();
      sound.destroy();
      this.activeSounds.delete(key);
      this.categoryMap.delete(key);
    }
  }

  /**
   * Stop all sounds in a given category.
   */
  stopCategory(category: AudioCategory): void {
    for (const [key, cat] of this.categoryMap.entries()) {
      if (cat === category) {
        this.stop(key);
      }
    }
  }

  /**
   * Stop all active sounds.
   */
  stopAll(): void {
    for (const key of Array.from(this.activeSounds.keys())) {
      this.stop(key);
    }
  }

  /**
   * Check if a sound key is currently playing.
   */
  isPlaying(key: string): boolean {
    const sound = this.activeSounds.get(key);
    return sound ? (sound as any).isPlaying === true : false;
  }

  // ── Listener support ───────────────────────────────────────

  onSettingsChange(callback: (settings: AudioSettings) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  // ── Persistence ────────────────────────────────────────────

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AudioSettings>;
        return {
          volumes: { ...DEFAULT_SETTINGS.volumes, ...parsed.volumes },
          muted: { ...DEFAULT_SETTINGS.muted, ...parsed.muted },
          globalMute: parsed.globalMute ?? DEFAULT_SETTINGS.globalMute,
        };
      }
    } catch {
      // Corrupted storage -- use defaults
    }
    return { ...DEFAULT_SETTINGS, volumes: { ...DEFAULT_SETTINGS.volumes }, muted: { ...DEFAULT_SETTINGS.muted } };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage full or unavailable
    }
  }

  private applyVolumes(): void {
    for (const [key, sound] of this.activeSounds.entries()) {
      const category = this.categoryMap.get(key) ?? AudioCategory.SFX;
      const vol = this.getEffectiveVolume(category);
      try {
        (sound as any).setVolume(vol);
      } catch {
        // Sound may have been destroyed
      }
    }
  }

  private notifyListeners(): void {
    const snapshot = this.getSettings();
    for (const cb of this.listeners) {
      cb(snapshot);
    }
  }

  /**
   * Clean up when switching scenes.
   */
  destroy(): void {
    this.stopAll();
    this.scene = null;
  }
}
