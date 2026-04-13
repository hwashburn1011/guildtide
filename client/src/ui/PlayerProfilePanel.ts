import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { apiClient } from '../api/client';

export class PlayerProfilePanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private contentItems: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.container = scene.add.container(x, y);
    this.buildUI();
  }

  private buildUI(): void {
    // Background
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, COLORS.panelBg, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.panelBorder);
    this.container.add(bg);
  }

  async refresh(): Promise<void> {
    this.clearContent();

    try {
      // Load own profile (get playerId from token)
      const profile = await this.loadOwnProfile();
      if (!profile) {
        this.renderNoProfile();
        return;
      }
      this.renderProfile(profile);
    } catch (err) {
      console.error('Load profile error:', err);
      this.renderNoProfile();
    }
  }

  private async loadOwnProfile(): Promise<any> {
    // The profile endpoint needs a player ID - we can get our own from guild
    try {
      const guild = await apiClient.getGuild();
      if (guild?.playerId) {
        return apiClient.getPlayerProfile(guild.playerId);
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private renderProfile(profile: any): void {
    const c = this.scene.add.container(15, 15);

    // Avatar placeholder
    const avatar = this.scene.add.circle(40, 40, 35, COLORS.panelBorder);
    c.add(avatar);
    const avatarLabel = this.scene.add.text(40, 40, profile.username.charAt(0).toUpperCase(), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.title}px`,
      color: COLORS.textGold,
    }).setOrigin(0.5);
    c.add(avatarLabel);

    // Username
    const username = this.scene.add.text(90, 15, profile.username, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
    });
    c.add(username);

    // Status
    const statusDot = this.scene.add.circle(90, 48,  5,
      profile.presence === 'online' ? 0x4ecca3
        : profile.presence === 'idle' ? 0xf5a623
        : 0x666666,
    );
    c.add(statusDot);

    const statusText = this.scene.add.text(100, 42, profile.presence, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });
    c.add(statusText);

    // Status message
    if (profile.statusMessage) {
      const statusMsg = this.scene.add.text(90, 62, `"${profile.statusMessage}"`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });
      c.add(statusMsg);
    }

    // Stats grid
    let y = 95;
    const sep = this.scene.add.rectangle(this.width / 2 - 15, y, this.width - 30, 1, COLORS.panelBorder)
      .setOrigin(0.5, 0);
    c.add(sep);
    y += 15;

    const stats = [
      { label: 'Guild', value: `${profile.guildName} (Lv.${profile.guildLevel})` },
      { label: 'Region', value: profile.regionId || 'Unknown' },
      { label: 'Hero Power', value: `${profile.heroPower}` },
      { label: 'Expeditions', value: `${profile.totalExpeditions}` },
      { label: 'Trade Volume', value: `${profile.totalTradeVolume}` },
      { label: 'Joined', value: new Date(profile.joinedAt).toLocaleDateString() },
    ];

    for (const stat of stats) {
      const label = this.scene.add.text(0, y, stat.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      c.add(label);

      const value = this.scene.add.text(150, y, stat.value, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      });
      c.add(value);
      y += 25;
    }

    // Achievements section
    y += 15;
    const achTitle = this.scene.add.text(0, y, 'Achievements', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    });
    c.add(achTitle);
    y += 25;

    if (profile.achievements && profile.achievements.length > 0) {
      for (const ach of profile.achievements.slice(0, 5)) {
        const achText = this.scene.add.text(0, y, `★ ${ach}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#4ecca3',
        });
        c.add(achText);
        y += 20;
      }
    } else {
      const noAch = this.scene.add.text(0, y, 'No achievements yet', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      c.add(noAch);
      y += 20;
    }

    // Action buttons
    y += 15;
    const editStatusBtn = this.scene.add.text(0, y, '[Edit Status Message]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        const msg = prompt('Enter status message:');
        if (msg !== null) {
          await apiClient.setStatusMessage(msg);
          this.refresh();
        }
      });
    c.add(editStatusBtn);

    const shareBtn = this.scene.add.text(200, y, '[Share Profile]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#2980b9',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        try {
          const card = await apiClient.getPlayerCard(profile.id);
          if (card?.shareUrl) {
            await navigator.clipboard.writeText(window.location.origin + card.shareUrl);
          }
        } catch (err) {
          console.error('Share error:', err);
        }
      });
    c.add(shareBtn);

    // Notification preferences
    const notifsBtn = this.scene.add.text(400, y, '[Notification Settings]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#8e44ad',
    }).setInteractive({ useHandCursor: true });
    c.add(notifsBtn);

    this.contentItems.push(c);
    this.container.add(c);
  }

  private renderNoProfile(): void {
    const text = this.scene.add.text(15, 20, 'Unable to load profile.', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    });
    const c = this.scene.add.container(0, 0, [text]);
    this.contentItems.push(c);
    this.container.add(c);
  }

  private clearContent(): void {
    for (const item of this.contentItems) {
      item.destroy();
    }
    this.contentItems = [];
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
