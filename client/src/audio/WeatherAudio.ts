import { AudioCategory, AudioManager } from './AudioManager';
import { ProceduralAudio } from './ProceduralAudio';

/**
 * Weather audio layer identifiers.
 */
export enum WeatherSoundType {
  RAIN = 'weather_rain',
  WIND = 'weather_wind',
  THUNDER = 'weather_thunder',
  SNOW = 'weather_snow',
  BIRDS = 'weather_birds',
  FIRE_CRACKLE = 'weather_fire_crackle',
}

/**
 * Weather condition to audio mapping.
 */
interface WeatherAudioConfig {
  layers: WeatherSoundType[];
  intensityScale: number; // 0-1 how strongly weather sounds play
}

const WEATHER_AUDIO_MAP: Record<string, WeatherAudioConfig> = {
  clear: {
    layers: [WeatherSoundType.BIRDS],
    intensityScale: 0.4,
  },
  rainy: {
    layers: [WeatherSoundType.RAIN],
    intensityScale: 0.7,
  },
  stormy: {
    layers: [WeatherSoundType.RAIN, WeatherSoundType.THUNDER, WeatherSoundType.WIND],
    intensityScale: 1.0,
  },
  snowy: {
    layers: [WeatherSoundType.SNOW, WeatherSoundType.WIND],
    intensityScale: 0.5,
  },
  windy: {
    layers: [WeatherSoundType.WIND],
    intensityScale: 0.6,
  },
  foggy: {
    layers: [WeatherSoundType.WIND],
    intensityScale: 0.3,
  },
  hot: {
    layers: [WeatherSoundType.BIRDS],
    intensityScale: 0.3,
  },
};

/**
 * Weather-reactive ambient sound system.
 * Manages layered ambient sounds based on current weather conditions.
 * Falls back to procedural noise when real audio assets aren't available.
 */
export class WeatherAudio {
  private audioManager: AudioManager;
  private proceduralAudio: ProceduralAudio;
  private activeWeather: string = '';
  private activeLayers: Map<WeatherSoundType, (() => void) | null> = new Map();
  private thunderTimer: number | null = null;
  private currentIntensity = 0.5;

  constructor() {
    this.audioManager = AudioManager.getInstance();
    this.proceduralAudio = new ProceduralAudio();
  }

  /**
   * Update weather audio to match current weather condition.
   */
  setWeather(weather: string, intensity = 0.5): void {
    if (weather === this.activeWeather && intensity === this.currentIntensity) return;

    this.stopAll();
    this.activeWeather = weather;
    this.currentIntensity = intensity;

    const config = WEATHER_AUDIO_MAP[weather];
    if (!config) return;

    const volume = this.audioManager.getEffectiveVolume(AudioCategory.AMBIENT);
    if (volume <= 0) return;

    const layerVolume = volume * config.intensityScale * intensity;

    for (const layer of config.layers) {
      this.startLayer(layer, layerVolume);
    }
  }

  /**
   * Update intensity without changing weather type (e.g., rain getting heavier).
   */
  setIntensity(intensity: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, intensity));
    // Re-apply current weather with new intensity
    if (this.activeWeather) {
      const weather = this.activeWeather;
      this.activeWeather = ''; // Force re-apply
      this.setWeather(weather, this.currentIntensity);
    }
  }

  /**
   * Start fire crackle ambient for indoor scenes (guild hall hearth).
   */
  startFireAmbient(volume = 0.3): void {
    const effectiveVol = this.audioManager.getEffectiveVolume(AudioCategory.AMBIENT) * volume;
    if (effectiveVol <= 0) return;
    this.startLayer(WeatherSoundType.FIRE_CRACKLE, effectiveVol);
  }

  /**
   * Stop all weather sounds.
   */
  stopAll(): void {
    for (const [type, stopFn] of this.activeLayers.entries()) {
      if (stopFn) {
        stopFn();
      }
      // Also stop any Phaser audio for this layer
      this.audioManager.stop(type);
    }
    this.activeLayers.clear();

    if (this.thunderTimer !== null) {
      clearInterval(this.thunderTimer);
      this.thunderTimer = null;
    }
  }

  /**
   * Start a single weather audio layer.
   */
  private startLayer(type: WeatherSoundType, volume: number): void {
    const scene = this.audioManager.getScene();

    // Try real audio asset first
    if (scene && scene.cache.audio.exists(type)) {
      this.audioManager.playLoop(type, AudioCategory.AMBIENT, { volume });
      this.activeLayers.set(type, null);
      return;
    }

    // Fall back to procedural sound
    let stopFn: (() => void) | null = null;

    switch (type) {
      case WeatherSoundType.RAIN:
        stopFn = this.proceduralAudio.playRainLoop(volume);
        break;
      case WeatherSoundType.WIND:
        stopFn = this.proceduralAudio.playWindLoop(volume * 0.6);
        break;
      case WeatherSoundType.SNOW:
        stopFn = this.proceduralAudio.playWindLoop(volume * 0.3);
        break;
      case WeatherSoundType.BIRDS:
        stopFn = this.proceduralAudio.playBirdAmbient(volume * 0.4);
        break;
      case WeatherSoundType.FIRE_CRACKLE:
        stopFn = this.proceduralAudio.playFireCrackle(volume);
        break;
      case WeatherSoundType.THUNDER:
        this.startThunderLoop(volume);
        break;
    }

    this.activeLayers.set(type, stopFn);
  }

  /**
   * Thunder: random strikes at intervals during storms.
   */
  private startThunderLoop(volume: number): void {
    const playThunder = (): void => {
      this.proceduralAudio.playThunder(volume);
    };

    // Play one immediately (slight delay for dramatic effect)
    setTimeout(playThunder, 1000 + Math.random() * 3000);

    // Then random intervals
    this.thunderTimer = window.setInterval(() => {
      if (Math.random() < 0.6) { // 60% chance each interval
        playThunder();
      }
    }, 5000 + Math.random() * 10000);
  }

  /**
   * Get current active weather.
   */
  getCurrentWeather(): string {
    return this.activeWeather;
  }

  /**
   * Cleanup.
   */
  destroy(): void {
    this.stopAll();
  }
}
