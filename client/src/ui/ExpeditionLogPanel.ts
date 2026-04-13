/**
 * Expedition Log Panel — detailed log viewer showing narrative entries,
 * encounter results, rare discoveries, and hero performance.
 *
 * T-0483: Expedition log system
 * T-0491: Encounter narrative text generation
 * T-0492: Encounter outcome effects display
 * T-0494: Rare discovery collection page
 * T-0500: Boss expedition debriefing screen
 * T-0509: Expedition reward detail screen
 * T-0513: Expedition diary UI
 * T-0514: Expedition statistics page
 * T-0538: Post-mortem analysis
 * T-0539: Achievement badges
 * T-0542: Hero performance rating
 * T-0545: Narrative summary display
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';
import type {
  Expedition,
  ExpeditionLogEntry,
  ExpeditionEncounterResult,
  RareDiscovery,
  ExpeditionStatistics,
  ExpeditionAchievement,
  HeroPerformanceRating,
} from '@shared/types';

type LogTab = 'log' | 'encounters' | 'performance' | 'discoveries' | 'stats' | 'achievements';

export class ExpeditionLogPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private currentTab: LogTab = 'log';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show the log for a specific expedition result.
   */
  async showExpeditionLog(expedition: Expedition): Promise<void> {
    this.currentTab = 'log';
    this.openModal('Expedition Log');
    const content = this.modal!.getContentContainer();
    this.renderExpeditionLog(content, expedition);
  }

  /**
   * Show the full diary (all past expeditions).
   */
  async showDiary(): Promise<void> {
    this.currentTab = 'log';
    this.openModal('Expedition Diary');
    const content = this.modal!.getContentContainer();

    try {
      const diary = await apiClient.getExpeditionDiary(0, 10);
      this.renderDiary(content, diary);
    } catch {
      this.renderError(content, 'Failed to load expedition diary');
    }
  }

  /**
   * Show statistics and achievements.
   */
  async showStatistics(): Promise<void> {
    this.currentTab = 'stats';
    this.openModal('Expedition Statistics');
    const content = this.modal!.getContentContainer();

    try {
      const stats = await apiClient.getExpeditionStatistics();
      this.renderStatistics(content, stats);
    } catch {
      this.renderError(content, 'Failed to load statistics');
    }
  }

  /**
   * Show rare discovery collection.
   */
  async showDiscoveries(): Promise<void> {
    this.currentTab = 'discoveries';
    this.openModal('Rare Discoveries');
    const content = this.modal!.getContentContainer();

    try {
      const discoveries = await apiClient.getExpeditionDiscoveries();
      this.renderDiscoveries(content, discoveries);
    } catch {
      this.renderError(content, 'Failed to load discoveries');
    }
  }

  private openModal(title: string): void {
    if (this.modal) this.modal.destroy();
    this.modal = new UIModal(this.scene, {
      title,
      width: 620,
      height: 520,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });
    this.modal.open();
  }

  private renderExpeditionLog(container: Phaser.GameObjects.Container, expedition: Expedition): void {
    let y = 0;
    const result = expedition.result;

    // Status header
    const statusColor = result?.success ? '#4ecca3' : '#e94560';
    const statusText = result?.success ? 'SUCCESS' : 'FAILED';
    container.add(
      this.scene.add.text(0, y, `Status: ${statusText}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: statusColor,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    // Narrative summary
    if (result?.narrative) {
      container.add(
        this.scene.add.text(0, y, result.narrative, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 580 },
          fontStyle: 'italic',
        }),
      );
      y += 35;
    }

    // Encounter summary
    if (result?.encounterSummary && result.encounterSummary.length > 0) {
      container.add(
        this.scene.add.text(0, y, 'Encounters:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 20;

      for (const enc of result.encounterSummary) {
        const outcomeColor = enc.outcome === 'success' ? '#4ecca3' : enc.outcome === 'partial' ? '#f5a623' : '#e94560';
        const outcomeLabel = enc.outcome.toUpperCase();

        container.add(
          this.scene.add.text(10, y, `[${outcomeLabel}] ${enc.title}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: outcomeColor,
            fontStyle: 'bold',
          }),
        );
        y += 16;

        container.add(
          this.scene.add.text(20, y, enc.narrative, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
            wordWrap: { width: 560 },
          }),
        );
        y += 22;

        if (enc.loot && Object.keys(enc.loot).length > 0) {
          const lootStr = Object.entries(enc.loot).map(([k, v]) => `${k}: +${v}`).join(', ');
          container.add(
            this.scene.add.text(20, y, `Loot: ${lootStr}`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textGold,
            }),
          );
          y += 16;
        }
      }
    }

    // Boss result
    if (result?.bossResult) {
      y += 5;
      const boss = result.bossResult;
      const bossColor = boss.success ? '#4ecca3' : '#e94560';
      container.add(
        this.scene.add.text(0, y, `Boss: ${boss.bossName}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: bossColor,
          fontStyle: 'bold',
        }),
      );
      y += 18;
      container.add(
        this.scene.add.text(10, y, `Phases cleared: ${boss.phasesCleared}/${boss.phases}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );
      y += 16;
      if (boss.exclusiveLoot && boss.exclusiveLoot.length > 0) {
        container.add(
          this.scene.add.text(10, y, `Exclusive: ${boss.exclusiveLoot.join(', ')}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textGold,
          }),
        );
        y += 16;
      }
    }

    // Rare discovery
    if (result?.rareDiscovery) {
      y += 5;
      const disc = result.rareDiscovery;
      const rarityColor = disc.rarity === 'legendary' ? '#ffd700' : disc.rarity === 'epic' ? '#a855f7' : '#4ecca3';
      container.add(
        this.scene.add.text(0, y, `Discovery: ${disc.name} [${disc.rarity.toUpperCase()}]`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: rarityColor,
          fontStyle: 'bold',
        }),
      );
      y += 18;
      container.add(
        this.scene.add.text(10, y, disc.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 560 },
        }),
      );
      y += 20;
    }

    // Loot summary
    if (result?.loot && Object.keys(result.loot).length > 0) {
      y += 5;
      container.add(
        this.scene.add.text(0, y, 'Total Loot:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 20;
      const lootStr = Object.entries(result.loot).map(([k, v]) => `${k}: +${v}`).join('  |  ');
      container.add(
        this.scene.add.text(10, y, lootStr, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }),
      );
      y += 18;
    }

    // XP and injuries
    if (result) {
      container.add(
        this.scene.add.text(0, y, `XP gained: ${result.xpGained}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );
      y += 20;

      if (result.injuries && result.injuries.length > 0) {
        container.add(
          this.scene.add.text(0, y, `Injuries: ${result.injuries.join(', ')}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#e94560',
          }),
        );
        y += 16;
      }

      if (result.milestoneUnlocked) {
        container.add(
          this.scene.add.text(0, y, `Milestone unlocked: ${result.milestoneUnlocked}!`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textGold,
            fontStyle: 'bold',
          }),
        );
        y += 20;
      }
    }

    // Hero performance
    if (result?.heroPerformance) {
      y += 5;
      container.add(
        this.scene.add.text(0, y, 'Hero Performance:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 18;

      for (const perf of Object.values(result.heroPerformance) as HeroPerformanceRating[]) {
        const stars = '\u2605'.repeat(Math.round(perf.overallRating)) + '\u2606'.repeat(5 - Math.round(perf.overallRating));
        container.add(
          this.scene.add.text(10, y, `${perf.heroName}: ${stars} (${perf.overallRating.toFixed(1)})`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }),
        );
        y += 16;
      }
    }
  }

  private renderDiary(container: Phaser.GameObjects.Container, diary: any): void {
    let y = 0;

    container.add(
      this.scene.add.text(0, y, `Total expeditions: ${diary.total}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 25;

    for (const entry of diary.entries) {
      const statusColor = entry.status === 'resolved' ? '#4ecca3' : entry.status === 'failed' ? '#e94560' : COLORS.textSecondary;
      const dateStr = new Date(entry.startedAt).toLocaleDateString();

      const bg = this.scene.add.graphics();
      bg.fillStyle(COLORS.panelBg, 0.5);
      bg.fillRoundedRect(0, y, 580, 45, 4);
      container.add(bg);

      container.add(
        this.scene.add.text(10, y + 5, `${entry.destinationName} (${entry.type})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );

      container.add(
        this.scene.add.text(10, y + 22, `${dateStr} | ${entry.status.toUpperCase()} | ${entry.heroIds.length} heroes`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: statusColor,
        }),
      );

      // Click to view details
      const zone = this.scene.add.zone(290, y + 22, 580, 45).setInteractive({ useHandCursor: true });
      container.add(zone);
      zone.on('pointerup', () => {
        if (this.modal) {
          this.modal.destroy();
          this.modal = null;
        }
        this.showExpeditionLog(entry);
      });

      y += 50;
    }
  }

  private renderStatistics(container: Phaser.GameObjects.Container, stats: ExpeditionStatistics): void {
    let y = 0;
    const col2 = 300;

    const addStat = (label: string, value: string, x: number, yPos: number, color: string = COLORS.textPrimary) => {
      container.add(
        this.scene.add.text(x, yPos, label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );
      container.add(
        this.scene.add.text(x + 180, yPos, value, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color,
          fontStyle: 'bold',
        }),
      );
    };

    container.add(
      this.scene.add.text(0, y, 'Expedition Statistics', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    addStat('Total Expeditions:', `${stats.totalExpeditions}`, 0, y);
    addStat('Success Rate:', `${(stats.successRate * 100).toFixed(1)}%`, col2, y, '#4ecca3');
    y += 18;
    addStat('Successes:', `${stats.successCount}`, 0, y, '#4ecca3');
    addStat('Failures:', `${stats.failureCount}`, col2, y, '#e94560');
    y += 18;
    addStat('Total Loot Value:', `${stats.totalLootValue}`, 0, y, COLORS.textGold);
    addStat('Total XP Earned:', `${stats.totalXpEarned}`, col2, y);
    y += 18;
    addStat('Bosses Defeated:', `${stats.bossesDefeated}`, 0, y);
    addStat('Rare Discoveries:', `${stats.rareDiscoveries}`, col2, y);
    y += 30;

    // Achievements
    container.add(
      this.scene.add.text(0, y, 'Achievements', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    for (const ach of stats.achievements) {
      const color = ach.unlocked ? COLORS.textGold : COLORS.textSecondary;
      const icon = ach.unlocked ? '\u2605' : '\u2606';
      container.add(
        this.scene.add.text(10, y, `${icon} ${ach.name}: ${ach.description}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color,
        }),
      );
      if (!ach.unlocked) {
        container.add(
          this.scene.add.text(500, y, `${ach.current}/${ach.requirement}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }),
        );
      }
      y += 18;
    }
  }

  private renderDiscoveries(container: Phaser.GameObjects.Container, discoveries: RareDiscovery[]): void {
    let y = 0;

    if (discoveries.length === 0) {
      container.add(
        this.scene.add.text(0, y, 'No rare discoveries yet. Keep exploring!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
      return;
    }

    container.add(
      this.scene.add.text(0, y, `${discoveries.length} Rare Discoveries`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    for (const disc of discoveries) {
      const rarityColor = disc.rarity === 'legendary' ? '#ffd700' : disc.rarity === 'epic' ? '#a855f7' : '#4ecca3';

      const bg = this.scene.add.graphics();
      bg.fillStyle(COLORS.panelBg, 0.5);
      bg.fillRoundedRect(0, y, 580, 50, 4);
      bg.lineStyle(1, rarityColor === '#ffd700' ? COLORS.gold : COLORS.panelBorder);
      bg.strokeRoundedRect(0, y, 580, 50, 4);
      container.add(bg);

      container.add(
        this.scene.add.text(10, y + 5, `${disc.name} [${disc.rarity.toUpperCase()}]`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: rarityColor,
          fontStyle: 'bold',
        }),
      );

      container.add(
        this.scene.add.text(10, y + 22, disc.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 560 },
        }),
      );

      const cat = disc.category.replace('_', ' ');
      container.add(
        this.scene.add.text(530, y + 5, cat, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(1, 0),
      );

      y += 55;
    }
  }

  private renderError(container: Phaser.GameObjects.Container, msg: string): void {
    container.add(
      this.scene.add.text(290, 60, msg, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textAccent,
      }).setOrigin(0.5),
    );
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
