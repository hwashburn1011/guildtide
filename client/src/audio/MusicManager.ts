import * as Phaser from 'phaser';
import { AudioCategory, AudioManager } from './AudioManager';
import { ProceduralAudio, ProceduralSoundType } from './ProceduralAudio';

/**
 * Scene-to-music-track mapping.
 */
export enum MusicTrack {
  MENU = 'music_menu',
  GUILD_HALL = 'music_guild_hall',
  MARKET = 'music_market',
  EXPEDITION = 'music_expedition',
  COMBAT = 'music_combat',
  RESEARCH = 'music_research',
  WORLD_MAP = 'music_world_map',
}

/**
 * Season modifier suffixes for seasonal music variations.
 */
export enum SeasonVariation {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter',
}

/**
 * Time-of-day modifier for music mood.
 */
export enum TimeOfDayVariation {
  DAY = 'day',
  NIGHT = 'night',
}

/**
 * Scene key to music track mapping.
 */
const SCENE_MUSIC_MAP: Record<string, MusicTrack> = {
  LoginScene: MusicTrack.MENU,
  RegionSelectScene: MusicTrack.MENU,
  GuildHallScene: MusicTrack.GUILD_HALL,
  MarketScene: MusicTrack.MARKET,
  ExpeditionScene: MusicTrack.EXPEDITION,
  ResearchScene: MusicTrack.RESEARCH,
  WorldMapScene: MusicTrack.WORLD_MAP,
  SocialScene: MusicTrack.GUILD_HALL,
  AccountSettingsScene: MusicTrack.MENU,
};

interface CrossfadeState {
  outgoing: Phaser.Sound.BaseSound | null;
  incoming: Phaser.Sound.BaseSound | null;
  progress: number;
  duration: number;
  active: boolean;
}

/**
 * Manages background music with crossfading, scene-based selection,
 * seasonal variations, and day/night mood shifts.
 */
export class MusicManager {
  private audioManager: AudioManager;
  private proceduralAudio: ProceduralAudio;
  private currentTrack: MusicTrack | null = null;
  private currentSound: Phaser.Sound.BaseSound | null = null;
  private currentSeason: SeasonVariation = SeasonVariation.SPRING;
  private currentTimeOfDay: TimeOfDayVariation = TimeOfDayVariation.DAY;
  private crossfade: CrossfadeState = {
    outgoing: null,
    incoming: null,
    progress: 0,
    duration: 2000,
    active: false,
  };
  private crossfadeTimer: number | null = null;
  private proceduralDroneActive = false;
  private proceduralDroneStop: (() => void) | null = null;
  private combatOverride = false;

  constructor() {
    this.audioManager = AudioManager.getInstance();
    this.proceduralAudio = new ProceduralAudio();
  }

  /**
   * Set the current season (affects music variation selection).
   */
  setSeason(season: SeasonVariation): void {
    const changed = this.currentSeason !== season;
    this.currentSeason = season;
    if (changed && this.currentTrack) {
      this.playTrack(this.currentTrack);
    }
  }

  /**
   * Set time of day (affects music mood -- brighter day, softer night).
   */
  setTimeOfDay(time: TimeOfDayVariation): void {
    const changed = this.currentTimeOfDay !== time;
    this.currentTimeOfDay = time;
    if (changed && this.currentTrack) {
      // Adjust volume for night = softer
      this.applyTimeOfDayVolume();
    }
  }

  /**
   * Enter combat music override. Crossfades to combat track.
   */
  enterCombat(): void {
    if (this.combatOverride) return;
    this.combatOverride = true;
    this.playTrack(MusicTrack.COMBAT);
  }

  /**
   * Exit combat music override. Returns to scene-appropriate track.
   */
  exitCombat(sceneKey: string): void {
    if (!this.combatOverride) return;
    this.combatOverride = false;
    const track = SCENE_MUSIC_MAP[sceneKey] ?? MusicTrack.GUILD_HALL;
    this.playTrack(track);
  }

  /**
   * Called when a scene starts. Selects and plays the appropriate music.
   */
  onSceneChange(sceneKey: string): void {
    if (this.combatOverride) return; // Don't interrupt combat music
    const track = SCENE_MUSIC_MAP[sceneKey];
    if (track && track !== this.currentTrack) {
      this.playTrack(track);
    }
  }

  /**
   * Play a specific music track with crossfade from current.
   */
  playTrack(track: MusicTrack, crossfadeDuration = 2000): void {
    const audioKey = this.resolveTrackKey(track);
    const scene = this.audioManager.getScene();

    // Stop procedural drone if active
    this.stopProceduralDrone();

    if (scene && scene.cache.audio.exists(audioKey)) {
      // Real audio asset available
      this.crossfadeTo(audioKey, crossfadeDuration);
    } else {
      // No asset: use procedural ambient drone
      this.stopCurrentSound();
      this.startProceduralDrone(track);
    }

    this.currentTrack = track;
  }

  /**
   * Stop all music.
   */
  stop(): void {
    this.stopProceduralDrone();
    this.stopCurrentSound();
    this.cancelCrossfade();
    this.currentTrack = null;
  }

  /**
   * Get the currently playing track.
   */
  getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  /**
   * Resolve a track key with season variation suffix.
   * e.g. "music_guild_hall_spring_day"
   */
  private resolveTrackKey(track: MusicTrack): string {
    const seasonKey = `${track}_${this.currentSeason}`;
    const fullKey = `${seasonKey}_${this.currentTimeOfDay}`;
    const scene = this.audioManager.getScene();

    // Try most specific first, then fall back
    if (scene?.cache.audio.exists(fullKey)) return fullKey;
    if (scene?.cache.audio.exists(seasonKey)) return seasonKey;
    return track;
  }

  private crossfadeTo(audioKey: string, duration: number): void {
    const scene = this.audioManager.getScene();
    if (!scene) return;

    this.cancelCrossfade();

    const volume = this.audioManager.getEffectiveVolume(AudioCategory.MUSIC);
    const targetVolume = this.currentTimeOfDay === TimeOfDayVariation.NIGHT
      ? volume * 0.7
      : volume;

    const newSound = scene.sound.add(audioKey, {
      volume: 0,
      loop: true,
    });

    this.crossfade = {
      outgoing: this.currentSound,
      incoming: newSound,
      progress: 0,
      duration,
      active: true,
    };

    newSound.play();

    const stepMs = 50;
    const steps = duration / stepMs;
    let step = 0;

    this.crossfadeTimer = window.setInterval(() => {
      step++;
      const t = Math.min(step / steps, 1);

      if (this.crossfade.outgoing) {
        try {
          (this.crossfade.outgoing as any).setVolume(targetVolume * (1 - t));
        } catch { /* destroyed */ }
      }
      if (this.crossfade.incoming) {
        try {
          (this.crossfade.incoming as any).setVolume(targetVolume * t);
        } catch { /* destroyed */ }
      }

      if (t >= 1) {
        this.finishCrossfade();
      }
    }, stepMs);
  }

  private finishCrossfade(): void {
    if (this.crossfade.outgoing) {
      try {
        this.crossfade.outgoing.stop();
        this.crossfade.outgoing.destroy();
      } catch { /* already gone */ }
    }
    this.currentSound = this.crossfade.incoming;
    this.crossfade.active = false;
    this.cancelCrossfade();
  }

  private cancelCrossfade(): void {
    if (this.crossfadeTimer !== null) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
  }

  private stopCurrentSound(): void {
    if (this.currentSound) {
      try {
        this.currentSound.stop();
        this.currentSound.destroy();
      } catch { /* already destroyed */ }
      this.currentSound = null;
    }
  }

  private applyTimeOfDayVolume(): void {
    if (!this.currentSound) return;
    const baseVol = this.audioManager.getEffectiveVolume(AudioCategory.MUSIC);
    const vol = this.currentTimeOfDay === TimeOfDayVariation.NIGHT
      ? baseVol * 0.7
      : baseVol;
    try {
      (this.currentSound as any).setVolume(vol);
    } catch { /* sound may be gone */ }
  }

  /**
   * Procedural ambient drone as placeholder music.
   * Uses Web Audio oscillators to create a soft ambient pad.
   */
  private startProceduralDrone(track: MusicTrack): void {
    const volume = this.audioManager.getEffectiveVolume(AudioCategory.MUSIC);
    if (volume <= 0) return;

    const nightMod = this.currentTimeOfDay === TimeOfDayVariation.NIGHT ? 0.7 : 1.0;
    const droneConfig = this.getDroneConfig(track);

    this.proceduralDroneStop = this.proceduralAudio.playDrone(
      droneConfig.frequency,
      droneConfig.secondFrequency,
      volume * nightMod * 0.3,
    );
    this.proceduralDroneActive = true;
  }

  private stopProceduralDrone(): void {
    if (this.proceduralDroneStop) {
      this.proceduralDroneStop();
      this.proceduralDroneStop = null;
    }
    this.proceduralDroneActive = false;
  }

  private getDroneConfig(track: MusicTrack): { frequency: number; secondFrequency: number } {
    switch (track) {
      case MusicTrack.MENU:
        return { frequency: 220, secondFrequency: 330 }; // A3 + E4 (inviting)
      case MusicTrack.GUILD_HALL:
        return { frequency: 196, secondFrequency: 294 }; // G3 + D4 (calm)
      case MusicTrack.MARKET:
        return { frequency: 262, secondFrequency: 392 }; // C4 + G4 (lively)
      case MusicTrack.EXPEDITION:
        return { frequency: 247, secondFrequency: 370 }; // B3 + F#4 (adventurous)
      case MusicTrack.COMBAT:
        return { frequency: 147, secondFrequency: 220 }; // D3 + A3 (intense)
      case MusicTrack.RESEARCH:
        return { frequency: 277, secondFrequency: 415 }; // C#4 + G#4 (contemplative)
      case MusicTrack.WORLD_MAP:
        return { frequency: 175, secondFrequency: 262 }; // F3 + C4 (epic)
      default:
        return { frequency: 220, secondFrequency: 330 };
    }
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    this.stop();
  }
}
