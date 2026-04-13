import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { GAME_VERSION } from '@shared/constants';

type LoginView = 'login' | 'register' | 'forgot-password' | 'reset-password';

export class LoginScene extends Phaser.Scene {
  private errorText!: Phaser.GameObjects.Text;
  private successText!: Phaser.GameObjects.Text;
  private formDom: Phaser.GameObjects.DOMElement | null = null;
  private currentView: LoginView = 'login';

  constructor() {
    super({ key: 'LoginScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;

    // Background
    this.cameras.main.setBackgroundColor(COLORS.background);

    // Title
    this.add.text(centerX, 50, 'GUILDTIDE', {
      fontFamily: FONTS.primary,
      fontSize: '48px',
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, 95, 'A Living World Idle RPG', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    // Version
    this.add.text(GAME_WIDTH - 12, GAME_HEIGHT - 12, `v${GAME_VERSION}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#555566',
    }).setOrigin(1, 1);

    // Status text areas
    this.errorText = this.add.text(centerX, GAME_HEIGHT - 60, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
      wordWrap: { width: 400 },
      align: 'center',
    }).setOrigin(0.5);

    this.successText = this.add.text(centerX, GAME_HEIGHT - 35, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3',
      wordWrap: { width: 400 },
      align: 'center',
    }).setOrigin(0.5);

    this.showView('login');
  }

  private clearForm(): void {
    if (this.formDom) {
      this.formDom.destroy();
      this.formDom = null;
    }
  }

  private showView(view: LoginView): void {
    this.currentView = view;
    this.clearForm();
    this.clearMessages();

    switch (view) {
      case 'login': this.renderLoginForm(); break;
      case 'register': this.renderRegisterForm(); break;
      case 'forgot-password': this.renderForgotPasswordForm(); break;
      case 'reset-password': this.renderResetPasswordForm(); break;
    }
  }

  // ---- T-0101/T-0106: Login form with email/password + OAuth buttons + remember me ----
  private renderLoginForm(): void {
    const centerX = GAME_WIDTH / 2;

    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 28px;
        width: 380px;
        font-family: Arial, sans-serif;
      ">
        <h3 style="color: #ffd700; margin: 0 0 16px 0; font-size: 18px; text-align: center;">Sign In</h3>
        <input id="gt-email" type="email" placeholder="Email" autocomplete="email" style="
          width: 100%; padding: 12px; margin-bottom: 10px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <div id="gt-email-error" style="color: #ff4444; font-size: 12px; margin-bottom: 4px; min-height: 16px;"></div>
        <input id="gt-password" type="password" placeholder="Password" autocomplete="current-password" style="
          width: 100%; padding: 12px; margin-bottom: 6px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <div id="gt-password-error" style="color: #ff4444; font-size: 12px; margin-bottom: 8px; min-height: 16px;"></div>
        <div style="display: flex; align-items: center; margin-bottom: 14px; gap: 8px;">
          <input id="gt-remember" type="checkbox" style="width: 16px; height: 16px; accent-color: #e94560;" />
          <label for="gt-remember" style="color: #a0a0b0; font-size: 13px; cursor: pointer;">Remember me</label>
          <span style="flex: 1;"></span>
          <a id="gt-forgot" href="#" style="color: #e94560; font-size: 13px; text-decoration: none;">Forgot password?</a>
        </div>
        <button id="gt-login" style="
          width: 100%; padding: 12px; margin-bottom: 10px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 16px; cursor: pointer; font-weight: bold;
        ">Sign In</button>
        <div style="text-align: center; color: #555; font-size: 13px; margin: 10px 0;">or</div>
        <button id="gt-oauth-google" style="
          width: 100%; padding: 10px; margin-bottom: 6px;
          background: #4285f4; border: none; border-radius: 6px;
          color: white; font-size: 14px; cursor: pointer;
        ">Continue with Google</button>
        <button id="gt-oauth-discord" style="
          width: 100%; padding: 10px; margin-bottom: 6px;
          background: #5865f2; border: none; border-radius: 6px;
          color: white; font-size: 14px; cursor: pointer;
        ">Continue with Discord</button>
        <button id="gt-oauth-github" style="
          width: 100%; padding: 10px; margin-bottom: 14px;
          background: #333; border: none; border-radius: 6px;
          color: white; font-size: 14px; cursor: pointer;
        ">Continue with GitHub</button>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <a id="gt-to-register" href="#" style="color: #a0a0b0; font-size: 13px; text-decoration: none;">Create Account</a>
          <a id="gt-guest" href="#" style="color: #7a7a8e; font-size: 13px; text-decoration: none;">Try as Guest</a>
        </div>
      </div>
    `;

    this.formDom = this.add.dom(centerX, 380).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.bindClick('gt-login', () => {
        const email = this.getInputValue('gt-email');
        const password = this.getInputValue('gt-password');
        const rememberMe = (document.getElementById('gt-remember') as HTMLInputElement)?.checked ?? false;
        this.handleLogin(email, password, rememberMe);
      });
      this.bindClick('gt-forgot', (e) => { e.preventDefault(); this.showView('forgot-password'); });
      this.bindClick('gt-to-register', (e) => { e.preventDefault(); this.showView('register'); });
      this.bindClick('gt-guest', (e) => { e.preventDefault(); this.handleGuest(); });
      this.bindClick('gt-oauth-google', () => this.handleOAuth('google'));
      this.bindClick('gt-oauth-discord', () => this.handleOAuth('discord'));
      this.bindClick('gt-oauth-github', () => this.handleOAuth('github'));

      // Live validation on email field
      const emailInput = document.getElementById('gt-email') as HTMLInputElement;
      emailInput?.addEventListener('blur', () => {
        this.validateEmailField('gt-email', 'gt-email-error');
      });

      // Enter key submits
      document.getElementById('gt-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const email = this.getInputValue('gt-email');
          const password = this.getInputValue('gt-password');
          const rememberMe = (document.getElementById('gt-remember') as HTMLInputElement)?.checked ?? false;
          this.handleLogin(email, password, rememberMe);
        }
      });
    });
  }

  // ---- T-0107/T-0108: Registration form with validation ----
  private renderRegisterForm(): void {
    const centerX = GAME_WIDTH / 2;

    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 28px;
        width: 380px;
        font-family: Arial, sans-serif;
      ">
        <h3 style="color: #ffd700; margin: 0 0 16px 0; font-size: 18px; text-align: center;">Create Account</h3>
        <input id="gt-reg-email" type="email" placeholder="Email" autocomplete="email" style="
          width: 100%; padding: 12px; margin-bottom: 4px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <div id="gt-reg-email-error" style="color: #ff4444; font-size: 12px; margin-bottom: 6px; min-height: 16px;"></div>
        <input id="gt-reg-username" type="text" placeholder="Username (3-20 chars, letters/numbers/_)" autocomplete="username" style="
          width: 100%; padding: 12px; margin-bottom: 4px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <div id="gt-reg-username-error" style="color: #ff4444; font-size: 12px; margin-bottom: 6px; min-height: 16px;"></div>
        <input id="gt-reg-password" type="password" placeholder="Password (8+ chars, uppercase + number)" autocomplete="new-password" style="
          width: 100%; padding: 12px; margin-bottom: 4px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <div id="gt-reg-pw-strength" style="font-size: 12px; margin-bottom: 4px; min-height: 16px; color: #7a7a8e;"></div>
        <div id="gt-reg-password-error" style="color: #ff4444; font-size: 12px; margin-bottom: 6px; min-height: 16px;"></div>
        <input id="gt-reg-confirm" type="password" placeholder="Confirm Password" autocomplete="new-password" style="
          width: 100%; padding: 12px; margin-bottom: 4px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <div id="gt-reg-confirm-error" style="color: #ff4444; font-size: 12px; margin-bottom: 10px; min-height: 16px;"></div>
        <button id="gt-register" style="
          width: 100%; padding: 12px; margin-bottom: 12px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 16px; cursor: pointer; font-weight: bold;
        ">Create Account</button>
        <div style="text-align: center;">
          <a id="gt-to-login" href="#" style="color: #a0a0b0; font-size: 13px; text-decoration: none;">Already have an account? Sign In</a>
        </div>
      </div>
    `;

    this.formDom = this.add.dom(centerX, 390).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.bindClick('gt-register', () => this.handleRegisterValidated());
      this.bindClick('gt-to-login', (e) => { e.preventDefault(); this.showView('login'); });

      // Live validation
      document.getElementById('gt-reg-email')?.addEventListener('blur', () => {
        this.validateEmailField('gt-reg-email', 'gt-reg-email-error');
      });
      document.getElementById('gt-reg-username')?.addEventListener('blur', () => {
        this.validateUsernameField();
      });
      document.getElementById('gt-reg-password')?.addEventListener('input', () => {
        this.updatePasswordStrength();
      });
      document.getElementById('gt-reg-password')?.addEventListener('blur', () => {
        this.validatePasswordField();
      });
      document.getElementById('gt-reg-confirm')?.addEventListener('blur', () => {
        this.validateConfirmField();
      });
    });
  }

  // ---- T-0116/T-0118: Forgot password form ----
  private renderForgotPasswordForm(): void {
    const centerX = GAME_WIDTH / 2;

    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 28px;
        width: 380px;
        font-family: Arial, sans-serif;
      ">
        <h3 style="color: #ffd700; margin: 0 0 8px 0; font-size: 18px; text-align: center;">Reset Password</h3>
        <p style="color: #a0a0b0; font-size: 13px; text-align: center; margin: 0 0 16px 0;">
          Enter your email and we'll send you a reset link.
        </p>
        <input id="gt-reset-email" type="email" placeholder="Email" style="
          width: 100%; padding: 12px; margin-bottom: 14px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <button id="gt-send-reset" style="
          width: 100%; padding: 12px; margin-bottom: 12px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 16px; cursor: pointer; font-weight: bold;
        ">Send Reset Link</button>
        <div style="text-align: center; margin-bottom: 8px;">
          <a id="gt-have-token" href="#" style="color: #a0a0b0; font-size: 13px; text-decoration: none;">I have a reset token</a>
        </div>
        <div style="text-align: center;">
          <a id="gt-back-login" href="#" style="color: #a0a0b0; font-size: 13px; text-decoration: none;">Back to Sign In</a>
        </div>
      </div>
    `;

    this.formDom = this.add.dom(centerX, 350).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.bindClick('gt-send-reset', () => {
        const email = this.getInputValue('gt-reset-email');
        this.handleForgotPassword(email);
      });
      this.bindClick('gt-have-token', (e) => { e.preventDefault(); this.showView('reset-password'); });
      this.bindClick('gt-back-login', (e) => { e.preventDefault(); this.showView('login'); });
    });
  }

  // ---- T-0118/T-0119: Reset password with token ----
  private renderResetPasswordForm(): void {
    const centerX = GAME_WIDTH / 2;

    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 28px;
        width: 380px;
        font-family: Arial, sans-serif;
      ">
        <h3 style="color: #ffd700; margin: 0 0 8px 0; font-size: 18px; text-align: center;">Set New Password</h3>
        <p style="color: #a0a0b0; font-size: 13px; text-align: center; margin: 0 0 16px 0;">
          Enter the reset token from your email and choose a new password.
        </p>
        <input id="gt-token" type="text" placeholder="Reset Token" style="
          width: 100%; padding: 12px; margin-bottom: 10px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <input id="gt-new-password" type="password" placeholder="New Password (8+ chars, uppercase + number)" style="
          width: 100%; padding: 12px; margin-bottom: 10px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <input id="gt-new-confirm" type="password" placeholder="Confirm New Password" style="
          width: 100%; padding: 12px; margin-bottom: 14px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 15px; outline: none; box-sizing: border-box;
        " />
        <button id="gt-do-reset" style="
          width: 100%; padding: 12px; margin-bottom: 12px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 16px; cursor: pointer; font-weight: bold;
        ">Reset Password</button>
        <div style="text-align: center;">
          <a id="gt-back-login2" href="#" style="color: #a0a0b0; font-size: 13px; text-decoration: none;">Back to Sign In</a>
        </div>
      </div>
    `;

    this.formDom = this.add.dom(centerX, 370).createFromHTML(formHtml);

    this.time.delayedCall(100, () => {
      this.bindClick('gt-do-reset', () => {
        const token = this.getInputValue('gt-token');
        const newPassword = this.getInputValue('gt-new-password');
        const confirm = this.getInputValue('gt-new-confirm');
        this.handleResetPassword(token, newPassword, confirm);
      });
      this.bindClick('gt-back-login2', (e) => { e.preventDefault(); this.showView('login'); });
    });
  }

  // ---- Handlers ----

  private async handleLogin(email: string, password: string, rememberMe: boolean): Promise<void> {
    this.clearMessages();
    if (!email || !password) {
      this.showError('Please enter email and password');
      return;
    }
    if (!this.isValidEmail(email)) {
      this.showError('Please enter a valid email address');
      return;
    }

    try {
      const response = await apiClient.login({ email, password, rememberMe }) as any;
      localStorage.setItem('guildtide_token', response.token);
      if (rememberMe) {
        localStorage.setItem('guildtide_remember', 'true');
      }

      if (response.offlineGains) {
        sessionStorage.setItem('guildtide_offline_gains', JSON.stringify(response.offlineGains));
        sessionStorage.setItem('guildtide_elapsed_seconds', String(response.elapsedSeconds || 0));
      }

      // T-0150: Route new accounts to guild setup
      if (response.player?.isNewAccount) {
        this.scene.start('RegionSelectScene');
      } else if (response.guild) {
        this.scene.start('GuildHallScene');
      } else if (!response.player.regionId) {
        this.scene.start('RegionSelectScene');
      } else {
        this.scene.start('GuildHallScene');
      }
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  private async handleRegisterValidated(): Promise<void> {
    this.clearMessages();

    const email = this.getInputValue('gt-reg-email');
    const username = this.getInputValue('gt-reg-username');
    const password = this.getInputValue('gt-reg-password');
    const confirm = this.getInputValue('gt-reg-confirm');

    // Client-side validation (T-0108)
    let hasError = false;

    if (!this.isValidEmail(email)) {
      this.setFieldError('gt-reg-email-error', 'Please enter a valid email address');
      hasError = true;
    }

    if (!username || username.length < 3 || username.length > 20) {
      this.setFieldError('gt-reg-username-error', 'Username must be 3-20 characters');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.setFieldError('gt-reg-username-error', 'Letters, numbers, and underscores only');
      hasError = true;
    }

    const pwErrors = this.getPasswordErrors(password);
    if (pwErrors.length > 0) {
      this.setFieldError('gt-reg-password-error', pwErrors[0]);
      hasError = true;
    }

    if (password !== confirm) {
      this.setFieldError('gt-reg-confirm-error', 'Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    try {
      const response = await apiClient.register({ email, username, password });
      localStorage.setItem('guildtide_token', response.token);
      // T-0150: New account goes to region select (onboarding)
      this.scene.start('RegionSelectScene');
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  private async handleForgotPassword(email: string): Promise<void> {
    this.clearMessages();
    if (!email) {
      this.showError('Please enter your email');
      return;
    }
    if (!this.isValidEmail(email)) {
      this.showError('Please enter a valid email address');
      return;
    }

    try {
      const response = await apiClient.forgotPassword(email);
      this.showSuccess(response.message);
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Request failed');
    }
  }

  private async handleResetPassword(token: string, newPassword: string, confirm: string): Promise<void> {
    this.clearMessages();
    if (!token) {
      this.showError('Please enter the reset token');
      return;
    }
    const pwErrors = this.getPasswordErrors(newPassword);
    if (pwErrors.length > 0) {
      this.showError(pwErrors[0]);
      return;
    }
    if (newPassword !== confirm) {
      this.showError('Passwords do not match');
      return;
    }

    try {
      const response = await apiClient.resetPassword(token, newPassword);
      this.showSuccess(response.message);
      this.time.delayedCall(2000, () => this.showView('login'));
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Reset failed');
    }
  }

  private async handleGuest(): Promise<void> {
    this.clearMessages();
    try {
      const response = await apiClient.guestLogin() as any;
      localStorage.setItem('guildtide_token', response.token);
      localStorage.setItem('guildtide_is_guest', 'true');
      this.scene.start('RegionSelectScene');
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Guest login failed');
    }
  }

  private handleOAuth(provider: string): void {
    this.showError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login coming soon`);
  }

  // ---- Validation helpers ----

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getPasswordErrors(password: string): string[] {
    const errors: string[] = [];
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
    else {
      if (!/[A-Z]/.test(password)) errors.push('Password needs at least one uppercase letter');
      if (!/[0-9]/.test(password)) errors.push('Password needs at least one number');
    }
    return errors;
  }

  private validateEmailField(inputId: string, errorId: string): void {
    const val = this.getInputValue(inputId);
    if (val && !this.isValidEmail(val)) {
      this.setFieldError(errorId, 'Invalid email format');
    } else {
      this.setFieldError(errorId, '');
    }
  }

  private validateUsernameField(): void {
    const val = this.getInputValue('gt-reg-username');
    if (val && (val.length < 3 || val.length > 20)) {
      this.setFieldError('gt-reg-username-error', 'Username must be 3-20 characters');
    } else if (val && !/^[a-zA-Z0-9_]+$/.test(val)) {
      this.setFieldError('gt-reg-username-error', 'Letters, numbers, and underscores only');
    } else {
      this.setFieldError('gt-reg-username-error', '');
    }
  }

  private validatePasswordField(): void {
    const val = this.getInputValue('gt-reg-password');
    const errors = this.getPasswordErrors(val);
    this.setFieldError('gt-reg-password-error', errors.length > 0 ? errors[0] : '');
  }

  private validateConfirmField(): void {
    const pw = this.getInputValue('gt-reg-password');
    const confirm = this.getInputValue('gt-reg-confirm');
    if (confirm && pw !== confirm) {
      this.setFieldError('gt-reg-confirm-error', 'Passwords do not match');
    } else {
      this.setFieldError('gt-reg-confirm-error', '');
    }
  }

  private updatePasswordStrength(): void {
    const val = this.getInputValue('gt-reg-password');
    const el = document.getElementById('gt-reg-pw-strength');
    if (!el) return;

    if (!val) { el.textContent = ''; return; }

    let score = 0;
    if (val.length >= 8) score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['#ff4444', '#ff8844', '#ffcc00', '#4ecca3', '#00ff88'];
    const idx = Math.min(score, 4);
    el.textContent = `Strength: ${labels[idx]}`;
    el.style.color = colors[idx];
  }

  // ---- DOM helpers ----

  private getInputValue(id: string): string {
    return (document.getElementById(id) as HTMLInputElement)?.value?.trim() ?? '';
  }

  private setFieldError(id: string, msg: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

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

  private showError(message: string): void {
    this.errorText.setText(message);
    this.successText.setText('');
    this.time.delayedCall(5000, () => {
      if (this.errorText?.active) this.errorText.setText('');
    });
  }

  private showSuccess(message: string): void {
    this.successText.setText(message);
    this.errorText.setText('');
    this.time.delayedCall(5000, () => {
      if (this.successText?.active) this.successText.setText('');
    });
  }

  private clearMessages(): void {
    this.errorText?.setText('');
    this.successText?.setText('');
  }
}
