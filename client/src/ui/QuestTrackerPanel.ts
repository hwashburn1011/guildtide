/**
 * QuestTrackerPanel — Active quest display with objective progress.
 *
 * T-1344: Quest log UI with active, completed, and failed tabs
 * T-1345: Quest objective tracking with progress display
 * T-1346: Quest turn-in system with NPC dialog and reward screen
 * T-1349: Quest marker system on world map for active quests
 * T-1350: Quest notification for new quest availability
 * T-1351: World history timeline displaying major events
 * T-1353: Timeline UI with scrollable visual layout
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

type QuestTab = 'active' | 'available' | 'completed' | 'timeline';

export class QuestTrackerPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private currentTab: QuestTab = 'active';
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, onChanged: () => void) {
    this.scene = scene;
    this.onChanged = onChanged;
  }

  async show(tab: QuestTab = 'active'): Promise<void> {
    this.currentTab = tab;

    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Quest Log',
      width: 650,
      height: 520,
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
    const tabs: Array<{ key: QuestTab; label: string }> = [
      { key: 'active', label: 'Active' },
      { key: 'available', label: 'Available' },
      { key: 'completed', label: 'Completed' },
      { key: 'timeline', label: 'Timeline' },
    ];

    const px = (GAME_WIDTH - 650) / 2;
    const py = (GAME_HEIGHT - 520) / 2;
    let x = px + 15;
    const y = py + 45;

    for (const tab of tabs) {
      const isActive = this.currentTab === tab.key;
      const btn = this.scene.add.text(x, y, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: isActive ? 'bold' : 'normal',
        backgroundColor: isActive ? '#1a3a5c' : undefined,
        padding: { x: 8, y: 4 },
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => this.show(tab.key));
      container.add(btn);
      x += btn.width + 10;
    }
  }

  private async renderContent(container: Phaser.GameObjects.Container): Promise<void> {
    const px = (GAME_WIDTH - 650) / 2;
    const py = (GAME_HEIGHT - 520) / 2;
    const contentY = py + 75;

    try {
      switch (this.currentTab) {
        case 'active':
          await this.renderActiveQuests(container, px + 15, contentY);
          break;
        case 'available':
          await this.renderAvailableQuests(container, px + 15, contentY);
          break;
        case 'completed':
          await this.renderCompletedQuests(container, px + 15, contentY);
          break;
        case 'timeline':
          await this.renderTimeline(container, px + 15, contentY);
          break;
      }
    } catch {
      container.add(this.scene.add.text(px + 325, contentY + 100, 'Failed to load quest data', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textAccent,
      }).setOrigin(0.5));
    }
  }

  private async renderActiveQuests(container: Phaser.GameObjects.Container, x: number, y: number): Promise<void> {
    const quests = await apiClient.getQuests();
    let ly = y;

    if (!quests.active || quests.active.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No active quests. Check the Available tab for new adventures!', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textSecondary,
        wordWrap: { width: 600 },
      }));
      return;
    }

    for (const quest of quests.active) {
      if (!quest) continue;

      // Quest title
      container.add(this.scene.add.text(x, ly, quest.title || quest.id, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
      }));
      ly += 22;

      // Category badge
      const catColor = quest.category === 'main' ? '#e94560' : quest.category === 'hero_story' ? '#9775fa' : '#4dabf7';
      container.add(this.scene.add.text(x, ly, quest.category?.toUpperCase() || 'QUEST', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: catColor,
        backgroundColor: '#0a1628', padding: { x: 4, y: 2 },
      }));
      ly += 20;

      // Fetch progress for this quest
      try {
        const progress = await apiClient.getQuestProgress(quest.id);
        if (progress.stage) {
          container.add(this.scene.add.text(x + 10, ly, progress.stage.title, {
            fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textPrimary,
          }));
          ly += 18;

          for (const obj of progress.stage.objectives) {
            const current = progress.progress[obj.id] || 0;
            const complete = current >= obj.required;
            const icon = complete ? '\u2713' : '\u25CB';
            const color = complete ? '#4ecca3' : COLORS.textSecondary;
            container.add(this.scene.add.text(x + 20, ly, `${icon} ${obj.description} (${current}/${obj.required})`, {
              fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color,
            }));
            ly += 16;
          }

          // Turn-in button if all complete
          const allDone = progress.stage.objectives.every(
            (o: any) => (progress.progress[o.id] || 0) >= o.required,
          );
          if (allDone) {
            const turnInBtn = this.scene.add.text(x + 20, ly, '\u2B50 Turn In Quest', {
              fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700',
              fontStyle: 'bold',
            }).setInteractive({ useHandCursor: true });
            turnInBtn.on('pointerup', async () => {
              await apiClient.turnInQuest(quest.id);
              this.onChanged();
              this.show('active');
            });
            container.add(turnInBtn);
            ly += 20;
          }
        }
      } catch {
        // Skip progress display on error
      }
      ly += 10;
    }
  }

  private async renderAvailableQuests(container: Phaser.GameObjects.Container, x: number, y: number): Promise<void> {
    const quests = await apiClient.getQuests();
    let ly = y;

    if (!quests.available || quests.available.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No new quests available right now. Keep progressing!', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textSecondary,
      }));
      return;
    }

    for (const quest of quests.available) {
      const catColor = quest.category === 'main' ? '#e94560' : quest.category === 'hero_story' ? '#9775fa' : '#4dabf7';

      container.add(this.scene.add.text(x, ly, `${quest.title}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
      }));
      ly += 20;

      container.add(this.scene.add.text(x, ly, quest.category?.toUpperCase() || 'SIDE', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: catColor,
        backgroundColor: '#0a1628', padding: { x: 4, y: 2 },
      }));
      ly += 18;

      container.add(this.scene.add.text(x + 10, ly, quest.description, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
        wordWrap: { width: 580 },
      }));
      ly += 22;

      const acceptBtn = this.scene.add.text(x + 10, ly, '\u25B6 Accept Quest', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#4ecca3', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      acceptBtn.on('pointerup', async () => {
        await apiClient.startQuest(quest.id);
        this.onChanged();
        this.show('active');
      });
      container.add(acceptBtn);
      ly += 28;
    }
  }

  private async renderCompletedQuests(container: Phaser.GameObjects.Container, x: number, y: number): Promise<void> {
    const quests = await apiClient.getQuests();
    let ly = y;

    if (!quests.completed || quests.completed.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No completed quests yet.', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textSecondary,
      }));
      return;
    }

    container.add(this.scene.add.text(x, ly, `${quests.completed.length} quest${quests.completed.length !== 1 ? 's' : ''} completed`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: '#4ecca3', fontStyle: 'bold',
    }));
    ly += 28;

    for (const id of quests.completed) {
      container.add(this.scene.add.text(x, ly, `\u2713 ${id}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }));
      ly += 18;
    }
  }

  // T-1351, T-1353: World history timeline
  private async renderTimeline(container: Phaser.GameObjects.Container, x: number, y: number): Promise<void> {
    const timeline = await apiClient.getTimeline();
    let ly = y;

    container.add(this.scene.add.text(x, ly, 'World History Timeline', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    ly += 30;

    // Draw timeline line
    const lineX = x + 40;
    const line = this.scene.add.graphics();
    line.lineStyle(2, COLORS.panelBorder);
    line.beginPath();
    line.moveTo(lineX, ly);
    line.lineTo(lineX, ly + timeline.length * 40);
    line.strokePath();
    container.add(line);

    for (const event of timeline) {
      const discovered = event.discovered;
      const dotColor = discovered ? 0x4ecca3 : 0x333355;

      // Timeline dot
      const dot = this.scene.add.graphics();
      dot.fillStyle(dotColor, 1);
      dot.fillCircle(lineX, ly + 6, 5);
      container.add(dot);

      // Year
      container.add(this.scene.add.text(x, ly, `Y${event.year}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: discovered ? '#4ecca3' : '#555566',
      }));

      // Title
      container.add(this.scene.add.text(lineX + 15, ly, discovered ? event.title : '??? (Undiscovered)', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: discovered ? COLORS.textPrimary : '#555566',
      }));

      ly += 28;
    }
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
