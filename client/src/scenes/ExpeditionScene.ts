import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Expedition, Hero } from '@shared/types';

interface Destination {
  id: string;
  name: string;
  description: string;
  type: string;
  difficulty: number;
  durationMinutes: number;
  lootTable: { resource: string; min: number; max: number; chance: number }[];
  requiredPartySize: number;
}

type TabMode = 'destinations' | 'active';

export class ExpeditionScene extends Phaser.Scene {
  private destinations: Destination[] = [];
  private expeditions: Expedition[] = [];
  private heroes: Hero[] = [];
  private selectedHeroIds: Set<string> = new Set();
  private selectedDestination: Destination | null = null;
  private tabMode: TabMode = 'destinations';
  private contentContainer: Phaser.GameObjects.Container | null = null;
  private refreshTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'ExpeditionScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.selectedHeroIds.clear();
    this.selectedDestination = null;
    this.tabMode = 'destinations';

    // Header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 55);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 55);

    this.add.text(20, 15, 'Expeditions', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    const backBtn = this.add.text(GAME_WIDTH - 20, 15, 'Back to Guild', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    backBtn.on('pointerup', () => {
      if (this.refreshTimer) this.refreshTimer.destroy();
      this.scene.start('GuildHallScene');
    });

    // Tab buttons
    this.buildTabs();

    // Bottom nav
    this.buildBottomNav();

    // Content container
    this.contentContainer = this.add.container(0, 0);

    // Load data
    await this.loadData();
    this.renderContent();

    // Periodic refresh for countdown timers
    this.refreshTimer = this.time.addEvent({
      delay: 5000,
      callback: () => this.renderContent(),
      loop: true,
    });
  }

  private buildTabs(): void {
    const tabY = 60;
    const tabBg = this.add.graphics();
    tabBg.fillStyle(COLORS.panelBg, 0.7);
    tabBg.fillRect(0, tabY, GAME_WIDTH, 35);

    const destTab = this.add.text(GAME_WIDTH / 4, tabY + 17, 'Available Destinations', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: this.tabMode === 'destinations' ? COLORS.textGold : COLORS.textSecondary,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const activeTab = this.add.text((GAME_WIDTH / 4) * 3, tabY + 17, 'Active & Completed', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: this.tabMode === 'active' ? COLORS.textGold : COLORS.textSecondary,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    destTab.on('pointerup', () => {
      this.tabMode = 'destinations';
      destTab.setColor(COLORS.textGold);
      activeTab.setColor(COLORS.textSecondary);
      this.renderContent();
    });

    activeTab.on('pointerup', () => {
      this.tabMode = 'active';
      activeTab.setColor(COLORS.textGold);
      destTab.setColor(COLORS.textSecondary);
      this.renderContent();
    });
  }

  private async loadData(): Promise<void> {
    try {
      const [destinations, expeditions, heroes] = await Promise.all([
        apiClient.getDestinations(),
        apiClient.getExpeditions(),
        apiClient.getHeroes(),
      ]);
      this.destinations = destinations;
      this.expeditions = expeditions;
      this.heroes = heroes;
    } catch (err) {
      console.error('Failed to load expedition data:', err);
    }
  }

  private renderContent(): void {
    if (!this.contentContainer) return;
    this.contentContainer.removeAll(true);

    if (this.tabMode === 'destinations') {
      this.renderDestinations();
    } else {
      this.renderActiveExpeditions();
    }
  }

  private renderDestinations(): void {
    if (!this.contentContainer) return;

    const startY = 100;
    const cardWidth = 380;
    const cardHeight = 140;
    const padding = 10;

    // Left side: destination list
    const leftTitle = this.add.text(15, startY + 5, 'Choose a Destination:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.contentContainer.add(leftTitle);

    this.destinations.forEach((dest, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 15 + col * (cardWidth + padding);
      const y = startY + 30 + row * (cardHeight + padding);

      if (y + cardHeight > GAME_HEIGHT - 100) return; // skip if overflows

      const isSelected = this.selectedDestination?.id === dest.id;

      const g = this.add.graphics();
      g.fillStyle(isSelected ? 0x0f3460 : COLORS.panelBg, 0.9);
      g.fillRoundedRect(x, y, cardWidth, cardHeight, 6);
      g.lineStyle(2, isSelected ? COLORS.gold : COLORS.panelBorder);
      g.strokeRoundedRect(x, y, cardWidth, cardHeight, 6);
      this.contentContainer!.add(g);

      // Name & type
      const nameText = this.add.text(x + 10, y + 8, dest.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      });
      this.contentContainer!.add(nameText);

      const typeLabel = this.add.text(x + cardWidth - 10, y + 8,
        dest.type.replace('_', ' ').toUpperCase(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textAccent,
      }).setOrigin(1, 0);
      this.contentContainer!.add(typeLabel);

      // Description
      const descText = this.add.text(x + 10, y + 28, dest.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: cardWidth - 20 },
      });
      this.contentContainer!.add(descText);

      // Stats row
      const statsY = y + 70;
      const diffColor = dest.difficulty <= 3 ? '#4ecca3' : dest.difficulty <= 6 ? '#f5a623' : '#e94560';
      const statsStr = `Diff: ${dest.difficulty}/10  |  ${dest.durationMinutes}min  |  Party: ${dest.requiredPartySize}+`;
      const statsText = this.add.text(x + 10, statsY, statsStr, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: diffColor,
      });
      this.contentContainer!.add(statsText);

      // Loot preview
      const lootStr = dest.lootTable
        .map(l => `${l.resource}: ${l.min}-${l.max}`)
        .join(', ');
      const lootText = this.add.text(x + 10, statsY + 16, `Loot: ${lootStr}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: cardWidth - 20 },
      });
      this.contentContainer!.add(lootText);

      // Click zone
      const hitZone = this.add.zone(x + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight)
        .setInteractive({ useHandCursor: true });
      this.contentContainer!.add(hitZone);

      hitZone.on('pointerup', () => {
        this.selectedDestination = dest;
        this.selectedHeroIds.clear();
        this.renderContent();
      });
    });

    // Right side: party selection (if destination selected)
    if (this.selectedDestination) {
      this.renderPartySelection();
    }
  }

  private renderPartySelection(): void {
    if (!this.contentContainer || !this.selectedDestination) return;

    const dest = this.selectedDestination;
    const panelX = GAME_WIDTH - 400;
    const panelY = 100;
    const panelW = 385;
    const panelH = GAME_HEIGHT - 170;

    const g = this.add.graphics();
    g.fillStyle(COLORS.panelBg, 0.95);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    g.lineStyle(2, COLORS.panelBorder);
    g.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    this.contentContainer.add(g);

    const title = this.add.text(panelX + 10, panelY + 10,
      `Select Party for ${dest.name}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });
    this.contentContainer.add(title);

    const reqText = this.add.text(panelX + 10, panelY + 32,
      `Min party size: ${dest.requiredPartySize}  |  Selected: ${this.selectedHeroIds.size}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.contentContainer.add(reqText);

    // Available heroes (idle or assigned)
    const availableHeroes = this.heroes.filter(
      h => h.status === 'idle' || h.status === 'assigned',
    );

    let heroY = panelY + 55;
    availableHeroes.forEach(hero => {
      if (heroY + 30 > panelY + panelH - 60) return;

      const isSelected = this.selectedHeroIds.has(hero.id);

      const heroBg = this.add.graphics();
      heroBg.fillStyle(isSelected ? 0x0f3460 : 0x1a1a2e, 0.8);
      heroBg.fillRoundedRect(panelX + 10, heroY, panelW - 20, 26, 4);
      if (isSelected) {
        heroBg.lineStyle(1, COLORS.gold);
        heroBg.strokeRoundedRect(panelX + 10, heroY, panelW - 20, 26, 4);
      }
      this.contentContainer!.add(heroBg);

      const checkbox = this.add.text(panelX + 18, heroY + 4,
        isSelected ? '[x]' : '[ ]', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: isSelected ? COLORS.textGold : COLORS.textSecondary,
      });
      this.contentContainer!.add(checkbox);

      const heroLabel = this.add.text(panelX + 48, heroY + 4,
        `${hero.name} (${hero.role} Lv${hero.level})`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textPrimary,
      });
      this.contentContainer!.add(heroLabel);

      const statusLabel = this.add.text(panelX + panelW - 18, heroY + 4,
        hero.status, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }).setOrigin(1, 0);
      this.contentContainer!.add(statusLabel);

      const hitZone = this.add.zone(
        panelX + panelW / 2, heroY + 13, panelW - 20, 26,
      ).setInteractive({ useHandCursor: true });
      this.contentContainer!.add(hitZone);

      hitZone.on('pointerup', () => {
        if (this.selectedHeroIds.has(hero.id)) {
          this.selectedHeroIds.delete(hero.id);
        } else if (this.selectedHeroIds.size < 5) {
          this.selectedHeroIds.add(hero.id);
        }
        this.renderContent();
      });

      heroY += 30;
    });

    if (availableHeroes.length === 0) {
      const noHeroText = this.add.text(panelX + 10, heroY + 5,
        'No heroes available. Recruit or free heroes first.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: panelW - 20 },
      });
      this.contentContainer.add(noHeroText);
    }

    // Launch button
    const canLaunch = this.selectedHeroIds.size >= dest.requiredPartySize;
    const launchY = panelY + panelH - 45;

    const btnG = this.add.graphics();
    btnG.fillStyle(canLaunch ? COLORS.success : 0x555555, 1);
    btnG.fillRoundedRect(panelX + 20, launchY, panelW - 40, 35, 6);
    this.contentContainer.add(btnG);

    const launchText = this.add.text(panelX + panelW / 2, launchY + 17,
      'Launch Expedition', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: canLaunch ? '#000000' : '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentContainer.add(launchText);

    if (canLaunch) {
      const launchZone = this.add.zone(
        panelX + panelW / 2, launchY + 17, panelW - 40, 35,
      ).setInteractive({ useHandCursor: true });
      this.contentContainer.add(launchZone);

      launchZone.on('pointerup', () => this.handleLaunch());
    }
  }

  private async handleLaunch(): Promise<void> {
    if (!this.selectedDestination) return;

    try {
      await apiClient.launchExpedition(
        this.selectedDestination.type,
        Array.from(this.selectedHeroIds),
        this.selectedDestination.id,
      );

      this.selectedDestination = null;
      this.selectedHeroIds.clear();
      this.tabMode = 'active';
      await this.loadData();
      this.renderContent();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Launch failed');
    }
  }

  private renderActiveExpeditions(): void {
    if (!this.contentContainer) return;

    const startY = 105;
    const cardWidth = GAME_WIDTH - 30;
    const cardHeight = 110;
    const padding = 8;

    const active = this.expeditions.filter(e => e.status === 'active');
    const completed = this.expeditions.filter(e => e.status !== 'active');

    let y = startY;

    // Active expeditions
    const activeTitle = this.add.text(15, y, `Active Expeditions (${active.length})`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.contentContainer.add(activeTitle);
    y += 25;

    if (active.length === 0) {
      const noneText = this.add.text(15, y, 'No active expeditions. Launch one from the Destinations tab.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      this.contentContainer.add(noneText);
      y += 25;
    }

    active.forEach(exp => {
      if (y + cardHeight > GAME_HEIGHT - 100) return;
      this.renderExpeditionCard(exp, 15, y, cardWidth, cardHeight);
      y += cardHeight + padding;
    });

    // Completed expeditions
    y += 10;
    const compTitle = this.add.text(15, y, `Completed (${completed.length})`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.contentContainer.add(compTitle);
    y += 25;

    completed.slice(0, 5).forEach(exp => {
      if (y + cardHeight > GAME_HEIGHT - 60) return;
      this.renderExpeditionCard(exp, 15, y, cardWidth, cardHeight);
      y += cardHeight + padding;
    });
  }

  private renderExpeditionCard(
    exp: Expedition,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    if (!this.contentContainer) return;

    const isActive = exp.status === 'active';
    const isSuccess = exp.status === 'resolved';

    const g = this.add.graphics();
    g.fillStyle(COLORS.panelBg, 0.9);
    g.fillRoundedRect(x, y, w, h, 6);
    const borderColor = isActive ? COLORS.panelBorder : isSuccess ? COLORS.success : COLORS.danger;
    g.lineStyle(2, borderColor);
    g.strokeRoundedRect(x, y, w, h, 6);
    this.contentContainer.add(g);

    // Destination name
    const dest = this.destinations.find(d => d.id === exp.destination);
    const destName = dest?.name || exp.destination;

    this.contentContainer.add(
      this.add.text(x + 10, y + 8, destName, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // Type badge
    this.contentContainer.add(
      this.add.text(x + w - 10, y + 8,
        exp.type.replace('_', ' ').toUpperCase(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textAccent,
      }).setOrigin(1, 0),
    );

    // Heroes
    const heroNames = exp.heroIds
      .map(id => this.heroes.find(h => h.id === id)?.name || 'Unknown')
      .join(', ');
    this.contentContainer.add(
      this.add.text(x + 10, y + 28, `Party: ${heroNames}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: w - 20 },
      }),
    );

    if (isActive) {
      // Countdown timer
      const startMs = new Date(exp.startedAt).getTime();
      const endMs = startMs + exp.duration * 60 * 1000;
      const remainMs = endMs - Date.now();

      if (remainMs > 0) {
        const remainMin = Math.floor(remainMs / 60000);
        const remainSec = Math.floor((remainMs % 60000) / 1000);
        this.contentContainer.add(
          this.add.text(x + 10, y + 50, `Time remaining: ${remainMin}m ${remainSec}s`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textPrimary,
          }),
        );

        // Progress bar
        const barX = x + 10;
        const barY = y + 75;
        const barW = w - 170;
        const barH = 12;
        const progress = 1 - remainMs / (exp.duration * 60 * 1000);

        const barBg = this.add.graphics();
        barBg.fillStyle(0x333333, 1);
        barBg.fillRoundedRect(barX, barY, barW, barH, 4);
        barBg.fillStyle(COLORS.success, 1);
        barBg.fillRoundedRect(barX, barY, barW * progress, barH, 4);
        this.contentContainer.add(barBg);
      } else {
        // Ready to collect
        this.contentContainer.add(
          this.add.text(x + 10, y + 50, 'Expedition complete!', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#4ecca3',
            fontStyle: 'bold',
          }),
        );

        const collectBg = this.add.graphics();
        collectBg.fillStyle(COLORS.success, 1);
        collectBg.fillRoundedRect(x + w - 150, y + 65, 140, 30, 6);
        this.contentContainer.add(collectBg);

        const collectText = this.add.text(x + w - 80, y + 80, 'Collect', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#000000',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.contentContainer.add(collectText);

        const collectZone = this.add.zone(x + w - 80, y + 80, 140, 30)
          .setInteractive({ useHandCursor: true });
        this.contentContainer.add(collectZone);

        collectZone.on('pointerup', () => this.handleCollect(exp.id));
      }
    } else {
      // Show result
      const result = exp.result;
      if (result) {
        const statusText = result.success ? 'SUCCESS' : 'FAILED';
        const statusColor = result.success ? '#4ecca3' : '#e94560';
        this.contentContainer.add(
          this.add.text(x + 10, y + 50, statusText, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: statusColor,
            fontStyle: 'bold',
          }),
        );

        // Loot summary
        if (result.success && result.loot) {
          const lootStr = Object.entries(result.loot)
            .map(([k, v]) => `${k}: +${v}`)
            .join('  ');
          this.contentContainer.add(
            this.add.text(x + 100, y + 52, lootStr, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textGold,
            }),
          );
        }

        // XP
        this.contentContainer.add(
          this.add.text(x + 10, y + 72, `XP gained: ${result.xpGained}  |  ${result.narrative}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
            wordWrap: { width: w - 20 },
          }),
        );
      }
    }
  }

  private async handleCollect(expeditionId: string): Promise<void> {
    try {
      await apiClient.collectExpedition(expeditionId);
      await this.loadData();
      this.renderContent();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Collection failed');
    }
  }

  private showError(message: string): void {
    const errorText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(3000, () => errorText.destroy());
  }

  private buildBottomNav(): void {
    const navY = GAME_HEIGHT - 50;
    const navBg = this.add.graphics();
    navBg.fillStyle(COLORS.panelBg, 0.9);
    navBg.fillRect(0, navY, GAME_WIDTH, 50);
    navBg.lineStyle(2, COLORS.panelBorder);
    navBg.strokeRect(0, navY, GAME_WIDTH, 50);

    const tabs = ['Guild Hall', 'Expeditions', 'Market', 'World Map', 'Research'];
    const tabWidth = GAME_WIDTH / tabs.length;

    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const isActive = i === 1; // Expeditions is active
      const text = this.add.text(x, navY + 25, tab, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => text.setColor(COLORS.textGold));
      text.on('pointerout', () => {
        if (!isActive) text.setColor(COLORS.textSecondary);
      });

      if (i === 0) {
        text.on('pointerup', () => {
          if (this.refreshTimer) this.refreshTimer.destroy();
          this.scene.start('GuildHallScene');
        });
      }
    });
  }
}
