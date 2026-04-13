/**
 * CalendarSharePanel — Calendar sharing for guild event coordination.
 *
 * T-0990: Calendar sharing feature for guild event coordination
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';

interface SharedCalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'festival' | 'guild_event' | 'expedition' | 'custom';
  createdBy: string;
  description: string;
}

interface CalendarShareData {
  guildName: string;
  events: SharedCalendarEvent[];
  shareCode: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  festival: '#ffd700',
  guild_event: '#4ecca3',
  expedition: '#e94560',
  custom: '#5b9bd5',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  festival: 'Festival',
  guild_event: 'Guild Event',
  expedition: 'Expedition',
  custom: 'Custom',
};

export class CalendarSharePanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onCreateEvent: () => void;
  private onCopyShareCode: (code: string) => void;

  constructor(
    scene: Phaser.Scene,
    onCreateEvent: () => void,
    onCopyShareCode: (code: string) => void,
  ) {
    this.scene = scene;
    this.onCreateEvent = onCreateEvent;
    this.onCopyShareCode = onCopyShareCode;
  }

  show(data: CalendarShareData): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: `${data.guildName} — Shared Calendar`,
      width: 560, height: 460,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Share code section
    const codeBg = this.scene.add.graphics();
    codeBg.fillStyle(0x1a2a3e, 0.8);
    codeBg.fillRoundedRect(0, y, 520, 40, 6);
    content.add(codeBg);

    content.add(this.scene.add.text(12, y + 8, 'Share Code:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }));

    content.add(this.scene.add.text(110, y + 8, data.shareCode, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    }));

    const copyBtn = new UIButton(this.scene, {
      x: 380, y: y + 4, width: 80, height: 30,
      text: 'Copy', variant: 'secondary', fontSize: FONTS.sizes.tiny,
      onClick: () => this.onCopyShareCode(data.shareCode),
    });
    content.add(copyBtn);
    y += 50;

    // Create event button
    const createBtn = new UIButton(this.scene, {
      x: 0, y: y, width: 150, height: 35,
      text: '+ Create Event', variant: 'primary', fontSize: FONTS.sizes.small,
      onClick: () => this.onCreateEvent(),
    });
    content.add(createBtn);
    y += 50;

    // Events list header
    content.add(this.scene.add.text(0, y, 'Upcoming Shared Events', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary, fontStyle: 'bold',
    }));
    y += 25;

    if (data.events.length === 0) {
      content.add(this.scene.add.text(0, y, 'No shared events yet. Create one to coordinate with your guild!', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary, fontStyle: 'italic',
        wordWrap: { width: 500 },
      }));
    }

    // Event cards
    for (const event of data.events.slice(0, 6)) {
      const cardH = 60;
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.panelBg, 0.8);
      cardBg.fillRoundedRect(0, y, 520, cardH, 6);
      cardBg.lineStyle(1, COLORS.panelBorder);
      cardBg.strokeRoundedRect(0, y, 520, cardH, 6);
      content.add(cardBg);

      // Type badge
      const typeColor = EVENT_TYPE_COLORS[event.type] ?? '#888';
      const typeLabel = EVENT_TYPE_LABELS[event.type] ?? event.type;
      content.add(this.scene.add.text(10, y + 6, typeLabel, {
        fontFamily: FONTS.primary, fontSize: '10px', color: typeColor, fontStyle: 'bold',
      }));

      // Date
      content.add(this.scene.add.text(100, y + 6, event.date, {
        fontFamily: FONTS.primary, fontSize: '10px', color: COLORS.textSecondary,
      }));

      // Title
      content.add(this.scene.add.text(10, y + 22, event.title, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary, fontStyle: 'bold',
      }));

      // Description
      content.add(this.scene.add.text(10, y + 40, event.description, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary, wordWrap: { width: 400 },
      }));

      // Created by
      content.add(this.scene.add.text(420, y + 40, `by ${event.createdBy}`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#666',
      }));

      y += cardH + 6;
    }

    this.modal.open();
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
