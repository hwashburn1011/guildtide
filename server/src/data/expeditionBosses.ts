/**
 * Boss fight definitions for the expedition system.
 *
 * T-0496: Expedition boss system with special boss expeditions
 * T-0497: Boss expedition unlock requirements (guild level, research, prerequisite)
 * T-0498: Boss encounter mechanics with multi-phase combat
 * T-0499: Boss loot table with exclusive rewards
 * T-0500: Boss expedition debriefing screen with battle summary
 */

export interface BossPhase {
  name: string;
  description: string;
  statCheck: 'strength' | 'agility' | 'endurance' | 'intellect';
  checkDifficulty: number;
  successNarrative: string;
  failureNarrative: string;
  damageOnFailure: number;
}

export interface BossDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  destinationId: string;
  difficulty: number;
  durationMinutes: number;
  requiredPartySize: number;
  unlockRequirements: {
    guildLevel: number;
    completedResearch?: string[];
    prerequisiteBoss?: string;
    expeditionsCompleted?: number;
  };
  phases: BossPhase[];
  lootTable: {
    resource: string;
    min: number;
    max: number;
    chance: number;
  }[];
  exclusiveRewards: string[];
  xpReward: number;
  briefingNarrative: string;
  victoryNarrative: string;
  defeatNarrative: string;
}

export const BOSS_DEFINITIONS: BossDefinition[] = [
  {
    id: 'scrapyard_golem',
    name: 'The Scrap Golem',
    title: 'Guardian of the Junkyard',
    description: 'A massive construct of twisted metal and broken machinery, animated by residual magic.',
    destinationId: 'scrapyard_outskirts',
    difficulty: 5,
    durationMinutes: 30,
    requiredPartySize: 3,
    unlockRequirements: {
      guildLevel: 3,
      expeditionsCompleted: 5,
    },
    phases: [
      {
        name: 'Charge',
        description: 'The golem charges forward, swinging massive metal fists.',
        statCheck: 'agility',
        checkDifficulty: 14,
        successNarrative: 'Your heroes dodge the lumbering charge, positioning for a counterattack.',
        failureNarrative: 'The golem crashes through your formation, scattering heroes.',
        damageOnFailure: 15,
      },
      {
        name: 'Magnetic Pull',
        description: 'The golem activates a magnetic field, dragging heroes toward its crushing embrace.',
        statCheck: 'strength',
        checkDifficulty: 16,
        successNarrative: 'Bracing against the pull, your strongest heroes hold the line.',
        failureNarrative: 'Heroes are dragged into range and battered by flailing arms.',
        damageOnFailure: 20,
      },
      {
        name: 'Core Exposed',
        description: 'The golem stumbles, revealing a glowing core within its chest.',
        statCheck: 'strength',
        checkDifficulty: 18,
        successNarrative: 'A devastating strike shatters the core! The golem collapses in a heap of metal.',
        failureNarrative: 'The core is too well-protected. The golem reforms and continues its assault.',
        damageOnFailure: 25,
      },
    ],
    lootTable: [
      { resource: 'ore', min: 30, max: 60, chance: 1.0 },
      { resource: 'gold', min: 40, max: 80, chance: 0.9 },
      { resource: 'essence', min: 5, max: 15, chance: 0.7 },
    ],
    exclusiveRewards: ['scrap_golem_core', 'iron_titan_gauntlets'],
    xpReward: 100,
    briefingNarrative: 'Deep in the scrapyard, a hulking figure stirs. The Scrap Golem awakens.',
    victoryNarrative: 'The golem falls with a thunderous crash! Rare components scatter from its shattered form.',
    defeatNarrative: 'The golem proves too powerful. Your battered party retreats from the scrapyard.',
  },
  {
    id: 'warehouse_specter',
    name: 'The Warehouse Specter',
    title: 'Echo of the Lost Merchant',
    description: 'A ghostly figure haunts the deepest vaults, hoarding treasures from a bygone era.',
    destinationId: 'abandoned_warehouse',
    difficulty: 7,
    durationMinutes: 45,
    requiredPartySize: 3,
    unlockRequirements: {
      guildLevel: 5,
      prerequisiteBoss: 'scrapyard_golem',
    },
    phases: [
      {
        name: 'Phantasmal Mist',
        description: 'The specter fills the vault with disorienting mist, whispering lies.',
        statCheck: 'intellect',
        checkDifficulty: 15,
        successNarrative: 'Clear-headed heroes see through the illusions and locate the specter.',
        failureNarrative: 'The mist sows confusion. Heroes strike at shadows.',
        damageOnFailure: 12,
      },
      {
        name: 'Possession Attempt',
        description: 'The specter tries to seize control of a party member.',
        statCheck: 'endurance',
        checkDifficulty: 17,
        successNarrative: 'Willpower holds. The hero shakes off the spectral grip.',
        failureNarrative: 'A hero is briefly possessed, turning on their allies before regaining control.',
        damageOnFailure: 18,
      },
      {
        name: 'Final Form',
        description: 'The specter manifests fully, a towering figure of cold light.',
        statCheck: 'strength',
        checkDifficulty: 19,
        successNarrative: 'Coordinated strikes disperse the spectral energy. The vault falls silent.',
        failureNarrative: 'The specter overwhelms the party with waves of freezing energy.',
        damageOnFailure: 22,
      },
    ],
    lootTable: [
      { resource: 'gold', min: 60, max: 120, chance: 1.0 },
      { resource: 'essence', min: 10, max: 25, chance: 0.8 },
    ],
    exclusiveRewards: ['spectral_ledger', 'ghost_merchant_ring'],
    xpReward: 150,
    briefingNarrative: 'The deepest vault of the warehouse holds a restless spirit and uncounted riches.',
    victoryNarrative: 'The specter dissolves into motes of light, leaving behind its centuries-old hoard.',
    defeatNarrative: 'The specter\'s wail drives your party from the vault. The treasure remains guarded.',
  },
  {
    id: 'forest_elder',
    name: 'The Elder Stag',
    title: 'Spirit of Whispering Woods',
    description: 'A colossal stag wreathed in forest magic. It is the living heart of the woods.',
    destinationId: 'whispering_woods',
    difficulty: 6,
    durationMinutes: 40,
    requiredPartySize: 3,
    unlockRequirements: {
      guildLevel: 4,
      expeditionsCompleted: 10,
    },
    phases: [
      {
        name: 'Thorn Wall',
        description: 'The forest itself rises to protect the Elder Stag, creating barriers of thorns.',
        statCheck: 'agility',
        checkDifficulty: 15,
        successNarrative: 'Nimble heroes weave through gaps in the thorny wall.',
        failureNarrative: 'Thorns tear at flesh and armor as heroes force their way through.',
        damageOnFailure: 14,
      },
      {
        name: 'Nature\'s Fury',
        description: 'Roots erupt from the ground, trying to entangle the party.',
        statCheck: 'strength',
        checkDifficulty: 16,
        successNarrative: 'Blades sever the grasping roots. The party maintains formation.',
        failureNarrative: 'Several heroes are pinned by the roots, unable to act.',
        damageOnFailure: 16,
      },
      {
        name: 'The Charge',
        description: 'The Elder Stag lowers its magnificent antlers and charges.',
        statCheck: 'endurance',
        checkDifficulty: 18,
        successNarrative: 'Standing firm, the party turns the charge aside. The great beast finally yields.',
        failureNarrative: 'The charge scatters the party. The Elder Stag escapes deeper into the forest.',
        damageOnFailure: 20,
      },
    ],
    lootTable: [
      { resource: 'food', min: 40, max: 80, chance: 1.0 },
      { resource: 'herbs', min: 20, max: 40, chance: 0.9 },
      { resource: 'essence', min: 8, max: 20, chance: 0.7 },
      { resource: 'wood', min: 15, max: 30, chance: 0.8 },
    ],
    exclusiveRewards: ['stag_antler_crown', 'heart_of_the_forest'],
    xpReward: 120,
    briefingNarrative: 'The Whispering Woods grow silent. Something ancient stirs in the deepest grove.',
    victoryNarrative: 'The Elder Stag bows its head in defeat, granting your guild the blessing of the forest.',
    defeatNarrative: 'The Elder Stag drives your party from the woods with an earth-shaking roar.',
  },
  {
    id: 'crystal_wyrm',
    name: 'The Crystal Wyrm',
    title: 'Devourer of Light',
    description: 'A serpentine creature made of living crystal, hoarding the cavern\'s magical essence.',
    destinationId: 'crystal_caverns',
    difficulty: 10,
    durationMinutes: 75,
    requiredPartySize: 4,
    unlockRequirements: {
      guildLevel: 8,
      prerequisiteBoss: 'warehouse_specter',
      completedResearch: ['deep_exploration'],
    },
    phases: [
      {
        name: 'Prismatic Blast',
        description: 'The wyrm unleashes a beam of refracted light that blinds and burns.',
        statCheck: 'agility',
        checkDifficulty: 18,
        successNarrative: 'Heroes scatter behind crystal pillars, avoiding the lethal beam.',
        failureNarrative: 'The light sears through the party, leaving painful burns.',
        damageOnFailure: 25,
      },
      {
        name: 'Crystal Armor',
        description: 'The wyrm encases itself in layers of regenerating crystal.',
        statCheck: 'strength',
        checkDifficulty: 20,
        successNarrative: 'Sustained heavy blows crack the crystal shell, exposing flesh beneath.',
        failureNarrative: 'The crystal reforms faster than your heroes can break it.',
        damageOnFailure: 15,
      },
      {
        name: 'Cavern Collapse',
        description: 'The wyrm thrashes wildly, bringing the ceiling down.',
        statCheck: 'endurance',
        checkDifficulty: 19,
        successNarrative: 'Heroes brace under overhangs, weathering the storm of falling crystal.',
        failureNarrative: 'Crystal shards rain down, burying heroes under sparkling rubble.',
        damageOnFailure: 30,
      },
      {
        name: 'Heart of Crystal',
        description: 'The wyrm\'s crystalline heart glows with blinding intensity.',
        statCheck: 'intellect',
        checkDifficulty: 21,
        successNarrative: 'A mystic identifies the heart\'s resonance frequency. A perfectly timed strike shatters it!',
        failureNarrative: 'The heart pulses with devastating force, blasting the party backward.',
        damageOnFailure: 35,
      },
    ],
    lootTable: [
      { resource: 'essence', min: 30, max: 60, chance: 1.0 },
      { resource: 'ore', min: 40, max: 80, chance: 0.9 },
      { resource: 'gold', min: 60, max: 150, chance: 0.8 },
    ],
    exclusiveRewards: ['crystal_wyrm_heart', 'prismatic_scale_armor', 'cavern_shard_blade'],
    xpReward: 250,
    briefingNarrative: 'The deepest caverns pulse with an eerie glow. The Crystal Wyrm waits.',
    victoryNarrative: 'The Crystal Wyrm shatters into a million sparkling fragments! Its hoard is yours.',
    defeatNarrative: 'The Crystal Wyrm\'s power is overwhelming. Your party escapes with their lives, barely.',
  },
  {
    id: 'thunder_titan',
    name: 'Grakmar the Storm King',
    title: 'Lord of Thunderpeak',
    description: 'A colossal beast that commands lightning and thunder from the mountaintop.',
    destinationId: 'thunderpeak_ridge',
    difficulty: 9,
    durationMinutes: 60,
    requiredPartySize: 4,
    unlockRequirements: {
      guildLevel: 7,
      prerequisiteBoss: 'forest_elder',
    },
    phases: [
      {
        name: 'Lightning Call',
        description: 'Grakmar raises his massive arms, calling bolts of lightning from the sky.',
        statCheck: 'agility',
        checkDifficulty: 17,
        successNarrative: 'Your heroes read the storm pattern and dodge between strikes.',
        failureNarrative: 'Lightning strikes find their marks, shocking heroes to their knees.',
        damageOnFailure: 22,
      },
      {
        name: 'Thunderclap',
        description: 'A deafening shockwave emanates from Grakmar\'s roar.',
        statCheck: 'endurance',
        checkDifficulty: 18,
        successNarrative: 'Hardened warriors stand firm against the concussive blast.',
        failureNarrative: 'Heroes are knocked prone and stunned by the thunderous roar.',
        damageOnFailure: 20,
      },
      {
        name: 'Summit Showdown',
        description: 'Grakmar makes his final stand at the peak, crackling with electrical fury.',
        statCheck: 'strength',
        checkDifficulty: 20,
        successNarrative: 'A coordinated assault brings the Storm King to his knees. The mountain falls silent.',
        failureNarrative: 'Grakmar summons a final devastating bolt, forcing your retreat down the mountain.',
        damageOnFailure: 28,
      },
    ],
    lootTable: [
      { resource: 'food', min: 40, max: 80, chance: 1.0 },
      { resource: 'essence', min: 15, max: 30, chance: 0.9 },
      { resource: 'gold', min: 50, max: 100, chance: 0.8 },
    ],
    exclusiveRewards: ['stormking_crown', 'thunderpeak_aegis'],
    xpReward: 200,
    briefingNarrative: 'Thunder echoes across the ridge. Grakmar has been sighted at the summit.',
    victoryNarrative: 'The Storm King falls! Clear skies return to Thunderpeak, and his treasures are claimed.',
    defeatNarrative: 'The storm intensifies as your party flees the ridge. Grakmar roars in triumph.',
  },
];

/**
 * Get a boss definition by ID.
 */
export function getBossById(bossId: string): BossDefinition | undefined {
  return BOSS_DEFINITIONS.find(b => b.id === bossId);
}

/**
 * Get bosses available for a given guild level and completed prerequisites.
 */
export function getAvailableBosses(
  guildLevel: number,
  completedBosses: string[],
  completedResearch: string[],
  totalExpeditions: number,
): BossDefinition[] {
  return BOSS_DEFINITIONS.filter(boss => {
    if (guildLevel < boss.unlockRequirements.guildLevel) return false;
    if (boss.unlockRequirements.prerequisiteBoss &&
        !completedBosses.includes(boss.unlockRequirements.prerequisiteBoss)) {
      return false;
    }
    if (boss.unlockRequirements.completedResearch) {
      for (const r of boss.unlockRequirements.completedResearch) {
        if (!completedResearch.includes(r)) return false;
      }
    }
    if (boss.unlockRequirements.expeditionsCompleted &&
        totalExpeditions < boss.unlockRequirements.expeditionsCompleted) {
      return false;
    }
    return true;
  });
}
