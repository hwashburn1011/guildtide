import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { FriendListPanel } from '../ui/FriendListPanel';
import { ChatPanel } from '../ui/ChatPanel';
import { AlliancePanel } from '../ui/AlliancePanel';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { PlayerProfilePanel } from '../ui/PlayerProfilePanel';

type SocialTab = 'friends' | 'chat' | 'alliance' | 'leaderboard' | 'profile';

export class SocialScene extends Phaser.Scene {
  private currentTab: SocialTab = 'friends';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private tabUnderline: Phaser.GameObjects.Rectangle | null = null;

  // Panels
  private friendListPanel: FriendListPanel | null = null;
  private chatPanel: ChatPanel | null = null;
  private alliancePanel: AlliancePanel | null = null;
  private leaderboardPanel: LeaderboardPanel | null = null;
  private profilePanel: PlayerProfilePanel | null = null;

  private contentContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'SocialScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);

    // Title
    this.add.text(GAME_WIDTH / 2, 30, 'Social Hub', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.title}px`,
      color: COLORS.textPrimary,
    }).setOrigin(0.5);

    // Tab bar
    const tabs: { key: SocialTab; label: string }[] = [
      { key: 'friends', label: 'Friends' },
      { key: 'chat', label: 'Chat' },
      { key: 'alliance', label: 'Alliance' },
      { key: 'leaderboard', label: 'Leaderboards' },
      { key: 'profile', label: 'Profile' },
    ];

    const tabWidth = GAME_WIDTH / tabs.length;
    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const btn = this.add.text(x, 70, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: this.currentTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.switchTab(tab.key));

      this.tabButtons.push(btn);
    });

    // Tab underline
    this.tabUnderline = this.add.rectangle(tabWidth / 2, 88, tabWidth - 20, 3, COLORS.gold)
      .setOrigin(0.5, 0);

    // Content area container
    this.contentContainer = this.add.container(0, 100);

    // Create panels
    this.friendListPanel = new FriendListPanel(this, 20, 0, GAME_WIDTH - 40, GAME_HEIGHT - 140);
    this.chatPanel = new ChatPanel(this, 20, 0, GAME_WIDTH - 40, GAME_HEIGHT - 140);
    this.alliancePanel = new AlliancePanel(this, 20, 0, GAME_WIDTH - 40, GAME_HEIGHT - 140);
    this.leaderboardPanel = new LeaderboardPanel(this, 20, 0, GAME_WIDTH - 40, GAME_HEIGHT - 140);
    this.profilePanel = new PlayerProfilePanel(this, 20, 0, GAME_WIDTH - 40, GAME_HEIGHT - 140);

    this.contentContainer.add([
      this.friendListPanel.container,
      this.chatPanel.container,
      this.alliancePanel.container,
      this.leaderboardPanel.container,
      this.profilePanel.container,
    ]);

    // Back button
    this.add.text(60, 30, '< Back', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textAccent,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('GuildHallScene'));

    // Show default tab
    this.switchTab('friends');

    // Load initial data
    this.loadData();
  }

  private switchTab(tab: SocialTab): void {
    this.currentTab = tab;

    // Update tab button colors
    const tabs: SocialTab[] = ['friends', 'chat', 'alliance', 'leaderboard', 'profile'];
    const tabWidth = GAME_WIDTH / tabs.length;

    tabs.forEach((t, i) => {
      this.tabButtons[i]?.setColor(t === tab ? COLORS.textGold : COLORS.textSecondary);
    });

    // Move underline
    const idx = tabs.indexOf(tab);
    if (this.tabUnderline) {
      this.tabUnderline.setX(tabWidth * idx + tabWidth / 2);
    }

    // Show/hide panels
    this.friendListPanel?.setVisible(tab === 'friends');
    this.chatPanel?.setVisible(tab === 'chat');
    this.alliancePanel?.setVisible(tab === 'alliance');
    this.leaderboardPanel?.setVisible(tab === 'leaderboard');
    this.profilePanel?.setVisible(tab === 'profile');

    // Load tab data
    switch (tab) {
      case 'friends': this.friendListPanel?.refresh(); break;
      case 'chat': this.chatPanel?.refresh(); break;
      case 'alliance': this.alliancePanel?.refresh(); break;
      case 'leaderboard': this.leaderboardPanel?.refresh(); break;
      case 'profile': this.profilePanel?.refresh(); break;
    }
  }

  private async loadData(): Promise<void> {
    try {
      await this.friendListPanel?.refresh();
    } catch (err) {
      console.error('Failed to load social data:', err);
    }
  }
}
