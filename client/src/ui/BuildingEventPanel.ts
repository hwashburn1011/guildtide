/**
 * Building event display panel showing active events on buildings.
 *
 * T-0358: Building special event trigger (Tavern brawl, etc.)
 * T-0368: Building event modifier (festival boosts)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import type { Building } from '@shared/types';

interface ActiveBuildingEvent {
  id: string;
  name: string;
  boost: number;
  penalty: number;
  expiresAt: string;
}

export class BuildingEventPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(buildings: Building[]): void {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Building Events',
      width: 500,
      height: 400,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.renderEvents(content, buildings);
    this.modal.open();
  }

  private renderEvents(
    container: Phaser.GameObjects.Container,
    buildings: Building[],
  ): void {
    let y = 0;

    container.add(
      this.scene.add.text(200, y, 'Active building events and modifiers', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }).setOrigin(0.5),
    );
    y += 25;

    let hasEvents = false;

    for (const building of buildings) {
      if (building.level < 1) continue;
      const meta = building.metadata as Record<string, unknown> | null;
      if (!meta?.activeEvent) continue;

      hasEvents = true;
      const event = meta.activeEvent as ActiveBuildingEvent;
      const expiresAt = new Date(event.expiresAt);
      const remaining = Math.max(0, expiresAt.getTime() - Date.now());
      const minutesLeft = Math.ceil(remaining / 60000);

      // Event card
      const cardH = 60;
      const isPositive = event.boost > 0;
      const borderColor = isPositive ? COLORS.success : COLORS.danger;

      const bg = this.scene.add.rectangle(200, y + cardH / 2, 420, cardH, COLORS.panelBg, 0.7);
      bg.setStrokeStyle(2, borderColor);
      container.add(bg);

      // Building name + event name
      const bldgName = building.type.replace(/_/g, ' ');
      container.add(
        this.scene.add.text(15, y + 8, `${bldgName}: ${event.name}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isPositive ? '#4ecca3' : '#e94560',
          fontStyle: 'bold',
        }),
      );

      // Effect description
      let effectText = '';
      if (event.boost > 0) effectText = `Production +${Math.round(event.boost * 100)}%`;
      if (event.penalty > 0) effectText = `Production -${Math.round(event.penalty * 100)}%`;

      container.add(
        this.scene.add.text(15, y + 28, effectText, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      // Time remaining
      container.add(
        this.scene.add.text(390, y + 18, remaining > 0 ? `${minutesLeft}m left` : 'Expired', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: remaining > 0 ? COLORS.textSecondary : '#666666',
        }).setOrigin(1, 0.5),
      );

      y += cardH + 8;
    }

    if (!hasEvents) {
      container.add(
        this.scene.add.text(200, y + 40, 'No active building events.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );

      container.add(
        this.scene.add.text(200, y + 65, 'Events trigger randomly based on building type and time of day.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 400 },
        }).setOrigin(0.5),
      );
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
