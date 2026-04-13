import { AudioCategory, AudioManager } from './AudioManager';
import { ProceduralAudio, ProceduralSoundType } from './ProceduralAudio';

/**
 * Sound effect identifiers -- every game event that should produce a sound.
 */
export enum SFXType {
  // UI sounds
  UI_BUTTON_CLICK = 'sfx_ui_button_click',
  UI_BUTTON_HOVER = 'sfx_ui_button_hover',
  UI_MODAL_OPEN = 'sfx_ui_modal_open',
  UI_MODAL_CLOSE = 'sfx_ui_modal_close',
  UI_TAB_SWITCH = 'sfx_ui_tab_switch',
  UI_ERROR = 'sfx_ui_error',
  UI_SUCCESS = 'sfx_ui_success',
  UI_NOTIFICATION = 'sfx_ui_notification',

  // Resource sounds
  RESOURCE_GAIN = 'sfx_resource_gain',
  RESOURCE_INSUFFICIENT = 'sfx_resource_insufficient',

  // Building sounds
  BUILDING_PLACE = 'sfx_building_place',
  BUILDING_CONSTRUCT = 'sfx_building_construct',
  BUILDING_UPGRADE = 'sfx_building_upgrade',
  BUILDING_DEMOLISH = 'sfx_building_demolish',

  // Hero sounds
  HERO_RECRUIT = 'sfx_hero_recruit',
  HERO_LEVEL_UP = 'sfx_hero_level_up',
  HERO_DISMISS = 'sfx_hero_dismiss',

  // Expedition sounds
  EXPEDITION_LAUNCH = 'sfx_expedition_launch',
  EXPEDITION_RETURN = 'sfx_expedition_return',

  // Combat sounds
  COMBAT_SWORD = 'sfx_combat_sword',
  COMBAT_MAGIC = 'sfx_combat_magic',
  COMBAT_BOW = 'sfx_combat_bow',
  COMBAT_HIT = 'sfx_combat_hit',
  COMBAT_HEAL = 'sfx_combat_heal',
  COMBAT_VICTORY = 'sfx_combat_victory',
  COMBAT_DEFEAT = 'sfx_combat_defeat',
  COMBAT_CRITICAL = 'sfx_combat_critical',

  // Notification sounds
  EVENT_STINGER = 'sfx_event_stinger',
  ACHIEVEMENT_UNLOCK = 'sfx_achievement_unlock',
}

/**
 * Mapping from SFX type to the audio category it belongs to.
 */
const SFX_CATEGORIES: Record<SFXType, AudioCategory> = {
  [SFXType.UI_BUTTON_CLICK]: AudioCategory.UI,
  [SFXType.UI_BUTTON_HOVER]: AudioCategory.UI,
  [SFXType.UI_MODAL_OPEN]: AudioCategory.UI,
  [SFXType.UI_MODAL_CLOSE]: AudioCategory.UI,
  [SFXType.UI_TAB_SWITCH]: AudioCategory.UI,
  [SFXType.UI_ERROR]: AudioCategory.UI,
  [SFXType.UI_SUCCESS]: AudioCategory.UI,
  [SFXType.UI_NOTIFICATION]: AudioCategory.UI,
  [SFXType.RESOURCE_GAIN]: AudioCategory.SFX,
  [SFXType.RESOURCE_INSUFFICIENT]: AudioCategory.SFX,
  [SFXType.BUILDING_PLACE]: AudioCategory.SFX,
  [SFXType.BUILDING_CONSTRUCT]: AudioCategory.SFX,
  [SFXType.BUILDING_UPGRADE]: AudioCategory.SFX,
  [SFXType.BUILDING_DEMOLISH]: AudioCategory.SFX,
  [SFXType.HERO_RECRUIT]: AudioCategory.SFX,
  [SFXType.HERO_LEVEL_UP]: AudioCategory.SFX,
  [SFXType.HERO_DISMISS]: AudioCategory.SFX,
  [SFXType.EXPEDITION_LAUNCH]: AudioCategory.SFX,
  [SFXType.EXPEDITION_RETURN]: AudioCategory.SFX,
  [SFXType.COMBAT_SWORD]: AudioCategory.SFX,
  [SFXType.COMBAT_MAGIC]: AudioCategory.SFX,
  [SFXType.COMBAT_BOW]: AudioCategory.SFX,
  [SFXType.COMBAT_HIT]: AudioCategory.SFX,
  [SFXType.COMBAT_HEAL]: AudioCategory.SFX,
  [SFXType.COMBAT_VICTORY]: AudioCategory.SFX,
  [SFXType.COMBAT_DEFEAT]: AudioCategory.SFX,
  [SFXType.COMBAT_CRITICAL]: AudioCategory.SFX,
  [SFXType.EVENT_STINGER]: AudioCategory.SFX,
  [SFXType.ACHIEVEMENT_UNLOCK]: AudioCategory.SFX,
};

/**
 * Mapping from SFX type to procedural fallback sound type.
 */
const SFX_PROCEDURAL_MAP: Record<SFXType, ProceduralSoundType> = {
  [SFXType.UI_BUTTON_CLICK]: ProceduralSoundType.CLICK,
  [SFXType.UI_BUTTON_HOVER]: ProceduralSoundType.HOVER,
  [SFXType.UI_MODAL_OPEN]: ProceduralSoundType.MODAL_OPEN,
  [SFXType.UI_MODAL_CLOSE]: ProceduralSoundType.MODAL_CLOSE,
  [SFXType.UI_TAB_SWITCH]: ProceduralSoundType.TAB_SWITCH,
  [SFXType.UI_ERROR]: ProceduralSoundType.ERROR,
  [SFXType.UI_SUCCESS]: ProceduralSoundType.SUCCESS,
  [SFXType.UI_NOTIFICATION]: ProceduralSoundType.NOTIFICATION,
  [SFXType.RESOURCE_GAIN]: ProceduralSoundType.COIN_CLINK,
  [SFXType.RESOURCE_INSUFFICIENT]: ProceduralSoundType.ERROR,
  [SFXType.BUILDING_PLACE]: ProceduralSoundType.BUILDING_PLACE,
  [SFXType.BUILDING_CONSTRUCT]: ProceduralSoundType.BUILDING_CONSTRUCT,
  [SFXType.BUILDING_UPGRADE]: ProceduralSoundType.FANFARE,
  [SFXType.BUILDING_DEMOLISH]: ProceduralSoundType.DEMOLISH,
  [SFXType.HERO_RECRUIT]: ProceduralSoundType.FANFARE,
  [SFXType.HERO_LEVEL_UP]: ProceduralSoundType.LEVEL_UP,
  [SFXType.HERO_DISMISS]: ProceduralSoundType.FAREWELL,
  [SFXType.EXPEDITION_LAUNCH]: ProceduralSoundType.HORN_BLAST,
  [SFXType.EXPEDITION_RETURN]: ProceduralSoundType.ARRIVAL,
  [SFXType.COMBAT_SWORD]: ProceduralSoundType.SWORD_SWING,
  [SFXType.COMBAT_MAGIC]: ProceduralSoundType.MAGIC_CAST,
  [SFXType.COMBAT_BOW]: ProceduralSoundType.BOW_SHOT,
  [SFXType.COMBAT_HIT]: ProceduralSoundType.HIT_IMPACT,
  [SFXType.COMBAT_HEAL]: ProceduralSoundType.HEAL,
  [SFXType.COMBAT_VICTORY]: ProceduralSoundType.VICTORY_FANFARE,
  [SFXType.COMBAT_DEFEAT]: ProceduralSoundType.DEFEAT,
  [SFXType.COMBAT_CRITICAL]: ProceduralSoundType.CRITICAL_HIT,
  [SFXType.EVENT_STINGER]: ProceduralSoundType.STINGER,
  [SFXType.ACHIEVEMENT_UNLOCK]: ProceduralSoundType.ACHIEVEMENT,
};

/**
 * Sound effects system. Plays SFX via Phaser audio if assets are loaded,
 * otherwise falls back to Web Audio API procedural sounds.
 */
export class SoundEffects {
  private audioManager: AudioManager;
  private proceduralAudio: ProceduralAudio;
  private cooldowns: Map<SFXType, number> = new Map();
  private minCooldownMs = 50; // prevent rapid-fire duplicate sounds

  constructor() {
    this.audioManager = AudioManager.getInstance();
    this.proceduralAudio = new ProceduralAudio();
  }

  /**
   * Play a sound effect. Tries Phaser audio first, then procedural fallback.
   */
  play(type: SFXType, volumeScale = 1.0): void {
    // Cooldown check
    const now = Date.now();
    const lastPlayed = this.cooldowns.get(type) ?? 0;
    if (now - lastPlayed < this.minCooldownMs) return;
    this.cooldowns.set(type, now);

    const category = SFX_CATEGORIES[type];
    const effectiveVolume = this.audioManager.getEffectiveVolume(category);
    if (effectiveVolume <= 0) return;

    // Try Phaser audio asset first
    const phaserSound = this.audioManager.play(type, category, { volume: volumeScale });
    if (phaserSound) return;

    // Fallback to procedural sound
    const proceduralType = SFX_PROCEDURAL_MAP[type];
    if (proceduralType) {
      this.proceduralAudio.play(proceduralType, effectiveVolume * volumeScale);
    }
  }

  /**
   * Convenience: play UI click sound.
   */
  playClick(): void {
    this.play(SFXType.UI_BUTTON_CLICK);
  }

  /**
   * Convenience: play UI hover sound.
   */
  playHover(): void {
    this.play(SFXType.UI_BUTTON_HOVER, 0.5);
  }

  /**
   * Convenience: play notification sound.
   */
  playNotification(): void {
    this.play(SFXType.UI_NOTIFICATION);
  }

  /**
   * Convenience: play error sound.
   */
  playError(): void {
    this.play(SFXType.UI_ERROR);
  }

  /**
   * Convenience: play success sound.
   */
  playSuccess(): void {
    this.play(SFXType.UI_SUCCESS);
  }
}
