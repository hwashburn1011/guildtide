/**
 * JournalPanel — Player codex/journal with lore, quests, discoveries, and narrative progress.
 *
 * T-1324: Lore codex UI with categorized entries (history, creatures, places, people)
 * T-1325: Lore entry detail view with text, related entries, and discovery info
 * T-1326: Lore search and filter in codex
 * T-1330: Pattern journal tracking discovered and hinted patterns
 * T-1344: Quest log UI with active, completed, and failed tabs
 * T-1359: Rumor log with verified/unverified status
 * T-1370: Lore completion percentage per region
 * T-1371: Narrative achievement system
 * T-1374: Journal quick-reference for tracking narrative progress
 * T-1376: Easter egg collection page
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

type JournalTab = 'overview' | 'lore' | 'quests' | 'patterns' | 'rumors' | 'achievements' | 'easter_eggs';

const LORE_CATEGORIES = ['history', 'creatures', 'places', 'people', 'mythology', 'prophecy'] as const;

const CATEGORY_ICONS: Record<string, string> = {
  history: '\u{1F4DC}', creatures: '\u{1F43E}', places: '\u{1F3D4}',
  people: '\u{1F464}', mythology: '\u{2728}', prophecy: '\u{1F52E}',
};

export class JournalPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private currentTab: JournalTab = 'overview';
  private selectedCategory: string | null = null;
  private searchText = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(tab: JournalTab = 'overview'): Promise<void> {
    this.currentTab = tab;

    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Journal & Codex',
      width: 700,
      height: 560,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    this.renderTabs(content);
    await this.renderContent(content);
  }

  private renderTabs(container: Phaser.GameObjects.Container): void {
    const tabs: Array<{ key: JournalTab; label: string }> = [
      { key: 'overview', label: 'Overview' },
      { key: 'lore', label: 'Lore' },
      { key: 'quests', label: 'Quests' },
      { key: 'patterns', label: 'Patterns' },
      { key: 'rumors', label: 'Rumors' },
      { key: 'achievements', label: 'Achievements' },
      { key: 'easter_eggs', label: 'Secrets' },
    ];

    const px = (GAME_WIDTH - 700) / 2;
    const py = (GAME_HEIGHT - 560) / 2;
    const startX = px + 10;
    let x = startX;
    const y = py + 45;

    for (const tab of tabs) {
      const isActive = this.currentTab === tab.key;
      const btn = this.scene.add.text(x, y, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: isActive ? 'bold' : 'normal',
        backgroundColor: isActive ? '#1a3a5c' : undefined,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        this.currentTab = tab.key;
        this.show(tab.key);
      });
      container.add(btn);
      x += btn.width + 8;
    }
  }

  private async renderContent(container: Phaser.GameObjects.Container): Promise<void> {
    const px = (GAME_WIDTH - 700) / 2;
    const py = (GAME_HEIGHT - 560) / 2;
    const contentY = py + 75;
    const contentW = 670;

    try {
      switch (this.currentTab) {
        case 'overview':
          await this.renderOverview(container, px + 15, contentY, contentW);
          break;
        case 'lore':
          await this.renderLore(container, px + 15, contentY, contentW);
          break;
        case 'quests':
          await this.renderQuests(container, px + 15, contentY, contentW);
          break;
        case 'patterns':
          await this.renderPatterns(container, px + 15, contentY, contentW);
          break;
        case 'rumors':
          await this.renderRumors(container, px + 15, contentY, contentW);
          break;
        case 'achievements':
          await this.renderAchievements(container, px + 15, contentY, contentW);
          break;
        case 'easter_eggs':
          await this.renderEasterEggs(container, px + 15, contentY, contentW);
          break;
      }
    } catch {
      container.add(this.scene.add.text(px + 350, contentY + 100, 'Failed to load journal data', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textAccent,
      }).setOrigin(0.5));
    }
  }

  private async renderOverview(container: Phaser.GameObjects.Container, x: number, y: number, _w: number): Promise<void> {
    const journal = await apiClient.getJournal();

    const items = [
      `Lore: ${journal.lore.total.discovered}/${journal.lore.total.total} entries (${journal.lore.total.percent}%)`,
      `Active Quests: ${journal.activeQuests}`,
      `Completed Quests: ${journal.completedQuests}`,
      `Available Quests: ${journal.availableQuests}`,
      `Patterns Discovered: ${journal.patterns.discovered}`,
      `Pattern Hints: ${journal.patterns.hinted}`,
      `Books: ${journal.books.read}/${journal.books.owned} read (${journal.books.total} total)`,
      `Rumors: ${journal.rumors.total} heard, ${journal.rumors.unverified} unverified`,
      `Achievements: ${journal.achievements.length}`,
    ];

    container.add(this.scene.add.text(x, y, 'Journal Overview', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));

    let ly = y + 35;
    for (const item of items) {
      container.add(this.scene.add.text(x, ly, item, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textPrimary,
      }));
      ly += 28;
    }

    // Region lore completion
    ly += 10;
    container.add(this.scene.add.text(x, ly, 'Lore by Region:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    ly += 25;
    for (const [region, data] of Object.entries(journal.lore.byRegion as Record<string, any>)) {
      const bar = this.scene.add.graphics();
      bar.fillStyle(0x333355, 1);
      bar.fillRoundedRect(x, ly, 200, 14, 4);
      bar.fillStyle(0x4ecca3, 1);
      bar.fillRoundedRect(x, ly, 200 * (data.percent / 100), 14, 4);
      container.add(bar);
      container.add(this.scene.add.text(x + 210, ly, `${region}: ${data.percent}%`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      ly += 22;
    }
  }

  private async renderLore(container: Phaser.GameObjects.Container, x: number, y: number, w: number): Promise<void> {
    // Category buttons
    let cx = x;
    for (const cat of LORE_CATEGORIES) {
      const isSelected = this.selectedCategory === cat;
      const icon = CATEGORY_ICONS[cat] || '';
      const btn = this.scene.add.text(cx, y, `${icon} ${cat}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: isSelected ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: isSelected ? 'bold' : 'normal',
        backgroundColor: isSelected ? '#1a3a5c' : '#0f2030',
        padding: { x: 5, y: 3 },
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        this.selectedCategory = this.selectedCategory === cat ? null : cat;
        this.show('lore');
      });
      container.add(btn);
      cx += btn.width + 6;
    }

    const entries = await apiClient.getLoreEntries({
      category: this.selectedCategory || undefined,
      discoveredOnly: false,
    });

    let ly = y + 30;
    const completion = await apiClient.getLoreCompletion();
    container.add(this.scene.add.text(x, ly, `${completion.total.discovered}/${completion.total.total} entries discovered`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }));
    ly += 22;

    const maxVisible = 12;
    const visible = entries.slice(0, maxVisible);
    for (const entry of visible) {
      const discovered = entry.discovered;
      const title = discovered ? entry.title : '??? (Undiscovered)';
      const rColor = entry.rarity === 'legendary' ? '#ffd700' : entry.rarity === 'rare' ? '#9775fa' : entry.rarity === 'uncommon' ? '#4dabf7' : COLORS.textPrimary;
      const text = this.scene.add.text(x, ly, `${discovered ? '\u2713' : '\u2022'} ${title}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: discovered ? rColor : '#555566',
      }).setInteractive({ useHandCursor: discovered });
      if (discovered) {
        text.on('pointerup', () => this.showLoreDetail(entry));
      }
      container.add(text);
      ly += 20;
    }
    if (entries.length > maxVisible) {
      container.add(this.scene.add.text(x, ly, `... and ${entries.length - maxVisible} more`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
    }
  }

  private showLoreDetail(entry: any): void {
    if (!this.modal) return;
    const content = this.modal.getContentContainer();
    // Clear and show detail
    content.removeAll(true);
    this.renderTabs(content);

    const px = (GAME_WIDTH - 700) / 2;
    const py = (GAME_HEIGHT - 560) / 2;
    let ly = py + 75;

    const backBtn = this.scene.add.text(px + 15, ly, '\u2190 Back to Lore', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent,
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerup', () => this.show('lore'));
    content.add(backBtn);
    ly += 25;

    content.add(this.scene.add.text(px + 15, ly, entry.title, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    ly += 30;

    content.add(this.scene.add.text(px + 15, ly, `Category: ${entry.category} | Rarity: ${entry.rarity}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }));
    ly += 22;

    if (entry.regionId) {
      content.add(this.scene.add.text(px + 15, ly, `Region: ${entry.regionId}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      ly += 22;
    }

    content.add(this.scene.add.text(px + 15, ly, entry.text || '???', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textPrimary,
      wordWrap: { width: 660 }, lineSpacing: 4,
    }));
  }

  private async renderQuests(container: Phaser.GameObjects.Container, x: number, y: number, _w: number): Promise<void> {
    const quests = await apiClient.getQuests();

    container.add(this.scene.add.text(x, y, 'Active Quests', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    let ly = y + 25;

    if (quests.active.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No active quests.', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      ly += 20;
    } else {
      for (const q of quests.active) {
        if (!q) continue;
        container.add(this.scene.add.text(x, ly, `\u2022 ${q.title || q.id}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textPrimary,
        }));
        ly += 18;
      }
    }

    ly += 10;
    container.add(this.scene.add.text(x, ly, `Completed: ${quests.completed.length}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: '#4ecca3', fontStyle: 'bold',
    }));
    ly += 25;

    if (quests.available.length > 0) {
      container.add(this.scene.add.text(x, ly, 'Available Quests', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
      }));
      ly += 25;
      for (const q of quests.available) {
        const qText = this.scene.add.text(x, ly, `\u2B50 ${q.title} — ${q.description}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#4dabf7',
          wordWrap: { width: 640 },
        }).setInteractive({ useHandCursor: true });
        qText.on('pointerup', async () => {
          await apiClient.startQuest(q.id);
          this.show('quests');
        });
        container.add(qText);
        ly += qText.height + 5;
      }
    }
  }

  private async renderPatterns(container: Phaser.GameObjects.Container, x: number, y: number, _w: number): Promise<void> {
    const journal = await apiClient.getPatternJournal();

    container.add(this.scene.add.text(x, y, 'Discovered Patterns', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    let ly = y + 25;

    if (journal.discovered.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No patterns discovered yet.', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      ly += 20;
    } else {
      for (const p of journal.discovered) {
        container.add(this.scene.add.text(x, ly, `\u2713 ${p.name}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#4ecca3',
        }));
        ly += 16;
        container.add(this.scene.add.text(x + 15, ly, p.description, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
          wordWrap: { width: 620 },
        }));
        ly += 20;
      }
    }

    ly += 10;
    container.add(this.scene.add.text(x, ly, 'Hints', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    ly += 25;

    if (journal.hinted.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No hints received yet. Talk to NPCs to learn more.', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
    } else {
      for (const h of journal.hinted) {
        container.add(this.scene.add.text(x, ly, `\u2022 ${h.hintText}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#9775fa',
          fontStyle: 'italic', wordWrap: { width: 640 },
        }));
        ly += 22;
      }
    }
  }

  private async renderRumors(container: Phaser.GameObjects.Container, x: number, y: number, _w: number): Promise<void> {
    const rumors = await apiClient.getRumors();

    container.add(this.scene.add.text(x, y, 'Rumor Log', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    let ly = y + 25;

    if (rumors.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No rumors heard yet. Talk to NPCs!', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
    } else {
      for (const r of rumors.slice(-15)) {
        const status = r.verified ? '\u2713 Verified' : '\u2753 Unverified';
        const statusColor = r.verified ? '#4ecca3' : '#f5a623';
        container.add(this.scene.add.text(x, ly, `[${status}] ${r.text}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: statusColor,
          wordWrap: { width: 640 },
        }));
        ly += 22;
      }
    }
  }

  private async renderAchievements(container: Phaser.GameObjects.Container, x: number, y: number, _w: number): Promise<void> {
    const achievements = await apiClient.getNarrativeAchievements();

    container.add(this.scene.add.text(x, y, 'Narrative Achievements', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    let ly = y + 25;

    const achievementNames: Record<string, string> = {
      lore_complete_history: 'Historian — All history entries discovered',
      lore_complete_creatures: 'Bestiary Master — All creature entries discovered',
      lore_complete_places: 'Cartographer — All place entries discovered',
      lore_complete_people: 'Biographer — All people entries discovered',
      lore_complete_mythology: 'Mythologist — All mythology entries discovered',
      lore_complete_prophecy: 'Oracle — All prophecy entries discovered',
      lore_complete_all: 'Loremaster — All lore entries discovered',
      patterns_complete_all: 'Pattern Seeker — All hidden patterns discovered',
      main_quest_complete: 'Savior — Main quest line completed',
    };

    const allIds = Object.keys(achievementNames);
    for (const id of allIds) {
      const earned = achievements.includes(id);
      container.add(this.scene.add.text(x, ly, `${earned ? '\u{1F3C6}' : '\u{1F512}'} ${achievementNames[id]}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: earned ? '#ffd700' : '#555566',
      }));
      ly += 22;
    }
  }

  private async renderEasterEggs(container: Phaser.GameObjects.Container, x: number, y: number, _w: number): Promise<void> {
    const data = await apiClient.getEasterEggs();

    container.add(this.scene.add.text(x, y, `Secrets Found: ${data.discovered}/${data.total}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    let ly = y + 30;

    for (const egg of data.eggs) {
      container.add(this.scene.add.text(x, ly, `${egg.discovered ? '\u2B50' : '\u2753'} ${egg.name}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: egg.discovered ? '#ffd700' : '#555566',
      }));
      ly += 16;
      if (egg.discovered) {
        container.add(this.scene.add.text(x + 15, ly, egg.description, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
          wordWrap: { width: 620 },
        }));
        ly += 20;
      } else {
        ly += 4;
      }
    }
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
