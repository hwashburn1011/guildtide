import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Region } from '@shared/types';
import { Climate } from '@shared/enums';

// Pre-defined regions for MVP — expandable later
const REGIONS: Region[] = [
  { id: 'miami', name: 'Miami, FL', country: 'US', latitude: 25.76, longitude: -80.19, climate: Climate.Tropical, timezone: 'America/New_York' },
  { id: 'new-york', name: 'New York, NY', country: 'US', latitude: 40.71, longitude: -74.01, climate: Climate.Continental, timezone: 'America/New_York' },
  { id: 'chicago', name: 'Chicago, IL', country: 'US', latitude: 41.88, longitude: -87.63, climate: Climate.Continental, timezone: 'America/Chicago' },
  { id: 'denver', name: 'Denver, CO', country: 'US', latitude: 39.74, longitude: -104.99, climate: Climate.Arid, timezone: 'America/Denver' },
  { id: 'seattle', name: 'Seattle, WA', country: 'US', latitude: 47.61, longitude: -122.33, climate: Climate.Temperate, timezone: 'America/Los_Angeles' },
  { id: 'los-angeles', name: 'Los Angeles, CA', country: 'US', latitude: 34.05, longitude: -118.24, climate: Climate.Mediterranean, timezone: 'America/Los_Angeles' },
  { id: 'austin', name: 'Austin, TX', country: 'US', latitude: 30.27, longitude: -97.74, climate: Climate.Temperate, timezone: 'America/Chicago' },
  { id: 'london', name: 'London', country: 'GB', latitude: 51.51, longitude: -0.13, climate: Climate.Temperate, timezone: 'Europe/London' },
  { id: 'tokyo', name: 'Tokyo', country: 'JP', latitude: 35.68, longitude: 139.69, climate: Climate.Temperate, timezone: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', country: 'AU', latitude: -33.87, longitude: 151.21, climate: Climate.Temperate, timezone: 'Australia/Sydney' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'BR', latitude: -23.55, longitude: -46.63, climate: Climate.Tropical, timezone: 'America/Sao_Paulo' },
  { id: 'berlin', name: 'Berlin', country: 'DE', latitude: 52.52, longitude: 13.41, climate: Climate.Continental, timezone: 'Europe/Berlin' },
];

export class RegionSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RegionSelectScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;

    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add.text(centerX, 60, 'Choose Your Region', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.title}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, 100, 'Your region determines your local weather, seasons, and world conditions.', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);

    // Build region button list
    const optionsHtml = REGIONS.map(r =>
      `<option value="${r.id}">${r.name} (${r.country})</option>`
    ).join('');

    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 32px;
        width: 400px;
        font-family: Arial, sans-serif;
      ">
        <label style="color: #a0a0b0; font-size: 14px; display: block; margin-bottom: 8px;">
          Select your city or region:
        </label>
        <select id="gt-region" style="
          width: 100%; padding: 12px; margin-bottom: 20px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 16px; outline: none;
        ">
          ${optionsHtml}
        </select>

        <label style="color: #a0a0b0; font-size: 14px; display: block; margin-bottom: 8px;">
          Name your guild:
        </label>
        <input id="gt-guild-name" type="text" placeholder="Enter guild name..." style="
          width: 100%; padding: 12px; margin-bottom: 20px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 16px; outline: none;
        " />

        <button id="gt-confirm-region" style="
          width: 100%; padding: 14px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 16px; cursor: pointer; font-weight: bold;
        ">Begin Your Journey</button>

        <p id="gt-region-error" style="color: #ff4444; font-size: 13px; margin-top: 12px; text-align: center;"></p>
      </div>
    `;

    const form = this.add.dom(centerX, GAME_HEIGHT / 2 + 30).createFromHTML(formHtml);

    form.addListener('click');
    form.on('click', async (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.id !== 'gt-confirm-region') return;

      const regionSelect = document.getElementById('gt-region') as HTMLSelectElement;
      const guildNameInput = document.getElementById('gt-guild-name') as HTMLInputElement;
      const errorEl = document.getElementById('gt-region-error')!;

      const regionId = regionSelect.value;
      const guildName = guildNameInput.value.trim();

      if (!guildName) {
        errorEl.textContent = 'Please enter a guild name';
        return;
      }

      if (guildName.length < 3 || guildName.length > 30) {
        errorEl.textContent = 'Guild name must be 3-30 characters';
        return;
      }

      try {
        await apiClient.setRegion({ regionId });
        await apiClient.createGuild({ name: guildName });
        this.scene.start('GuildHallScene');
      } catch (err) {
        errorEl.textContent = err instanceof Error ? err.message : 'Failed to set up guild';
      }
    });
  }
}
