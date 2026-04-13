/**
 * LoreBookPanel — Collected lore/book viewer with reading UI.
 *
 * T-1354: Prophecy display in Temple
 * T-1356: Prophecy display in Temple building
 * T-1362: Narrative text fade-in presentation with pacing
 * T-1366: World mythology entries
 * T-1368: Mythology gallery with illustration and text pairs
 * T-1378: In-game book collection with readable text content
 * T-1379: Book reading UI with page-turn animation
 * T-1380: Book discovery in expeditions and shops
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

type BookTab = 'collection' | 'mythology' | 'prophecies';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#4dabf7',
  rare: '#9775fa',
  legendary: '#ffd700',
};

export class LoreBookPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private currentTab: BookTab = 'collection';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(tab: BookTab = 'collection'): Promise<void> {
    this.currentTab = tab;

    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Library of Knowledge',
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
    const tabs: Array<{ key: BookTab; label: string }> = [
      { key: 'collection', label: 'Books' },
      { key: 'mythology', label: 'Mythology' },
      { key: 'prophecies', label: 'Prophecies' },
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
        case 'collection':
          await this.renderBookCollection(container, px + 15, contentY);
          break;
        case 'mythology':
          await this.renderMythology(container, px + 15, contentY);
          break;
        case 'prophecies':
          await this.renderProphecies(container, px + 15, contentY);
          break;
      }
    } catch {
      container.add(this.scene.add.text(px + 325, contentY + 100, 'Failed to load data', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textAccent,
      }).setOrigin(0.5));
    }
  }

  // T-1378: Book collection
  private async renderBookCollection(container: Phaser.GameObjects.Container, x: number, y: number): Promise<void> {
    const books = await apiClient.getBooks();
    let ly = y;

    const owned = books.filter((b: any) => b.owned);
    const total = books.length;
    container.add(this.scene.add.text(x, ly, `Book Collection: ${owned.length}/${total}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    ly += 28;

    for (const book of books) {
      const rarityColor = RARITY_COLORS[book.rarity] || COLORS.textPrimary;
      const statusIcon = book.read ? '\u{1F4D6}' : book.owned ? '\u{1F4D5}' : '\u{1F512}';
      const titleColor = book.owned ? rarityColor : '#555566';

      const bookText = this.scene.add.text(x, ly, `${statusIcon} ${book.title} — ${book.author}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: titleColor,
      }).setInteractive({ useHandCursor: book.owned });

      if (book.owned) {
        bookText.on('pointerup', () => this.openBookReader(book.id, book.title));
        bookText.on('pointerover', () => bookText.setColor('#ffffff'));
        bookText.on('pointerout', () => bookText.setColor(titleColor));
      }

      container.add(bookText);
      ly += 20;

      // Rarity and page count
      container.add(this.scene.add.text(x + 20, ly, `${book.rarity} \u2022 ${book.pageCount} pages`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      ly += 18;
    }
  }

  // T-1379: Book reading UI with page-turn animation
  private async openBookReader(bookId: string, bookTitle: string): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    const bookData = await apiClient.readBook(bookId);
    if (!bookData) return;

    this.modal = new UIModal(this.scene, {
      title: bookTitle,
      width: 600,
      height: 480,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
        this.show('collection');
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    const pages = bookData.pages as string[];
    let currentPage = 0;

    const renderPage = (pageIndex: number): void => {
      // Clear previous page content (keep modal structure)
      const children = content.list.filter(
        (c: any) => c.getData?.('isPageContent'),
      );
      for (const child of children) {
        (child as Phaser.GameObjects.GameObject).destroy();
      }

      const px = (GAME_WIDTH - 600) / 2;
      const py = (GAME_HEIGHT - 480) / 2;

      // Page background
      const pageBg = this.scene.add.graphics();
      pageBg.fillStyle(0x0d1b2a, 0.9);
      pageBg.fillRoundedRect(px + 20, py + 50, 560, 340, 6);
      pageBg.setData('isPageContent', true);
      content.add(pageBg);

      // T-1362: Fade-in text
      const pageText = this.scene.add.text(px + 40, py + 70, pages[pageIndex], {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        wordWrap: { width: 520 },
        lineSpacing: 6,
      }).setAlpha(0);
      pageText.setData('isPageContent', true);
      content.add(pageText);

      // Fade in
      this.scene.tweens.add({
        targets: pageText,
        alpha: 1,
        duration: 500,
        ease: 'Power2',
      });

      // Page indicator
      const pageIndicator = this.scene.add.text(px + 300, py + 410, `Page ${pageIndex + 1} of ${pages.length}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      }).setOrigin(0.5);
      pageIndicator.setData('isPageContent', true);
      content.add(pageIndicator);

      // Navigation
      if (pageIndex > 0) {
        const prevBtn = this.scene.add.text(px + 40, py + 410, '\u2190 Previous', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#4dabf7',
        }).setInteractive({ useHandCursor: true });
        prevBtn.on('pointerup', () => {
          currentPage--;
          renderPage(currentPage);
        });
        prevBtn.setData('isPageContent', true);
        content.add(prevBtn);
      }

      if (pageIndex < pages.length - 1) {
        const nextBtn = this.scene.add.text(px + 530, py + 410, 'Next \u2192', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#4dabf7',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        nextBtn.on('pointerup', () => {
          currentPage++;
          renderPage(currentPage);
        });
        nextBtn.setData('isPageContent', true);
        content.add(nextBtn);
      }

      // Lore unlock notification
      if (pageIndex === pages.length - 1 && bookData.unlockedLore) {
        const loreNotif = this.scene.add.text(px + 300, py + 440, `\u{1F4DC} Lore Unlocked: ${bookData.unlockedLore.title}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700', fontStyle: 'bold',
        }).setOrigin(0.5);
        loreNotif.setData('isPageContent', true);
        content.add(loreNotif);
      }
    };

    renderPage(0);
  }

  // T-1366, T-1368: Mythology gallery
  private async renderMythology(container: Phaser.GameObjects.Container, x: number, y: number): Promise<void> {
    const mythology = await apiClient.getMythology();
    let ly = y;

    container.add(this.scene.add.text(x, ly, 'Mythology Gallery', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    ly += 28;

    if (mythology.length === 0) {
      container.add(this.scene.add.text(x, ly, 'No mythology discovered yet. Research at the Temple to uncover the gods\' stories.', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textSecondary,
        wordWrap: { width: 600 },
      }));
      return;
    }

    for (const entry of mythology) {
      // Illustration placeholder
      const illustBg = this.scene.add.graphics();
      illustBg.fillStyle(0x0a1628, 1);
      illustBg.fillRoundedRect(x, ly, 60, 60, 6);
      illustBg.lineStyle(1, COLORS.gold, 0.5);
      illustBg.strokeRoundedRect(x, ly, 60, 60, 6);
      container.add(illustBg);

      container.add(this.scene.add.text(x + 30, ly + 30, '\u2728', {
        fontFamily: FONTS.primary, fontSize: '24px',
      }).setOrigin(0.5));

      // Title
      container.add(this.scene.add.text(x + 70, ly, entry.title, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
      }));

      // Text (truncated)
      const truncated = entry.text.length > 120 ? entry.text.substring(0, 120) + '...' : entry.text;
      container.add(this.scene.add.text(x + 70, ly + 22, truncated, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
        wordWrap: { width: 530 },
      }));

      ly += 70;
    }

    // Research button
    ly += 10;
    const researchBtn = this.scene.add.text(x, ly, '\u{1F52C} Research Mythology at Temple', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#4dabf7', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    researchBtn.on('pointerup', async () => {
      await apiClient.researchMythology();
      this.show('mythology');
    });
    container.add(researchBtn);
  }

  // T-1354, T-1356: Prophecy display
  private async renderProphecies(container: Phaser.GameObjects.Container, x: number, y: number): Promise<void> {
    const prophecies = await apiClient.getProphecies();
    let ly = y;

    container.add(this.scene.add.text(x, ly, 'Prophecies', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    ly += 28;

    for (const prophecy of prophecies) {
      const revealed = prophecy.revealed;

      // Prophecy card
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(revealed ? 0x1a2a4a : 0x0d1220, 0.9);
      cardBg.fillRoundedRect(x, ly, 600, 70, 8);
      cardBg.lineStyle(1, revealed ? 0xffd700 : 0x333355);
      cardBg.strokeRoundedRect(x, ly, 600, 70, 8);
      container.add(cardBg);

      const icon = revealed ? '\u{1F52E}' : '\u{2753}';
      container.add(this.scene.add.text(x + 10, ly + 8, `${icon} ${prophecy.title}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: revealed ? '#ffd700' : '#777788', fontStyle: 'bold',
      }));

      container.add(this.scene.add.text(x + 10, ly + 28, prophecy.text, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: revealed ? COLORS.textPrimary : '#555566',
        fontStyle: revealed ? 'normal' : 'italic',
        wordWrap: { width: 580 },
      }));

      ly += 80;
    }
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
