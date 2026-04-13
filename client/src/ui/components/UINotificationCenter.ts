import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface NotificationEntry {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface UINotificationCenterConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  maxEntries?: number;
}

const TYPE_COLORS: Record<string, number> = {
  info: COLORS.panelBorder,
  success: COLORS.success,
  warning: COLORS.warning,
  error: COLORS.danger,
};

/**
 * Dropdown panel listing recent notifications with read/unread state,
 * timestamps, scrollable, max 20 entries.
 */
export class UINotificationCenter extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private entries: NotificationEntry[] = [];
  private entryContainers: Phaser.GameObjects.Container[] = [];
  private contentContainer: Phaser.GameObjects.Container;
  private panelWidth: number;
  private panelHeight: number;
  private maxEntries: number;
  private scrollOffset: number = 0;
  private titleText: Phaser.GameObjects.Text;
  private countText: Phaser.GameObjects.Text;

  private static readonly ROW_HEIGHT = 48;
  private static readonly PADDING = 10;

  constructor(scene: Phaser.Scene, config: UINotificationCenterConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);
    this.setDepth(400);

    this.panelWidth = config.width ?? 320;
    this.panelHeight = config.height ?? 360;
    this.maxEntries = config.maxEntries ?? 20;

    // Background
    this.bg = scene.add.graphics();
    this.drawBg();
    this.add(this.bg);

    // Header
    this.titleText = scene.add.text(
      UINotificationCenter.PADDING,
      UINotificationCenter.PADDING,
      'Notifications',
      {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      },
    );
    this.add(this.titleText);

    this.countText = scene.add.text(
      this.panelWidth - UINotificationCenter.PADDING,
      UINotificationCenter.PADDING + 2,
      '0 unread',
      {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      },
    );
    this.countText.setOrigin(1, 0);
    this.add(this.countText);

    // Content container with mask for scrolling
    this.contentContainer = scene.add.container(0, 40);
    this.add(this.contentContainer);

    const maskShape = scene.make.graphics({ x: 0, y: 0 });
    maskShape.fillRect(config.x, config.y + 40, this.panelWidth, this.panelHeight - 50);
    const mask = maskShape.createGeometryMask();
    this.contentContainer.setMask(mask);

    // Scroll interaction
    const scrollZone = scene.add.zone(
      this.panelWidth / 2,
      this.panelHeight / 2,
      this.panelWidth,
      this.panelHeight,
    );
    scrollZone.setInteractive();
    scrollZone.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
      this.scroll(dz > 0 ? 1 : -1);
    });
    this.add(scrollZone);

    this.setVisible(false);
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(COLORS.panelBg, 0.97);
    this.bg.fillRoundedRect(0, 0, this.panelWidth, this.panelHeight, 8);
    this.bg.lineStyle(2, COLORS.panelBorder, 1);
    this.bg.strokeRoundedRect(0, 0, this.panelWidth, this.panelHeight, 8);
  }

  addNotification(entry: Omit<NotificationEntry, 'id'>): void {
    const notification: NotificationEntry = {
      ...entry,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };
    this.entries.unshift(notification);

    // Enforce max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    this.rebuildList();
  }

  markAsRead(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.read = true;
      this.rebuildList();
    }
  }

  markAllAsRead(): void {
    this.entries.forEach((e) => (e.read = true));
    this.rebuildList();
  }

  clearAll(): void {
    this.entries = [];
    this.rebuildList();
  }

  getUnreadCount(): number {
    return this.entries.filter((e) => !e.read).length;
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  private scroll(direction: number): void {
    const maxScroll = Math.max(
      0,
      this.entries.length * UINotificationCenter.ROW_HEIGHT - (this.panelHeight - 50),
    );
    this.scrollOffset = Phaser.Math.Clamp(
      this.scrollOffset + direction * UINotificationCenter.ROW_HEIGHT,
      0,
      maxScroll,
    );
    this.contentContainer.y = 40 - this.scrollOffset;
  }

  private rebuildList(): void {
    // Clear old entries
    this.entryContainers.forEach((c) => c.destroy());
    this.entryContainers = [];

    const unreadCount = this.getUnreadCount();
    this.countText.setText(`${unreadCount} unread`);

    this.entries.forEach((entry, i) => {
      const row = this.scene.add.container(0, i * UINotificationCenter.ROW_HEIGHT);

      // Row background
      const rowBg = this.scene.add.graphics();
      const bgAlpha = entry.read ? 0.3 : 0.6;
      rowBg.fillStyle(entry.read ? 0x111128 : 0x1a1a3e, bgAlpha);
      rowBg.fillRect(
        UINotificationCenter.PADDING,
        0,
        this.panelWidth - UINotificationCenter.PADDING * 2,
        UINotificationCenter.ROW_HEIGHT - 4,
      );
      row.add(rowBg);

      // Type indicator dot
      const dotColor = TYPE_COLORS[entry.type ?? 'info'];
      const dot = this.scene.add.graphics();
      dot.fillStyle(dotColor, 1);
      dot.fillCircle(UINotificationCenter.PADDING + 8, UINotificationCenter.ROW_HEIGHT / 2 - 2, 4);
      row.add(dot);

      // Unread indicator
      if (!entry.read) {
        const unreadDot = this.scene.add.graphics();
        unreadDot.fillStyle(COLORS.accent, 1);
        unreadDot.fillCircle(this.panelWidth - UINotificationCenter.PADDING - 8, 10, 4);
        row.add(unreadDot);
      }

      // Message text
      const msgText = this.scene.add.text(
        UINotificationCenter.PADDING + 20,
        4,
        entry.message,
        {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: entry.read ? COLORS.textSecondary : COLORS.textPrimary,
          wordWrap: { width: this.panelWidth - 60 },
        },
      );
      row.add(msgText);

      // Timestamp
      const timeAgo = this.formatTimestamp(entry.timestamp);
      const timeText = this.scene.add.text(
        UINotificationCenter.PADDING + 20,
        UINotificationCenter.ROW_HEIGHT - 18,
        timeAgo,
        {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny - 2}px`,
          color: COLORS.textSecondary,
        },
      );
      row.add(timeText);

      // Click to mark as read
      const hitZone = this.scene.add.zone(
        this.panelWidth / 2,
        UINotificationCenter.ROW_HEIGHT / 2 - 2,
        this.panelWidth - UINotificationCenter.PADDING * 2,
        UINotificationCenter.ROW_HEIGHT - 4,
      );
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this.markAsRead(entry.id));
      row.add(hitZone);

      this.contentContainer.add(row);
      this.entryContainers.push(row);
    });
  }

  private formatTimestamp(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
