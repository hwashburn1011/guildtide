/**
 * CalendarPanel — In-game calendar showing current month, upcoming festivals,
 * season info, moon phases, daily challenges, and event markers.
 *
 * T-0943: Calendar UI component showing current month with event markers
 * T-0953: Season indicator display showing current season and days remaining
 * T-0964: Moon phase display widget with current phase icon
 * T-0968: Lunar calendar view showing upcoming full and new moons
 * T-0969: Daily login calendar with streak rewards
 * T-0970: Daily challenge system with rotating objectives
 * T-0976: Event calendar preview showing upcoming events this week
 * T-0979: Calendar notification system for upcoming events
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type MoonPhase = 'new_moon' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full_moon' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

const SEASON_COLORS: Record<Season, { bg: number; text: string; icon: string; label: string }> = {
  spring: { bg: 0x2d5a3d, text: '#4ecca3', icon: '🌱', label: 'Spring' },
  summer: { bg: 0x5a4a2d, text: '#f5a623', icon: '☀', label: 'Summer' },
  autumn: { bg: 0x5a3a2d, text: '#e07c24', icon: '🍂', label: 'Autumn' },
  winter: { bg: 0x2d3a5a, text: '#5b9bd5', icon: '❄', label: 'Winter' },
};

const MOON_ICONS: Record<MoonPhase, string> = {
  new_moon: '🌑',
  waxing_crescent: '🌒',
  first_quarter: '🌓',
  waxing_gibbous: '🌔',
  full_moon: '🌕',
  waning_gibbous: '🌖',
  last_quarter: '🌗',
  waning_crescent: '🌘',
};

const MOON_LABELS: Record<MoonPhase, string> = {
  new_moon: 'New Moon',
  waxing_crescent: 'Waxing Crescent',
  first_quarter: 'First Quarter',
  waxing_gibbous: 'Waxing Gibbous',
  full_moon: 'Full Moon',
  waning_gibbous: 'Waning Gibbous',
  last_quarter: 'Last Quarter',
  waning_crescent: 'Waning Crescent',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarDayData {
  day: number;
  isToday: boolean;
  season: Season;
  holidays: Array<{ name: string }>;
  moonPhase: MoonPhase;
  isWeekend: boolean;
}

interface SeasonInfo {
  season: Season;
  daysRemaining: number;
  progress: number;
  nextSeason: Season;
}

interface UpcomingEvent {
  date: string;
  name: string;
  type: 'holiday' | 'festival' | 'lunar' | 'weekend_bonus';
}

interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  target: number;
  rewards: { xp: number };
}

export class CalendarPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private currentMonth: number;
  private currentYear: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const now = new Date();
    this.currentMonth = now.getMonth();
    this.currentYear = now.getFullYear();
  }

  show(data: {
    calendarDays: CalendarDayData[];
    seasonInfo: SeasonInfo;
    moonPhase: MoonPhase;
    moonEffect: { magicModifier: number; stealthModifier: number; description: string };
    upcomingEvents: UpcomingEvent[];
    dailyChallenges: DailyChallenge[];
    upcomingLunar: Array<{ phase: string; date: string; label: string }>;
    notifications: string[];
  }): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: 'Guild Calendar',
      width: 780,
      height: 560,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let yOffset = 0;

    // --- Season Indicator (T-0953) ---
    const seasonTheme = SEASON_COLORS[data.seasonInfo.season];
    const seasonBg = this.scene.add.graphics();
    seasonBg.fillStyle(seasonTheme.bg, 0.6);
    seasonBg.fillRoundedRect(0, yOffset, 750, 50, 6);
    content.add(seasonBg);

    content.add(this.scene.add.text(12, yOffset + 8, `${seasonTheme.icon} ${seasonTheme.label}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`,
      color: seasonTheme.text, fontStyle: 'bold',
    }));

    content.add(this.scene.add.text(12, yOffset + 34, `${data.seasonInfo.daysRemaining} days remaining`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
    }));

    // Season progress bar
    const barX = 200; const barW = 200; const barH = 10;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x333333, 0.8); barBg.fillRoundedRect(barX, yOffset + 20, barW, barH, 3);
    content.add(barBg);
    const barFill = this.scene.add.graphics();
    barFill.fillStyle(seasonTheme.bg + 0x222222, 1);
    barFill.fillRoundedRect(barX, yOffset + 20, barW * data.seasonInfo.progress, barH, 3);
    content.add(barFill);

    content.add(this.scene.add.text(barX + barW + 10, yOffset + 16, `Next: ${SEASON_COLORS[data.seasonInfo.nextSeason].label}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
    }));

    // --- Moon Phase (T-0964) ---
    const moonX = 560;
    content.add(this.scene.add.text(moonX, yOffset + 8, `${MOON_ICONS[data.moonPhase]} ${MOON_LABELS[data.moonPhase]}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ddd', fontStyle: 'bold',
    }));

    content.add(this.scene.add.text(moonX, yOffset + 28, `Magic ${data.moonEffect.magicModifier > 1 ? '+' : ''}${Math.round((data.moonEffect.magicModifier - 1) * 100)}%  Stealth ${data.moonEffect.stealthModifier > 1 ? '+' : ''}${Math.round((data.moonEffect.stealthModifier - 1) * 100)}%`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
    }));

    yOffset += 60;

    // --- Month header ---
    content.add(this.scene.add.text(0, yOffset, `${MONTH_NAMES[this.currentMonth]} ${this.currentYear}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textPrimary, fontStyle: 'bold',
    }));
    yOffset += 28;

    // --- Day name headers ---
    const cellW = 36; const cellH = 34; const gridX = 0;
    for (let i = 0; i < 7; i++) {
      content.add(this.scene.add.text(gridX + i * cellW + cellW / 2, yOffset, DAY_NAMES[i], {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: i === 0 || i === 6 ? '#e94560' : COLORS.textSecondary,
      }).setOrigin(0.5, 0));
    }
    yOffset += 18;

    // --- Calendar grid (T-0943) ---
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    let col = firstDay;
    let row = 0;

    for (const dayData of data.calendarDays) {
      const cx = gridX + col * cellW;
      const cy = yOffset + row * cellH;

      const cellBg = this.scene.add.graphics();
      if (dayData.isToday) {
        cellBg.fillStyle(COLORS.accent, 0.4);
      } else if (dayData.holidays.length > 0) {
        cellBg.fillStyle(COLORS.gold, 0.15);
      } else if (dayData.isWeekend) {
        cellBg.fillStyle(0x333355, 0.3);
      }
      cellBg.fillRoundedRect(cx, cy, cellW - 2, cellH - 2, 3);
      content.add(cellBg);

      // Day number
      const dayColor = dayData.isToday ? COLORS.textAccent
        : dayData.holidays.length > 0 ? COLORS.textGold
        : COLORS.textPrimary;
      content.add(this.scene.add.text(cx + cellW / 2, cy + 4, `${dayData.day}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: dayColor, fontStyle: dayData.isToday ? 'bold' : 'normal',
      }).setOrigin(0.5, 0));

      // Moon phase icon (tiny)
      if (dayData.moonPhase === 'full_moon' || dayData.moonPhase === 'new_moon') {
        content.add(this.scene.add.text(cx + cellW / 2, cy + 18, MOON_ICONS[dayData.moonPhase], {
          fontFamily: FONTS.primary, fontSize: '8px', color: '#aaa',
        }).setOrigin(0.5, 0));
      }

      // Holiday dot
      if (dayData.holidays.length > 0) {
        const dot = this.scene.add.graphics();
        dot.fillStyle(COLORS.gold, 0.8);
        dot.fillCircle(cx + cellW - 6, cy + 4, 3);
        content.add(dot);
      }

      col++;
      if (col >= 7) { col = 0; row++; }
    }

    yOffset += (row + 1) * cellH + 10;

    // --- Right side panels ---
    const rightX = 280;
    let rightY = 88;

    // Upcoming Events (T-0976, T-0979)
    content.add(this.scene.add.text(rightX, rightY, 'Upcoming Events', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    }));
    rightY += 20;

    const maxEvents = Math.min(data.upcomingEvents.length, 5);
    for (let i = 0; i < maxEvents; i++) {
      const ev = data.upcomingEvents[i];
      const typeColor = ev.type === 'holiday' ? COLORS.textGold
        : ev.type === 'lunar' ? '#aaa'
        : ev.type === 'weekend_bonus' ? '#5b9bd5' : '#4ecca3';

      content.add(this.scene.add.text(rightX, rightY, `${ev.date}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      content.add(this.scene.add.text(rightX + 55, rightY, ev.name, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: typeColor,
      }));
      rightY += 16;
    }
    if (data.upcomingEvents.length === 0) {
      content.add(this.scene.add.text(rightX, rightY, 'No events this week', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      rightY += 16;
    }

    // Upcoming Lunar Events (T-0968)
    rightY += 10;
    content.add(this.scene.add.text(rightX, rightY, 'Lunar Calendar', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#ccc', fontStyle: 'bold',
    }));
    rightY += 20;

    for (const lunar of data.upcomingLunar.slice(0, 4)) {
      const icon = lunar.phase === 'full_moon' ? '🌕' : '🌑';
      content.add(this.scene.add.text(rightX, rightY, `${icon} ${lunar.label}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#bbb',
      }));
      content.add(this.scene.add.text(rightX + 110, rightY, lunar.date, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));
      rightY += 16;
    }

    // Daily Challenges (T-0970)
    rightY += 10;
    content.add(this.scene.add.text(rightX, rightY, 'Daily Challenges', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3', fontStyle: 'bold',
    }));
    rightY += 20;

    for (const challenge of data.dailyChallenges.slice(0, 3)) {
      content.add(this.scene.add.text(rightX, rightY, challenge.name, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textPrimary,
      }));
      rightY += 14;
      content.add(this.scene.add.text(rightX + 8, rightY, `${challenge.description} (+${challenge.rewards.xp} XP)`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: COLORS.textSecondary,
      }));
      rightY += 16;
    }

    // Notifications (T-0979)
    if (data.notifications.length > 0) {
      rightY += 10;
      content.add(this.scene.add.text(rightX, rightY, 'Notifications', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textAccent, fontStyle: 'bold',
      }));
      rightY += 18;

      for (const note of data.notifications.slice(0, 3)) {
        content.add(this.scene.add.text(rightX, rightY, `• ${note}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
        }));
        rightY += 14;
      }
    }

    this.modal.open();
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
