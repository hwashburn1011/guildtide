/**
 * NPC Merchant interaction UI panel.
 *
 * T-0567: NPC merchant dialog UI with greeting and trade interface
 * T-0568: NPC merchant reputation display
 * T-0569: Traveling merchant indicator
 * T-0570: Traveling merchant notification
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';

interface MerchantData {
  id: string;
  name: string;
  type: string;
  greeting: string;
  description: string;
  inventory: Array<{
    resource: string;
    quantity: number;
    pricePerUnit: number;
    priceMultiplier: number;
  }>;
  reputation: number;
}

export class NpcMerchantPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  async show(): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Merchants',
      width: 600,
      height: 520,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const merchants: MerchantData[] = await apiClient.getMarketMerchants();
      this.renderMerchantList(content, merchants);
    } catch {
      content.add(
        this.scene.add.text(250, 60, 'Failed to load merchants', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderMerchantList(container: Phaser.GameObjects.Container, merchants: MerchantData[]): void {
    let y = 0;

    if (merchants.length === 0) {
      container.add(
        this.scene.add.text(250, 60, 'No merchants available right now', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );
      return;
    }

    for (const merchant of merchants) {
      this.renderMerchantCard(container, merchant, y);
      y += 30 + merchant.inventory.length * 28 + 15;
    }
  }

  private renderMerchantCard(
    container: Phaser.GameObjects.Container,
    merchant: MerchantData,
    startY: number,
  ): void {
    let y = startY;

    // Merchant name with type badge
    const typeColor = merchant.type === 'traveling' ? COLORS.textAccent : COLORS.textGold;
    const typeBadge = merchant.type === 'traveling' ? ' [VISITING]' : '';

    container.add(
      this.scene.add.text(0, y, `${merchant.name}${typeBadge}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: typeColor,
        fontStyle: 'bold',
      }),
    );
    y += 20;

    // Greeting
    container.add(
      this.scene.add.text(0, y, `"${merchant.greeting}"`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        wordWrap: { width: 550 },
      }),
    );
    y += 22;

    // Reputation
    container.add(
      this.scene.add.text(0, y, `Rep: ${merchant.reputation} | ${merchant.description}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 18;

    // Inventory table header
    const cols = [0, 130, 230, 350, 450];
    const headers = ['Resource', 'Stock', 'Price/ea', 'Modifier', ''];
    headers.forEach((h, i) => {
      container.add(
        this.scene.add.text(cols[i], y, h, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          fontStyle: 'bold',
        }),
      );
    });
    y += 16;

    // Inventory rows
    for (const item of merchant.inventory) {
      const modColor = item.priceMultiplier < 1 ? '#4ecca3' : item.priceMultiplier > 1 ? '#ff4444' : COLORS.textSecondary;
      const modLabel = item.priceMultiplier < 1
        ? `-${Math.round((1 - item.priceMultiplier) * 100)}%`
        : item.priceMultiplier > 1
          ? `+${Math.round((item.priceMultiplier - 1) * 100)}%`
          : '--';

      container.add(
        this.scene.add.text(cols[0], y, item.resource, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );

      container.add(
        this.scene.add.text(cols[1], y, `${item.quantity}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );

      container.add(
        this.scene.add.text(cols[2], y, `${item.pricePerUnit}g`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
        }),
      );

      container.add(
        this.scene.add.text(cols[3], y, modLabel, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: modColor,
          fontStyle: 'bold',
        }),
      );

      // Buy button
      const buyBtn = new UIButton(this.scene, {
        x: cols[4] + 30,
        y: y + 8,
        width: 55,
        height: 22,
        text: 'Buy 10',
        style: 'primary',
        onClick: () => this.buyFromMerchant(merchant.id, item.resource, 10),
      });
      container.add(buyBtn.getContainer());

      y += 28;
    }
  }

  private async buyFromMerchant(merchantId: string, resource: string, quantity: number): Promise<void> {
    try {
      await apiClient.buyFromMerchant(merchantId, resource, quantity);
      NotificationSystem.getInstance(this.scene).showSuccess(`Bought ${quantity} ${resource}`);
      this.onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      NotificationSystem.getInstance(this.scene).showError(msg);
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
