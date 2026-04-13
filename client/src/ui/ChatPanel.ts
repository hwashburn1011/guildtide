import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { apiClient } from '../api/client';

type ChatTab = 'global' | 'alliance' | 'private';

export class ChatPanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private messageItems: Phaser.GameObjects.Container[] = [];
  private currentChannel: ChatTab = 'global';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private messageInput: Phaser.GameObjects.DOMElement | null = null;
  private unreadCounts: Record<ChatTab, number> = { global: 0, alliance: 0, private: 0 };

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

    // Channel tabs
    const channels: { key: ChatTab; label: string }[] = [
      { key: 'global', label: 'Global' },
      { key: 'alliance', label: 'Alliance' },
      { key: 'private', label: 'Messages' },
    ];

    channels.forEach((ch, i) => {
      const btn = this.scene.add.text(15 + i * 120, 15, ch.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: this.currentChannel === ch.key ? COLORS.textGold : COLORS.textSecondary,
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.switchChannel(ch.key));
      this.tabButtons.push(btn);
      this.container.add(btn);
    });

    // Separator
    const sep = this.scene.add.rectangle(this.width / 2, 42, this.width - 20, 1, COLORS.panelBorder)
      .setOrigin(0.5, 0);
    this.container.add(sep);

    // Message input at bottom
    const inputHtml = `<input type="text" placeholder="Type a message..." style="
      width:${this.width - 120}px;padding:8px 12px;background:#1a1a2e;border:1px solid #0f3460;
      color:#fff;border-radius:4px;font-size:14px;outline:none;
    " />`;
    this.messageInput = this.scene.add.dom(this.width / 2 - 40, this.height - 35)
      .createFromHTML(inputHtml);
    this.container.add(this.messageInput);

    // Send button
    const sendBtn = this.scene.add.text(this.width - 30, this.height - 40, 'Send', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.sendMessage());
    this.container.add(sendBtn);
  }

  private switchChannel(channel: ChatTab): void {
    this.currentChannel = channel;
    this.tabButtons.forEach((btn, i) => {
      const channels: ChatTab[] = ['global', 'alliance', 'private'];
      btn.setColor(channels[i] === channel ? COLORS.textGold : COLORS.textSecondary);
    });
    this.refresh();
  }

  async refresh(): Promise<void> {
    // Clear existing messages
    for (const item of this.messageItems) {
      item.destroy();
    }
    this.messageItems = [];

    try {
      if (this.currentChannel === 'private') {
        // Show conversation list
        const convos = await apiClient.getChatConversations();
        let yOff = 50;
        for (const convo of convos.slice(0, 10)) {
          const item = this.createConversationItem(convo, yOff);
          this.messageItems.push(item);
          this.container.add(item);
          yOff += 50;
        }

        if (convos.length === 0) {
          const noMsg = this.scene.add.text(15, 60, 'No conversations yet', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textSecondary,
          });
          const c = this.scene.add.container(0, 0, [noMsg]);
          this.messageItems.push(c);
          this.container.add(c);
        }
      } else {
        // Show message history
        const channelId = this.currentChannel === 'global' ? 'global' : 'alliance_default';
        const messages = await apiClient.getChatMessages(this.currentChannel, channelId, 30);
        let yOff = 50;

        for (const msg of messages) {
          const item = this.createMessageItem(msg, yOff);
          this.messageItems.push(item);
          this.container.add(item);
          yOff += 35;

          if (yOff > this.height - 80) break;
        }

        if (messages.length === 0) {
          const noMsg = this.scene.add.text(15, 60, 'No messages yet. Start the conversation!', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textSecondary,
          });
          const c = this.scene.add.container(0, 0, [noMsg]);
          this.messageItems.push(c);
          this.container.add(c);
        }
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  }

  private createMessageItem(msg: any, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(15, y);

    // Sender name
    const sender = this.scene.add.text(0, 0, msg.senderUsername, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    });
    container.add(sender);

    // Message content
    const content = this.scene.add.text(sender.width + 10, 0, msg.content, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: this.width - 150 },
    });
    container.add(content);

    // Timestamp
    const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeText = this.scene.add.text(this.width - 80, 0, time, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    container.add(timeText);

    // Reactions display
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
      let rx = 0;
      for (const [emoji, players] of Object.entries(msg.reactions)) {
        const reactText = this.scene.add.text(rx, 18, `${emoji} ${(players as string[]).length}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        });
        container.add(reactText);
        rx += 40;
      }
    }

    return container;
  }

  private createConversationItem(convo: any, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(15, y);

    const name = this.scene.add.text(0, 0, convo.username, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
    });
    container.add(name);

    const preview = this.scene.add.text(0, 22, convo.lastMessage.slice(0, 50), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    container.add(preview);

    if (convo.unreadCount > 0) {
      const badge = this.scene.add.circle(this.width - 50, 15, 10, COLORS.accent);
      container.add(badge);
      const count = this.scene.add.text(this.width - 50, 15, `${convo.unreadCount}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#fff',
      }).setOrigin(0.5);
      container.add(count);
    }

    return container;
  }

  private async sendMessage(): Promise<void> {
    if (!this.messageInput) return;
    const input = this.messageInput.node.querySelector('input') as HTMLInputElement;
    if (!input || !input.value.trim()) return;

    try {
      const channelId = this.currentChannel === 'global' ? 'global' : 'alliance_default';
      await apiClient.sendChatMessage(this.currentChannel, channelId, input.value.trim());
      input.value = '';
      await this.refresh();
    } catch (err) {
      console.error('Send message error:', err);
    }
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
