/**
 * Item set definitions with tiered set bonuses.
 * T-0706/T-0707: 10 item sets with 3-5 pieces each and tiered bonuses.
 */

export interface ItemSetBonus {
  piecesRequired: number;
  statBonuses?: Partial<Record<'strength' | 'agility' | 'intellect' | 'endurance' | 'luck', number>>;
  expeditionBonus?: number;
  buildingBonus?: number;
  resourceBonuses?: Partial<Record<string, number>>;
  specialEffect?: string;
}

export interface ItemSetDefinition {
  id: string;
  name: string;
  description: string;
  pieceTemplateIds: string[];
  bonuses: ItemSetBonus[];
}

export const ITEM_SETS: ItemSetDefinition[] = [
  {
    id: 'set_flameguard',
    name: 'Flameguard',
    description: 'Forged in volcanic fires, this set radiates destructive heat.',
    pieceTemplateIds: ['weapon_flameforge_blade', 'armor_flameguard_plate', 'acc_flameguard_ring'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { strength: 3 }, expeditionBonus: 5, specialEffect: '+10% fire damage' },
      { piecesRequired: 3, statBonuses: { strength: 5, endurance: 3 }, expeditionBonus: 10, specialEffect: 'Fire aura: +15% expedition damage' },
    ],
  },
  {
    id: 'set_arcane_scholar',
    name: 'Arcane Scholar',
    description: 'Worn by the masters of the Arcane Academy.',
    pieceTemplateIds: ['weapon_archmage_scepter', 'armor_mystic_robes', 'armor_wizard_hat', 'relic_scholars_tome'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { intellect: 3 }, buildingBonus: 0.05, specialEffect: '+5% research speed' },
      { piecesRequired: 3, statBonuses: { intellect: 5, luck: 2 }, buildingBonus: 0.1, specialEffect: '+10% essence production' },
      { piecesRequired: 4, statBonuses: { intellect: 8, luck: 4, endurance: 2 }, buildingBonus: 0.15, specialEffect: 'Arcane mastery: double essence chance' },
    ],
  },
  {
    id: 'set_ironwall',
    name: 'Ironwall Defender',
    description: 'The legendary armor of the Iron Wall garrison.',
    pieceTemplateIds: ['armor_iron_helm', 'armor_plate_cuirass', 'armor_ironshod_boots', 'armor_tower_shield', 'weapon_ironwall_mace'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { endurance: 3 }, expeditionBonus: 3 },
      { piecesRequired: 3, statBonuses: { endurance: 5, strength: 2 }, expeditionBonus: 6, specialEffect: 'Iron resolve: -20% injury chance' },
      { piecesRequired: 4, statBonuses: { endurance: 8, strength: 4 }, expeditionBonus: 10, specialEffect: 'Unyielding: cannot be one-shot' },
      { piecesRequired: 5, statBonuses: { endurance: 12, strength: 6, luck: 2 }, expeditionBonus: 15, specialEffect: 'Iron fortress: party-wide +5 endurance' },
    ],
  },
  {
    id: 'set_shadow_dancer',
    name: 'Shadow Dancer',
    description: 'Crafted by the thieves guild for silent operations.',
    pieceTemplateIds: ['weapon_shadow_blade', 'armor_shadow_vest', 'armor_shadow_boots', 'acc_shadow_cloak'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { agility: 3, luck: 1 }, expeditionBonus: 4 },
      { piecesRequired: 3, statBonuses: { agility: 5, luck: 3 }, expeditionBonus: 8, specialEffect: 'Shadow step: +15% trap avoidance' },
      { piecesRequired: 4, statBonuses: { agility: 8, luck: 5 }, expeditionBonus: 14, specialEffect: 'Phantom strike: guaranteed first strike' },
    ],
  },
  {
    id: 'set_nature_wrath',
    name: "Nature's Wrath",
    description: 'Blessed by the spirits of the ancient forest.',
    pieceTemplateIds: ['weapon_nature_staff', 'armor_nature_robes', 'acc_nature_amulet'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { intellect: 2, endurance: 2 }, resourceBonuses: { herbs: 0.1 }, specialEffect: '+10% herb yield' },
      { piecesRequired: 3, statBonuses: { intellect: 4, endurance: 3, luck: 2 }, resourceBonuses: { herbs: 0.2, food: 0.1 }, specialEffect: 'Nature bond: auto-heal on expedition' },
    ],
  },
  {
    id: 'set_fortune_seeker',
    name: 'Fortune Seeker',
    description: 'Gear favored by treasure hunters and gamblers.',
    pieceTemplateIds: ['weapon_fortune_dagger', 'acc_fortune_ring', 'acc_fortune_belt'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { luck: 3 }, resourceBonuses: { gold: 0.1 }, specialEffect: '+10% gold find' },
      { piecesRequired: 3, statBonuses: { luck: 6, agility: 2 }, resourceBonuses: { gold: 0.2 }, specialEffect: 'Lucky strike: +20% rare loot chance' },
    ],
  },
  {
    id: 'set_stormcaller',
    name: 'Stormcaller',
    description: 'Harness the power of the tempest itself.',
    pieceTemplateIds: ['weapon_storm_scepter', 'armor_storm_robes', 'acc_storm_amulet'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { intellect: 4 }, expeditionBonus: 6, specialEffect: 'Storm immunity' },
      { piecesRequired: 3, statBonuses: { intellect: 7, luck: 3 }, expeditionBonus: 12, specialEffect: 'Chain lightning: hit multiple enemies' },
    ],
  },
  {
    id: 'set_harvester',
    name: 'Bountiful Harvester',
    description: 'Tools and charms blessed by the harvest spirit.',
    pieceTemplateIds: ['tool_harvester_scythe', 'acc_harvester_gloves', 'charm_harvester_charm'],
    bonuses: [
      { piecesRequired: 2, buildingBonus: 0.1, resourceBonuses: { food: 0.15 }, specialEffect: '+15% food production' },
      { piecesRequired: 3, buildingBonus: 0.2, resourceBonuses: { food: 0.25, herbs: 0.15, water: 0.1 }, specialEffect: 'Cornucopia: seasonal bonus doubled' },
    ],
  },
  {
    id: 'set_prospector',
    name: 'Master Prospector',
    description: 'Equipment of the legendary prospectors guild.',
    pieceTemplateIds: ['tool_prospector_pick', 'acc_prospector_belt', 'charm_prospector_charm'],
    bonuses: [
      { piecesRequired: 2, buildingBonus: 0.1, resourceBonuses: { ore: 0.15 }, specialEffect: '+15% ore yield' },
      { piecesRequired: 3, buildingBonus: 0.2, resourceBonuses: { ore: 0.3, stone: 0.2, gold: 0.1 }, specialEffect: 'Motherlode: chance of double ore' },
    ],
  },
  {
    id: 'set_explorer',
    name: 'Trailblazer',
    description: 'Gear of the renowned Trailblazer Company.',
    pieceTemplateIds: ['weapon_hunters_bow', 'armor_scouts_cloak', 'tool_cartographers_lens'],
    bonuses: [
      { piecesRequired: 2, statBonuses: { agility: 2, luck: 2 }, expeditionBonus: 8, specialEffect: '+10% discovery chance' },
      { piecesRequired: 3, statBonuses: { agility: 4, luck: 4, intellect: 2 }, expeditionBonus: 15, specialEffect: 'Pathfinder: reveal hidden routes' },
    ],
  },
];

/** Look up a set by ID */
export function getItemSet(setId: string): ItemSetDefinition | undefined {
  return ITEM_SETS.find(s => s.id === setId);
}

/** Get all sets that include a given template */
export function getSetsForTemplate(templateId: string): ItemSetDefinition[] {
  return ITEM_SETS.filter(s => s.pieceTemplateIds.includes(templateId));
}

/** Calculate which set bonuses are active given a list of equipped templateIds */
export function getActiveSetBonuses(equippedTemplateIds: string[]): Array<{
  set: ItemSetDefinition;
  activeBonuses: ItemSetBonus[];
  piecesWorn: number;
}> {
  const results: Array<{ set: ItemSetDefinition; activeBonuses: ItemSetBonus[]; piecesWorn: number }> = [];

  for (const set of ITEM_SETS) {
    const piecesWorn = set.pieceTemplateIds.filter(id => equippedTemplateIds.includes(id)).length;
    if (piecesWorn < 2) continue;

    const activeBonuses = set.bonuses.filter(b => piecesWorn >= b.piecesRequired);
    if (activeBonuses.length > 0) {
      results.push({ set, activeBonuses, piecesWorn });
    }
  }

  return results;
}
