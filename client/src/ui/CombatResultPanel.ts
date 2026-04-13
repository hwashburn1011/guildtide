/**
 * Post-combat summary with rewards display.
 *
 * T-1292: Build combat reward screen with XP, gold, and item display
 * T-1294: Combat MVP display (highest damage, most heals, etc.)
 * T-1295: Combat replay system to rewatch past battles
 * T-1299: Combat tutorial introducing mechanics
 */

import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';

interface CombatReward {
  xp: number;
  gold: number;
  loot: { resource: string; amount: number }[];
  items: string[];
  rareDrop?: string;
  mvpHeroId?: string;
  mvpReason?: string;
}

interface CombatStatistics {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  criticalHits: number;
  dodges: number;
  abilitiesUsed: number;
  turnsPlayed: number;
  enemiesDefeated: number;
  heroesKnockedOut: number;
  statusEffectsApplied: number;
  comboChains: number;
  ultimatesUsed: number;
  perHero: Record<string, {
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
    kills: number;
    crits: number;
  }>;
}

interface CombatResultData {
  outcome: 'victory' | 'defeat' | 'fled';
  totalRounds: number;
  rewards: CombatReward;
  statistics: CombatStatistics;
  synergiesActive: string[];
  achievements: string[];
  heroNames: Record<string, string>;
}

type ResultTab = 'rewards' | 'statistics' | 'breakdown';

export class CombatResultPanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private contentItems: Phaser.GameObjects.GameObject[] = [];
  private currentTab: ResultTab = 'rewards';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private data: CombatResultData | null = null;
  private onClose: (() => void) | null = null;
  private onReplay: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.container = scene.add.container(x, y);
    this.buildUI();
  }

  private buildUI(): void {
    // Backdrop
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, COLORS.panelBg, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COLORS.panelBorder);
    this.container.add(bg);

    // Tabs
    const tabs: { key: ResultTab; label: string }[] = [
      { key: 'rewards', label: 'Rewards' },
      { key: 'statistics', label: 'Statistics' },
      { key: 'breakdown', label: 'Hero Breakdown' },
    ];

    tabs.forEach((tab, i) => {
      const btn = this.scene.add.text(20 + i * 130, 50, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.currentTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.switchTab(tab.key));
      this.tabButtons.push(btn);
      this.container.add(btn);
    });

    // Separator
    const sep = this.scene.add.rectangle(this.width / 2, 72, this.width - 20, 1, COLORS.panelBorder).setOrigin(0.5, 0);
    this.container.add(sep);

    // Close button
    const closeBtn = this.scene.add.text(this.width - 30, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onClose?.());
    this.container.add(closeBtn);
  }

  // ── Load Result Data ──

  loadResult(data: CombatResultData, onClose?: () => void, onReplay?: () => void): void {
    this.data = data;
    this.onClose = onClose ?? null;
    this.onReplay = onReplay ?? null;

    // Outcome banner
    const outcomeColor = data.outcome === 'victory' ? COLORS.textGold : COLORS.textAccent;
    const outcomeText = data.outcome === 'victory' ? 'VICTORY!' : data.outcome === 'fled' ? 'FLED' : 'DEFEAT';
    const banner = this.scene.add.text(this.width / 2, 18, outcomeText, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.title}px`,
      color: outcomeColor,
    }).setOrigin(0.5, 0);
    this.container.add(banner);

    // Animate banner in
    banner.setScale(0.5);
    banner.setAlpha(0);
    this.scene.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.renderContent();
  }

  private switchTab(tab: ResultTab): void {
    this.currentTab = tab;
    this.tabButtons.forEach((btn, i) => {
      const keys: ResultTab[] = ['rewards', 'statistics', 'breakdown'];
      btn.setColor(keys[i] === tab ? COLORS.textGold : COLORS.textSecondary);
    });
    this.renderContent();
  }

  private renderContent(): void {
    this.contentItems.forEach(item => item.destroy());
    this.contentItems = [];
    if (!this.data) return;

    const startY = 85;

    switch (this.currentTab) {
      case 'rewards':
        this.renderRewards(startY);
        break;
      case 'statistics':
        this.renderStatistics(startY);
        break;
      case 'breakdown':
        this.renderBreakdown(startY);
        break;
    }
  }

  // ── T-1292: Rewards Display ──

  private renderRewards(startY: number): void {
    if (!this.data) return;
    const r = this.data.rewards;
    let y = startY;

    this.addContentText(20, y, `Rounds: ${this.data.totalRounds}`, COLORS.textSecondary);
    y += 25;

    this.addContentText(20, y, `XP Earned: ${r.xp}`, COLORS.textGold);
    y += 22;
    this.addContentText(20, y, `Gold: ${r.gold}`, COLORS.textGold);
    y += 22;

    if (r.loot.length > 0) {
      this.addContentText(20, y, 'Loot:', COLORS.textPrimary);
      y += 20;
      for (const item of r.loot) {
        this.addContentText(35, y, `${item.resource}: ${item.amount}`, COLORS.textSecondary);
        y += 18;
      }
    }

    if (r.items.length > 0) {
      y += 5;
      this.addContentText(20, y, 'Items Found:', COLORS.textPrimary);
      y += 20;
      for (const item of r.items) {
        this.addContentText(35, y, item, COLORS.textGold);
        y += 18;
      }
    }

    if (r.rareDrop) {
      y += 10;
      this.addContentText(20, y, `RARE DROP: ${r.rareDrop}`, '#ff44ff');
      y += 22;
    }

    // T-1294: MVP display
    if (r.mvpHeroId && r.mvpReason) {
      y += 15;
      const mvpName = this.data.heroNames[r.mvpHeroId] ?? r.mvpHeroId;
      this.addContentText(20, y, `MVP: ${mvpName}`, COLORS.textGold);
      y += 18;
      this.addContentText(35, y, r.mvpReason, COLORS.textSecondary);
      y += 22;
    }

    // Synergies
    if (this.data.synergiesActive.length > 0) {
      y += 10;
      this.addContentText(20, y, 'Active Synergies:', COLORS.textPrimary);
      y += 20;
      for (const syn of this.data.synergiesActive) {
        this.addContentText(35, y, syn.replace(/_/g, ' '), COLORS.textSecondary);
        y += 18;
      }
    }

    // Achievements (T-1318)
    if (this.data.achievements.length > 0) {
      y += 10;
      this.addContentText(20, y, 'Achievements Unlocked!', COLORS.textGold);
      y += 20;
      for (const ach of this.data.achievements) {
        this.addContentText(35, y, ach.replace(/_/g, ' ').toUpperCase(), '#4ecca3');
        y += 18;
      }
    }

    // T-1295: Replay button
    y += 20;
    const replayBtn = this.scene.add.text(this.width / 2, y, '[ Replay Battle ]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onReplay?.());
    this.container.add(replayBtn);
    this.contentItems.push(replayBtn);
  }

  // ── Statistics Tab ──

  private renderStatistics(startY: number): void {
    if (!this.data) return;
    const s = this.data.statistics;
    let y = startY;

    const stats = [
      ['Total Damage Dealt', s.totalDamageDealt],
      ['Total Damage Taken', s.totalDamageTaken],
      ['Total Healing', s.totalHealing],
      ['Critical Hits', s.criticalHits],
      ['Dodges', s.dodges],
      ['Abilities Used', s.abilitiesUsed],
      ['Enemies Defeated', s.enemiesDefeated],
      ['Heroes Knocked Out', s.heroesKnockedOut],
      ['Status Effects Applied', s.statusEffectsApplied],
      ['Combo Chains', s.comboChains],
      ['Ultimates Used', s.ultimatesUsed],
    ];

    for (const [label, value] of stats) {
      this.addContentText(20, y, `${label}:`, COLORS.textSecondary);
      this.addContentText(this.width - 40, y, `${value}`, COLORS.textPrimary, 1);
      y += 20;
    }
  }

  // ── Hero Breakdown Tab ──

  private renderBreakdown(startY: number): void {
    if (!this.data) return;
    let y = startY;

    for (const [heroId, stats] of Object.entries(this.data.statistics.perHero)) {
      const heroName = this.data.heroNames[heroId] ?? heroId;
      this.addContentText(20, y, heroName, COLORS.textGold);
      y += 18;
      this.addContentText(35, y, `Dmg: ${stats.damageDealt} | Taken: ${stats.damageTaken} | Heals: ${stats.healingDone}`, COLORS.textSecondary);
      y += 18;
      this.addContentText(35, y, `Kills: ${stats.kills} | Crits: ${stats.crits}`, COLORS.textSecondary);
      y += 24;
    }
  }

  private addContentText(x: number, y: number, text: string, color: string | number, originX: number = 0): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color,
    }).setOrigin(originX, 0);
    this.container.add(t);
    this.contentItems.push(t);
  }

  destroy(): void {
    this.container.destroy();
  }
}
