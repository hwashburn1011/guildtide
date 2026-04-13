/**
 * Core item service: inventory management, equip/unequip, crafting,
 * durability, salvage, upgrade, trading, gear score, loadouts, sorting, and more.
 *
 * T-0681 through T-0760 (item system tasks).
 */
import { prisma } from '../db';
import { ItemCategory, ItemRarity, ResourceType } from '../../../shared/src/enums';
import { getItemTemplate, ITEM_TEMPLATES } from '../data/itemTemplates';
import { getActiveSetBonuses } from '../data/itemSets';
import type { ItemTemplate } from '../data/itemTemplates';

/** Maps ItemCategory to valid equipment slot names */
const CATEGORY_TO_SLOT: Partial<Record<string, string>> = {
  [ItemCategory.Weapon]: 'weapon',
  [ItemCategory.Armor]: 'armor',
  [ItemCategory.Charm]: 'charm',
  [ItemCategory.Tool]: 'tool',
  [ItemCategory.Helmet]: 'helmet',
  [ItemCategory.Boots]: 'boots',
  [ItemCategory.Shield]: 'shield',
  [ItemCategory.Ring]: 'ring',
  [ItemCategory.Amulet]: 'amulet',
  [ItemCategory.Belt]: 'belt',
  [ItemCategory.Cloak]: 'cloak',
};

const VALID_SLOTS = [
  'weapon', 'armor', 'charm', 'tool',
  'helmet', 'boots', 'shield', 'ring',
  'amulet', 'belt', 'cloak',
] as const;

/** Rarity ordering for upgrades */
const RARITY_ORDER: string[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Item instance metadata shape */
interface ItemMetadata {
  durability?: number;
  maxDurability?: number;
  enchantments?: Array<{ enchantmentId: string; level: number }>;
  socketedGems?: Array<{ socketIndex: number; gemType: string }>;
  quality?: string;
  locked?: boolean;
  transmogId?: string | null;
  statRolls?: Record<string, number>;
  createdDay?: number;
  loadoutId?: string | null;
}

function parseMetadata(raw: string | null): ItemMetadata {
  if (!raw) return {};
  try { return JSON.parse(raw) as ItemMetadata; } catch { return {}; }
}

export class ItemService {
  /**
   * Add an item to a guild's inventory.
   * If an item with the same templateId already exists, increase quantity.
   */
  static async addItem(guildId: string, templateId: string, quantity: number = 1) {
    const template = getItemTemplate(templateId);
    if (!template) throw new Error(`Unknown item template: ${templateId}`);
    if (quantity < 1) throw new Error('Quantity must be at least 1');

    const existing = await prisma.item.findFirst({
      where: { guildId, templateId },
    });

    if (existing) {
      const updated = await prisma.item.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
      return { ...updated, metadata: updated.metadata ? JSON.parse(updated.metadata) : null };
    }

    // Initialize metadata with durability if template has it
    const meta: ItemMetadata = {};
    if (template.durability) {
      meta.durability = template.durability;
      meta.maxDurability = template.durability;
    }

    const item = await prisma.item.create({
      data: {
        guildId,
        templateId,
        quantity,
        metadata: Object.keys(meta).length > 0 ? JSON.stringify(meta) : null,
      },
    });
    return { ...item, metadata: meta };
  }

  /**
   * Remove quantity of an item from inventory.
   */
  static async removeItem(guildId: string, itemId: string, quantity: number = 1) {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');
    if (quantity < 1) throw new Error('Quantity must be at least 1');
    if (item.quantity < quantity) throw new Error('Not enough items');

    if (item.quantity === quantity) {
      await prisma.item.delete({ where: { id: itemId } });
      return null;
    }

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: { quantity: item.quantity - quantity },
    });
    return { ...updated, metadata: updated.metadata ? JSON.parse(updated.metadata) : null };
  }

  /**
   * Equip an item on a hero in the appropriate slot.
   */
  static async equipItem(heroId: string, itemId: string, slot: string, guildId: string) {
    if (!VALID_SLOTS.includes(slot as any)) {
      throw new Error(`Invalid equipment slot: ${slot}. Valid slots: ${VALID_SLOTS.join(', ')}`);
    }

    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');
    if (hero.guildId !== guildId) throw new Error('Hero does not belong to your guild');

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    // Check if item is locked
    const meta = parseMetadata(item.metadata);
    // Items can be equipped even if locked

    const template = getItemTemplate(item.templateId);
    if (!template) throw new Error('Item template not found');

    const expectedSlot = CATEGORY_TO_SLOT[template.category];
    if (!expectedSlot) throw new Error(`${template.category} items cannot be equipped`);
    if (expectedSlot !== slot) throw new Error(`${template.name} must be equipped in the ${expectedSlot} slot, not ${slot}`);

    const equipment = JSON.parse(hero.equipment) as Record<string, string | null>;

    // Unequip current item in slot if any
    if (equipment[slot]) {
      const previousTemplateId = equipment[slot]!;
      await this.addItem(guildId, previousTemplateId, 1);
    }

    await this.removeItem(guildId, itemId, 1);
    equipment[slot] = template.id;

    const updatedHero = await prisma.hero.update({
      where: { id: heroId },
      data: { equipment: JSON.stringify(equipment) },
    });

    return {
      ...updatedHero,
      traits: JSON.parse(updatedHero.traits),
      stats: JSON.parse(updatedHero.stats),
      equipment: JSON.parse(updatedHero.equipment),
    };
  }

  /**
   * Unequip an item from a hero's slot.
   */
  static async unequipItem(heroId: string, slot: string, guildId: string) {
    if (!VALID_SLOTS.includes(slot as any)) {
      throw new Error(`Invalid equipment slot: ${slot}. Valid slots: ${VALID_SLOTS.join(', ')}`);
    }

    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');
    if (hero.guildId !== guildId) throw new Error('Hero does not belong to your guild');

    const equipment = JSON.parse(hero.equipment) as Record<string, string | null>;
    const templateId = equipment[slot];
    if (!templateId) throw new Error(`Nothing equipped in ${slot} slot`);

    await this.addItem(guildId, templateId, 1);
    equipment[slot] = null;

    const updatedHero = await prisma.hero.update({
      where: { id: heroId },
      data: { equipment: JSON.stringify(equipment) },
    });

    return {
      ...updatedHero,
      traits: JSON.parse(updatedHero.traits),
      stats: JSON.parse(updatedHero.stats),
      equipment: JSON.parse(updatedHero.equipment),
    };
  }

  /**
   * Craft an item (simple path, keeping backward compat).
   */
  static async craftItem(guildId: string, templateId: string) {
    const template = getItemTemplate(templateId);
    if (!template) throw new Error(`Unknown item template: ${templateId}`);
    if (!template.craftable) throw new Error(`${template.name} cannot be crafted`);
    if (!template.craftCost) throw new Error(`${template.name} has no craft cost defined`);

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    for (const [resource, cost] of Object.entries(template.craftCost)) {
      const have = resources[resource] || 0;
      if (have < cost!) throw new Error(`Not enough ${resource}. Need ${cost}, have ${Math.floor(have)}`);
    }

    for (const [resource, cost] of Object.entries(template.craftCost)) {
      resources[resource] = (resources[resource] || 0) - cost!;
    }

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    const item = await this.addItem(guildId, templateId, 1);
    return { item, resources };
  }

  /**
   * Get the full inventory for a guild.
   */
  static async getInventory(guildId: string) {
    const items = await prisma.item.findMany({ where: { guildId } });

    return items.map(item => {
      const template = getItemTemplate(item.templateId);
      return {
        ...item,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
        template: template || null,
      };
    });
  }

  /**
   * Get all item templates.
   */
  static getAllTemplates(): ItemTemplate[] {
    return ITEM_TEMPLATES;
  }

  // ========== DURABILITY & REPAIR (T-0717, T-0718, T-0751) ==========

  /** Reduce durability of equipped items (called after expeditions) */
  static async degradeDurability(guildId: string, heroId: string, amount: number = 5): Promise<string[]> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) return [];

    const equipment = JSON.parse(hero.equipment) as Record<string, string | null>;
    const warnings: string[] = [];

    for (const [_slot, templateId] of Object.entries(equipment)) {
      if (!templateId) continue;
      const template = getItemTemplate(templateId);
      if (!template || !template.durability) continue;

      // Find this item in inventory to get its metadata
      // Equipment is stored by templateId; we track durability in guild metadata
      const guildData = await prisma.guild.findUnique({ where: { id: guildId } });
      if (!guildData) continue;

      let meta: Record<string, unknown> = {};
      try { if (guildData.metadata) meta = JSON.parse(guildData.metadata); } catch { /* empty */ }

      const durMap: Record<string, number> = (meta.equipmentDurability as Record<string, number>) || {};
      const current = durMap[templateId] ?? template.durability;
      const newDur = Math.max(0, current - amount);
      durMap[templateId] = newDur;

      if (newDur <= template.durability * 0.2 && newDur > 0) {
        warnings.push(`${template.name} is almost broken (${newDur}/${template.durability})`);
      }
      if (newDur === 0) {
        warnings.push(`${template.name} has broken!`);
      }

      meta.equipmentDurability = durMap;
      await prisma.guild.update({
        where: { id: guildId },
        data: { metadata: JSON.stringify(meta) },
      });
    }

    return warnings;
  }

  /** Repair an item (costs gold based on durability lost) */
  static async repairItem(guildId: string, templateId: string): Promise<{ cost: number; durability: number }> {
    const template = getItemTemplate(templateId);
    if (!template || !template.durability) throw new Error('Item has no durability');

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    let meta: Record<string, unknown> = {};
    try { if (guild.metadata) meta = JSON.parse(guild.metadata); } catch { /* empty */ }

    const durMap: Record<string, number> = (meta.equipmentDurability as Record<string, number>) || {};
    const current = durMap[templateId] ?? template.durability;

    if (current >= template.durability) throw new Error('Item is already at full durability');

    const missing = template.durability - current;
    const cost = Math.ceil(missing * 0.5);

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    if ((resources[ResourceType.Gold] || 0) < cost) {
      throw new Error(`Not enough gold. Need ${cost}`);
    }

    resources[ResourceType.Gold] -= cost;
    durMap[templateId] = template.durability;
    meta.equipmentDurability = durMap;

    await prisma.guild.update({
      where: { id: guildId },
      data: {
        resources: JSON.stringify(resources),
        metadata: JSON.stringify(meta),
      },
    });

    return { cost, durability: template.durability };
  }

  // ========== SALVAGE / DISENCHANT (T-0719, T-0720) ==========

  /** Salvage an item for materials */
  static async salvageItem(guildId: string, itemId: string, quantity: number = 1): Promise<{ recovered: Record<string, number> }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    const meta = parseMetadata(item.metadata);
    if (meta.locked) throw new Error('Cannot salvage a locked item');

    if (item.quantity < quantity) throw new Error('Not enough items to salvage');

    const template = getItemTemplate(item.templateId);
    if (!template) throw new Error('Template not found');

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    const recovered: Record<string, number> = {};

    const yields = template.salvageYield || {};
    for (const [res, amt] of Object.entries(yields)) {
      const total = amt! * quantity;
      resources[res] = (resources[res] || 0) + total;
      recovered[res] = total;
    }

    await this.removeItem(guildId, itemId, quantity);

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return { recovered };
  }

  // ========== ITEM UPGRADE — COMBINE DUPLICATES (T-0721, T-0722) ==========

  /** Upgrade item rarity by combining 3 of the same item */
  static async upgradeItem(guildId: string, itemId: string): Promise<{ newItem: any }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');
    if (item.quantity < 3) throw new Error('Need at least 3 copies to upgrade');

    const template = getItemTemplate(item.templateId);
    if (!template) throw new Error('Template not found');

    const currentIdx = RARITY_ORDER.indexOf(template.rarity);
    if (currentIdx === -1 || currentIdx >= RARITY_ORDER.length - 1) {
      throw new Error('Item is already at maximum rarity');
    }

    // Find a template of the same category with the next rarity
    const nextRarity = RARITY_ORDER[currentIdx + 1];
    const upgradedTemplate = ITEM_TEMPLATES.find(
      t => t.category === template.category && t.rarity === nextRarity
    );

    if (!upgradedTemplate) {
      throw new Error('No upgrade path available for this item');
    }

    // Remove 3 of the source item
    await this.removeItem(guildId, itemId, 3);

    // Add 1 of the upgraded item
    const newItem = await this.addItem(guildId, upgradedTemplate.id, 1);

    return { newItem };
  }

  // ========== LOCK / FAVORITE (T-0732) ==========

  /** Toggle lock status on an item */
  static async toggleLock(guildId: string, itemId: string): Promise<{ locked: boolean }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    const meta = parseMetadata(item.metadata);
    meta.locked = !meta.locked;

    await prisma.item.update({
      where: { id: itemId },
      data: { metadata: JSON.stringify(meta) },
    });

    return { locked: !!meta.locked };
  }

  // ========== SELL ITEMS (T-0731) ==========

  /** Sell items for gold */
  static async sellItems(guildId: string, itemIds: Array<{ itemId: string; quantity: number }>): Promise<{ totalGold: number }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    let totalGold = 0;

    for (const { itemId, quantity } of itemIds) {
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item || item.guildId !== guildId) continue;

      const meta = parseMetadata(item.metadata);
      if (meta.locked) continue; // Skip locked items

      const template = getItemTemplate(item.templateId);
      if (!template) continue;

      const sellQty = Math.min(quantity, item.quantity);
      const gold = (template.sellValue || 1) * sellQty;
      totalGold += gold;

      await this.removeItem(guildId, itemId, sellQty);
    }

    resources[ResourceType.Gold] = (resources[ResourceType.Gold] || 0) + totalGold;
    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return { totalGold };
  }

  // ========== TRANSMOG (T-0748, T-0749) ==========

  /** Set transmog appearance on an item */
  static async setTransmog(guildId: string, itemId: string, transmogTemplateId: string | null): Promise<{ item: any }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    if (transmogTemplateId) {
      const tmog = getItemTemplate(transmogTemplateId);
      if (!tmog) throw new Error('Transmog template not found');

      const template = getItemTemplate(item.templateId);
      if (!template) throw new Error('Item template not found');

      // Must be same category
      if (tmog.category !== template.category) {
        throw new Error('Transmog must be the same item type');
      }
    }

    const meta = parseMetadata(item.metadata);
    meta.transmogId = transmogTemplateId;

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: { metadata: JSON.stringify(meta) },
    });

    return { item: { ...updated, metadata: meta } };
  }

  // ========== GEAR SCORE (T-0740) ==========

  /** Calculate gear score for a hero */
  static calculateGearScore(equipment: Record<string, string | null>): {
    totalScore: number;
    slotScores: Record<string, number>;
    setBonusScore: number;
  } {
    const slotScores: Record<string, number> = {};
    let totalScore = 0;
    const equippedTemplateIds: string[] = [];

    for (const [slot, templateId] of Object.entries(equipment)) {
      if (!templateId) {
        slotScores[slot] = 0;
        continue;
      }

      const template = getItemTemplate(templateId);
      if (!template) {
        slotScores[slot] = 0;
        continue;
      }

      equippedTemplateIds.push(templateId);

      let score = 0;
      const rarityScore: Record<string, number> = {
        common: 10, uncommon: 20, rare: 35, epic: 55, legendary: 80,
      };
      score += rarityScore[template.rarity] || 10;

      if (template.effects.statBonuses) {
        score += Object.values(template.effects.statBonuses).reduce((s, v) => s + (v || 0), 0) * 2;
      }
      if (template.effects.expeditionBonus) score += template.effects.expeditionBonus;
      if (template.effects.buildingBonus) score += Math.round(template.effects.buildingBonus * 100);

      slotScores[slot] = score;
      totalScore += score;
    }

    // Set bonus score
    const setBonuses = getActiveSetBonuses(equippedTemplateIds);
    let setBonusScore = 0;
    for (const { activeBonuses } of setBonuses) {
      for (const bonus of activeBonuses) {
        if (bonus.statBonuses) {
          setBonusScore += Object.values(bonus.statBonuses).reduce((s, v) => s + (v || 0), 0) * 2;
        }
        if (bonus.expeditionBonus) setBonusScore += bonus.expeditionBonus;
      }
    }
    totalScore += setBonusScore;

    return { totalScore, slotScores, setBonusScore };
  }

  // ========== AUTO-EQUIP BEST GEAR (T-0759) ==========

  /** Suggest and apply best equipment for a hero */
  static async autoEquipBest(heroId: string, guildId: string): Promise<Record<string, string | null>> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');
    if (hero.guildId !== guildId) throw new Error('Hero does not belong to your guild');

    const inventory = await this.getInventory(guildId);
    const equipment = JSON.parse(hero.equipment) as Record<string, string | null>;

    for (const slot of VALID_SLOTS) {
      // Find best item for this slot in inventory
      const candidates = inventory.filter(item => {
        const t = item.template;
        if (!t) return false;
        return CATEGORY_TO_SLOT[t.category] === slot;
      });

      if (candidates.length === 0) continue;

      // Score each candidate
      const scored = candidates.map(item => {
        const t = item.template!;
        let score = 0;
        const rarityScore: Record<string, number> = {
          common: 10, uncommon: 20, rare: 35, epic: 55, legendary: 80,
        };
        score += rarityScore[t.rarity] || 10;
        if (t.effects.statBonuses) {
          score += Object.values(t.effects.statBonuses).reduce((s, v) => s + (v || 0), 0) * 2;
        }
        if (t.effects.expeditionBonus) score += t.effects.expeditionBonus;
        return { item, score };
      }).sort((a, b) => b.score - a.score);

      const best = scored[0];
      if (!best) continue;

      // Check if better than currently equipped
      const currentId = equipment[slot];
      if (currentId) {
        const currentTemplate = getItemTemplate(currentId);
        if (currentTemplate) {
          let currentScore = 0;
          const rs: Record<string, number> = { common: 10, uncommon: 20, rare: 35, epic: 55, legendary: 80 };
          currentScore += rs[currentTemplate.rarity] || 10;
          if (currentTemplate.effects.statBonuses) {
            currentScore += Object.values(currentTemplate.effects.statBonuses).reduce((s, v) => s + (v || 0), 0) * 2;
          }
          if (currentTemplate.effects.expeditionBonus) currentScore += currentTemplate.effects.expeditionBonus;

          if (best.score <= currentScore) continue;
        }
      }

      // Equip the best item
      try {
        await this.equipItem(heroId, best.item.id, slot, guildId);
      } catch {
        // Skip if equip fails for any reason
      }
    }

    // Return final equipment state
    const updatedHero = await prisma.hero.findUnique({ where: { id: heroId } });
    return updatedHero ? JSON.parse(updatedHero.equipment) : equipment;
  }

  // ========== EQUIPMENT LOADOUTS (T-0752) ==========

  /** Save current equipment as a loadout */
  static async saveLoadout(guildId: string, heroId: string, loadoutName: string): Promise<any> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');
    if (hero.guildId !== guildId) throw new Error('Hero does not belong to your guild');

    const equipment = JSON.parse(hero.equipment) as Record<string, string | null>;

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    let meta: Record<string, unknown> = {};
    try { if (guild.metadata) meta = JSON.parse(guild.metadata); } catch { /* empty */ }

    const loadouts: Array<{ id: string; name: string; heroId: string; slots: Record<string, string | null> }> =
      (meta.equipmentLoadouts as any[]) || [];

    const loadout = {
      id: `loadout_${Date.now()}`,
      name: loadoutName,
      heroId,
      slots: { ...equipment },
    };

    loadouts.push(loadout);
    meta.equipmentLoadouts = loadouts;

    await prisma.guild.update({
      where: { id: guildId },
      data: { metadata: JSON.stringify(meta) },
    });

    return loadout;
  }

  // ========== SORTING & FILTERING (T-0728 through T-0730) ==========

  /** Get inventory with sorting and filtering */
  static async getFilteredInventory(
    guildId: string,
    options: {
      sortBy?: 'type' | 'rarity' | 'name' | 'value';
      filterCategory?: string;
      filterRarity?: string;
      searchQuery?: string;
    },
  ) {
    let items = await this.getInventory(guildId);

    // Filter by category
    if (options.filterCategory) {
      items = items.filter(i => i.template?.category === options.filterCategory);
    }

    // Filter by rarity
    if (options.filterRarity) {
      items = items.filter(i => i.template?.rarity === options.filterRarity);
    }

    // Search by name
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      items = items.filter(i =>
        i.template?.name.toLowerCase().includes(query) ||
        i.template?.description.toLowerCase().includes(query)
      );
    }

    // Sort
    const rarityOrder = (r: string) => RARITY_ORDER.indexOf(r);

    switch (options.sortBy) {
      case 'rarity':
        items.sort((a, b) => rarityOrder(b.template?.rarity || '') - rarityOrder(a.template?.rarity || ''));
        break;
      case 'name':
        items.sort((a, b) => (a.template?.name || '').localeCompare(b.template?.name || ''));
        break;
      case 'value':
        items.sort((a, b) => (b.template?.sellValue || 0) - (a.template?.sellValue || 0));
        break;
      case 'type':
      default:
        items.sort((a, b) => (a.template?.category || '').localeCompare(b.template?.category || ''));
        break;
    }

    return items;
  }

  // ========== ITEM COLLECTION STATS (T-0743) ==========

  /** Get collection completion percentage per category */
  static async getCollectionStats(guildId: string): Promise<Record<string, { owned: number; total: number; percent: number }>> {
    const items = await prisma.item.findMany({ where: { guildId } });
    const ownedTemplateIds = new Set(items.map(i => i.templateId));

    const categories: Record<string, { owned: number; total: number; percent: number }> = {};

    for (const template of ITEM_TEMPLATES) {
      if (!categories[template.category]) {
        categories[template.category] = { owned: 0, total: 0, percent: 0 };
      }
      categories[template.category].total++;
      if (ownedTemplateIds.has(template.id)) {
        categories[template.category].owned++;
      }
    }

    for (const cat of Object.values(categories)) {
      cat.percent = cat.total > 0 ? Math.round((cat.owned / cat.total) * 100) : 0;
    }

    return categories;
  }

  // ========== INVENTORY CAPACITY (T-0758) ==========

  /** Check inventory capacity */
  static async getInventoryCapacity(guildId: string): Promise<{ used: number; max: number }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const items = await prisma.item.findMany({ where: { guildId } });
    const used = items.reduce((sum, i) => sum + i.quantity, 0);
    const baseCapacity = 50;
    const levelBonus = guild.level * 10;

    let meta: Record<string, unknown> = {};
    try { if (guild.metadata) meta = JSON.parse(guild.metadata); } catch { /* empty */ }
    const storageUpgrades = (meta.storageUpgrades as number) || 0;

    const max = baseCapacity + levelBonus + storageUpgrades * 25;
    return { used, max };
  }

  /** Expand inventory storage */
  static async expandStorage(guildId: string): Promise<{ newMax: number; cost: number }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    let meta: Record<string, unknown> = {};
    try { if (guild.metadata) meta = JSON.parse(guild.metadata); } catch { /* empty */ }

    const storageUpgrades = ((meta.storageUpgrades as number) || 0);
    const cost = 50 + storageUpgrades * 25;

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    if ((resources[ResourceType.Gold] || 0) < cost) {
      throw new Error(`Not enough gold. Need ${cost}`);
    }

    resources[ResourceType.Gold] -= cost;
    meta.storageUpgrades = storageUpgrades + 1;

    await prisma.guild.update({
      where: { id: guildId },
      data: {
        resources: JSON.stringify(resources),
        metadata: JSON.stringify(meta),
      },
    });

    const newMax = 50 + guild.level * 10 + (storageUpgrades + 1) * 25;
    return { newMax, cost };
  }

  // ========== MARKET PRICE ESTIMATION (T-0754) ==========

  /** Estimate item market price */
  static estimatePrice(templateId: string): number {
    const template = getItemTemplate(templateId);
    if (!template) return 0;

    const rarityMult: Record<string, number> = {
      common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16,
    };

    const base = template.sellValue || 5;
    return Math.round(base * (rarityMult[template.rarity] || 1) * 0.8);
  }

  // ========== LORE (T-0723, T-0724) ==========

  /** Get discovered item lore */
  static async getItemLore(guildId: string): Promise<Array<{ templateId: string; name: string; lore: string }>> {
    const items = await prisma.item.findMany({ where: { guildId } });
    const ownedIds = new Set(items.map(i => i.templateId));

    return ITEM_TEMPLATES
      .filter(t => t.lore && ownedIds.has(t.id))
      .map(t => ({ templateId: t.id, name: t.name, lore: t.lore! }));
  }
}
