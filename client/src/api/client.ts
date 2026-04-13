import { API_BASE_URL } from '../config';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  SetRegionRequest,
  CreateGuildRequest,
  Guild,
  Resources,
  Building,
  Hero,
  Item,
  Expedition,
} from '@shared/types';
import type { ResourceType } from '@shared/enums';

class ApiClient {
  private baseUrl: string;
  private _online = true;
  private onStatusChange: ((online: boolean) => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  get online(): boolean {
    return this._online;
  }

  /** Register a callback for connection status changes */
  setStatusListener(cb: (online: boolean) => void): void {
    this.onStatusChange = cb;
  }

  private setOnlineStatus(online: boolean): void {
    if (this._online !== online) {
      this._online = online;
      this.onStatusChange?.(online);
    }
  }

  private getToken(): string | null {
    return localStorage.getItem('guildtide_token');
  }

  /** T-0104: Attempt to refresh the JWT token silently */
  private async tryRefreshToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;
    try {
      const resp = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      if (data.token) {
        localStorage.setItem('guildtide_token', data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const doFetch = async (): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    let response: Response;
    try {
      response = await doFetch();
    } catch (err) {
      // Network error — retry once after 2s
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        response = await doFetch();
      } catch {
        this.setOnlineStatus(false);
        throw new Error('Network error: unable to reach server');
      }
    }

    this.setOnlineStatus(true);

    // T-0104/T-0105: Auto-refresh token on 401, unless this IS the refresh call
    if (response.status === 401 && !path.includes('/auth/refresh')) {
      // Try to refresh token once
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the original request with the new token
        try {
          response = await doFetch();
        } catch {
          this.setOnlineStatus(false);
          throw new Error('Network error after token refresh');
        }
        if (response.ok) {
          this.setOnlineStatus(true);
          return response.json();
        }
      }
      localStorage.removeItem('guildtide_token');
      localStorage.removeItem('guildtide_remember');
      window.location.hash = '';
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(data: LoginRequest & { rememberMe?: boolean }): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/auth/login', data);
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/auth/register', data);
  }

  async refreshToken(): Promise<{ token: string; player: any }> {
    return this.request('POST', '/auth/refresh');
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/auth/reset-password', { token, newPassword });
  }

  async guestLogin(): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/auth/guest');
  }

  async upgradeGuest(data: RegisterRequest): Promise<{ token: string; player: any }> {
    return this.request('POST', '/auth/upgrade-guest', data);
  }

  // Account management
  async getProfile(): Promise<any> {
    return this.request('GET', '/account/profile');
  }

  async updateProfile(data: { username?: string; bio?: string; avatarUrl?: string }): Promise<any> {
    return this.request('POST', '/account/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/account/change-password', { currentPassword, newPassword });
  }

  async changeEmail(newEmail: string, password: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/account/change-email', { newEmail, password });
  }

  async deleteAccount(password: string, confirmation: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/account/delete', { password, confirmation });
  }

  async exportData(): Promise<any> {
    return this.request('GET', '/account/export');
  }

  async getNotificationPrefs(): Promise<{ prefs: Record<string, boolean> }> {
    return this.request('GET', '/account/notifications');
  }

  async updateNotificationPrefs(prefs: Record<string, boolean>): Promise<{ success: boolean; prefs: Record<string, boolean> }> {
    return this.request('POST', '/account/notifications', { prefs });
  }

  // Player
  async setRegion(data: SetRegionRequest): Promise<void> {
    await this.request('POST', '/player/region', data);
  }

  // Guild
  async createGuild(data: CreateGuildRequest): Promise<Guild> {
    return this.request<Guild>('POST', '/guild', data);
  }

  async getGuild(): Promise<Guild> {
    return this.request<Guild>('GET', '/guild');
  }

  // Idle collection
  async collect(): Promise<{
    gains: Partial<Record<ResourceType, number>>;
    elapsedSeconds: number;
    resources: Resources;
    rates: Record<ResourceType, number>;
  }> {
    return this.request('POST', '/guild/collect');
  }

  async getRates(): Promise<Record<ResourceType, number>> {
    return this.request('GET', '/guild/rates');
  }

  // Buildings
  async getBuildings(): Promise<Building[]> {
    return this.request('GET', '/buildings');
  }

  async upgradeBuilding(type: string): Promise<{
    building: Building;
    resources: Resources;
  }> {
    return this.request('POST', `/buildings/${type}/upgrade`);
  }

  // Heroes
  async getHeroes(): Promise<Hero[]> {
    return this.request('GET', '/heroes');
  }

  async recruitHero(role?: string): Promise<{ hero: Hero; resources: Resources }> {
    return this.request('POST', '/heroes/recruit', role ? { role } : {});
  }

  async assignHero(heroId: string, assignment: string | null): Promise<Hero> {
    return this.request('POST', `/heroes/${heroId}/assign`, { assignment });
  }

  // Events
  async getEvents(): Promise<any[]> {
    return this.request('GET', '/events');
  }

  async respondToEvent(eventId: string, choiceIndex: number): Promise<{
    success: boolean;
    narrative: string;
    rewards?: Record<string, number>;
  }> {
    return this.request('POST', `/events/${eventId}/respond`, { choiceIndex });
  }

  async getEventLog(): Promise<any[]> {
    return this.request('GET', '/events/log');
  }

  // Expeditions
  async getExpeditions(): Promise<Expedition[]> {
    return this.request('GET', '/expeditions');
  }

  async getDestinations(): Promise<any[]> {
    return this.request('GET', '/expeditions/destinations');
  }

  async launchExpedition(
    type: string,
    heroIds: string[],
    destinationId: string,
  ): Promise<Expedition> {
    return this.request('POST', '/expeditions/launch', {
      type,
      heroIds,
      destinationId,
    });
  }

  async collectExpedition(expeditionId: string): Promise<Expedition> {
    return this.request('POST', `/expeditions/${expeditionId}/collect`);
  }

  // Market
  async getMarketPrices(): Promise<{
    date: string;
    confidence: number;
    items: Array<{
      resource: string;
      basePrice: number;
      currentPrice: number;
      trend: 'rising' | 'falling' | 'stable';
    }>;
  }> {
    return this.request('GET', '/market');
  }

  async marketBuy(resource: string, quantity: number): Promise<{
    success: boolean;
    resource: string;
    quantity: number;
    totalPrice: number;
    resources: Record<string, number>;
  }> {
    return this.request('POST', '/market/buy', { resource, quantity });
  }

  async marketSell(resource: string, quantity: number): Promise<{
    success: boolean;
    resource: string;
    quantity: number;
    totalPrice: number;
    resources: Record<string, number>;
  }> {
    return this.request('POST', '/market/sell', { resource, quantity });
  }

  // Research
  async getResearchState(): Promise<any> {
    return this.request('GET', '/research');
  }

  async startResearch(researchId: string): Promise<any> {
    return this.request('POST', `/research/${researchId}/start`);
  }

  // Items & Equipment
  async getInventory(): Promise<any[]> {
    return this.request('GET', '/items');
  }

  async getItemTemplates(): Promise<any[]> {
    return this.request('GET', '/items/templates');
  }

  async craftItem(templateId: string): Promise<{ item: any; resources: Record<string, number> }> {
    return this.request('POST', '/items/craft', { templateId });
  }

  async equipItem(heroId: string, itemId: string, slot: string): Promise<Hero> {
    return this.request('POST', '/items/equip', { heroId, itemId, slot });
  }

  async unequipItem(heroId: string, slot: string): Promise<Hero> {
    return this.request('POST', '/items/unequip', { heroId, slot });
  }

  // World state
  async getWorldState(): Promise<{
    regionId: string;
    date: string;
    weather: {
      condition: string;
      temperature: number;
      humidity: number;
      windSpeed: number;
      rainMm: number;
    };
    modifiers: Record<string, number>;
    activeEvents: unknown[];
    marketState: unknown;
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    festival: {
      name: string;
      flavorText: string;
      buffs: {
        morale: number;
        goldIncome: number;
        marketDiscount: number;
        xpBonus: number;
      };
      duration: number;
    } | null;
  }> {
    return this.request('GET', '/world/state');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
