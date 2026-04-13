import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { apiClient } from '../api/client';

export class FriendListPanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private friendItems: Phaser.GameObjects.Container[] = [];
  private searchInput: Phaser.GameObjects.DOMElement | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.container = scene.add.container(x, y);

    this.buildUI();
  }

  private buildUI(): void {
    // Background panel
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, COLORS.panelBg, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.panelBorder);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(15, 15, 'Friends', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
    });
    this.container.add(title);

    // Search bar
    const searchHtml = `<input type="text" placeholder="Search players..." style="
      width:200px;padding:6px 10px;background:#1a1a2e;border:1px solid #0f3460;
      color:#fff;border-radius:4px;font-size:14px;outline:none;
    " />`;
    this.searchInput = this.scene.add.dom(this.width - 130, 22).createFromHTML(searchHtml);
    this.container.add(this.searchInput);

    // Add Friend button
    const addBtn = this.scene.add.text(this.width - 15, 15, '+ Add Friend', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.promptAddFriend());
    this.container.add(addBtn);

    // Pending requests section
    const pendingLabel = this.scene.add.text(15, 55, 'Pending Requests', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(pendingLabel);

    // Separator
    const sep = this.scene.add.rectangle(this.width / 2, 75, this.width - 30, 1, COLORS.panelBorder)
      .setOrigin(0.5, 0);
    this.container.add(sep);
  }

  async refresh(): Promise<void> {
    // Clear existing items
    for (const item of this.friendItems) {
      item.destroy();
    }
    this.friendItems = [];

    try {
      // Load pending requests
      const requests = await apiClient.getPendingFriendRequests();
      let yOff = 85;

      for (const req of requests.slice(0, 5)) {
        const item = this.createRequestItem(req, yOff);
        this.friendItems.push(item);
        this.container.add(item);
        yOff += 40;
      }

      if (requests.length === 0) {
        const noReqs = this.scene.add.text(15, yOff, 'No pending requests', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        });
        const c = this.scene.add.container(0, 0, [noReqs]);
        this.friendItems.push(c);
        this.container.add(c);
        yOff += 25;
      }

      // Friends list label
      yOff += 10;
      const friendsLabel = this.scene.add.text(15, yOff, 'Online Friends', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      const labelC = this.scene.add.container(0, 0, [friendsLabel]);
      this.friendItems.push(labelC);
      this.container.add(labelC);
      yOff += 25;

      // Load friends
      const friends = await apiClient.getFriendList();

      // Sort: online first
      friends.sort((a: any, b: any) => {
        if (a.presence === 'online' && b.presence !== 'online') return -1;
        if (a.presence !== 'online' && b.presence === 'online') return 1;
        return 0;
      });

      for (const friend of friends.slice(0, 15)) {
        const item = this.createFriendItem(friend, yOff);
        this.friendItems.push(item);
        this.container.add(item);
        yOff += 45;
      }

      if (friends.length === 0) {
        const noFriends = this.scene.add.text(15, yOff, 'No friends yet. Search for players to add!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        });
        const c = this.scene.add.container(0, 0, [noFriends]);
        this.friendItems.push(c);
        this.container.add(c);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }

  private createFriendItem(friend: any, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(15, y);

    // Status dot
    const statusColor = friend.presence === 'online' ? 0x4ecca3
      : friend.presence === 'idle' ? 0xf5a623
      : 0x666666;
    const dot = this.scene.add.circle(8, 12, 5, statusColor);
    container.add(dot);

    // Name
    const name = this.scene.add.text(22, 2, friend.username, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
    });
    container.add(name);

    // Guild info
    const guild = this.scene.add.text(22, 22, `${friend.guildName} (Lv.${friend.guildLevel})`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    container.add(guild);

    // Actions
    const viewBtn = this.scene.add.text(this.width - 160, 5, 'View', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    }).setInteractive({ useHandCursor: true });
    container.add(viewBtn);

    const giftBtn = this.scene.add.text(this.width - 110, 5, 'Gift', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3',
    }).setInteractive({ useHandCursor: true });
    container.add(giftBtn);

    const tradeBtn = this.scene.add.text(this.width - 60, 5, 'Trade', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#2980b9',
    }).setInteractive({ useHandCursor: true });
    container.add(tradeBtn);

    return container;
  }

  private createRequestItem(req: any, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(15, y);

    const text = this.scene.add.text(0, 5, `${req.fromUsername} wants to be your friend`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
    });
    container.add(text);

    const acceptBtn = this.scene.add.text(this.width - 120, 5, 'Accept', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        await apiClient.acceptFriendRequest(req.id);
        this.refresh();
      });
    container.add(acceptBtn);

    const declineBtn = this.scene.add.text(this.width - 55, 5, 'Decline', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        await apiClient.declineFriendRequest(req.id);
        this.refresh();
      });
    container.add(declineBtn);

    return container;
  }

  private async promptAddFriend(): Promise<void> {
    const name = prompt('Enter player username to add:');
    if (!name) return;

    try {
      const results = await apiClient.searchPlayers(name);
      if (results.length > 0) {
        await apiClient.sendFriendRequest(results[0].id);
        this.refresh();
      }
    } catch (err) {
      console.error('Add friend error:', err);
    }
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
