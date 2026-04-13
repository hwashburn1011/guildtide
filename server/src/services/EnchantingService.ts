/**
 * Enchanting and gem socketing service.
 * T-0710 through T-0716: Enchanting system and gem socketing.
 */
import { prisma } from '../db';
import { getItemTemplate } from '../data/itemTemplates';
import { getEnchantment, ENCHANTMENTS } from '../data/enchantments';
import { EnchantmentType, GemType, ResourceType } from '../../../shared/src/enums';
import type { EnchantmentDef } from '../data/enchantments';

/** Enchantment applied to an item */
interface AppliedEnchantment {
  enchantmentId: EnchantmentType;
  level: number;
}

/** Gem socketed into an item */
interface SocketedGem {
  socketIndex: number;
  gemType: GemType;
}

/** Item instance metadata */
interface ItemMetadata {
  enchantments?: AppliedEnchantment[];
  socketedGems?: SocketedGem[];
  durability?: number;
  maxDurability?: number;
  quality?: string;
  locked?: boolean;
  transmogId?: string | null;
  statRolls?: Record<string, number>;
  createdDay?: number;
  loadoutId?: string | null;
}

/** Slot mapping from category */
const CATEGORY_TO_SLOT: Record<string, string> = {
  weapon: 'weapon',
  armor: 'armor',
  charm: 'charm',
  tool: 'tool',
  helmet: 'helmet',
  boots: 'boots',
  shield: 'shield',
  ring: 'ring',
  amulet: 'amulet',
  belt: 'belt',
  cloak: 'cloak',
};

/** Gem stat effects */
const GEM_EFFECTS: Record<GemType, Record<string, number>> = {
  [GemType.Ruby]: { strength: 3 },
  [GemType.Sapphire]: { intellect: 3 },
  [GemType.Emerald]: { endurance: 3 },
  [GemType.Topaz]: { agility: 3 },
  [GemType.Diamond]: { strength: 2, agility: 2, intellect: 2, endurance: 2, luck: 2 },
  [GemType.Amethyst]: { luck: 4 },
  [GemType.Onyx]: { endurance: 4, strength: 1 },
  [GemType.Opal]: { intellect: 3, luck: 3 },
};

function parseMetadata(raw: string | null): ItemMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ItemMetadata;
  } catch {
    return {};
  }
}

export class EnchantingService {
  /** Get all enchantment definitions */
  static getAllEnchantments(): EnchantmentDef[] {
    return ENCHANTMENTS;
  }

  /** Apply an enchantment to an item */
  static async enchantItem(
    guildId: string,
    itemId: string,
    enchantmentId: EnchantmentType,
  ): Promise<{ item: any; enchantment: EnchantmentDef }> {
    const enchDef = getEnchantment(enchantmentId);
    if (!enchDef) throw new Error(`Unknown enchantment: ${enchantmentId}`);

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    const template = getItemTemplate(item.templateId);
    if (!template) throw new Error('Item template not found');

    // Check slot applicability
    const slot = CATEGORY_TO_SLOT[template.category] || template.category;
    if (!enchDef.applicableSlots.includes(slot)) {
      throw new Error(`${enchDef.name} cannot be applied to ${template.category} items`);
    }

    // Check costs
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    if ((resources[ResourceType.Essence] || 0) < enchDef.essenceCost) {
      throw new Error(`Not enough essence. Need ${enchDef.essenceCost}`);
    }
    if ((resources[ResourceType.Gold] || 0) < enchDef.goldCost) {
      throw new Error(`Not enough gold. Need ${enchDef.goldCost}`);
    }

    // Deduct costs
    resources[ResourceType.Essence] -= enchDef.essenceCost;
    resources[ResourceType.Gold] -= enchDef.goldCost;

    // Apply enchantment to item metadata
    const metadata = parseMetadata(item.metadata);
    if (!metadata.enchantments) metadata.enchantments = [];

    // Max 2 enchantments per item
    if (metadata.enchantments.length >= 2) {
      throw new Error('Item already has maximum enchantments (2)');
    }

    // No duplicate enchantments
    if (metadata.enchantments.some(e => e.enchantmentId === enchantmentId)) {
      throw new Error('Item already has this enchantment');
    }

    metadata.enchantments.push({ enchantmentId, level: 1 });

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return {
      item: { ...updatedItem, metadata },
      enchantment: enchDef,
    };
  }

  /** Remove an enchantment from an item (recovers 50% essence) */
  static async removeEnchantment(
    guildId: string,
    itemId: string,
    enchantmentId: EnchantmentType,
  ): Promise<{ item: any; essenceRecovered: number }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    const metadata = parseMetadata(item.metadata);
    if (!metadata.enchantments) throw new Error('Item has no enchantments');

    const idx = metadata.enchantments.findIndex(e => e.enchantmentId === enchantmentId);
    if (idx === -1) throw new Error('Enchantment not found on item');

    const enchDef = getEnchantment(enchantmentId);
    const essenceRecovered = enchDef ? Math.floor(enchDef.essenceCost * 0.5) : 0;

    metadata.enchantments.splice(idx, 1);

    // Recover essence
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (guild) {
      const resources = JSON.parse(guild.resources) as Record<string, number>;
      resources[ResourceType.Essence] = (resources[ResourceType.Essence] || 0) + essenceRecovered;
      await prisma.guild.update({
        where: { id: guildId },
        data: { resources: JSON.stringify(resources) },
      });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return { item: { ...updatedItem, metadata }, essenceRecovered };
  }

  /** Socket a gem into an item */
  static async socketGem(
    guildId: string,
    itemId: string,
    gemItemId: string,
    socketIndex: number,
  ): Promise<{ item: any; gemEffects: Record<string, number> }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    const template = getItemTemplate(item.templateId);
    if (!template) throw new Error('Template not found');

    const maxSockets = template.sockets || 0;
    if (maxSockets === 0) throw new Error('This item has no gem sockets');
    if (socketIndex < 0 || socketIndex >= maxSockets) {
      throw new Error(`Invalid socket index. Item has ${maxSockets} socket(s)`);
    }

    // Find the gem item
    const gemItem = await prisma.item.findUnique({ where: { id: gemItemId } });
    if (!gemItem) throw new Error('Gem not found');
    if (gemItem.guildId !== guildId) throw new Error('Gem does not belong to your guild');

    const gemTemplate = getItemTemplate(gemItem.templateId);
    if (!gemTemplate || gemTemplate.category !== 'gem') {
      throw new Error('Selected item is not a gem');
    }

    // Determine gem type from templateId
    const gemTypeMap: Record<string, GemType> = {
      gem_ruby: GemType.Ruby,
      gem_sapphire: GemType.Sapphire,
      gem_emerald: GemType.Emerald,
      gem_topaz: GemType.Topaz,
      gem_diamond: GemType.Diamond,
      gem_amethyst: GemType.Amethyst,
      gem_onyx: GemType.Onyx,
      gem_opal: GemType.Opal,
    };

    const gemType = gemTypeMap[gemItem.templateId];
    if (!gemType) throw new Error('Unknown gem type');

    const metadata = parseMetadata(item.metadata);
    if (!metadata.socketedGems) metadata.socketedGems = [];

    // Check if socket is already occupied
    if (metadata.socketedGems.some(g => g.socketIndex === socketIndex)) {
      throw new Error(`Socket ${socketIndex} is already occupied`);
    }

    // Remove gem from inventory
    if (gemItem.quantity <= 1) {
      await prisma.item.delete({ where: { id: gemItemId } });
    } else {
      await prisma.item.update({
        where: { id: gemItemId },
        data: { quantity: gemItem.quantity - 1 },
      });
    }

    metadata.socketedGems.push({ socketIndex, gemType });

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return {
      item: { ...updatedItem, metadata },
      gemEffects: GEM_EFFECTS[gemType] || {},
    };
  }

  /** Remove a gem from a socket (gem is destroyed) */
  static async unsocketGem(
    guildId: string,
    itemId: string,
    socketIndex: number,
  ): Promise<{ item: any }> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');
    if (item.guildId !== guildId) throw new Error('Item does not belong to your guild');

    const metadata = parseMetadata(item.metadata);
    if (!metadata.socketedGems) throw new Error('No gems socketed');

    const idx = metadata.socketedGems.findIndex(g => g.socketIndex === socketIndex);
    if (idx === -1) throw new Error('No gem in that socket');

    metadata.socketedGems.splice(idx, 1);

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return { item: { ...updatedItem, metadata } };
  }

  /** Get gem effects lookup */
  static getGemEffects(): Record<GemType, Record<string, number>> {
    return GEM_EFFECTS;
  }
}
