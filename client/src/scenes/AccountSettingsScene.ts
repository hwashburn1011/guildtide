import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

type SettingsTab = 'profile' | 'security' | 'notifications';

export class AccountSettingsScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private formDom: Phaser.GameObjects.DOMElement | null = null;
  private activeTab: SettingsTab = 'profile';
  private profileData: any = null;

  constructor() {
    super({ key: 'AccountSettingsScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);

    // Header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 50);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 50);

    this.add.text(20, 14, 'Account Settings', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    // Back button
    const backBtn = this.add.text(GAME_WIDTH - 20, 14, 'Back to Guild', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    backBtn.on('pointerup', () => {
      this.clearForm();
      this.scene.start('GuildHallScene');
    });

    // Tab buttons
    const tabs: { label: string; key: SettingsTab }[] = [
      { label: 'Profile', key: 'profile' },
      { label: 'Security', key: 'security' },
      { label: 'Notifications', key: 'notifications' },
    ];

    tabs.forEach((tab, i) => {
      const x = 100 + i * 160;
      const tabText = this.add.text(x, 65, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: this.activeTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: this.activeTab === tab.key ? 'bold' : 'normal',
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

      tabText.on('pointerup', () => {
        this.activeTab = tab.key;
        this.clearForm();
        this.scene.restart();
      });
    });

    // Status text
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3',
      wordWrap: { width: 500 },
      align: 'center',
    }).setOrigin(0.5);

    // Load profile data and render active tab
    try {
      this.profileData = await apiClient.getProfile();
      this.renderTab();
    } catch (err) {
      this.showStatus('Failed to load profile', true);
    }
  }

  private clearForm(): void {
    if (this.formDom) {
      this.formDom.destroy();
      this.formDom = null;
    }
  }

  private renderTab(): void {
    switch (this.activeTab) {
      case 'profile': this.renderProfileTab(); break;
      case 'security': this.renderSecurityTab(); break;
      case 'notifications': this.renderNotificationsTab(); break;
    }
  }

  // ---- T-0121/T-0125/T-0126/T-0127/T-0128/T-0147: Profile Tab ----
  private renderProfileTab(): void {
    const p = this.profileData;
    if (!p) return;

    const avatars = ['knight', 'mage', 'rogue', 'ranger', 'cleric', 'warrior', 'bard', 'druid'];
    const avatarOptions = avatars.map(a =>
      `<option value="${a}" ${p.avatarUrl === a ? 'selected' : ''}>${a.charAt(0).toUpperCase() + a.slice(1)}</option>`
    ).join('');

    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 28px;
        width: 500px;
        font-family: Arial, sans-serif;
      ">
        <div style="margin-bottom: 16px;">
          <label style="color: #a0a0b0; font-size: 13px; display: block; margin-bottom: 4px;">Username</label>
          <input id="gt-s-username" type="text" value="${p.username}" style="
            width: 100%; padding: 10px;
            background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
            color: white; font-size: 14px; outline: none; box-sizing: border-box;
          " />
        </div>
        <div style="margin-bottom: 16px;">
          <label style="color: #a0a0b0; font-size: 13px; display: block; margin-bottom: 4px;">Bio (200 chars max)</label>
          <textarea id="gt-s-bio" maxlength="200" rows="3" style="
            width: 100%; padding: 10px;
            background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
            color: white; font-size: 14px; outline: none; box-sizing: border-box; resize: vertical;
          ">${p.bio || ''}</textarea>
          <div id="gt-s-bio-count" style="color: #555; font-size: 11px; text-align: right;">${(p.bio || '').length}/200</div>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="color: #a0a0b0; font-size: 13px; display: block; margin-bottom: 4px;">Avatar</label>
          <select id="gt-s-avatar" style="
            width: 100%; padding: 10px;
            background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
            color: white; font-size: 14px; outline: none; box-sizing: border-box;
          ">
            <option value="">None</option>
            ${avatarOptions}
          </select>
        </div>
        <div style="margin-bottom: 16px; padding: 12px; background: #1a1a2e; border-radius: 6px; border: 1px solid #0f3460;">
          <div style="color: #a0a0b0; font-size: 12px;">Email: <span style="color: white;">${p.email}</span></div>
          <div style="color: #a0a0b0; font-size: 12px; margin-top: 4px;">Member since: <span style="color: white;">${new Date(p.createdAt).toLocaleDateString()}</span></div>
          <div style="color: #a0a0b0; font-size: 12px; margin-top: 4px;">Last login: <span style="color: white;">${new Date(p.lastLoginAt).toLocaleString()}</span></div>
          ${p.isGuest ? '<div style="color: #f5a623; font-size: 12px; margin-top: 6px; font-weight: bold;">Guest Account - <a id="gt-s-upgrade" href="#" style="color: #e94560;">Upgrade now</a></div>' : ''}
        </div>
        <button id="gt-s-save-profile" style="
          width: 100%; padding: 12px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 15px; cursor: pointer; font-weight: bold;
        ">Save Profile</button>
      </div>
    `;

    this.formDom = this.add.dom(GAME_WIDTH / 2, 360).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      document.getElementById('gt-s-bio')?.addEventListener('input', () => {
        const bio = (document.getElementById('gt-s-bio') as HTMLTextAreaElement)?.value || '';
        const countEl = document.getElementById('gt-s-bio-count');
        if (countEl) countEl.textContent = `${bio.length}/200`;
      });

      this.bindClick('gt-s-save-profile', () => this.handleSaveProfile());

      if (p.isGuest) {
        this.bindClick('gt-s-upgrade', (e) => {
          e.preventDefault();
          this.clearForm();
          this.renderUpgradeForm();
        });
      }
    });
  }

  // ---- T-0122/T-0123/T-0133/T-0134: Security Tab ----
  private renderSecurityTab(): void {
    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 28px;
        width: 500px;
        font-family: Arial, sans-serif;
      ">
        <h4 style="color: #ffd700; margin: 0 0 14px 0; font-size: 16px;">Change Password</h4>
        <input id="gt-s-cur-pw" type="password" placeholder="Current Password" style="
          width: 100%; padding: 10px; margin-bottom: 8px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <input id="gt-s-new-pw" type="password" placeholder="New Password (8+ chars, uppercase + number)" style="
          width: 100%; padding: 10px; margin-bottom: 8px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <input id="gt-s-confirm-pw" type="password" placeholder="Confirm New Password" style="
          width: 100%; padding: 10px; margin-bottom: 12px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <button id="gt-s-change-pw" style="
          width: 100%; padding: 10px; margin-bottom: 20px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 14px; cursor: pointer; font-weight: bold;
        ">Change Password</button>

        <h4 style="color: #ffd700; margin: 0 0 14px 0; font-size: 16px;">Change Email</h4>
        <input id="gt-s-new-email" type="email" placeholder="New Email Address" style="
          width: 100%; padding: 10px; margin-bottom: 8px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <input id="gt-s-email-pw" type="password" placeholder="Password (to confirm)" style="
          width: 100%; padding: 10px; margin-bottom: 12px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <button id="gt-s-change-email" style="
          width: 100%; padding: 10px; margin-bottom: 20px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 14px; cursor: pointer; font-weight: bold;
        ">Change Email</button>

        <h4 style="color: #ffd700; margin: 0 0 14px 0; font-size: 16px;">Data & Account</h4>
        <div style="display: flex; gap: 10px;">
          <button id="gt-s-export" style="
            flex: 1; padding: 10px;
            background: #333; border: 1px solid #0f3460; border-radius: 6px;
            color: white; font-size: 13px; cursor: pointer;
          ">Export My Data</button>
          <button id="gt-s-delete" style="
            flex: 1; padding: 10px;
            background: #660000; border: 1px solid #990000; border-radius: 6px;
            color: #ff6666; font-size: 13px; cursor: pointer; font-weight: bold;
          ">Delete Account</button>
        </div>
      </div>
    `;

    this.formDom = this.add.dom(GAME_WIDTH / 2, 380).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.bindClick('gt-s-change-pw', () => this.handleChangePassword());
      this.bindClick('gt-s-change-email', () => this.handleChangeEmail());
      this.bindClick('gt-s-export', () => this.handleExportData());
      this.bindClick('gt-s-delete', () => this.handleDeleteAccount());
    });
  }

  // ---- T-0145: Notifications Tab ----
  private renderNotificationsTab(): void {
    const prefs = this.profileData?.notificationPrefs || {};
    const categories = [
      { key: 'email_login', label: 'Login from new device' },
      { key: 'email_expedition', label: 'Expedition completed' },
      { key: 'email_market', label: 'Market price alerts' },
      { key: 'email_events', label: 'World events' },
    ];

    const checkboxes = categories.map(c => `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <input id="gt-n-${c.key}" type="checkbox" ${prefs[c.key] !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #e94560;" />
        <label for="gt-n-${c.key}" style="color: #d0d0e0; font-size: 14px; cursor: pointer;">${c.label}</label>
      </div>
    `).join('');

    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 28px;
        width: 500px;
        font-family: Arial, sans-serif;
      ">
        <h4 style="color: #ffd700; margin: 0 0 14px 0; font-size: 16px;">Email Notifications</h4>
        <p style="color: #7a7a8e; font-size: 13px; margin: 0 0 16px 0;">Choose which email notifications you'd like to receive.</p>
        ${checkboxes}
        <button id="gt-n-save" style="
          width: 100%; padding: 12px; margin-top: 10px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 15px; cursor: pointer; font-weight: bold;
        ">Save Preferences</button>
      </div>
    `;

    this.formDom = this.add.dom(GAME_WIDTH / 2, 310).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.bindClick('gt-n-save', () => this.handleSaveNotifications(categories));
    });
  }

  // ---- T-0142: Guest upgrade form ----
  private renderUpgradeForm(): void {
    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #e94560;
        border-radius: 12px;
        padding: 28px;
        width: 500px;
        font-family: Arial, sans-serif;
      ">
        <h4 style="color: #ffd700; margin: 0 0 8px 0; font-size: 16px;">Upgrade Guest Account</h4>
        <p style="color: #a0a0b0; font-size: 13px; margin: 0 0 16px 0;">Your game progress will be preserved.</p>
        <input id="gt-u-email" type="email" placeholder="Email" style="
          width: 100%; padding: 10px; margin-bottom: 8px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <input id="gt-u-username" type="text" placeholder="Username" style="
          width: 100%; padding: 10px; margin-bottom: 8px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <input id="gt-u-password" type="password" placeholder="Password" style="
          width: 100%; padding: 10px; margin-bottom: 12px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 14px; outline: none; box-sizing: border-box;
        " />
        <button id="gt-u-submit" style="
          width: 100%; padding: 12px; margin-bottom: 8px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 15px; cursor: pointer; font-weight: bold;
        ">Upgrade Account</button>
        <button id="gt-u-cancel" style="
          width: 100%; padding: 10px;
          background: transparent; border: 1px solid #0f3460; border-radius: 6px;
          color: #a0a0b0; font-size: 13px; cursor: pointer;
        ">Cancel</button>
      </div>
    `;

    this.formDom = this.add.dom(GAME_WIDTH / 2, 340).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.bindClick('gt-u-submit', () => this.handleUpgradeGuest());
      this.bindClick('gt-u-cancel', () => {
        this.clearForm();
        this.renderProfileTab();
      });
    });
  }

  // ---- Handlers ----

  private async handleSaveProfile(): Promise<void> {
    const username = (document.getElementById('gt-s-username') as HTMLInputElement)?.value?.trim();
    const bio = (document.getElementById('gt-s-bio') as HTMLTextAreaElement)?.value?.trim();
    const avatarUrl = (document.getElementById('gt-s-avatar') as HTMLSelectElement)?.value;

    try {
      const result = await apiClient.updateProfile({ username, bio, avatarUrl });
      this.profileData = { ...this.profileData, ...result.player };
      this.showStatus('Profile saved!');
    } catch (err) {
      this.showStatus(err instanceof Error ? err.message : 'Save failed', true);
    }
  }

  private async handleChangePassword(): Promise<void> {
    const currentPassword = (document.getElementById('gt-s-cur-pw') as HTMLInputElement)?.value;
    const newPassword = (document.getElementById('gt-s-new-pw') as HTMLInputElement)?.value;
    const confirm = (document.getElementById('gt-s-confirm-pw') as HTMLInputElement)?.value;

    if (!currentPassword || !newPassword) {
      this.showStatus('Fill in all password fields', true);
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      this.showStatus('Password needs 8+ chars, uppercase, and number', true);
      return;
    }
    if (newPassword !== confirm) {
      this.showStatus('Passwords do not match', true);
      return;
    }

    try {
      await apiClient.changePassword(currentPassword, newPassword);
      this.showStatus('Password changed successfully!');
      // Clear fields
      (document.getElementById('gt-s-cur-pw') as HTMLInputElement).value = '';
      (document.getElementById('gt-s-new-pw') as HTMLInputElement).value = '';
      (document.getElementById('gt-s-confirm-pw') as HTMLInputElement).value = '';
    } catch (err) {
      this.showStatus(err instanceof Error ? err.message : 'Failed to change password', true);
    }
  }

  private async handleChangeEmail(): Promise<void> {
    const newEmail = (document.getElementById('gt-s-new-email') as HTMLInputElement)?.value?.trim();
    const password = (document.getElementById('gt-s-email-pw') as HTMLInputElement)?.value;

    if (!newEmail || !password) {
      this.showStatus('Fill in email and password fields', true);
      return;
    }

    try {
      await apiClient.changeEmail(newEmail, password);
      this.showStatus('Email changed successfully!');
      this.profileData.email = newEmail;
    } catch (err) {
      this.showStatus(err instanceof Error ? err.message : 'Failed to change email', true);
    }
  }

  private async handleExportData(): Promise<void> {
    try {
      const data = await apiClient.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guildtide-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showStatus('Data export downloaded!');
    } catch (err) {
      this.showStatus(err instanceof Error ? err.message : 'Export failed', true);
    }
  }

  private async handleDeleteAccount(): Promise<void> {
    const confirmation = prompt('Type DELETE to confirm permanent account deletion:');
    if (confirmation !== 'DELETE') {
      this.showStatus('Account deletion cancelled', false);
      return;
    }
    const password = prompt('Enter your password to confirm:');
    if (!password) {
      this.showStatus('Account deletion cancelled', false);
      return;
    }

    try {
      await apiClient.deleteAccount(password, 'DELETE');
      localStorage.removeItem('guildtide_token');
      localStorage.removeItem('guildtide_remember');
      localStorage.removeItem('guildtide_is_guest');
      this.clearForm();
      this.scene.start('LoginScene');
    } catch (err) {
      this.showStatus(err instanceof Error ? err.message : 'Deletion failed', true);
    }
  }

  private async handleSaveNotifications(categories: { key: string; label: string }[]): Promise<void> {
    const prefs: Record<string, boolean> = {};
    for (const c of categories) {
      const el = document.getElementById(`gt-n-${c.key}`) as HTMLInputElement;
      prefs[c.key] = el?.checked ?? true;
    }

    try {
      await apiClient.updateNotificationPrefs(prefs);
      this.showStatus('Notification preferences saved!');
    } catch (err) {
      this.showStatus(err instanceof Error ? err.message : 'Save failed', true);
    }
  }

  private async handleUpgradeGuest(): Promise<void> {
    const email = (document.getElementById('gt-u-email') as HTMLInputElement)?.value?.trim();
    const username = (document.getElementById('gt-u-username') as HTMLInputElement)?.value?.trim();
    const password = (document.getElementById('gt-u-password') as HTMLInputElement)?.value;

    if (!email || !username || !password) {
      this.showStatus('All fields are required', true);
      return;
    }

    try {
      const result = await apiClient.upgradeGuest({ email, username, password });
      localStorage.setItem('guildtide_token', result.token);
      localStorage.removeItem('guildtide_is_guest');
      this.showStatus('Account upgraded! Reloading...');
      this.time.delayedCall(1500, () => {
        this.clearForm();
        this.scene.restart();
      });
    } catch (err) {
      this.showStatus(err instanceof Error ? err.message : 'Upgrade failed', true);
    }
  }

  // ---- Helpers ----

  private bindClick(id: string, handler: (e: Event) => void): void {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      });
    }
  }

  private showStatus(message: string, isError = false): void {
    this.statusText.setColor(isError ? '#ff4444' : '#4ecca3');
    this.statusText.setText(message);
    this.time.delayedCall(5000, () => {
      if (this.statusText?.active) this.statusText.setText('');
    });
  }
}
