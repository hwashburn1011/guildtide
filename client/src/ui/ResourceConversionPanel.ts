import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ResourceType } from '@shared/enums';
import type { ConversionRecipe } from '@shared/constants';

const RESOURCE_COLORS: Record<string, string> = {
  gold: '#ffd700',
  wood: '#8b6914',
  stone: '#a0a0a0',
  herbs: '#4ecca3',
  ore: '#c87533',
  water: '#4dabf7',
  food: '#f59f00',
  essence: '#be4bdb',
};

interface RecipeDisplay {
  id: string;
  name: string;
  description: string;
  inputs: Partial<Record<ResourceType, number>>;
  outputs: Partial<Record<ResourceType, number>>;
  requiredBuildingLevel: number;
  available: boolean;
  meetsLevel: boolean;
  canAfford: boolean;
  maxQuantity: number;
}

export class ResourceConversionPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;
  private recipes: RecipeDisplay[] = [];
  private selectedQuantities: Map<string, number> = new Map();
  private onConvert: ((recipeId: string, quantity: number) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 300, 60);
    this.container.setDepth(1001);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 600, 550, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 600, 550, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 15, 'Resource Conversion', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Subtitle
    const subtitle = scene.add.text(20, 42, 'Requires Workshop building', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(subtitle);

    // Close
    const closeBtn = scene.add.text(570, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  setOnConvert(callback: (recipeId: string, quantity: number) => void): void {
    this.onConvert = callback;
  }

  setRecipes(recipes: RecipeDisplay[]): void {
    this.recipes = recipes;
    for (const r of recipes) {
      if (!this.selectedQuantities.has(r.id)) {
        this.selectedQuantities.set(r.id, 1);
      }
    }
    this.render();
  }

  private render(): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 65;

    for (const recipe of this.recipes) {
      const cardBg = this.scene.add.graphics();
      const alpha = recipe.available ? 0.8 : 0.4;
      cardBg.fillStyle(recipe.available ? 0x1a2a4e : 0x111833, alpha);
      cardBg.fillRoundedRect(15, y, 570, 72, 8);
      if (recipe.available) {
        cardBg.lineStyle(1, 0x4ecca3, 0.4);
      } else {
        cardBg.lineStyle(1, 0x333355, 0.4);
      }
      cardBg.strokeRoundedRect(15, y, 570, 72, 8);
      this.container.add(cardBg);
      this.contentElements.push(cardBg);

      // Name
      const nameText = this.scene.add.text(25, y + 5, recipe.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: recipe.available ? '#ffffff' : '#666688',
        fontStyle: 'bold',
      });
      this.container.add(nameText);
      this.contentElements.push(nameText);

      // Lv. requirement
      const lvText = this.scene.add.text(200, y + 5, `Lv.${recipe.requiredBuildingLevel}`, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: recipe.meetsLevel ? '#4ecca3' : '#ff6b6b',
      });
      this.container.add(lvText);
      this.contentElements.push(lvText);

      // Input costs
      let ix = 25;
      for (const [res, cost] of Object.entries(recipe.inputs)) {
        const qty = this.selectedQuantities.get(recipe.id) || 1;
        const totalCost = (cost ?? 0) * qty;
        const costStr = `${res}: ${totalCost}`;
        const costText = this.scene.add.text(ix, y + 24, costStr, {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: RESOURCE_COLORS[res] || '#aaaaaa',
        });
        this.container.add(costText);
        this.contentElements.push(costText);
        ix += costStr.length * 7 + 10;
      }

      // Arrow
      const arrow = this.scene.add.text(ix, y + 22, '->', {
        fontFamily: FONTS.primary,
        fontSize: '13px',
        color: '#ffd700',
        fontStyle: 'bold',
      });
      this.container.add(arrow);
      this.contentElements.push(arrow);
      ix += 30;

      // Outputs
      for (const [res, amt] of Object.entries(recipe.outputs)) {
        const qty = this.selectedQuantities.get(recipe.id) || 1;
        const totalAmt = (amt ?? 0) * qty;
        const outStr = `${res}: +${totalAmt}`;
        const outText = this.scene.add.text(ix, y + 24, outStr, {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: RESOURCE_COLORS[res] || '#aaaaaa',
        });
        this.container.add(outText);
        this.contentElements.push(outText);
        ix += outStr.length * 7 + 10;
      }

      // Quantity selector
      const qty = this.selectedQuantities.get(recipe.id) || 1;

      const minusBtn = this.scene.add.text(380, y + 48, ' - ', {
        fontFamily: FONTS.primary,
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#333355',
      });
      minusBtn.setInteractive({ useHandCursor: true });
      minusBtn.on('pointerdown', () => {
        const cur = this.selectedQuantities.get(recipe.id) || 1;
        this.selectedQuantities.set(recipe.id, Math.max(1, cur - 1));
        this.render();
      });
      this.container.add(minusBtn);
      this.contentElements.push(minusBtn);

      const qtyText = this.scene.add.text(410, y + 48, `x${qty}`, {
        fontFamily: FONTS.primary,
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      this.container.add(qtyText);
      this.contentElements.push(qtyText);

      const plusBtn = this.scene.add.text(445, y + 48, ' + ', {
        fontFamily: FONTS.primary,
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#333355',
      });
      plusBtn.setInteractive({ useHandCursor: true });
      plusBtn.on('pointerdown', () => {
        const cur = this.selectedQuantities.get(recipe.id) || 1;
        this.selectedQuantities.set(recipe.id, Math.min(recipe.maxQuantity, cur + 1));
        this.render();
      });
      this.container.add(plusBtn);
      this.contentElements.push(plusBtn);

      // Max button
      const maxBtn = this.scene.add.text(475, y + 48, 'Max', {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#ffd700',
      });
      maxBtn.setInteractive({ useHandCursor: true });
      maxBtn.on('pointerdown', () => {
        this.selectedQuantities.set(recipe.id, recipe.maxQuantity);
        this.render();
      });
      this.container.add(maxBtn);
      this.contentElements.push(maxBtn);

      // Convert button
      const convertBtn = this.scene.add.text(520, y + 45, 'Convert', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: recipe.available ? '#1a1a2e' : '#555555',
        backgroundColor: recipe.available ? '#4ecca3' : '#333344',
        fontStyle: 'bold',
        padding: { x: 8, y: 4 },
      });
      if (recipe.available) {
        convertBtn.setInteractive({ useHandCursor: true });
        convertBtn.on('pointerdown', () => {
          if (this.onConvert) {
            this.onConvert(recipe.id, this.selectedQuantities.get(recipe.id) || 1);
          }
        });
      }
      this.container.add(convertBtn);
      this.contentElements.push(convertBtn);

      y += 80;
    }
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
