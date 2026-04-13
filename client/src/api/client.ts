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

  async getResources(): Promise<{
    current: Record<ResourceType, number>;
    caps: Record<ResourceType, number>;
  }> {
    return this.request('GET', '/resources/balance');
  }

  async convertResources(recipeId: string, quantity: number): Promise<{
    success: boolean;
    consumed: Record<string, number>;
    produced: Record<string, number>;
  }> {
    return this.request('POST', '/resources/convert', { recipeId, quantity });
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

  async getHeroDetail(heroId: string): Promise<any> {
    return this.request('GET', `/heroes/${heroId}/detail`);
  }

  async dismissHero(heroId: string): Promise<{ success: boolean; farewellMessage: string }> {
    return this.request('POST', `/heroes/${heroId}/dismiss`);
  }

  async awardHeroXP(heroId: string, amount: number, source: string): Promise<any> {
    return this.request('POST', `/heroes/${heroId}/xp`, { amount, source });
  }

  async unlockHeroSkill(heroId: string, skillId: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', `/heroes/${heroId}/skills/unlock`, { skillId });
  }

  async respecHeroSkills(heroId: string): Promise<{ success: boolean; cost: number }> {
    return this.request('POST', `/heroes/${heroId}/skills/respec`);
  }

  async getSkillTree(role: string): Promise<any> {
    return this.request('GET', `/heroes/skill-trees/${role}`);
  }

  async retireHero(heroId: string): Promise<any> {
    return this.request('POST', `/heroes/${heroId}/retire`);
  }

  async trainHero(heroId: string, stat: string): Promise<any> {
    return this.request('POST', `/heroes/${heroId}/train`, { stat });
  }

  async adjustHeroMorale(heroId: string, delta: number): Promise<{ morale: number; label: string }> {
    return this.request('POST', `/heroes/${heroId}/morale`, { delta });
  }

  async specializeHero(heroId: string, specializationId: string): Promise<any> {
    return this.request('POST', `/heroes/${heroId}/specialize`, { specializationId });
  }

  async evolveHeroClass(heroId: string, evolutionId: string): Promise<any> {
    return this.request('POST', `/heroes/${heroId}/evolve`, { evolutionId });
  }

  async setHeroNickname(heroId: string, nickname: string): Promise<{ success: boolean }> {
    return this.request('POST', `/heroes/${heroId}/nickname`, { nickname });
  }

  async toggleHeroFavorite(heroId: string): Promise<{ favorited: boolean }> {
    return this.request('POST', `/heroes/${heroId}/favorite`);
  }

  async compareHeroes(heroAId: string, heroBId: string): Promise<{ heroA: any; heroB: any }> {
    return this.request('GET', `/heroes/compare?heroA=${heroAId}&heroB=${heroBId}`);
  }

  async searchHeroes(query: string): Promise<Hero[]> {
    return this.request('GET', `/heroes/search?q=${encodeURIComponent(query)}`);
  }

  async getHeroDashboard(): Promise<any> {
    return this.request('GET', '/heroes/dashboard');
  }

  async getAutoAssignSuggestions(): Promise<Array<{ heroId: string; heroName: string; building: string; score: number }>> {
    return this.request('GET', '/heroes/auto-assign');
  }

  async batchAssignIdle(): Promise<{ assigned: number }> {
    return this.request('POST', '/heroes/batch/assign-idle');
  }

  async batchRestAll(): Promise<{ rested: number }> {
    return this.request('POST', '/heroes/batch/rest-all');
  }

  async getSpecializations(role: string): Promise<any[]> {
    return this.request('GET', `/heroes/specializations/${role}`);
  }

  async getClassEvolutions(role: string): Promise<any[]> {
    return this.request('GET', `/heroes/evolutions/${role}`);
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

  // Guild XP
  async getGuildXP(): Promise<{
    level: number;
    xp: number;
    xpToNext: number;
    unlockedBuildings: string[];
    unlockedFeatures: string[];
    buildingSlots: number;
    nextReward: any;
  }> {
    return this.request('GET', '/guild/xp');
  }

  async addGuildXP(amount: number): Promise<{
    level: number;
    xp: number;
    xpToNext: number;
    levelUps: any[];
  }> {
    return this.request('POST', '/guild/xp', { amount });
  }

  // Guild emblem
  async setGuildEmblem(color: string, symbol: string): Promise<{ emblem: { color: string; symbol: string } }> {
    return this.request('POST', '/guild/emblem', { color, symbol });
  }

  // Guild motto
  async setGuildMotto(motto: string): Promise<{ motto: string }> {
    return this.request('POST', '/guild/motto', { motto });
  }

  // Guild stats
  async getGuildStats(): Promise<{
    totalBuildingsConstructed: number;
    totalExpeditionsCompleted: number;
    totalResourcesEarned: number;
    totalHeroesRecruited: number;
    totalResearchCompleted: number;
    totalMarketTrades: number;
    guildAgeDays: number;
    loginStreak: number;
  }> {
    return this.request('GET', '/guild/stats');
  }

  // Guild activity feed
  async getGuildActivity(limit?: number): Promise<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    data?: Record<string, unknown>;
  }>> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request('GET', `/guild/activity${params}`);
  }

  // Daily login reward
  async claimDailyReward(): Promise<{
    day: number;
    resources: Record<string, number>;
    xp: number;
    label: string;
    streak: number;
  }> {
    return this.request('POST', '/guild/daily-reward');
  }

  // Building synergies
  async getBuildingSynergies(): Promise<Array<{
    buildingA: string;
    buildingB: string;
    bonusPercent: number;
    description: string;
  }>> {
    return this.request('GET', '/guild/synergies');
  }

  // Seasonal decoration
  async getSeasonalDecoration(): Promise<{
    season: string;
    decoration: string;
    description: string;
  }> {
    return this.request('GET', '/guild/seasonal');
  }

  // Building detail
  async getBuildingDetail(type: string): Promise<{
    type: string;
    name: string;
    description: string;
    level: number;
    maxLevel: number;
    currentOutput: Record<string, number>;
    nextOutput: Record<string, number>;
    upgradeCost: Record<string, number> | null;
    assignedHero: { id: string; name: string; role: string; level: number } | null;
  }> {
    return this.request('GET', `/buildings/${type}/detail`);
  }

  // Demolish building
  async demolishBuilding(type: string): Promise<{
    refund: Record<string, number>;
    resources: Record<string, number>;
  }> {
    return this.request('POST', `/buildings/${type}/demolish`);
  }

  // Construction queue
  async queueBuilding(buildingType: string): Promise<{
    building: any;
    resources: Record<string, number>;
  }> {
    return this.request('POST', '/buildings/queue', { buildingType });
  }

  // Complete construction
  async completeConstruction(type: string): Promise<{ building: any }> {
    return this.request('POST', `/buildings/${type}/complete`);
  }

  // Extended building detail
  async getExtendedBuildingDetail(type: string): Promise<any> {
    return this.request('GET', `/buildings/${type}/extended`);
  }

  // Specialize building
  async specializeBuilding(type: string, specializationId: string): Promise<{ success: boolean }> {
    return this.request('POST', `/buildings/${type}/specialize`, { specializationId });
  }

  // Pay building maintenance
  async payBuildingMaintenance(type: string): Promise<{
    success: boolean;
    costs?: Record<string, number>;
  }> {
    return this.request('POST', `/buildings/${type}/maintenance`);
  }

  // Toggle auto-collect
  async toggleBuildingAutoCollect(type: string, enabled: boolean): Promise<{ success: boolean }> {
    return this.request('POST', `/buildings/${type}/auto-collect`, { enabled });
  }

  // Get production chains
  async getProductionChains(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    steps: Array<{ building: string; input: Record<string, number>; output: Record<string, number> }>;
    active: boolean;
    efficiency: number;
  }>> {
    return this.request('GET', '/buildings/chains/all');
  }

  // Get building comparison
  async getBuildingComparison(type: string): Promise<{
    current: { output: Record<string, number>; maintenance: Record<string, number> };
    next: { output: Record<string, number>; maintenance: Record<string, number>; cost: Record<string, number> };
  }> {
    return this.request('GET', `/buildings/${type}/compare`);
  }

  // Get building info card
  async getBuildingInfoCard(type: string): Promise<{
    name: string;
    description: string;
    level: number;
    maxLevel: number;
    stats: Array<{ label: string; current: string; next: string; change: string }>;
  }> {
    return this.request('GET', `/buildings/${type}/info`);
  }

  // Get building lore
  async getBuildingLore(type: string): Promise<Array<{
    level: number;
    title: string;
    text: string;
  }>> {
    return this.request('GET', `/buildings/${type}/lore`);
  }

  // Check building achievements
  async checkBuildingAchievements(): Promise<{
    achievements: any[];
    all: any[];
  }> {
    return this.request('GET', '/buildings/achievements/check');
  }

  // Check building storage
  async checkBuildingStorage(type: string): Promise<{
    full: Array<{ resource: string; current: number; cap: number }>;
  }> {
    return this.request('GET', `/buildings/${type}/storage-check`);
  }

  // Get worker efficiency
  async getWorkerEfficiency(type: string): Promise<Array<{
    heroId: string;
    heroName: string;
    heroRole: string;
    baseEfficiency: number;
    roleMatchBonus: number;
    skillBonus: number;
    happinessModifier: number;
    totalEfficiency: number;
  }>> {
    return this.request('GET', `/buildings/${type}/worker-efficiency`);
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
