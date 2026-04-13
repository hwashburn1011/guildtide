/**
 * RegionComparisonPanel — Compare weather, resources, and difficulty between regions.
 *
 * T-1107: Region comparison panel for expedition planning
 * T-1136: Weather forecast overlay per region
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

interface ComparisonEntry {
  id: string;
  name: string;
  biome: string;
  climate: string;
  difficulty: number;
  dangerLevel: number;
  resourceTypes: string[];
  weather: {
    condition: string;
    temp: number;
    humidity: number;
  } | null;
}

export class RegionComparisonPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(110);
    this.container.setVisible(false);
  }

  show(entries: ComparisonEntry[]): void {
    this.container.removeAll(true);
    this.visible = true;
    this.container.setVisible(true);

    const panelW = Math.min(GAME_WIDTH - 40, entries.length * 200 + 40);
    const panelH = 400;
    const startX = (GAME_WIDTH - panelW) / 2;
    const startY = (GAME_HEIGHT - panelH) / 2;

    // Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.5);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const backdropZone = this.scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setInteractive();
    backdropZone.on('pointerup', () => this.hide());
    this.container.add([backdrop, backdropZone]);

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(startX, startY, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(startX, startY, panelW, panelH, 12);
    this.container.add(bg);

    // Title
    this.container.add(this.scene.add.text(GAME_WIDTH / 2, startY + 16, 'Region Comparison', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0));

    // Close button
    const close = this.scene.add.text(startX + panelW - 20, startY + 10, '\u{2715}', {
      fontSize: '16px',
      color: COLORS.textSecondary,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());
    this.container.add(close);

    // Column headers / comparison rows
    const colW = (panelW - 40) / entries.length;
    const labels = ['Region', 'Biome', 'Climate', 'Difficulty', 'Danger', 'Resources', 'Weather', 'Temp', 'Humidity'];
    const rowH = 28;

    // Label column
    let y = startY + 55;
    for (const label of labels) {
      this.container.add(this.scene.add.text(startX + 12, y, label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        fontStyle: 'bold',
      }));
      y += rowH;
    }

    // Data columns
    entries.forEach((entry, i) => {
      const cx = startX + 100 + i * colW;
      let y = startY + 55;

      const values = [
        entry.name,
        entry.biome,
        entry.climate,
        `${entry.difficulty}/10`,
        `${entry.dangerLevel}/10`,
        entry.resourceTypes.join(', '),
        entry.weather?.condition || 'N/A',
        entry.weather ? `${Math.round(entry.weather.temp)}\u00B0C` : 'N/A',
        entry.weather ? `${entry.weather.humidity}%` : 'N/A',
      ];

      const diffColors = [
        COLORS.textGold,
        '#a0c4ff',
        COLORS.textSecondary,
        entry.difficulty <= 3 ? '#4ecca3' : entry.difficulty <= 6 ? '#f5a623' : '#e94560',
        entry.dangerLevel <= 3 ? '#4ecca3' : entry.dangerLevel <= 6 ? '#f5a623' : '#e94560',
        '#a0c4ff',
        COLORS.textSecondary,
        COLORS.textSecondary,
        COLORS.textSecondary,
      ];

      for (let j = 0; j < values.length; j++) {
        this.container.add(this.scene.add.text(cx, y, values[j], {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: diffColors[j],
          wordWrap: { width: colW - 10 },
        }));
        y += rowH;
      }
    });
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.container.destroy();
  }
}
