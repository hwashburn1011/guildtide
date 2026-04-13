/**
 * Enchantment definitions — 20 enchantment types.
 * T-0710/T-0713: Enchanting system with 20 enchantment types.
 */
import { EnchantmentType, ItemRarity } from '../../../shared/src/enums';

export interface EnchantmentDef {
  id: EnchantmentType;
  name: string;
  description: string;
  effects: Record<string, number>;
  essenceCost: number;
  goldCost: number;
  /** Which equipment slots this enchantment can be applied to */
  applicableSlots: string[];
  rarity: ItemRarity;
}

export const ENCHANTMENTS: EnchantmentDef[] = [
  {
    id: EnchantmentType.FireDamage,
    name: 'Flame Tongue',
    description: 'Adds fire damage to attacks.',
    effects: { strength: 3, expeditionBonus: 5 },
    essenceCost: 8, goldCost: 20,
    applicableSlots: ['weapon'],
    rarity: ItemRarity.Uncommon,
  },
  {
    id: EnchantmentType.ColdResist,
    name: 'Frostward',
    description: 'Grants resistance to cold.',
    effects: { endurance: 3 },
    essenceCost: 6, goldCost: 15,
    applicableSlots: ['armor', 'helmet', 'boots', 'cloak'],
    rarity: ItemRarity.Common,
  },
  {
    id: EnchantmentType.SpeedBoost,
    name: 'Windwalker',
    description: 'Increases movement speed and agility.',
    effects: { agility: 4, expeditionBonus: 3 },
    essenceCost: 8, goldCost: 20,
    applicableSlots: ['boots', 'cloak', 'ring'],
    rarity: ItemRarity.Uncommon,
  },
  {
    id: EnchantmentType.LifeSteal,
    name: 'Vampiric Touch',
    description: 'Drains life from enemies.',
    effects: { endurance: 2, expeditionBonus: 5 },
    essenceCost: 12, goldCost: 35,
    applicableSlots: ['weapon'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.CritChance,
    name: 'Precision Edge',
    description: 'Increases critical hit chance.',
    effects: { luck: 4, expeditionBonus: 4 },
    essenceCost: 10, goldCost: 25,
    applicableSlots: ['weapon', 'ring', 'amulet'],
    rarity: ItemRarity.Uncommon,
  },
  {
    id: EnchantmentType.ManaRegen,
    name: 'Arcane Flow',
    description: 'Enhances essence recovery.',
    effects: { intellect: 3, buildingBonus: 5 },
    essenceCost: 8, goldCost: 20,
    applicableSlots: ['helmet', 'ring', 'amulet'],
    rarity: ItemRarity.Uncommon,
  },
  {
    id: EnchantmentType.Thorns,
    name: 'Thorns',
    description: 'Reflects damage back to attackers.',
    effects: { endurance: 2, expeditionBonus: 4 },
    essenceCost: 10, goldCost: 25,
    applicableSlots: ['armor', 'shield'],
    rarity: ItemRarity.Uncommon,
  },
  {
    id: EnchantmentType.Fortify,
    name: 'Fortification',
    description: 'Strengthens defenses considerably.',
    effects: { endurance: 5 },
    essenceCost: 10, goldCost: 25,
    applicableSlots: ['armor', 'shield', 'helmet'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.Haste,
    name: 'Haste',
    description: 'Accelerates all actions.',
    effects: { agility: 5, expeditionBonus: 6 },
    essenceCost: 14, goldCost: 40,
    applicableSlots: ['boots', 'weapon', 'ring'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.Berserk,
    name: 'Berserker Rage',
    description: 'Greatly increases attack power at the cost of defense.',
    effects: { strength: 6, expeditionBonus: 8 },
    essenceCost: 15, goldCost: 45,
    applicableSlots: ['weapon'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.Vampiric,
    name: 'Blood Pact',
    description: 'Drains life force in combat.',
    effects: { endurance: 4, strength: 2, expeditionBonus: 6 },
    essenceCost: 18, goldCost: 50,
    applicableSlots: ['weapon', 'amulet'],
    rarity: ItemRarity.Epic,
  },
  {
    id: EnchantmentType.Arcane,
    name: 'Arcane Infusion',
    description: 'Infuses the item with raw arcane energy.',
    effects: { intellect: 5, luck: 2, expeditionBonus: 5 },
    essenceCost: 15, goldCost: 40,
    applicableSlots: ['weapon', 'armor', 'helmet', 'amulet'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.NatureBlessing,
    name: "Nature's Blessing",
    description: 'The blessing of the forest spirits.',
    effects: { endurance: 3, luck: 2, buildingBonus: 5 },
    essenceCost: 10, goldCost: 25,
    applicableSlots: ['armor', 'cloak', 'amulet', 'ring'],
    rarity: ItemRarity.Uncommon,
  },
  {
    id: EnchantmentType.ShadowStrike,
    name: 'Shadow Strike',
    description: 'Attacks from the shadows deal extra damage.',
    effects: { agility: 4, luck: 3, expeditionBonus: 6 },
    essenceCost: 14, goldCost: 40,
    applicableSlots: ['weapon'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.HolyShield,
    name: 'Holy Shield',
    description: 'A divine barrier that wards off evil.',
    effects: { endurance: 5, intellect: 2, expeditionBonus: 5 },
    essenceCost: 16, goldCost: 45,
    applicableSlots: ['shield', 'armor', 'amulet'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.StormCall,
    name: 'Storm Call',
    description: 'Calls down lightning to smite foes.',
    effects: { intellect: 6, expeditionBonus: 10 },
    essenceCost: 20, goldCost: 60,
    applicableSlots: ['weapon', 'ring'],
    rarity: ItemRarity.Epic,
  },
  {
    id: EnchantmentType.EarthShatter,
    name: 'Earth Shatter',
    description: 'Strikes with the force of an earthquake.',
    effects: { strength: 6, endurance: 2, expeditionBonus: 8 },
    essenceCost: 18, goldCost: 50,
    applicableSlots: ['weapon'],
    rarity: ItemRarity.Epic,
  },
  {
    id: EnchantmentType.WindWalk,
    name: 'Wind Walk',
    description: 'Move as swiftly as the wind itself.',
    effects: { agility: 6, expeditionBonus: 8 },
    essenceCost: 16, goldCost: 45,
    applicableSlots: ['boots', 'cloak'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.PoisonCoat,
    name: 'Poison Coat',
    description: 'Coats the weapon with deadly poison.',
    effects: { agility: 2, luck: 2, expeditionBonus: 7 },
    essenceCost: 12, goldCost: 30,
    applicableSlots: ['weapon'],
    rarity: ItemRarity.Rare,
  },
  {
    id: EnchantmentType.LuckCharm,
    name: 'Fortuna\'s Grace',
    description: 'The blessing of the goddess of luck.',
    effects: { luck: 6, expeditionBonus: 5 },
    essenceCost: 12, goldCost: 35,
    applicableSlots: ['ring', 'amulet', 'charm', 'belt'],
    rarity: ItemRarity.Rare,
  },
];

/** Look up an enchantment by ID */
export function getEnchantment(id: EnchantmentType): EnchantmentDef | undefined {
  return ENCHANTMENTS.find(e => e.id === id);
}

/** Get enchantments applicable to a given slot */
export function getEnchantmentsForSlot(slot: string): EnchantmentDef[] {
  return ENCHANTMENTS.filter(e => e.applicableSlots.includes(slot));
}
