import { HeroRole } from '../../../shared/src/enums';

/**
 * Idle animation set per role (text descriptions for UI rendering).
 * T-0446: Hero idle animation set per role
 * T-0462: Hero training montage animation for Barracks activities
 */

export interface IdleAnimation {
  id: string;
  role: HeroRole;
  description: string;
  frames: string[]; // text descriptions of animation frames
  duration: number; // seconds per cycle
}

export const IDLE_ANIMATIONS: Record<string, IdleAnimation> = {
  [HeroRole.Farmer]: {
    id: 'farmer_idle', role: HeroRole.Farmer,
    description: 'Farmer tends to crops and checks soil',
    frames: ['Standing with hoe', 'Bending to check soil', 'Wiping brow', 'Examining crop', 'Standing with hoe'],
    duration: 4,
  },
  [HeroRole.Scout]: {
    id: 'scout_idle', role: HeroRole.Scout,
    description: 'Scout scans the horizon and checks map',
    frames: ['Hand over eyes scanning', 'Unrolling map', 'Pointing at map', 'Looking through spyglass', 'Standing alert'],
    duration: 5,
  },
  [HeroRole.Merchant]: {
    id: 'merchant_idle', role: HeroRole.Merchant,
    description: 'Merchant counts coins and reviews ledger',
    frames: ['Counting gold coins', 'Writing in ledger', 'Stroking chin thoughtfully', 'Flipping coin', 'Polishing a gem'],
    duration: 4,
  },
  [HeroRole.Blacksmith]: {
    id: 'blacksmith_idle', role: HeroRole.Blacksmith,
    description: 'Blacksmith hammers at the anvil',
    frames: ['Lifting hammer', 'Striking anvil', 'Examining blade', 'Pumping bellows', 'Wiping brow'],
    duration: 3,
  },
  [HeroRole.Alchemist]: {
    id: 'alchemist_idle', role: HeroRole.Alchemist,
    description: 'Alchemist mixes potions and studies formulas',
    frames: ['Stirring cauldron', 'Adding ingredient', 'Watching reaction', 'Writing notes', 'Sniffing potion'],
    duration: 5,
  },
  [HeroRole.Hunter]: {
    id: 'hunter_idle', role: HeroRole.Hunter,
    description: 'Hunter practices archery and sharpens arrows',
    frames: ['Drawing bow', 'Aiming at target', 'Releasing arrow', 'Sharpening arrowhead', 'Stretching'],
    duration: 4,
  },
  [HeroRole.Defender]: {
    id: 'defender_idle', role: HeroRole.Defender,
    description: 'Defender practices shield drills',
    frames: ['Shield stance', 'Shield bash motion', 'Blocking high', 'Blocking low', 'At attention'],
    duration: 3,
  },
  [HeroRole.Mystic]: {
    id: 'mystic_idle', role: HeroRole.Mystic,
    description: 'Mystic meditates and channels energy',
    frames: ['Meditating seated', 'Hands glowing', 'Hovering slightly', 'Reading ancient tome', 'Crystal gazing'],
    duration: 6,
  },
  [HeroRole.CaravanMaster]: {
    id: 'caravan_idle', role: HeroRole.CaravanMaster,
    description: 'Caravan Master checks supplies and routes',
    frames: ['Checking supply list', 'Adjusting pack straps', 'Feeding pack animal', 'Studying route map', 'Securing cargo'],
    duration: 5,
  },
  [HeroRole.Archivist]: {
    id: 'archivist_idle', role: HeroRole.Archivist,
    description: 'Archivist reads and catalogs documents',
    frames: ['Reading thick tome', 'Turning page carefully', 'Writing with quill', 'Adjusting spectacles', 'Shelving a book'],
    duration: 5,
  },
};

export const TRAINING_MONTAGE_FRAMES: Record<string, string[]> = {
  strength: ['Lifting weights', 'Push-ups', 'Heavy bag punching', 'Log carrying', 'Rest and flex'],
  agility: ['Sprint drills', 'Obstacle course', 'Balance beam', 'Dodging practice', 'Cool down stretches'],
  intellect: ['Studying scrolls', 'Puzzle solving', 'Chess game', 'Debate practice', 'Meditation'],
  endurance: ['Long distance run', 'Swimming laps', 'Mountain climb', 'Breath holding', 'Recovery meal'],
  luck: ['Dice practice', 'Card tricks', 'Four-leaf clover hunt', 'Lucky charm crafting', 'Star gazing'],
};

export function getIdleAnimation(role: HeroRole): IdleAnimation | undefined {
  return IDLE_ANIMATIONS[role];
}

export function getTrainingMontageFrames(stat: string): string[] {
  return TRAINING_MONTAGE_FRAMES[stat] || TRAINING_MONTAGE_FRAMES.strength;
}
