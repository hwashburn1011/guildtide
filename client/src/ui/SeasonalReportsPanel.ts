/**
 * SeasonalReportsPanel — Weekly recap, month-end report, seasonal leaderboard,
 * season pass progression, and end-of-season summary.
 *
 * T-0971: Weekly recap summary with guild progress
 * T-0972: Month-end report with statistics and achievements
 * T-0973: Seasonal leaderboard reset with rewards for top performers
 * T-0987: Season pass progression system with seasonal rewards
 * T-0988: Season pass reward track UI with milestone indicators
 * T-0989: End-of-season summary with achievement highlights
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';

// --- Weekly Recap (T-0971) ---
interface WeeklyRecapData {
  weekNumber: number;
  resourcesGained: Record<string, number>;
  expeditionsCompleted: number;
  heroesRecruited: number;
  buildingsUpgraded: number;
  xpGained: number;
  topHero: { name: string; contribution: string } | null;
  highlights: string[];
}

// --- Month-End Report (T-0972) ---
interface MonthEndReportData {
  month: string;
  year: number;
  totalResourcesEarned: Record<string, number>;
  totalExpeditions: number;
  totalTrades: number;
  guildLevelProgress: { from: number; to: number };
  achievements: string[];
  bestDay: { date: string; description: string } | null;
  seasonSummary: string;
}

// --- Seasonal Leaderboard (T-0973) ---
interface LeaderboardEntry {
  rank: number;
  guildName: string;
  score: number;
  isPlayer: boolean;
}

interface SeasonalLeaderboardData {
  season: string;
  category: string;
  entries: LeaderboardEntry[];
  playerRank: number;
  rewards: Array<{ rank: string; reward: string }>;
}

// --- Season Pass (T-0987, T-0988) ---
interface SeasonPassData {
  season: string;
  currentXp: number;
  currentTier: number;
  tiers: Array<{
    tier: number;
    xpRequired: number;
    reward: { label: string };
    claimed: boolean;
    unlocked: boolean;
  }>;
  daysRemaining: number;
}

// --- End-of-Season Summary (T-0989) ---
interface EndOfSeasonData {
  season: string;
  totalXpEarned: number;
  seasonPassTier: number;
  topAchievements: string[];
  resourcesSummary: Record<string, number>;
  expeditionCount: number;
  leaderboardRank: number;
  nextSeason: string;
}

export class SeasonalReportsPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // --- T-0971: Weekly Recap ---
  showWeeklyRecap(data: WeeklyRecapData): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: `Weekly Recap — Week ${data.weekNumber}`,
      width: 500, height: 420,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // XP gained
    content.add(this.scene.add.text(0, y, `Guild XP Earned: +${data.xpGained}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    }));
    y += 28;

    // Stats grid
    const stats = [
      ['Expeditions', `${data.expeditionsCompleted}`],
      ['Heroes Recruited', `${data.heroesRecruited}`],
      ['Buildings Upgraded', `${data.buildingsUpgraded}`],
    ];
    for (const [label, value] of stats) {
      content.add(this.scene.add.text(0, y, label, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      content.add(this.scene.add.text(220, y, value, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textPrimary,
      }));
      y += 20;
    }
    y += 10;

    // Resources
    content.add(this.scene.add.text(0, y, 'Resources Gained:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3', fontStyle: 'bold',
    }));
    y += 20;

    let rx = 0;
    for (const [res, amt] of Object.entries(data.resourcesGained)) {
      content.add(this.scene.add.text(rx, y, `+${amt} ${res}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#4ecca3',
      }));
      rx += 100;
      if (rx > 400) { rx = 0; y += 16; }
    }
    y += 22;

    // Top hero
    if (data.topHero) {
      content.add(this.scene.add.text(0, y, `Star of the Week: ${data.topHero.name}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold, fontStyle: 'bold',
      }));
      y += 18;
      content.add(this.scene.add.text(0, y, data.topHero.contribution, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      y += 22;
    }

    // Highlights
    if (data.highlights.length > 0) {
      content.add(this.scene.add.text(0, y, 'Highlights:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary, fontStyle: 'bold',
      }));
      y += 18;
      for (const hl of data.highlights.slice(0, 4)) {
        content.add(this.scene.add.text(8, y, `• ${hl}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
        }));
        y += 16;
      }
    }

    this.modal.open();
  }

  // --- T-0972: Month-End Report ---
  showMonthEndReport(data: MonthEndReportData): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: `${data.month} ${data.year} — Monthly Report`,
      width: 560, height: 480,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Season summary
    content.add(this.scene.add.text(0, y, data.seasonSummary, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary, fontStyle: 'italic',
      wordWrap: { width: 520 },
    }));
    y += 30;

    // Guild level progress
    content.add(this.scene.add.text(0, y, `Guild Level: ${data.guildLevelProgress.from} → ${data.guildLevelProgress.to}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    }));
    y += 28;

    // Key stats
    const monthStats = [
      ['Expeditions Completed', `${data.totalExpeditions}`],
      ['Market Trades', `${data.totalTrades}`],
    ];
    for (const [label, value] of monthStats) {
      content.add(this.scene.add.text(0, y, label, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      content.add(this.scene.add.text(250, y, value, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textPrimary,
      }));
      y += 20;
    }
    y += 10;

    // Resources
    content.add(this.scene.add.text(0, y, 'Total Resources Earned:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3', fontStyle: 'bold',
    }));
    y += 20;
    let rx = 0;
    for (const [res, amt] of Object.entries(data.totalResourcesEarned)) {
      content.add(this.scene.add.text(rx, y, `+${amt} ${res}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#4ecca3',
      }));
      rx += 100;
      if (rx > 450) { rx = 0; y += 16; }
    }
    y += 22;

    // Best day
    if (data.bestDay) {
      content.add(this.scene.add.text(0, y, `Best Day: ${data.bestDay.date}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold, fontStyle: 'bold',
      }));
      y += 16;
      content.add(this.scene.add.text(0, y, data.bestDay.description, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      y += 22;
    }

    // Achievements
    if (data.achievements.length > 0) {
      content.add(this.scene.add.text(0, y, 'Achievements Unlocked:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold, fontStyle: 'bold',
      }));
      y += 18;
      for (const ach of data.achievements.slice(0, 5)) {
        content.add(this.scene.add.text(8, y, `★ ${ach}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#ffd700',
        }));
        y += 16;
      }
    }

    this.modal.open();
  }

  // --- T-0973: Seasonal Leaderboard ---
  showSeasonalLeaderboard(data: SeasonalLeaderboardData): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: `${data.season} Leaderboard — ${data.category}`,
      width: 500, height: 450,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Player rank
    content.add(this.scene.add.text(0, y, `Your Rank: #${data.playerRank}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    }));
    y += 30;

    // Rewards table
    content.add(this.scene.add.text(0, y, 'Season Rewards:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3', fontStyle: 'bold',
    }));
    y += 18;
    for (const r of data.rewards.slice(0, 3)) {
      content.add(this.scene.add.text(8, y, `${r.rank}: ${r.reward}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      y += 16;
    }
    y += 12;

    // Leaderboard entries
    const sep = this.scene.add.graphics();
    sep.fillStyle(COLORS.panelBorder, 0.5);
    sep.fillRect(0, y, 460, 1);
    content.add(sep);
    y += 8;

    // Header
    content.add(this.scene.add.text(0, y, 'Rank', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
    }));
    content.add(this.scene.add.text(60, y, 'Guild', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
    }));
    content.add(this.scene.add.text(300, y, 'Score', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
    }));
    y += 18;

    for (const entry of data.entries.slice(0, 10)) {
      const rowColor = entry.isPlayer ? COLORS.textGold : COLORS.textPrimary;
      const rankIcons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
      const rankDisplay = rankIcons[entry.rank] ?? `#${entry.rank}`;

      content.add(this.scene.add.text(0, y, rankDisplay, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: rowColor,
      }));
      content.add(this.scene.add.text(60, y, entry.guildName, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: rowColor, fontStyle: entry.isPlayer ? 'bold' : 'normal',
      }));
      content.add(this.scene.add.text(300, y, `${entry.score}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: rowColor,
      }));
      y += 18;

      // Highlight row for player
      if (entry.isPlayer) {
        const highlight = this.scene.add.graphics();
        highlight.fillStyle(COLORS.gold, 0.08);
        highlight.fillRect(0, y - 18, 460, 18);
        content.add(highlight);
      }
    }

    this.modal.open();
  }

  // --- T-0987, T-0988: Season Pass ---
  showSeasonPass(data: SeasonPassData): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: `Season Pass — ${data.season}`,
      width: 640, height: 420,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Current progress
    content.add(this.scene.add.text(0, y, `Tier ${data.currentTier} — ${data.currentXp} XP`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    }));

    content.add(this.scene.add.text(350, y, `${data.daysRemaining} days remaining`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }));
    y += 30;

    // Progress bar (overall)
    const maxXp = data.tiers[data.tiers.length - 1]?.xpRequired ?? 5000;
    const progress = Math.min(1, data.currentXp / maxXp);
    const barW = 600; const barH = 14;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x333333, 0.8);
    barBg.fillRoundedRect(0, y, barW, barH, 4);
    content.add(barBg);

    const barFill = this.scene.add.graphics();
    barFill.fillStyle(COLORS.gold, 0.8);
    barFill.fillRoundedRect(0, y, barW * progress, barH, 4);
    content.add(barFill);
    y += 24;

    // Reward track
    const tierW = 56;
    const trackY = y;
    for (const tier of data.tiers) {
      const tx = (tier.tier - 1) * (tierW + 4);
      if (tx + tierW > 600) break; // don't overflow

      const tierBg = this.scene.add.graphics();
      const bgColor = tier.claimed ? 0x1a3a2e
        : tier.unlocked ? COLORS.accent
        : COLORS.panelBg;
      tierBg.fillStyle(bgColor, 0.8);
      tierBg.fillRoundedRect(tx, trackY, tierW, 70, 4);
      tierBg.lineStyle(1, tier.unlocked ? COLORS.gold : COLORS.panelBorder);
      tierBg.strokeRoundedRect(tx, trackY, tierW, 70, 4);
      content.add(tierBg);

      // Tier number
      content.add(this.scene.add.text(tx + tierW / 2, trackY + 6, `T${tier.tier}`, {
        fontFamily: FONTS.primary, fontSize: '10px',
        color: tier.unlocked ? COLORS.textGold : '#666',
        fontStyle: 'bold',
      }).setOrigin(0.5));

      // XP required
      content.add(this.scene.add.text(tx + tierW / 2, trackY + 20, `${tier.xpRequired}`, {
        fontFamily: FONTS.primary, fontSize: '9px', color: '#888',
      }).setOrigin(0.5));

      // Reward label
      content.add(this.scene.add.text(tx + tierW / 2, trackY + 36, tier.reward.label, {
        fontFamily: FONTS.primary, fontSize: '9px',
        color: tier.claimed ? '#4ecca3' : COLORS.textSecondary,
        wordWrap: { width: tierW - 4 },
        align: 'center',
      }).setOrigin(0.5, 0));

      // Claimed checkmark
      if (tier.claimed) {
        content.add(this.scene.add.text(tx + tierW / 2, trackY + 58, '✓', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
          color: '#4ecca3', fontStyle: 'bold',
        }).setOrigin(0.5));
      }
    }
    y += 80;

    // Legend
    y += 10;
    const legendItems = [
      { color: '#4ecca3', label: 'Claimed' },
      { color: COLORS.textAccent, label: 'Available' },
      { color: '#666', label: 'Locked' },
    ];
    let lx = 0;
    for (const item of legendItems) {
      const dot = this.scene.add.graphics();
      dot.fillStyle(typeof item.color === 'string' ? parseInt(item.color.replace('#', ''), 16) : item.color, 0.8);
      dot.fillCircle(lx + 5, y + 6, 4);
      content.add(dot);
      content.add(this.scene.add.text(lx + 14, y, item.label, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      lx += 100;
    }

    this.modal.open();
  }

  // --- T-0989: End-of-Season Summary ---
  showEndOfSeasonSummary(data: EndOfSeasonData): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: `${data.season} Season Complete!`,
      width: 520, height: 440,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Celebration header
    content.add(this.scene.add.text(220, y, '★ Season Complete ★', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    y += 35;

    // Key metrics
    const metrics = [
      ['Total XP Earned', `${data.totalXpEarned}`],
      ['Season Pass Tier', `${data.seasonPassTier}/10`],
      ['Leaderboard Rank', `#${data.leaderboardRank}`],
      ['Expeditions', `${data.expeditionCount}`],
    ];
    for (const [label, value] of metrics) {
      content.add(this.scene.add.text(40, y, label, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      content.add(this.scene.add.text(300, y, value, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold, fontStyle: 'bold',
      }));
      y += 22;
    }
    y += 10;

    // Resources earned
    content.add(this.scene.add.text(40, y, 'Resources Earned This Season:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3', fontStyle: 'bold',
    }));
    y += 18;
    let rx = 40;
    for (const [res, amt] of Object.entries(data.resourcesSummary)) {
      content.add(this.scene.add.text(rx, y, `+${amt} ${res}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#4ecca3',
      }));
      rx += 100;
      if (rx > 400) { rx = 40; y += 16; }
    }
    y += 22;

    // Top achievements
    if (data.topAchievements.length > 0) {
      content.add(this.scene.add.text(40, y, 'Season Highlights:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold, fontStyle: 'bold',
      }));
      y += 18;
      for (const ach of data.topAchievements.slice(0, 5)) {
        content.add(this.scene.add.text(48, y, `★ ${ach}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#ffd700',
        }));
        y += 16;
      }
    }

    // Next season teaser
    y += 15;
    content.add(this.scene.add.text(220, y, `Next up: ${data.nextSeason}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary, fontStyle: 'bold',
    }).setOrigin(0.5, 0));

    this.modal.open();
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
