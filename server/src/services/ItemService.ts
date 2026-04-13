import { prisma } from '../db';
import { ItemCategory } from '../../../shared/src/enums';
import { getItemTemplate, ITEM_TEMPLATES } from '../data/itemTemplates';
import type { ItemTemplate } from '../data/itemTemplates';

/** Maps ItemCategory to valid equipment slot names */
const CATEGORY_TO_SLOT: Partial<Record<ItemCategory, string>> = {
  [ItemCategory.Weapon]: 'weapon',
  [ItemCategory.Armor]: 'armor',
  [ItemCategory.Charm]: 'charm',
  [ItemCategory.Tool]: 'tool',
};

/** Valid equipment slot names */
const VALID_SLOTS = ['weapon', 'armor', 'charm', 'tool'] as const;

export class ItemService {
  /**
   * Add an item to a guild's inventory.
   * If an item with the same templateId already exists, increase quantity.
   */
  static async addItem(guildId: string, templateId: string, quantity: number = 1) {
    const template = getItemTemplate(templateId);
    if (!template) throw new Error(`Unknown item template: ${templateId}`);
    if (quantity < 1) throw new Error('Quantity must be at least 1');

    // Check for existing stack
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

    const item = await prisma.item.create({
      data: { guildId, templateId, quantity },
    });
    return { ...item, metadata: null };
  }

  /**
   * Remove quantity of an item from inventory.
   * If quantity reaches 0, delete the row.
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
   * Validates the item category matches the slot.
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

    const template = getItemTemplate(item.templateId);
    if (!template) throw new Error('Item template not found');

    // Validate slot matches category
    const expectedSlot = CATEGORY_TO_SLOT[template.category];
    if (!expectedSlot) {
      throw new Error(`${template.category} items cannot be equipped`);
    }
    if (expectedSlot !== slot) {
      throw new Error(`${template.name} must be equipped in the ${expectedSlot} slot, not ${slot}`);
    }

    const equipment = JSON.parse(hero.equipment) as Record<string, string | null>;

    // If something is already in that slot, return it to inventory
    if (equipment[slot]) {
      // Find the equipped item's templateId from the stored value
      const previousTemplateId = equipment[slot]!;
      await this.addItem(guildId, previousTemplateId, 1);
    }

    // Remove the item from inventory (1 unit)
    await this.removeItem(guildId, itemId, 1);

    // Set the equipment slot to the templateId
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
   * Unequip an item from a hero's slot, returning it to guild inventory.
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

    // Return item to inventory
    await this.addItem(guildId, templateId, 1);

    // Clear slot
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
   * Craft an item: validate resource costs, deduct, and create the item.
   */
  static async craftItem(guildId: string, templateId: string) {
    const template = getItemTemplate(templateId);
    if (!template) throw new Error(`Unknown item template: ${templateId}`);
    if (!template.craftable) throw new Error(`${template.name} cannot be crafted`);
    if (!template.craftCost) throw new Error(`${template.name} has no craft cost defined`);

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;

    // Validate resources
    for (const [resource, cost] of Object.entries(template.craftCost)) {
      const have = resources[resource] || 0;
      if (have < cost!) {
        throw new Error(`Not enough ${resource}. Need ${cost}, have ${Math.floor(have)}`);
      }
    }

    // Deduct resources
    for (const [resource, cost] of Object.entries(template.craftCost)) {
      resources[resource] = (resources[resource] || 0) - cost!;
    }

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    // Add item to inventory
    const item = await this.addItem(guildId, templateId, 1);

    return { item, resources };
  }

  /**
   * Get the full inventory for a guild, with template data joined.
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
   * Get all item templates (for client display of craftable items, etc.)
   */
  static getAllTemplates(): ItemTemplate[] {
    return ITEM_TEMPLATES;
  }
}
