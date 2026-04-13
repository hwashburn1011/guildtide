import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { I18nManager } from '../i18n/I18nManager';
import { AnalyticsService } from '../systems/AnalyticsService';

// ============================================================================
// Epic 30: Analytics & Monetization — Cosmetic Shop (T-2066 – T-2090)
// ============================================================================

// ---------------------------------------------------------------------------
// T-2067: Cosmetic categories
// ---------------------------------------------------------------------------
export type CosmeticCategory = 'decorations' | 'heroSkins' | 'themes' | 'emblems' | 'buildingSkins';

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  previewColor: number; // placeholder color for preview sprite
  owned: boolean;
}

// ---------------------------------------------------------------------------
// T-2078: Supporter tiers
// ---------------------------------------------------------------------------
export type SupporterTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface SupporterTierInfo {
  tier: SupporterTier;
  name: string;
  priceMonthly: number;
  benefits: string[];
  badgeColor: number;
}

const SUPPORTER_TIERS: SupporterTierInfo[] = [
  {
    tier: 'bronze',
    name: 'Bronze Supporter',
    priceMonthly: 5,
    benefits: ['Chat badge', 'Exclusive emote'],
    badgeColor: 0xcd7f32,
  },
  {
    tier: 'silver',
    name: 'Silver Supporter',
    priceMonthly: 10,
    benefits: ['Chat badge', 'Exclusive emotes', '2 exclusive cosmetics/month'],
    badgeColor: 0xc0c0c0,
  },
  {
    tier: 'gold',
    name: 'Gold Supporter',
    priceMonthly: 20,
    benefits: ['Chat badge', 'All emotes', '5 exclusive cosmetics/month', 'Bonus storage'],
    badgeColor: 0xffd700,
  },
  {
    tier: 'platinum',
    name: 'Platinum Supporter',
    priceMonthly: 50,
    benefits: ['Chat badge', 'All emotes', 'All exclusive cosmetics', 'Bonus storage', 'Early access', 'Exclusive channel'],
    badgeColor: 0xe5e4e2,
  },
];

// ---------------------------------------------------------------------------
// T-2068–T-2072: Sample cosmetic items
// ---------------------------------------------------------------------------

const SAMPLE_ITEMS: CosmeticItem[] = [
  // T-2068: Guild hall decorations
  { id: 'deco_banner_1', name: 'Victory Banner', description: 'A golden banner for your guild hall', category: 'decorations', price: 100, rarity: 'common', previewColor: 0xffd700, owned: false },
  { id: 'deco_fountain', name: 'Crystal Fountain', description: 'A shimmering fountain centerpiece', category: 'decorations', price: 250, rarity: 'uncommon', previewColor: 0x00bfff, owned: false },
  { id: 'deco_statue', name: 'Hero Statue', description: 'A statue honoring your greatest hero', category: 'decorations', price: 500, rarity: 'rare', previewColor: 0xc0c0c0, owned: false },
  { id: 'deco_garden', name: 'Enchanted Garden', description: 'A magical garden with glowing flowers', category: 'decorations', price: 750, rarity: 'epic', previewColor: 0x00ff7f, owned: false },
  { id: 'deco_throne', name: 'Dragon Throne', description: 'A throne carved from dragon bone', category: 'decorations', price: 1000, rarity: 'legendary', previewColor: 0xff4500, owned: false },
  // T-2069: Hero portrait frames
  { id: 'frame_wood', name: 'Wooden Frame', description: 'Simple wooden portrait frame', category: 'heroSkins', price: 50, rarity: 'common', previewColor: 0x8b4513, owned: false },
  { id: 'frame_iron', name: 'Iron Frame', description: 'Sturdy iron portrait frame', category: 'heroSkins', price: 100, rarity: 'common', previewColor: 0x808080, owned: false },
  { id: 'frame_gold', name: 'Gold Frame', description: 'Ornate gold portrait frame', category: 'heroSkins', price: 300, rarity: 'rare', previewColor: 0xffd700, owned: false },
  { id: 'frame_crystal', name: 'Crystal Frame', description: 'Glowing crystal portrait frame', category: 'heroSkins', price: 600, rarity: 'epic', previewColor: 0x00ffff, owned: false },
  { id: 'frame_dragon', name: 'Dragon Frame', description: 'Frame wreathed in dragon fire', category: 'heroSkins', price: 1200, rarity: 'legendary', previewColor: 0xff0000, owned: false },
  // T-2070: UI themes
  { id: 'theme_ocean', name: 'Ocean Theme', description: 'Cool blue ocean-inspired UI', category: 'themes', price: 200, rarity: 'uncommon', previewColor: 0x006994, owned: false },
  { id: 'theme_forest', name: 'Forest Theme', description: 'Lush green forest-inspired UI', category: 'themes', price: 200, rarity: 'uncommon', previewColor: 0x228b22, owned: false },
  { id: 'theme_volcanic', name: 'Volcanic Theme', description: 'Fiery volcanic-inspired UI', category: 'themes', price: 300, rarity: 'rare', previewColor: 0xb22222, owned: false },
  { id: 'theme_celestial', name: 'Celestial Theme', description: 'Starry celestial-inspired UI', category: 'themes', price: 500, rarity: 'epic', previewColor: 0x191970, owned: false },
  { id: 'theme_void', name: 'Void Theme', description: 'Mysterious void-inspired UI', category: 'themes', price: 800, rarity: 'legendary', previewColor: 0x2d0036, owned: false },
  // T-2071: Guild emblems
  { id: 'emblem_sword', name: 'Sword Emblem', description: 'Crossed swords guild emblem', category: 'emblems', price: 150, rarity: 'common', previewColor: 0xc0c0c0, owned: false },
  { id: 'emblem_shield', name: 'Shield Emblem', description: 'Ornate shield guild emblem', category: 'emblems', price: 150, rarity: 'common', previewColor: 0x4682b4, owned: false },
  { id: 'emblem_dragon', name: 'Dragon Emblem', description: 'Fearsome dragon guild emblem', category: 'emblems', price: 400, rarity: 'rare', previewColor: 0xff4500, owned: false },
  { id: 'emblem_phoenix', name: 'Phoenix Emblem', description: 'Rising phoenix guild emblem', category: 'emblems', price: 700, rarity: 'epic', previewColor: 0xff8c00, owned: false },
  { id: 'emblem_crown', name: 'Crown Emblem', description: 'Royal crown guild emblem', category: 'emblems', price: 1000, rarity: 'legendary', previewColor: 0xffd700, owned: false },
  // T-2072: Building skins
  { id: 'bskin_stone', name: 'Stone Masonry', description: 'Classic stone building style', category: 'buildingSkins', price: 200, rarity: 'uncommon', previewColor: 0x808080, owned: false },
  { id: 'bskin_elven', name: 'Elven Architecture', description: 'Elegant elven building style', category: 'buildingSkins', price: 400, rarity: 'rare', previewColor: 0x90ee90, owned: false },
  { id: 'bskin_dwarven', name: 'Dwarven Forge', description: 'Sturdy dwarven building style', category: 'buildingSkins', price: 400, rarity: 'rare', previewColor: 0x8b4513, owned: false },
  { id: 'bskin_crystal', name: 'Crystal Spire', description: 'Magical crystal building style', category: 'buildingSkins', price: 600, rarity: 'epic', previewColor: 0x00ffff, owned: false },
  { id: 'bskin_shadow', name: 'Shadow Keep', description: 'Dark shadow building style', category: 'buildingSkins', price: 900, rarity: 'legendary', previewColor: 0x2f0040, owned: false },
];

const RARITY_COLORS: Record<string, number> = {
  common: 0xaaaaaa,
  uncommon: 0x1eff00,
  rare: 0x0070dd,
  epic: 0xa335ee,
  legendary: 0xff8000,
};

const PANEL_W = 700;
const PANEL_H = 550;

/**
 * Cosmetic shop panel — browse, preview, and "purchase" cosmetic items.
 * No real payment integration — framework only.
 */
export class CosmeticShopPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private i18n: I18nManager;
  private analytics: AnalyticsService;
  private visible = false;

  private items: CosmeticItem[] = [...SAMPLE_ITEMS];
  private activeCategory: CosmeticCategory = 'decorations';
  private premiumBalance = 5000; // T-2074: Starting gems for demo

  private itemContainer: Phaser.GameObjects.Container | null = null;
  private balanceText: Phaser.GameObjects.Text | null = null;
  private previewContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.i18n = I18nManager.getInstance();
    this.analytics = AnalyticsService.getInstance();

    this.container = scene.add.container(
      (GAME_WIDTH - PANEL_W) / 2,
      (GAME_HEIGHT - PANEL_H) / 2,
    );
    this.container.setDepth(1100);
    this.container.setVisible(false);

    this.buildPanel();
  }

  private buildPanel(): void {
    // Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(-(GAME_WIDTH - PANEL_W) / 2, -(GAME_HEIGHT - PANEL_H) / 2, GAME_WIDTH, GAME_HEIGHT);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(-(GAME_WIDTH - PANEL_W) / 2, -(GAME_HEIGHT - PANEL_H) / 2, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    backdrop.on('pointerup', () => this.hide());
    this.container.add(backdrop);

    // Panel BG
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, 12);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(PANEL_W / 2, 16, this.i18n.t('shop.cosmetics'), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // T-2076: Premium currency balance
    this.balanceText = this.scene.add.text(PANEL_W - 20, 20, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    }).setOrigin(1, 0);
    this.container.add(this.balanceText);
    this.updateBalance();

    // Close button
    const close = this.scene.add.text(PANEL_W - 16, 4, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());
    this.container.add(close);

    // Category tabs
    const categories: CosmeticCategory[] = ['decorations', 'heroSkins', 'themes', 'emblems', 'buildingSkins'];
    const catLabels = categories.map((c) => this.i18n.t(`shop.${c}`));
    let tabX = 20;
    categories.forEach((cat, i) => {
      const tab = this.scene.add.text(tabX, 52, catLabels[i], {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: cat === this.activeCategory ? COLORS.textGold : COLORS.textSecondary,
      }).setInteractive({ useHandCursor: true });
      tab.on('pointerup', () => {
        this.activeCategory = cat;
        this.renderItems();
        this.analytics.trackShopView(cat);
      });
      this.container.add(tab);
      tabX += tab.width + 16;
    });

    // Item grid container
    this.itemContainer = this.scene.add.container(0, 80);
    this.container.add(this.itemContainer);

    // Preview container
    this.previewContainer = this.scene.add.container(0, 0);
    this.previewContainer.setVisible(false);
    this.container.add(this.previewContainer);

    this.renderItems();
  }

  private renderItems(): void {
    if (!this.itemContainer) return;
    this.itemContainer.removeAll(true);

    const filtered = this.items.filter((item) => item.category === this.activeCategory);
    const COLS = 4;
    const CARD_W = 155;
    const CARD_H = 140;
    const GAP = 10;
    const START_X = 20;

    filtered.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = START_X + col * (CARD_W + GAP);
      const y = row * (CARD_H + GAP);

      // Card BG
      const card = this.scene.add.graphics();
      const rarityColor = RARITY_COLORS[item.rarity] ?? 0xaaaaaa;
      card.fillStyle(0x0a0a1e, 0.9);
      card.fillRoundedRect(x, y, CARD_W, CARD_H, 8);
      card.lineStyle(2, rarityColor);
      card.strokeRoundedRect(x, y, CARD_W, CARD_H, 8);

      // Preview color swatch
      const swatch = this.scene.add.graphics();
      swatch.fillStyle(item.previewColor);
      swatch.fillRoundedRect(x + 10, y + 10, CARD_W - 20, 50, 4);

      // Name
      const name = this.scene.add.text(x + CARD_W / 2, y + 70, item.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      // Price or owned
      const priceText = item.owned
        ? this.i18n.t('shop.owned')
        : `${item.price} ${this.i18n.t('shop.premiumCurrency')}`;
      const price = this.scene.add.text(x + CARD_W / 2, y + 90, priceText, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: item.owned ? '#4ecca3' : COLORS.textGold,
      }).setOrigin(0.5, 0);

      // Buy / Preview button
      if (!item.owned) {
        const btn = this.scene.add.text(x + CARD_W / 2, y + 112, this.i18n.t('shop.purchase'), {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#ffffff',
          backgroundColor: '#e94560',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

        btn.on('pointerup', () => this.purchaseItem(item));
        this.itemContainer!.add(btn);
      }

      // Click card for preview
      const hitZone = this.scene.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      hitZone.on('pointerup', () => {
        this.analytics.trackItemPreview(item.id, item.category);
      });

      this.itemContainer!.add([card, swatch, name, price, hitZone]);
    });
  }

  // T-2077: Purchase flow
  private purchaseItem(item: CosmeticItem): void {
    if (item.owned) return;
    if (this.premiumBalance < item.price) return;

    this.premiumBalance -= item.price;
    item.owned = true;
    this.updateBalance();
    this.renderItems();

    this.analytics.trackPurchase(item.id, item.price, 'gems');
  }

  private updateBalance(): void {
    if (this.balanceText) {
      this.balanceText.setText(this.i18n.t('shop.balance', { amount: this.premiumBalance }));
    }
  }

  // T-2090: Gift sending (framework)
  sendGift(itemId: string, recipientId: string): boolean {
    const item = this.items.find((i) => i.id === itemId && i.owned);
    if (!item) return false;

    this.analytics.trackGiftSent(itemId, recipientId);
    return true;
  }

  // T-2089: Purchase history
  getPurchaseHistory(): CosmeticItem[] {
    return this.items.filter((i) => i.owned);
  }

  // T-2078–T-2084: Supporter tier info
  getSupporterTiers(): SupporterTierInfo[] {
    return SUPPORTER_TIERS;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.container.setVisible(true);
    this.renderItems();
    this.analytics.trackShopView(this.activeCategory);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.container.destroy();
  }
}
