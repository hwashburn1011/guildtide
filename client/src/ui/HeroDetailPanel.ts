import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

const STAT_LABELS: Record<string, string> = {
  strength: 'STR', agility: 'AGI', intellect: 'INT', endurance: 'END', luck: 'LCK',
};

const MORALE_ICONS: Record<string, string> = {
  happy: '😊', neutral: '😐', unhappy: '😟', angry: '😡',
};

const ROLE_COLORS: Record<string, string> = {
  farmer: '#4ecca3', scout: '#4dabf7', merchant: '#ffd700', blacksmith: '#c87533',
  alchemist: '#be4bdb', hunter: '#e94560', defender: '#a0a0a0', mystic: '#9775fa',
  caravan_master: '#f59f00', archivist: '#74c0fc',
};

const STATUS_COLORS: Record<string, string> = {
  idle: '#a0a0b0', assigned: '#4ecca3', expedition: '#4dabf7',
  recovering: '#e94560', training: '#ffd700', resting: '#9775fa',
};

const TRAIT_LABELS: Record<string, string> = {
  stormborn: 'Stormborn', sunblessed: 'Sunblessed', frostward: 'Frostward',
  shrewd_trader: 'Shrewd Trader', lucky_forager: 'Lucky Forager', salvager: 'Salvager',
  hardy: 'Hardy', nimble: 'Nimble', brave: 'Brave', greedy: 'Greedy',
  cautious: 'Cautious', loyal: 'Loyal', scholarly: 'Scholarly', charismatic: 'Charismatic',
  stubborn: 'Stubborn', inventive: 'Inventive',
};

const RARITY_LABELS: Record<number, string> = {
  1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Legendary',
};

export class HeroDetailPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroId: string;
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, heroId: string, onChanged: () => void) {
    this.scene = scene;
    this.heroId = heroId;
    this.onChanged = onChanged;
  }

  async show(): Promise<void> {
    const hero = await apiClient.getHeroDetail(this.heroId);
    if (!hero) return;

    // Overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.75);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(200);

    this.container = this.scene.add.container(0, 0).setDepth(201);

    const panelW = 1000;
    const panelH = 640;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Background with rarity-colored border
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    const rarityColor = Phaser.Display.Color.HexStringToColor(hero.rarityColor || '#808080').color;
    bg.lineStyle(3, rarityColor);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 12, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // ── Left column: portrait, name, role ──
    const leftX = px + 20;
    let ly = py + 20;

    // Portrait background (colored by rarity)
    const portraitBg = this.scene.add.graphics();
    portraitBg.fillStyle(rarityColor, 0.3);
    portraitBg.fillRoundedRect(leftX, ly, 120, 120, 8);
    portraitBg.lineStyle(2, rarityColor);
    portraitBg.strokeRoundedRect(leftX, ly, 120, 120, 8);
    this.container.add(portraitBg);

    // Role icon in portrait area
    const roleInitial = hero.role.charAt(0).toUpperCase();
    this.container.add(this.scene.add.text(leftX + 60, ly + 60, roleInitial, {
      fontFamily: FONTS.primary, fontSize: '48px', color: ROLE_COLORS[hero.role] || '#fff', fontStyle: 'bold',
    }).setOrigin(0.5));

    ly += 130;

    // Name + nickname
    const displayName = hero.nickname ? `"${hero.nickname}" ${hero.name}` : hero.name;
    this.container.add(this.scene.add.text(leftX, ly, displayName, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textPrimary, fontStyle: 'bold',
      wordWrap: { width: 200 },
    }));
    ly += 24;

    // Role + Level
    const roleLabel = hero.role.replace(/_/g, ' ');
    this.container.add(this.scene.add.text(leftX, ly, `${roleLabel} - Lv ${hero.level}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: ROLE_COLORS[hero.role] || COLORS.textSecondary,
    }));
    ly += 20;

    // Specialization
    if (hero.specialization) {
      this.container.add(this.scene.add.text(leftX, ly, `Spec: ${hero.specialization.name || hero.specialization}`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: '#ffd700',
      }));
      ly += 16;
    }

    // Evolution
    if (hero.evolution) {
      this.container.add(this.scene.add.text(leftX, ly, `Class: ${hero.evolution.name || hero.evolution}`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: '#e94560',
      }));
      ly += 16;
    }

    // Rarity
    this.container.add(this.scene.add.text(leftX, ly, `${RARITY_LABELS[hero.rarityTier] || 'Common'} Hero`, {
      fontFamily: FONTS.primary, fontSize: '11px', color: hero.rarityColor || '#808080',
    }));
    ly += 20;

    // Traits
    const traitStr = (hero.traits || []).map((t: string) => TRAIT_LABELS[t] || t).join(', ');
    this.container.add(this.scene.add.text(leftX, ly, `Traits: ${traitStr}`, {
      fontFamily: FONTS.primary, fontSize: '11px', color: '#6a6a7a', wordWrap: { width: 200 },
    }));
    ly += 30;

    // Status
    this.container.add(this.scene.add.text(leftX, ly, `Status: ${hero.status}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: STATUS_COLORS[hero.status] || '#a0a0b0',
    }));
    ly += 20;

    // Morale
    const moraleIcon = MORALE_ICONS[hero.moraleLabel] || '';
    this.container.add(this.scene.add.text(leftX, ly, `Morale: ${hero.morale} ${moraleIcon}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: hero.morale >= 60 ? '#4ecca3' : '#e94560',
    }));
    ly += 20;

    // Power Score
    this.container.add(this.scene.add.text(leftX, ly, `Power: ${hero.powerScore}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold,
    }));
    ly += 25;

    // Favorite button
    const favBtn = this.scene.add.text(leftX, ly, hero.favorited ? '★ Favorited' : '☆ Favorite', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: hero.favorited ? '#ffd700' : COLORS.textSecondary,
    }).setInteractive({ useHandCursor: true });
    favBtn.on('pointerup', async () => {
      await apiClient.toggleHeroFavorite(this.heroId);
      this.hide();
      this.show();
    });
    this.container.add(favBtn);

    // ── Center column: stats + XP ──
    const centerX = px + 240;
    let cy = py + 20;

    this.container.add(this.scene.add.text(centerX, cy, 'Stats', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    cy += 28;

    // Stat radar chart (simplified as bars)
    const stats = hero.stats || {};
    const maxStat = Math.max(1, ...Object.values(stats).map(v => v as number));
    for (const [stat, value] of Object.entries(stats)) {
      const label = STAT_LABELS[stat] || stat;
      this.container.add(this.scene.add.text(centerX, cy, `${label}: ${value}`, {
        fontFamily: FONTS.primary, fontSize: '13px', color: COLORS.textPrimary,
      }));

      // Bar
      const barWidth = 150;
      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0x333355, 0.8);
      barBg.fillRect(centerX + 60, cy + 2, barWidth, 12);
      this.container.add(barBg);

      const fillWidth = Math.min(barWidth, ((value as number) / maxStat) * barWidth);
      const barFill = this.scene.add.graphics();
      barFill.fillStyle(Phaser.Display.Color.HexStringToColor(ROLE_COLORS[hero.role] || '#4ecca3').color, 1);
      barFill.fillRect(centerX + 60, cy + 2, fillWidth, 12);
      this.container.add(barFill);

      cy += 22;
    }

    cy += 10;

    // XP bar
    this.container.add(this.scene.add.text(centerX, cy, `XP: ${hero.xp} / ${hero.xpToNext}`, {
      fontFamily: FONTS.primary, fontSize: '13px', color: COLORS.textSecondary,
    }));
    cy += 18;

    const xpBarWidth = 210;
    const xpBg = this.scene.add.graphics();
    xpBg.fillStyle(0x333355, 0.8);
    xpBg.fillRect(centerX, cy, xpBarWidth, 10);
    this.container.add(xpBg);

    const xpFillWidth = hero.xpToNext > 0 ? (hero.xp / hero.xpToNext) * xpBarWidth : 0;
    const xpFill = this.scene.add.graphics();
    xpFill.fillStyle(0xffd700, 1);
    xpFill.fillRect(centerX, cy, Math.min(xpBarWidth, xpFillWidth), 10);
    this.container.add(xpFill);
    cy += 20;

    // Skill points
    this.container.add(this.scene.add.text(centerX, cy, `Skill Points: ${hero.skillPoints || 0}`, {
      fontFamily: FONTS.primary, fontSize: '13px', color: hero.skillPoints > 0 ? '#ffd700' : COLORS.textSecondary,
    }));
    cy += 20;

    // Unlocked skills count
    const skillCount = (hero.unlockedSkills || []).length;
    this.container.add(this.scene.add.text(centerX, cy, `Skills Unlocked: ${skillCount}`, {
      fontFamily: FONTS.primary, fontSize: '13px', color: COLORS.textSecondary,
    }));
    cy += 25;

    // Equipment
    this.container.add(this.scene.add.text(centerX, cy, 'Equipment', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    cy += 20;

    const equipment = hero.equipment || {};
    for (const [slot, item] of Object.entries(equipment)) {
      this.container.add(this.scene.add.text(centerX, cy, `${slot}: ${item || '(empty)'}`, {
        fontFamily: FONTS.primary, fontSize: '12px', color: item ? COLORS.textPrimary : '#6a6a7a',
      }));
      cy += 16;
    }
    cy += 15;

    // Biome affinities
    if (hero.biomeAffinities?.length > 0) {
      this.container.add(this.scene.add.text(centerX, cy, `Affinities: ${hero.biomeAffinities.join(', ')}`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: '#6a6a7a',
      }));
      cy += 16;
    }

    // Injury
    if (hero.injury && !hero.injury.healedAt) {
      this.container.add(this.scene.add.text(centerX, cy, `INJURED - Recovering (${hero.injury.recoveryHours}h)`, {
        fontFamily: FONTS.primary, fontSize: '12px', color: '#e94560', fontStyle: 'bold',
      }));
      cy += 16;
    }

    // ── Right column: stories, quests, actions ──
    const rightX = px + 500;
    let ry = py + 20;

    // Stories
    if (hero.stories?.length > 0) {
      this.container.add(this.scene.add.text(rightX, ry, 'Journal', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
      }));
      ry += 20;

      for (const story of hero.stories.slice(-3)) {
        this.container.add(this.scene.add.text(rightX, ry, `Lv ${story.level}: ${story.text}`, {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#9a9ab0', wordWrap: { width: panelW - (rightX - px) - 30 },
        }));
        ry += 32;
      }
      ry += 10;
    }

    // Available quests
    if (hero.availableQuests?.length > 0) {
      this.container.add(this.scene.add.text(rightX, ry, 'Available Quests', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
      }));
      ry += 20;

      for (const quest of hero.availableQuests.slice(0, 3)) {
        this.container.add(this.scene.add.text(rightX, ry, `[${quest.type}] ${quest.title}`, {
          fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textAccent,
        }));
        ry += 14;
        this.container.add(this.scene.add.text(rightX + 10, ry, quest.description, {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#6a6a7a', wordWrap: { width: panelW - (rightX - px) - 40 },
        }));
        ry += 30;
      }
      ry += 10;
    }

    // XP log
    if (hero.xpLog?.length > 0) {
      this.container.add(this.scene.add.text(rightX, ry, 'Recent XP', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
      }));
      ry += 18;

      for (const entry of hero.xpLog.slice(-5)) {
        this.container.add(this.scene.add.text(rightX, ry, `+${entry.amount} (${entry.source})`, {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#6a6a7a',
        }));
        ry += 14;
      }
      ry += 10;
    }

    // ── Bottom action buttons ──
    const btnY = py + panelH - 50;
    let btnX = px + 20;
    const btnGap = 120;

    // Nickname button
    const nickBtn = this.scene.add.text(btnX, btnY, 'Set Nickname', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent,
    }).setInteractive({ useHandCursor: true });
    nickBtn.on('pointerup', async () => {
      const name = prompt('Enter nickname (max 20 chars):');
      if (name) {
        await apiClient.setHeroNickname(this.heroId, name);
        this.onChanged();
        this.hide();
        this.show();
      }
    });
    this.container.add(nickBtn);
    btnX += btnGap;

    // Skill Tree button
    const skillBtn = this.scene.add.text(btnX, btnY, 'Skill Tree', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent,
    }).setInteractive({ useHandCursor: true });
    skillBtn.on('pointerup', () => {
      // Import dynamically to avoid circular
      import('./HeroSkillTreePanel').then(({ HeroSkillTreePanel }) => {
        const panel = new HeroSkillTreePanel(this.scene, this.heroId, hero.role, this.onChanged);
        panel.show();
      });
    });
    this.container.add(skillBtn);
    btnX += btnGap;

    // Training button
    const trainBtn = this.scene.add.text(btnX, btnY, 'Train', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent,
    }).setInteractive({ useHandCursor: true });
    trainBtn.on('pointerup', () => {
      import('./HeroTrainingPanel').then(({ HeroTrainingPanel }) => {
        const panel = new HeroTrainingPanel(this.scene, this.heroId, hero, this.onChanged);
        panel.show();
      });
    });
    this.container.add(trainBtn);
    btnX += btnGap;

    // Retire button (if high enough level)
    if (hero.level >= 15) {
      const retireBtn = this.scene.add.text(btnX, btnY, 'Retire', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700',
      }).setInteractive({ useHandCursor: true });
      retireBtn.on('pointerup', async () => {
        if (confirm(`Retire ${hero.name}? This is permanent but grants legacy bonuses.`)) {
          await apiClient.retireHero(this.heroId);
          this.onChanged();
          this.hide();
        }
      });
      this.container.add(retireBtn);
      btnX += btnGap;
    }

    // Dismiss button
    const dismissBtn = this.scene.add.text(btnX, btnY, 'Dismiss', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#e94560',
    }).setInteractive({ useHandCursor: true });
    dismissBtn.on('pointerup', async () => {
      if (confirm(`Dismiss ${hero.name}? This cannot be undone.`)) {
        const result = await apiClient.dismissHero(this.heroId);
        alert(result.farewellMessage);
        this.onChanged();
        this.hide();
      }
    });
    this.container.add(dismissBtn);
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
