import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { Hero, Building } from '@shared/types';
import { HeroRole, HeroTrait, BuildingType } from '@shared/enums';
import { apiClient } from '../api/client';

const ROLE_COLORS: Record<string, string> = {
  farmer: '#4ecca3', scout: '#4dabf7', merchant: '#ffd700', blacksmith: '#c87533',
  alchemist: '#be4bdb', hunter: '#e94560', defender: '#a0a0a0', mystic: '#9775fa',
  caravan_master: '#f59f00', archivist: '#74c0fc',
};

const TRAIT_LABELS: Record<string, string> = {
  stormborn: 'Stormborn', sunblessed: 'Sunblessed', frostward: 'Frostward',
  shrewd_trader: 'Shrewd Trader', lucky_forager: 'Lucky Forager', salvager: 'Salvager',
  hardy: 'Hardy', nimble: 'Nimble', brave: 'Brave', greedy: 'Greedy',
  cautious: 'Cautious', loyal: 'Loyal', scholarly: 'Scholarly', charismatic: 'Charismatic',
  stubborn: 'Stubborn', inventive: 'Inventive',
};

const MORALE_ICONS: Record<string, string> = {
  happy: '😊', neutral: '😐', unhappy: '😟', angry: '😡',
};

const RARITY_COLORS: Record<number, string> = {
  1: '#808080', 2: '#2ecc71', 3: '#3498db', 4: '#9b59b6', 5: '#f39c12',
};

type SortKey = 'name' | 'level' | 'role' | 'morale' | 'power';
type FilterRole = 'all' | string;
type FilterStatus = 'all' | string;
type ViewMode = 'list' | 'grid';

export class HeroRoster {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private heroes: Hero[];
  private buildings: Building[];
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private panelContainer: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;

  // Sort/filter state
  private sortKey: SortKey = 'level';
  private sortAsc: boolean = false;
  private filterRole: FilterRole = 'all';
  private filterStatus: FilterStatus = 'all';
  private searchQuery: string = '';
  private viewMode: ViewMode = 'list';
  private scrollOffset: number = 0;

  constructor(
    scene: Phaser.Scene,
    heroes: Hero[],
    buildings: Building[],
    onChanged: () => void,
  ) {
    this.scene = scene;
    this.heroes = heroes;
    this.buildings = buildings;
    this.onChanged = onChanged;
    this.container = scene.add.container(0, 0);
  }

  show(): void {
    // Overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.panelContainer = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 980;
    const panelH = 620;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.panelContainer.add(bg);

    // Title
    this.panelContainer.add(
      this.scene.add.text(px + 20, py + 12, 'Hero Roster', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textGold, fontStyle: 'bold',
      })
    );

    // Hero count
    this.panelContainer.add(
      this.scene.add.text(px + 180, py + 18, `(${this.heroes.length} heroes)`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      })
    );

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 12, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.panelContainer.add(closeBtn);

    // ── Toolbar row ──
    let toolX = px + 20;
    const toolY = py + 48;

    // View mode toggle
    const viewBtn = this.scene.add.text(toolX, toolY, this.viewMode === 'list' ? '☰ List' : '⊞ Grid', {
      fontFamily: FONTS.primary, fontSize: '12px', color: COLORS.textAccent,
    }).setInteractive({ useHandCursor: true });
    viewBtn.on('pointerup', () => {
      this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
      this.scrollOffset = 0;
      this.refresh(px, py, panelW, panelH);
    });
    this.panelContainer.add(viewBtn);
    toolX += 60;

    // Sort buttons
    const sortOptions: Array<{ key: SortKey; label: string }> = [
      { key: 'level', label: 'Level' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'morale', label: 'Morale' },
      { key: 'power', label: 'Power' },
    ];

    this.panelContainer.add(this.scene.add.text(toolX, toolY, 'Sort:', {
      fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
    }));
    toolX += 35;

    for (const opt of sortOptions) {
      const isActive = this.sortKey === opt.key;
      const sortBtn = this.scene.add.text(toolX, toolY, opt.label + (isActive ? (this.sortAsc ? '↑' : '↓') : ''), {
        fontFamily: FONTS.primary, fontSize: '11px', color: isActive ? '#ffd700' : '#6a6a7a',
      }).setInteractive({ useHandCursor: true });
      sortBtn.on('pointerup', () => {
        if (this.sortKey === opt.key) this.sortAsc = !this.sortAsc;
        else { this.sortKey = opt.key; this.sortAsc = false; }
        this.scrollOffset = 0;
        this.refresh(px, py, panelW, panelH);
      });
      this.panelContainer.add(sortBtn);
      toolX += 55;
    }

    // Filter by role
    toolX += 10;
    this.panelContainer.add(this.scene.add.text(toolX, toolY, 'Role:', {
      fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
    }));
    toolX += 35;

    const roleFilterBtn = this.scene.add.text(toolX, toolY,
      this.filterRole === 'all' ? 'All' : this.filterRole.replace(/_/g, ' '), {
        fontFamily: FONTS.primary, fontSize: '11px', color: this.filterRole === 'all' ? '#6a6a7a' : ROLE_COLORS[this.filterRole] || '#ffd700',
      }).setInteractive({ useHandCursor: true });
    roleFilterBtn.on('pointerup', () => {
      const allRoles = ['all', ...Object.values(HeroRole)];
      const idx = allRoles.indexOf(this.filterRole);
      this.filterRole = allRoles[(idx + 1) % allRoles.length];
      this.scrollOffset = 0;
      this.refresh(px, py, panelW, panelH);
    });
    this.panelContainer.add(roleFilterBtn);
    toolX += 80;

    // Filter by status
    this.panelContainer.add(this.scene.add.text(toolX, toolY, 'Status:', {
      fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
    }));
    toolX += 45;

    const statusFilterBtn = this.scene.add.text(toolX, toolY,
      this.filterStatus === 'all' ? 'All' : this.filterStatus, {
        fontFamily: FONTS.primary, fontSize: '11px', color: '#6a6a7a',
      }).setInteractive({ useHandCursor: true });
    statusFilterBtn.on('pointerup', () => {
      const statuses = ['all', 'idle', 'assigned', 'expedition', 'recovering', 'training'];
      const idx = statuses.indexOf(this.filterStatus);
      this.filterStatus = statuses[(idx + 1) % statuses.length];
      this.scrollOffset = 0;
      this.refresh(px, py, panelW, panelH);
    });
    this.panelContainer.add(statusFilterBtn);

    // ── Bottom buttons ──
    const bottomY = py + panelH - 30;

    // Recruit button
    const recruitBtn = this.scene.add.text(px + panelW - 20, bottomY, 'Recruit (50 Gold)', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent, fontStyle: 'bold',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    recruitBtn.on('pointerup', () => this.recruitHero());
    this.panelContainer.add(recruitBtn);

    // Batch actions
    const batchAssignBtn = this.scene.add.text(px + 20, bottomY, 'Auto-Assign Idle', {
      fontFamily: FONTS.primary, fontSize: '11px', color: '#4dabf7',
    }).setInteractive({ useHandCursor: true });
    batchAssignBtn.on('pointerup', async () => {
      const result = await apiClient.batchAssignIdle();
      alert(`${result.assigned} heroes auto-assigned`);
      const heroes = await apiClient.getHeroes();
      this.heroes = heroes;
      this.onChanged();
      this.refresh(px, py, panelW, panelH);
    });
    this.panelContainer.add(batchAssignBtn);

    const batchRestBtn = this.scene.add.text(px + 140, bottomY, 'Rest All', {
      fontFamily: FONTS.primary, fontSize: '11px', color: '#9775fa',
    }).setInteractive({ useHandCursor: true });
    batchRestBtn.on('pointerup', async () => {
      const result = await apiClient.batchRestAll();
      alert(`${result.rested} heroes rested`);
      const heroes = await apiClient.getHeroes();
      this.heroes = heroes;
      this.onChanged();
      this.refresh(px, py, panelW, panelH);
    });
    this.panelContainer.add(batchRestBtn);

    // Dashboard button
    const dashBtn = this.scene.add.text(px + 230, bottomY, 'Dashboard', {
      fontFamily: FONTS.primary, fontSize: '11px', color: '#ffd700',
    }).setInteractive({ useHandCursor: true });
    dashBtn.on('pointerup', async () => {
      const dash = await apiClient.getHeroDashboard();
      alert(`Heroes: ${dash.totalHeroes}\nAvg Level: ${dash.avgLevel}\nAvg Power: ${dash.avgPowerScore}\nAvg Morale: ${dash.avgMorale}\nHighest: ${dash.highestLevel}`);
    });
    this.panelContainer.add(dashBtn);

    // Render hero cards
    this.renderCards(px + 15, py + 70, panelW - 30, panelH - 120);
  }

  private getFilteredSortedHeroes(): Hero[] {
    let heroes = [...this.heroes];

    // Filter
    if (this.filterRole !== 'all') {
      heroes = heroes.filter(h => h.role === this.filterRole);
    }
    if (this.filterStatus !== 'all') {
      heroes = heroes.filter(h => h.status === this.filterStatus);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      heroes = heroes.filter(h =>
        h.name.toLowerCase().includes(q)
        || h.role.toLowerCase().includes(q)
        || (h.traits || []).some((t: string) => t.toLowerCase().includes(q))
        || ((h as any).nickname || '').toLowerCase().includes(q)
      );
    }

    // Pin favorites first
    heroes.sort((a, b) => {
      const aFav = (a as any).favorited ? 1 : 0;
      const bFav = (b as any).favorited ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      // Sort by selected key
      const dir = this.sortAsc ? 1 : -1;
      switch (this.sortKey) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'level': return (a.level - b.level) * dir;
        case 'role': return a.role.localeCompare(b.role) * dir;
        case 'morale': return (((a as any).morale || 70) - ((b as any).morale || 70)) * dir;
        case 'power': return (((a as any).powerScore || 0) - ((b as any).powerScore || 0)) * dir;
        default: return 0;
      }
    });

    return heroes;
  }

  private renderCards(x: number, y: number, width: number, height: number): void {
    if (!this.panelContainer) return;

    const heroes = this.getFilteredSortedHeroes();

    if (heroes.length === 0) {
      this.panelContainer.add(
        this.scene.add.text(x + width / 2, y + 100, this.heroes.length === 0
          ? 'No heroes yet.\nRecruit your first hero!'
          : 'No heroes match the current filters.', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary, align: 'center',
        }).setOrigin(0.5)
      );
      return;
    }

    if (this.viewMode === 'grid') {
      this.renderGrid(heroes, x, y, width, height);
    } else {
      this.renderList(heroes, x, y, width, height);
    }
  }

  private renderList(heroes: Hero[], x: number, y: number, width: number, height: number): void {
    const cardH = 72;
    const gap = 6;
    const maxVisible = Math.floor(height / (cardH + gap));

    const visibleHeroes = heroes.slice(this.scrollOffset, this.scrollOffset + maxVisible);

    visibleHeroes.forEach((hero, i) => {
      const cy = y + i * (cardH + gap);

      // Card bg with rarity tint
      const rarityTier = (hero as any).rarityTier || 1;
      const rarityColor = RARITY_COLORS[rarityTier] || '#808080';
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.8);
      cardBg.fillRoundedRect(x, cy, width, cardH, 6);
      cardBg.lineStyle(1, Phaser.Display.Color.HexStringToColor(rarityColor).color, 0.5);
      cardBg.strokeRoundedRect(x, cy, width, cardH, 6);
      this.panelContainer!.add(cardBg);

      const roleColor = ROLE_COLORS[hero.role] || COLORS.textSecondary;

      // Favorite star
      if ((hero as any).favorited) {
        this.panelContainer!.add(this.scene.add.text(x + 5, cy + 4, '★', {
          fontFamily: FONTS.primary, fontSize: '12px', color: '#ffd700',
        }));
      }

      // Name (clickable for detail)
      const nameText = this.scene.add.text(x + 20, cy + 6,
        (hero as any).nickname ? `"${(hero as any).nickname}" ${hero.name}` : hero.name, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textPrimary, fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      nameText.on('pointerup', () => this.openHeroDetail(hero.id));
      nameText.on('pointerover', () => nameText.setColor('#ffd700'));
      nameText.on('pointerout', () => nameText.setColor(COLORS.textPrimary));
      this.panelContainer!.add(nameText);

      // Role + Level
      this.panelContainer!.add(this.scene.add.text(x + 20, cy + 28,
        `${hero.role.replace(/_/g, ' ')} · Lv ${hero.level}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: roleColor,
      }));

      // Trait badges
      const traits = hero.traits || [];
      let traitX = x + 20;
      for (const trait of traits) {
        const label = TRAIT_LABELS[trait as string] || trait;
        const badge = this.scene.add.text(traitX, cy + 46, label, {
          fontFamily: FONTS.primary, fontSize: '9px', color: '#c0c0d0',
          backgroundColor: '#2a2a4a', padding: { x: 3, y: 1 },
        });
        this.panelContainer!.add(badge);
        traitX += badge.width + 6;
      }

      // Stats
      const stats = hero.stats;
      this.panelContainer!.add(this.scene.add.text(x + 280, cy + 8,
        `STR ${stats.strength}  AGI ${stats.agility}  INT ${stats.intellect}`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
      }));
      this.panelContainer!.add(this.scene.add.text(x + 280, cy + 24,
        `END ${stats.endurance}  LCK ${stats.luck}`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
      }));

      // Power score
      this.panelContainer!.add(this.scene.add.text(x + 280, cy + 42,
        `Power: ${(hero as any).powerScore || '—'}`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#ffd700',
      }));

      // Morale indicator
      const morale = (hero as any).morale ?? 70;
      const moraleLabel = morale >= 80 ? 'happy' : morale >= 60 ? 'neutral' : morale >= 40 ? 'unhappy' : 'angry';
      const moraleIcon = MORALE_ICONS[moraleLabel] || '';
      this.panelContainer!.add(this.scene.add.text(x + 470, cy + 8,
        `${moraleIcon} ${morale}`, {
        fontFamily: FONTS.primary, fontSize: '12px', color: morale >= 60 ? '#4ecca3' : '#e94560',
      }));

      // Status with injury indicator
      const statusEffects: string[] = [];
      if ((hero as any).injury) statusEffects.push('🤕');
      if ((hero as any).training) statusEffects.push('💪');
      const statusStr = `${hero.status}${statusEffects.length > 0 ? ' ' + statusEffects.join('') : ''}`;

      // Assignment status
      const assignText = hero.assignment ? `Assigned: ${hero.assignment}` : statusStr;
      this.panelContainer!.add(this.scene.add.text(x + 470, cy + 28, assignText, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: hero.assignment ? '#4ecca3' : '#6a6a7a',
      }));

      // Action buttons (right side)
      if (hero.assignment) {
        const unassignBtn = this.scene.add.text(x + width - 10, cy + cardH / 2, 'Unassign', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        unassignBtn.on('pointerup', () => this.assignHero(hero.id, null));
        this.panelContainer!.add(unassignBtn);
      } else if (hero.status === 'idle') {
        const assignBtn = this.scene.add.text(x + width - 10, cy + cardH / 2, 'Assign ▼', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent,
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        assignBtn.on('pointerup', () => this.showAssignMenu(hero, x + width - 120, cy + cardH));
        this.panelContainer!.add(assignBtn);
      }
    });

    // Scroll indicators
    if (this.scrollOffset > 0) {
      const upBtn = this.scene.add.text(x + width / 2, y - 5, '▲ More', {
        fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textAccent,
      }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
      upBtn.on('pointerup', () => {
        this.scrollOffset = Math.max(0, this.scrollOffset - 3);
        this.panelContainer!.removeAll(true);
        this.show();
      });
      this.panelContainer!.add(upBtn);
    }

    if (this.scrollOffset + maxVisible < heroes.length) {
      const downBtn = this.scene.add.text(x + width / 2, y + height + 5, '▼ More', {
        fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textAccent,
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      downBtn.on('pointerup', () => {
        this.scrollOffset += 3;
        this.panelContainer!.removeAll(true);
        this.show();
      });
      this.panelContainer!.add(downBtn);
    }
  }

  private renderGrid(heroes: Hero[], x: number, y: number, width: number, _height: number): void {
    const cardW = 145;
    const cardH = 130;
    const gap = 8;
    const cols = Math.floor(width / (cardW + gap));

    heroes.forEach((hero, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = x + col * (cardW + gap);
      const cy = y + row * (cardH + gap);

      if (cy > y + 430) return; // overflow guard

      const rarityTier = (hero as any).rarityTier || 1;
      const rarityColor = RARITY_COLORS[rarityTier] || '#808080';

      // Card bg
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.8);
      cardBg.fillRoundedRect(cx, cy, cardW, cardH, 6);
      cardBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(rarityColor).color, 0.7);
      cardBg.strokeRoundedRect(cx, cy, cardW, cardH, 6);
      this.panelContainer!.add(cardBg);

      // Role initial (mini portrait)
      const roleColor = ROLE_COLORS[hero.role] || '#fff';
      this.panelContainer!.add(this.scene.add.text(cx + 20, cy + 25, hero.role.charAt(0).toUpperCase(), {
        fontFamily: FONTS.primary, fontSize: '24px', color: roleColor, fontStyle: 'bold',
      }).setOrigin(0.5));

      // Favorite
      if ((hero as any).favorited) {
        this.panelContainer!.add(this.scene.add.text(cx + 5, cy + 3, '★', {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#ffd700',
        }));
      }

      // Name (clickable)
      const shortName = hero.name.length > 14 ? hero.name.substring(0, 12) + '..' : hero.name;
      const nameText = this.scene.add.text(cx + 42, cy + 8, shortName, {
        fontFamily: FONTS.primary, fontSize: '12px', color: COLORS.textPrimary, fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      nameText.on('pointerup', () => this.openHeroDetail(hero.id));
      nameText.on('pointerover', () => nameText.setColor('#ffd700'));
      nameText.on('pointerout', () => nameText.setColor(COLORS.textPrimary));
      this.panelContainer!.add(nameText);

      // Level
      this.panelContainer!.add(this.scene.add.text(cx + 42, cy + 25, `Lv ${hero.level}`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: roleColor,
      }));

      // Morale
      const morale = (hero as any).morale ?? 70;
      const moraleLabel = morale >= 80 ? 'happy' : morale >= 60 ? 'neutral' : morale >= 40 ? 'unhappy' : 'angry';
      this.panelContainer!.add(this.scene.add.text(cx + cardW - 8, cy + 8,
        MORALE_ICONS[moraleLabel] || '', {
        fontFamily: FONTS.primary, fontSize: '12px', color: '#fff',
      }).setOrigin(1, 0));

      // Stats summary
      const stats = hero.stats;
      this.panelContainer!.add(this.scene.add.text(cx + 8, cy + 50,
        `S${stats.strength} A${stats.agility} I${stats.intellect}\nE${stats.endurance} L${stats.luck}`, {
        fontFamily: FONTS.primary, fontSize: '9px', color: COLORS.textSecondary,
      }));

      // Status
      this.panelContainer!.add(this.scene.add.text(cx + 8, cy + cardH - 18, hero.status, {
        fontFamily: FONTS.primary, fontSize: '9px',
        color: hero.status === 'idle' ? '#6a6a7a' : '#4ecca3',
      }));

      // Power
      this.panelContainer!.add(this.scene.add.text(cx + cardW - 8, cy + cardH - 18,
        `⚔${(hero as any).powerScore || '—'}`, {
        fontFamily: FONTS.primary, fontSize: '9px', color: '#ffd700',
      }).setOrigin(1, 0));
    });
  }

  private openHeroDetail(heroId: string): void {
    import('./HeroDetailPanel').then(({ HeroDetailPanel }) => {
      const panel = new HeroDetailPanel(this.scene, heroId, () => {
        this.refreshHeroes();
      });
      panel.show();
    });
  }

  private async refreshHeroes(): Promise<void> {
    try {
      const heroes = await apiClient.getHeroes();
      this.heroes = heroes;
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      console.error('Refresh error:', err);
    }
  }

  private refresh(px: number, py: number, panelW: number, panelH: number): void {
    this.hide();
    this.show();
  }

  private showAssignMenu(hero: Hero, x: number, y: number): void {
    if (!this.panelContainer) return;

    const menuBg = this.scene.add.graphics();
    menuBg.fillStyle(0x0f3460, 0.98);
    const menuItems = this.buildings.length > 0 ? this.buildings : [];
    if (menuItems.length === 0) return;

    const menuH = menuItems.length * 28 + 10;
    menuBg.fillRoundedRect(x, y, 140, menuH, 4);
    menuBg.setDepth(102);
    this.panelContainer.add(menuBg);

    menuItems.forEach((building, i) => {
      const item = this.scene.add.text(x + 10, y + 5 + i * 28, building.type, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textPrimary,
      }).setInteractive({ useHandCursor: true }).setDepth(102);

      item.on('pointerover', () => item.setColor(COLORS.textGold));
      item.on('pointerout', () => item.setColor(COLORS.textPrimary));
      item.on('pointerup', () => {
        this.assignHero(hero.id, building.type);
        menuBg.destroy();
        menuItems.forEach(() => item.destroy());
      });

      this.panelContainer!.add(item);
    });
  }

  private async assignHero(heroId: string, assignment: string | null): Promise<void> {
    try {
      await apiClient.assignHero(heroId, assignment);
      await this.refreshHeroes();
    } catch (err) {
      console.error('Assign error:', err);
    }
  }

  private async recruitHero(): Promise<void> {
    try {
      const result = await apiClient.recruitHero();
      this.heroes.push(result.hero);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      console.error('Recruit error:', err);
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.panelContainer?.destroy(true);
    this.overlay = null;
    this.panelContainer = null;
  }

  setHeroes(heroes: Hero[]): void {
    this.heroes = heroes;
  }

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
  }
}
