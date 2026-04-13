import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { FriendListPanel } from '../ui/FriendListPanel';
import { ChatPanel } from '../ui/ChatPanel';
import { AlliancePanel } from '../ui/AlliancePanel';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { PlayerProfilePanel } from '../ui/PlayerProfilePanel';
import { SocialTutorial } from '../ui/SocialTutorial';

type SocialTab = 'friends' | 'chat' | 'alliance' | 'leaderboard' | 'profile' | 'feed';

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
  private feedContainer: Phaser.GameObjects.Container | null = null;
  private feedItems: Phaser.GameObjects.Container[] = [];

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
      { key: 'feed', label: 'Feed' },
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

    // Feed container
    this.feedContainer = this.add.container(20, 0);
    const feedBg = this.add.rectangle(0, 0, GAME_WIDTH - 40, GAME_HEIGHT - 140, COLORS.panelBg, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.panelBorder);
    this.feedContainer.add(feedBg);
    const feedTitle = this.add.text(15, 15, 'Social Feed', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
    });
    this.feedContainer.add(feedTitle);

    this.contentContainer.add([
      this.friendListPanel.container,
      this.chatPanel.container,
      this.alliancePanel.container,
      this.leaderboardPanel.container,
      this.feedContainer,
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

    // Show tutorial on first visit
    if (SocialTutorial.shouldShow()) {
      new SocialTutorial(this);
    }
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
    this.feedContainer?.setVisible(tab === 'feed');
    this.profilePanel?.setVisible(tab === 'profile');

    // Load tab data
    switch (tab) {
      case 'friends': this.friendListPanel?.refresh(); break;
      case 'chat': this.chatPanel?.refresh(); break;
      case 'alliance': this.alliancePanel?.refresh(); break;
      case 'leaderboard': this.leaderboardPanel?.refresh(); break;
      case 'feed': this.loadFeed(); break;
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

  private async loadFeed(): Promise<void> {
    if (!this.feedContainer) return;

    // Clear existing items
    for (const item of this.feedItems) {
      item.destroy();
    }
    this.feedItems = [];

    try {
      const feed = await apiClient.getSocialFeed(30);
      let y = 50;

      for (const entry of feed) {
        const item = this.add.container(15, y);

        const username = this.add.text(0, 0, entry.username, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
        });
        item.add(username);

        const msg = this.add.text(0, 18, entry.message, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          wordWrap: { width: GAME_WIDTH - 120 },
        });
        item.add(msg);

        const time = this.add.text(GAME_WIDTH - 140, 0,
          new Date(entry.createdAt).toLocaleString(), {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          });
        item.add(time);

        this.feedContainer!.add(item);
        this.feedItems.push(item);
        y += 45;

        if (y > GAME_HEIGHT - 200) break;
      }

      if (feed.length === 0) {
        const noFeed = this.add.text(15, 55, 'No activity yet. Add friends to see their updates!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        });
        const c = this.add.container(0, 0, [noFeed]);
        this.feedContainer!.add(c);
        this.feedItems.push(c);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    }
  }
}
