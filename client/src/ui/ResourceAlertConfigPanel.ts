import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType } from '@shared/enums';
import type { ResourceAlert } from '@shared/types';

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Gold]: '#ffd700',
  [ResourceType.Wood]: '#8b6914',
  [ResourceType.Stone]: '#a0a0a0',
  [ResourceType.Herbs]: '#4ecca3',
  [ResourceType.Ore]: '#c87533',
  [ResourceType.Water]: '#4dabf7',
  [ResourceType.Food]: '#f59f00',
  [ResourceType.Essence]: '#be4bdb',
};

export class ResourceAlertConfigPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;
  private alerts: ResourceAlert[] = [];
  private onSave: ((alerts: ResourceAlert[]) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 220, 100);
    this.container.setDepth(1002);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 440, 420, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 440, 420, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Resource Alerts', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    const subtitle = scene.add.text(20, 38, 'Get notified when resources cross thresholds', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(subtitle);

    // Close
    const closeBtn = scene.add.text(410, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Initialize default alerts for each resource
    this.alerts = Object.values(ResourceType).map(res => ({
      resource: res,
      threshold: 100,
      direction: 'below' as const,
      enabled: false,
    }));
  }

  setOnSave(callback: (alerts: ResourceAlert[]) => void): void {
    this.onSave = callback;
  }

  setAlerts(alerts: ResourceAlert[]): void {
    this.alerts = alerts;
    this.render();
  }

  private render(): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 60;

    // Header row
    const headerLabels = ['Resource', 'Threshold', 'Direction', 'Enabled'];
    const headerXs = [20, 130, 250, 360];
    headerLabels.forEach((label, i) => {
      const t = this.scene.add.text(headerXs[i], y, label, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#8888aa',
        fontStyle: 'bold',
      });
      this.container.add(t);
      this.contentElements.push(t);
    });
    y += 20;

    for (const alert of this.alerts) {
      const color = RESOURCE_COLORS[alert.resource];

      // Resource name
      const nameText = this.scene.add.text(20, y, alert.resource, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color,
      });
      this.container.add(nameText);
      this.contentElements.push(nameText);

      // Threshold display with +/- controls
      const minusBtn = this.scene.add.text(130, y, '-', {
        fontFamily: FONTS.primary,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#333355',
        padding: { x: 4, y: 1 },
      });
      minusBtn.setInteractive({ useHandCursor: true });
      minusBtn.on('pointerdown', () => {
        alert.threshold = Math.max(0, alert.threshold - 50);
        this.render();
      });
      this.container.add(minusBtn);
      this.contentElements.push(minusBtn);

      const threshText = this.scene.add.text(155, y, alert.threshold.toString(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ffffff',
      });
      this.container.add(threshText);
      this.contentElements.push(threshText);

      const plusBtn = this.scene.add.text(210, y, '+', {
        fontFamily: FONTS.primary,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#333355',
        padding: { x: 4, y: 1 },
      });
      plusBtn.setInteractive({ useHandCursor: true });
      plusBtn.on('pointerdown', () => {
        alert.threshold += 50;
        this.render();
      });
      this.container.add(plusBtn);
      this.contentElements.push(plusBtn);

      // Direction toggle
      const dirBtn = this.scene.add.text(250, y, alert.direction === 'below' ? 'Below' : 'Above', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: alert.direction === 'below' ? '#ff8c00' : '#4ecca3',
      });
      dirBtn.setInteractive({ useHandCursor: true });
      dirBtn.on('pointerdown', () => {
        alert.direction = alert.direction === 'below' ? 'above' : 'below';
        this.render();
      });
      this.container.add(dirBtn);
      this.contentElements.push(dirBtn);

      // Enabled toggle
      const enabledBtn = this.scene.add.text(360, y, alert.enabled ? 'ON' : 'OFF', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: alert.enabled ? '#4ecca3' : '#ff6b6b',
        fontStyle: 'bold',
      });
      enabledBtn.setInteractive({ useHandCursor: true });
      enabledBtn.on('pointerdown', () => {
        alert.enabled = !alert.enabled;
        this.render();
      });
      this.container.add(enabledBtn);
      this.contentElements.push(enabledBtn);

      y += 32;
    }

    // Save button
    y += 15;
    const saveBtn = this.scene.add.text(170, y, 'Save Alerts', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#1a1a2e',
      backgroundColor: '#4ecca3',
      fontStyle: 'bold',
      padding: { x: 16, y: 8 },
    });
    saveBtn.setInteractive({ useHandCursor: true });
    saveBtn.on('pointerdown', () => {
      if (this.onSave) {
        this.onSave(this.alerts);
      }
      this.hide();
    });
    this.container.add(saveBtn);
    this.contentElements.push(saveBtn);
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  getAlerts(): ResourceAlert[] {
    return [...this.alerts];
  }
}
