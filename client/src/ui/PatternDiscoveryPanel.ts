/**
 * PatternDiscoveryPanel — Helps players discover real-world to game connections.
 *
 * T-0813: Moon phase display with current phase icon
 * T-0815: Lunar calendar display
 * T-0824: Real-world data tutorial
 * T-0833: Compound effect display
 * T-0845: Real-world data impact report
 * T-0849: Event correlation leaderboard
 * T-0850: Test interface support
 * T-0853: Global event significance scoring display
 * T-0857: A/B test framework display
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

interface MoonCalendarEntry {
  date: string;
  phase: string;
  label: string;
  icon: string;
}

interface CompoundEffect {
  name: string;
  description: string;
  modifiers: Record<string, number>;
}

interface ImpactReportEntry {
  date: string;
  modifiers: Record<string, number>;
  moonPhase: string;
  celebrations: number;
}

export class PatternDiscoveryPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private currentTab: 'patterns' | 'lunar' | 'tutorial' | 'impact' = 'patterns';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(tab: 'patterns' | 'lunar' | 'tutorial' | 'impact' = 'patterns'): Promise<void> {
    this.currentTab = tab;

    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Pattern Discovery',
      width: 580,
      height: 520,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    // Tab buttons
    this.renderTabs(content);

    try {
      switch (this.currentTab) {
        case 'patterns':
          await this.renderPatterns(content);
          break;
        case 'lunar':
          await this.renderLunarCalendar(content);
          break;
        case 'tutorial':
          await this.renderTutorial(content);
          break;
        case 'impact':
          await this.renderImpactReport(content);
          break;
      }
    } catch {
      content.add(
        this.scene.add.text(270, 100, 'Failed to load data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderTabs(container: Phaser.GameObjects.Container): void {
    const tabs = [
      { key: 'patterns' as const, label: 'Patterns' },
      { key: 'lunar' as const, label: 'Lunar' },
      { key: 'tutorial' as const, label: 'Guide' },
      { key: 'impact' as const, label: 'Impact' },
    ];

    let x = 0;
    for (const tab of tabs) {
      const isActive = tab.key === this.currentTab;
      const btn = this.scene.add.text(x, 0, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: isActive ? 'bold' : 'normal',
        backgroundColor: isActive ? '#16213e' : undefined,
        padding: { x: 12, y: 6 },
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerup', () => {
        this.show(tab.key);
      });

      container.add(btn);
      x += btn.width + 8;
    }
  }

  // ---- Patterns Tab ----

  private async renderPatterns(container: Phaser.GameObjects.Container): Promise<void> {
    let y = 40;

    const [modifierData, pipelineData] = await Promise.all([
      apiClient.getModifierSummary(),
      apiClient.getDataPipeline(),
    ]);

    // Active compound effects (T-0833)
    container.add(
      this.scene.add.text(0, y, 'Active Compound Effects', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    const compounds = modifierData.compoundEffects || [];
    if (compounds.length === 0) {
      container.add(
        this.scene.add.text(15, y, 'No compound effects active. These trigger when multiple conditions align.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 500 },
        }),
      );
      y += 30;
    } else {
      for (const effect of compounds) {
        container.add(
          this.scene.add.text(15, y, `✦ ${effect.name}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#ffd700',
            fontStyle: 'bold',
          }),
        );
        y += 18;

        container.add(
          this.scene.add.text(25, y, effect.description, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
            wordWrap: { width: 480 },
          }),
        );
        y += 22;

        for (const [key, value] of Object.entries(effect.modifiers)) {
          const pct = Math.round(((value as number) - 1) * 100);
          const display = pct >= 0 ? `+${pct}%` : `${pct}%`;
          const color = pct >= 0 ? '#4ecca3' : '#e94560';

          container.add(
            this.scene.add.text(35, y, `${key}: ${display}`, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color,
            }),
          );
          y += 16;
        }
        y += 5;
      }
    }

    // Celebrations
    const celebrations = pipelineData.celebrations || [];
    if (celebrations.length > 0) {
      y += 10;
      container.add(
        this.scene.add.text(0, y, 'Active Celebrations', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ffd700',
          fontStyle: 'bold',
        }),
      );
      y += 25;

      for (const cel of celebrations) {
        container.add(
          this.scene.add.text(15, y, `✦ ${cel.fantasyName}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#c8a84e',
          }),
        );
        y += 18;

        container.add(
          this.scene.add.text(25, y, cel.description, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
            wordWrap: { width: 480 },
          }),
        );
        y += 22;
      }
    }

    // Astronomical events
    const astroEvents = pipelineData.astronomicalEvents || [];
    if (astroEvents.length > 0) {
      y += 10;
      container.add(
        this.scene.add.text(0, y, 'Astronomical Events', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#9b59b6',
          fontStyle: 'bold',
        }),
      );
      y += 25;

      for (const event of astroEvents) {
        container.add(
          this.scene.add.text(15, y, `☆ ${event.fantasyName || event.name}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#c39bd3',
          }),
        );
        y += 20;
      }
    }
  }

  // ---- Lunar Calendar Tab (T-0813, T-0815) ----

  private async renderLunarCalendar(container: Phaser.GameObjects.Container): Promise<void> {
    let y = 40;

    const data = await apiClient.getLunarCalendar();
    const calendar: MoonCalendarEntry[] = data.calendar;
    const currentPhase = data.currentPhase;

    // Current moon phase (T-0813)
    container.add(
      this.scene.add.text(0, y, `Current Moon: ${currentPhase.icon} ${currentPhase.label}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#c8a84e',
        fontStyle: 'bold',
      }),
    );
    y += 25;

    // Effects
    const effects = [
      { label: 'Magic Potency', value: currentPhase.magicPotency },
      { label: 'Stealth Bonus', value: currentPhase.stealthBonus },
      { label: 'Essence Drops', value: currentPhase.essenceDrops },
      { label: 'Hunt Bonus', value: currentPhase.huntBonus },
    ];

    for (const effect of effects) {
      if (Math.abs(effect.value - 1.0) < 0.01) continue;
      const pct = Math.round((effect.value - 1) * 100);
      const display = pct >= 0 ? `+${pct}%` : `${pct}%`;
      const color = pct >= 0 ? '#4ecca3' : '#e94560';

      container.add(
        this.scene.add.text(15, y, `${effect.label}: ${display}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color,
        }),
      );
      y += 20;
    }

    y += 10;

    // Calendar grid (T-0815)
    container.add(
      this.scene.add.text(0, y, '30-Day Lunar Calendar', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    // Grid: 7 columns x ~5 rows
    const cellSize = 64;
    const cols = 7;

    for (let i = 0; i < Math.min(28, calendar.length); i++) {
      const entry = calendar[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * (cellSize + 4);
      const cy = y + row * (cellSize + 4);

      // Cell background
      const cellBg = this.scene.add.graphics();
      cellBg.fillStyle(i === 0 ? 0x2a2a5e : COLORS.panelBg, 0.8);
      cellBg.fillRoundedRect(cx, cy, cellSize, cellSize, 4);
      cellBg.lineStyle(1, i === 0 ? 0xffd700 : COLORS.panelBorder, 0.5);
      cellBg.strokeRoundedRect(cx, cy, cellSize, cellSize, 4);
      container.add(cellBg);

      // Day number
      const dayNum = new Date(entry.date).getDate().toString();
      container.add(
        this.scene.add.text(cx + 4, cy + 2, dayNum, {
          fontFamily: FONTS.primary,
          fontSize: '9px',
          color: COLORS.textSecondary,
        }),
      );

      // Moon icon
      container.add(
        this.scene.add.text(cx + cellSize / 2, cy + cellSize / 2, entry.icon, {
          fontSize: '22px',
        }).setOrigin(0.5),
      );
    }
  }

  // ---- Tutorial Tab (T-0824) ----

  private async renderTutorial(container: Phaser.GameObjects.Container): Promise<void> {
    let y = 40;

    const data = await apiClient.getDataTutorial();
    const steps = data.steps;

    container.add(
      this.scene.add.text(0, y, 'How Real-World Data Affects Your Guild', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Step number
      container.add(
        this.scene.add.text(0, y, `${i + 1}.`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );

      // Step title
      container.add(
        this.scene.add.text(25, y, step.title, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 22;

      // Step text
      const text = this.scene.add.text(25, y, step.text, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 480 },
      });
      container.add(text);
      y += text.height + 15;
    }
  }

  // ---- Impact Report Tab (T-0845) ----

  private async renderImpactReport(container: Phaser.GameObjects.Container): Promise<void> {
    let y = 40;

    const data = await apiClient.getImpactReport();
    const report: ImpactReportEntry[] = data.report;

    container.add(
      this.scene.add.text(0, y, 'Real-World Data Impact History', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    if (report.length === 0) {
      container.add(
        this.scene.add.text(0, y, 'Impact data will accumulate over the coming days.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );
      return;
    }

    // Table headers
    const headers = ['Date', 'Moon', 'Events', 'Net Effect'];
    const colWidths = [100, 80, 60, 120];
    let hx = 0;
    for (let i = 0; i < headers.length; i++) {
      container.add(
        this.scene.add.text(hx, y, headers[i], {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );
      hx += colWidths[i];
    }
    y += 18;

    // Table rows
    for (const entry of report.slice(-15)) {
      let rx = 0;

      // Date
      container.add(
        this.scene.add.text(rx, y, entry.date, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );
      rx += colWidths[0];

      // Moon
      container.add(
        this.scene.add.text(rx, y, entry.moonPhase, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#c8a84e',
        }),
      );
      rx += colWidths[1];

      // Celebrations
      container.add(
        this.scene.add.text(rx, y, String(entry.celebrations), {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: entry.celebrations > 0 ? '#ffd700' : COLORS.textSecondary,
        }),
      );
      rx += colWidths[2];

      // Net effect (average of all modifiers)
      const modValues = Object.values(entry.modifiers || {});
      if (modValues.length > 0) {
        const avg = modValues.reduce((a, b) => a + b, 0) / modValues.length;
        const pct = Math.round((avg - 1) * 100);
        const display = pct >= 0 ? `+${pct}%` : `${pct}%`;
        const color = pct >= 0 ? '#4ecca3' : '#e94560';
        container.add(
          this.scene.add.text(rx, y, display, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color,
          }),
        );
      }

      y += 18;
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
