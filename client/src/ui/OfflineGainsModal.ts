import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ResourceType } from '@shared/enums';

const RESOURCE_LABELS: Record<string, string> = {
  gold: 'Gold',
  wood: 'Wood',
  stone: 'Stone',
  herbs: 'Herbs',
  ore: 'Ore',
  water: 'Water',
  food: 'Food',
  essence: 'Essence',
};

export class OfflineGainsModal {
  static show(scene: Phaser.Scene, gains: Partial<Record<ResourceType, number>>, elapsedMinutes: number): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const DEPTH = 200;

    // Overlay — blocks clicks on everything behind
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setDepth(DEPTH);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);

    // Panel
    const panelW = 400;
    const panelH = 320;
    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.panelBg, 0.98);
    panel.fillRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, COLORS.accent);
    panel.strokeRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 12);
    panel.setDepth(DEPTH + 1);

    const allElements: Phaser.GameObjects.GameObject[] = [overlay, panel];

    // Title
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = Math.floor(elapsedMinutes % 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    allElements.push(
      scene.add.text(centerX, centerY - panelH / 2 + 25, 'While You Were Away...', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH + 2)
    );

    allElements.push(
      scene.add.text(centerX, centerY - panelH / 2 + 55, `Gone for ${timeStr}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }).setOrigin(0.5).setDepth(DEPTH + 2)
    );

    // Resource gains list
    let yOffset = centerY - panelH / 2 + 85;
    const entries = Object.entries(gains).filter(([, v]) => v && v > 0);

    if (entries.length === 0) {
      allElements.push(
        scene.add.text(centerX, yOffset + 40, 'No resources generated yet.\nBuild some buildings!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
          align: 'center',
        }).setOrigin(0.5).setDepth(DEPTH + 2)
      );
    } else {
      for (const [resource, amount] of entries) {
        const label = RESOURCE_LABELS[resource] || resource;
        allElements.push(
          scene.add.text(centerX - 80, yOffset, label, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: COLORS.textSecondary,
          }).setDepth(DEPTH + 2)
        );
        allElements.push(
          scene.add.text(centerX + 80, yOffset, `+${Math.floor(amount!)}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: '#4ecca3',
            fontStyle: 'bold',
          }).setOrigin(1, 0).setDepth(DEPTH + 2)
        );
        yOffset += 28;
      }
    }

    // Collect button
    const collectBtn = scene.add.text(centerX, centerY + panelH / 2 - 35, 'Collect', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#e94560',
      padding: { x: 40, y: 10 },
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(DEPTH + 2);
    allElements.push(collectBtn);

    collectBtn.on('pointerup', () => {
      for (const el of allElements) {
        el.destroy();
      }
    });
  }
}
