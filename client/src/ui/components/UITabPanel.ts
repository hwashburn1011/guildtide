import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface TabDefinition {
  key: string;
  label: string;
}

export interface UITabPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  tabs: TabDefinition[];
  onTabChange?: (key: string) => void;
}

/**
 * Row of tab buttons with content switching.
 * Active tab is highlighted. Each tab key maps to a content container.
 */
export class UITabPanel extends Phaser.GameObjects.Container {
  private tabButtons: Map<string, { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }> = new Map();
  private contentContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private activeKey: string;
  private tabWidth: number;
  private panelWidth: number;
  private panelHeight: number;
  private onTabChange?: (key: string) => void;

  private static readonly TAB_HEIGHT = 36;

  constructor(scene: Phaser.Scene, config: UITabPanelConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.panelWidth = config.width;
    this.panelHeight = config.height;
    this.onTabChange = config.onTabChange;
    this.tabWidth = this.panelWidth / config.tabs.length;
    this.activeKey = config.tabs[0]?.key ?? '';

    // Panel background
    const panelBg = scene.add.graphics();
    panelBg.fillStyle(COLORS.panelBg, 0.9);
    panelBg.fillRoundedRect(0, UITabPanel.TAB_HEIGHT, this.panelWidth, this.panelHeight - UITabPanel.TAB_HEIGHT, { tl: 0, tr: 0, bl: 8, br: 8 });
    panelBg.lineStyle(1, COLORS.panelBorder, 0.6);
    panelBg.strokeRoundedRect(0, UITabPanel.TAB_HEIGHT, this.panelWidth, this.panelHeight - UITabPanel.TAB_HEIGHT, { tl: 0, tr: 0, bl: 8, br: 8 });
    this.add(panelBg);

    // Create tabs
    config.tabs.forEach((tab, i) => {
      const tx = i * this.tabWidth;

      const bg = scene.add.graphics();
      this.add(bg);

      const text = scene.add.text(tx + this.tabWidth / 2, UITabPanel.TAB_HEIGHT / 2, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      });
      text.setOrigin(0.5);
      this.add(text);

      const zone = scene.add.zone(tx + this.tabWidth / 2, UITabPanel.TAB_HEIGHT / 2, this.tabWidth, UITabPanel.TAB_HEIGHT);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.setActiveTab(tab.key));
      this.add(zone);

      this.tabButtons.set(tab.key, { bg, text });

      // Content container per tab
      const content = scene.add.container(10, UITabPanel.TAB_HEIGHT + 10);
      content.setVisible(tab.key === this.activeKey);
      this.add(content);
      this.contentContainers.set(tab.key, content);
    });

    this.renderTabs();
  }

  private renderTabs(): void {
    let i = 0;
    for (const [key, { bg, text }] of this.tabButtons) {
      const tx = i * this.tabWidth;
      const isActive = key === this.activeKey;

      bg.clear();
      bg.fillStyle(isActive ? COLORS.panelBorder : COLORS.background, isActive ? 1 : 0.6);
      bg.fillRoundedRect(tx, 0, this.tabWidth, UITabPanel.TAB_HEIGHT, { tl: 8, tr: 8, bl: 0, br: 0 });

      text.setColor(isActive ? COLORS.textAccent : COLORS.textSecondary);
      text.setFontStyle(isActive ? 'bold' : 'normal');

      i++;
    }
  }

  setActiveTab(key: string): void {
    if (key === this.activeKey) return;
    this.activeKey = key;

    for (const [k, container] of this.contentContainers) {
      container.setVisible(k === key);
    }
    this.renderTabs();
    this.onTabChange?.(key);
  }

  getActiveTab(): string {
    return this.activeKey;
  }

  getContentContainer(key: string): Phaser.GameObjects.Container | undefined {
    return this.contentContainers.get(key);
  }
}
