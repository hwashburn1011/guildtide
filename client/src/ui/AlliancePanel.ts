import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { apiClient } from '../api/client';

type AllianceTab = 'overview' | 'members' | 'treasury' | 'wars' | 'events' | 'recruitment';

export class AlliancePanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private contentItems: Phaser.GameObjects.Container[] = [];
  private currentTab: AllianceTab = 'overview';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private alliance: any = null;

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

    // Sub-tabs
    const tabs: { key: AllianceTab; label: string }[] = [
      { key: 'overview', label: 'Overview' },
      { key: 'members', label: 'Members' },
      { key: 'treasury', label: 'Treasury' },
      { key: 'wars', label: 'Wars' },
      { key: 'events', label: 'Events' },
      { key: 'recruitment', label: 'Recruit' },
    ];

    tabs.forEach((tab, i) => {
      const btn = this.scene.add.text(15 + i * 100, 10, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.currentTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.switchTab(tab.key));
      this.tabButtons.push(btn);
      this.container.add(btn);
    });

    // Separator
    const sep = this.scene.add.rectangle(this.width / 2, 32, this.width - 20, 1, COLORS.panelBorder)
      .setOrigin(0.5, 0);
    this.container.add(sep);
  }

  private switchTab(tab: AllianceTab): void {
    this.currentTab = tab;
    const allTabs: AllianceTab[] = ['overview', 'members', 'treasury', 'wars', 'events', 'recruitment'];
    this.tabButtons.forEach((btn, i) => {
      btn.setColor(allTabs[i] === tab ? COLORS.textGold : COLORS.textSecondary);
    });
    this.renderContent();
  }

  async refresh(): Promise<void> {
    try {
      this.alliance = await apiClient.getMyAlliance();
    } catch {
      this.alliance = null;
    }
    this.renderContent();
  }

  private clearContent(): void {
    for (const item of this.contentItems) {
      item.destroy();
    }
    this.contentItems = [];
  }

  private renderContent(): void {
    this.clearContent();

    if (!this.alliance) {
      this.renderNoAlliance();
      return;
    }

    switch (this.currentTab) {
      case 'overview': this.renderOverview(); break;
      case 'members': this.renderMembers(); break;
      case 'treasury': this.renderTreasury(); break;
      case 'wars': this.renderWars(); break;
      case 'events': this.renderEvents(); break;
      case 'recruitment': this.renderRecruitment(); break;
    }
  }

  private renderNoAlliance(): void {
    const c = this.scene.add.container(15, 50);

    const text = this.scene.add.text(0, 0, 'You are not in an alliance.', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
    });
    c.add(text);

    const createBtn = this.scene.add.text(0, 40, '[Create Alliance]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        const name = prompt('Enter alliance name (3-30 chars):');
        if (!name || name.length < 3) return;
        const desc = prompt('Enter description:') ?? '';
        try {
          await apiClient.createAlliance(name, desc);
          this.refresh();
        } catch (err) {
          console.error('Create alliance error:', err);
        }
      });
    c.add(createBtn);

    const browseBtn = this.scene.add.text(0, 80, '[Browse Recruitment]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#2980b9',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.currentTab = 'recruitment';
        this.renderContent();
      });
    c.add(browseBtn);

    this.contentItems.push(c);
    this.container.add(c);
  }

  private renderOverview(): void {
    const a = this.alliance;
    if (!a) return;
    const c = this.scene.add.container(15, 45);

    let y = 0;
    const lines = [
      { label: 'Name', value: a.name },
      { label: 'Level', value: `${a.level}` },
      { label: 'XP', value: `${a.xp}` },
      { label: 'Members', value: `${a.members.length}/${a.maxMembers}` },
      { label: 'Description', value: a.description || 'No description' },
      { label: 'Rules', value: a.rules || 'None set' },
      { label: 'Recruiting', value: a.isRecruiting ? 'Yes' : 'No' },
    ];

    for (const line of lines) {
      const label = this.scene.add.text(0, y, `${line.label}:`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      c.add(label);

      const val = this.scene.add.text(120, y, line.value, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        wordWrap: { width: this.width - 160 },
      });
      c.add(val);
      y += 28;
    }

    // Alliance perks
    y += 15;
    const perksTitle = this.scene.add.text(0, y, 'Active Perks:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    });
    c.add(perksTitle);
    y += 22;

    // Leave button
    const leaveBtn = this.scene.add.text(0, y + 60, '[Leave Alliance]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        if (confirm('Are you sure you want to leave this alliance?')) {
          try {
            await apiClient.leaveAlliance(a.id);
            this.alliance = null;
            this.renderContent();
          } catch (err) {
            console.error('Leave error:', err);
          }
        }
      });
    c.add(leaveBtn);

    this.contentItems.push(c);
    this.container.add(c);
  }

  private renderMembers(): void {
    const a = this.alliance;
    if (!a) return;
    const c = this.scene.add.container(15, 45);

    let y = 0;
    for (const member of a.members) {
      const roleColor = member.role === 'leader' ? COLORS.textGold
        : member.role === 'officer' ? '#2980b9'
        : COLORS.textPrimary;

      const name = this.scene.add.text(0, y, `${member.username} [${member.role}]`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: roleColor,
      });
      c.add(name);

      const info = this.scene.add.text(250, y, `${member.guildName} Lv.${member.guildLevel}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });
      c.add(info);

      const score = this.scene.add.text(450, y, `Activity: ${member.activityScore}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });
      c.add(score);

      // Promote/Kick buttons for leader
      if (a.leaderId !== member.playerId) {
        const kickBtn = this.scene.add.text(this.width - 70, y, 'Kick', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textAccent,
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', async () => {
            try {
              await apiClient.kickAllianceMember(a.id, member.playerId);
              this.refresh();
            } catch (err) {
              console.error('Kick error:', err);
            }
          });
        c.add(kickBtn);
      }

      y += 28;
    }

    // Invite button
    const inviteBtn = this.scene.add.text(0, y + 15, '[Invite Player]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        const name = prompt('Enter username to invite:');
        if (!name) return;
        try {
          const results = await apiClient.searchPlayers(name);
          if (results.length > 0) {
            await apiClient.inviteToAlliance(a.id, results[0].id);
          }
        } catch (err) {
          console.error('Invite error:', err);
        }
      });
    c.add(inviteBtn);

    this.contentItems.push(c);
    this.container.add(c);
  }

  private renderTreasury(): void {
    const a = this.alliance;
    if (!a) return;
    const c = this.scene.add.container(15, 45);

    const title = this.scene.add.text(0, 0, 'Alliance Treasury', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    });
    c.add(title);

    let y = 30;
    const resources = a.treasury || {};
    const resNames = ['gold', 'wood', 'stone', 'herbs', 'ore', 'water', 'food', 'essence'];
    for (const res of resNames) {
      const amount = resources[res] ?? 0;
      const text = this.scene.add.text(0, y, `${res}: ${amount}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: amount > 0 ? COLORS.textPrimary : COLORS.textSecondary,
      });
      c.add(text);
      y += 22;
    }

    // Deposit button
    const depositBtn = this.scene.add.text(0, y + 15, '[Deposit Resources]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#4ecca3',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        const amtStr = prompt('Enter gold amount to deposit:');
        if (!amtStr) return;
        const amt = parseInt(amtStr);
        if (isNaN(amt) || amt <= 0) return;
        try {
          await apiClient.depositTreasury(a.id, { gold: amt });
          this.refresh();
        } catch (err) {
          console.error('Deposit error:', err);
        }
      });
    c.add(depositBtn);

    this.contentItems.push(c);
    this.container.add(c);
  }

  private async renderWars(): Promise<void> {
    const c = this.scene.add.container(15, 45);

    const title = this.scene.add.text(0, 0, 'Guild Wars', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    });
    c.add(title);

    try {
      // We need guild ID - simplified
      const wars: any[] = [];
      let y = 35;

      if (wars.length === 0) {
        const noWars = this.scene.add.text(0, y, 'No active wars', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        });
        c.add(noWars);
        y += 25;
      }

      // Declare war button
      const declareBtn = this.scene.add.text(0, y + 15, '[Declare War]', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textAccent,
      }).setInteractive({ useHandCursor: true });
      c.add(declareBtn);

      // War history
      const historyTitle = this.scene.add.text(0, y + 55, 'War History', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      c.add(historyTitle);

    } catch (err) {
      console.error('Load wars error:', err);
    }

    this.contentItems.push(c);
    this.container.add(c);
  }

  private async renderEvents(): Promise<void> {
    const a = this.alliance;
    if (!a) return;
    const c = this.scene.add.container(15, 45);

    const title = this.scene.add.text(0, 0, 'Alliance Events & Challenges', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    });
    c.add(title);

    try {
      const challenge = await apiClient.getAllianceChallenge(a.id);
      if (challenge) {
        const chalText = this.scene.add.text(0, 35, `Daily Challenge: ${challenge.objective}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        });
        c.add(chalText);

        const progress = this.scene.add.text(0, 55, `Progress: ${challenge.current}/${challenge.target}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        });
        c.add(progress);
      }

      const events = await apiClient.getAllianceEvents(a.id);
      let y = 85;
      for (const event of events.slice(0, 5)) {
        const eventText = this.scene.add.text(0, y, `${event.title} - ${event.current}/${event.target}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        });
        c.add(eventText);
        y += 25;
      }
    } catch (err) {
      console.error('Load events error:', err);
    }

    this.contentItems.push(c);
    this.container.add(c);
  }

  private async renderRecruitment(): Promise<void> {
    const c = this.scene.add.container(15, 45);

    const title = this.scene.add.text(0, 0, 'Alliance Recruitment Board', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    });
    c.add(title);

    try {
      const posts = await apiClient.browseRecruitment();
      let y = 35;

      for (const post of posts.slice(0, 8)) {
        const postC = this.scene.add.container(0, y);

        const name = this.scene.add.text(0, 0, `${post.allianceName} (Lv.${post.allianceLevel})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textPrimary,
        });
        postC.add(name);

        const desc = this.scene.add.text(0, 22, post.description.slice(0, 80), {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        });
        postC.add(desc);

        const members = this.scene.add.text(350, 0, `${post.memberCount}/${post.maxMembers}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        });
        postC.add(members);

        c.add(postC);
        y += 50;
      }

      if (posts.length === 0) {
        const noPostsText = this.scene.add.text(0, y, 'No recruitment posts found', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        });
        c.add(noPostsText);
      }
    } catch (err) {
      console.error('Load recruitment error:', err);
    }

    this.contentItems.push(c);
    this.container.add(c);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
