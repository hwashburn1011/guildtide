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

  async checkBirthdays(): Promise<Array<{ heroId: string; heroName: string; message: string }>> {
    return this.request('GET', '/heroes/birthdays');
  }

  async rerollHeroStats(heroId: string): Promise<{ success: boolean; newStats: Record<string, number> }> {
    return this.request('POST', `/heroes/${heroId}/reroll`);
  }

  async setHeroWishList(heroId: string, items: string[]): Promise<{ success: boolean }> {
    return this.request('POST', `/heroes/${heroId}/wishlist`, { items });
  }

  async getRecruitmentHistory(): Promise<any[]> {
    return this.request('GET', '/heroes/recruitment-history');
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

  async getEventLog(opts?: { category?: string; rarity?: string; limit?: number; offset?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (opts?.category) params.set('category', opts.category);
    if (opts?.rarity) params.set('rarity', opts.rarity);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return this.request('GET', `/events/log${qs ? `?${qs}` : ''}`);
  }

  async getEventStats(): Promise<any> {
    return this.request('GET', '/events/stats');
  }

  async getEventAchievements(): Promise<any> {
    return this.request('GET', '/events/achievements');
  }

  async getEventReputation(): Promise<any> {
    return this.request('GET', '/events/reputation');
  }

  async getEventPredictions(): Promise<any[]> {
    return this.request('GET', '/events/predictions');
  }

  async getEventChains(): Promise<any> {
    return this.request('GET', '/events/chains');
  }

  async getEventPreferences(): Promise<any> {
    return this.request('GET', '/events/preferences');
  }

  async updateEventPreferences(prefs: any): Promise<void> {
    return this.request('PUT', '/events/preferences', prefs);
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
    options?: {
      bossId?: string;
      chainId?: string;
      chainStep?: number;
      isTimedChallenge?: boolean;
      isFleet?: boolean;
    },
  ): Promise<Expedition> {
    return this.request('POST', '/expeditions/launch', {
      type,
      heroIds,
      destinationId,
      ...options,
    });
  }

  async collectExpedition(expeditionId: string): Promise<Expedition> {
    return this.request('POST', `/expeditions/${expeditionId}/collect`);
  }

  async retreatExpedition(expeditionId: string): Promise<{ retreated: boolean; xpGained: number }> {
    return this.request('POST', `/expeditions/${expeditionId}/retreat`);
  }

  async getExpeditionStatistics(): Promise<any> {
    return this.request('GET', '/expeditions/statistics');
  }

  async getExpeditionDiary(page: number = 0, pageSize: number = 20): Promise<any> {
    return this.request('GET', `/expeditions/diary?page=${page}&pageSize=${pageSize}`);
  }

  async getExpeditionDiscoveries(): Promise<any[]> {
    return this.request('GET', '/expeditions/discoveries');
  }

  async getExpeditionBosses(): Promise<any[]> {
    return this.request('GET', '/expeditions/bosses');
  }

  async getExpeditionChains(): Promise<any[]> {
    return this.request('GET', '/expeditions/chains');
  }

  async getExpeditionFogOfWar(): Promise<Record<string, boolean>> {
    return this.request('GET', '/expeditions/fog-of-war');
  }

  async getExpeditionWeatherForecast(): Promise<any> {
    return this.request('GET', '/expeditions/weather-forecast');
  }

  async getExpeditionLeaderboard(destinationId: string): Promise<any[]> {
    return this.request('GET', `/expeditions/leaderboard/${destinationId}`);
  }

  async getEncounterHistory(destinationId: string): Promise<any[]> {
    return this.request('GET', `/expeditions/encounter-history/${destinationId}`);
  }

  async validateExpeditionParty(heroIds: string[], destinationId: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.request('POST', '/expeditions/validate-party', { heroIds, destinationId });
  }

  async getExpeditionPartyPower(heroIds: string[]): Promise<{ power: number }> {
    return this.request('POST', '/expeditions/party-power', { heroIds });
  }

  async getExpeditionRecommendation(destinationId: string): Promise<any> {
    return this.request('GET', `/expeditions/recommend/${destinationId}`);
  }

  async scoutDestination(destinationId: string, scoutLevel: number = 1): Promise<any> {
    return this.request('GET', `/expeditions/scout/${destinationId}?scoutLevel=${scoutLevel}`);
  }

  async getExpeditionPostMortem(destinationId: string): Promise<any> {
    return this.request('GET', `/expeditions/post-mortem/${destinationId}`);
  }

  async getExpeditionTemplates(): Promise<any[]> {
    return this.request('GET', '/expeditions/templates');
  }

  async saveExpeditionTemplate(name: string, heroIds: string[], destinationId?: string): Promise<any> {
    return this.request('POST', '/expeditions/templates', { name, heroIds, destinationId });
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
      changePercent: number;
      supplyDemandRatio: number;
    }>;
    economicPhase: string;
    inflationIndex: number;
    activeEvents: Array<{ id: string; title: string; description: string; effects: Record<string, number> }>;
    newsTicker: string[];
    dailyDeals: Array<{ resource: string; discount: number; quantity: number; expiresAt: number }>;
  }> {
    return this.request('GET', '/market');
  }

  async marketBuy(resource: string, quantity: number): Promise<{
    success: boolean;
    resource: string;
    quantity: number;
    totalPrice: number;
    fees: number;
    resources: Record<string, number>;
    reputation: number;
  }> {
    return this.request('POST', '/market/buy', { resource, quantity });
  }

  async marketSell(resource: string, quantity: number): Promise<{
    success: boolean;
    resource: string;
    quantity: number;
    totalPrice: number;
    fees: number;
    resources: Record<string, number>;
    reputation: number;
  }> {
    return this.request('POST', '/market/sell', { resource, quantity });
  }

  async marketQuickSell(resource: string, quantity: number): Promise<{
    success: boolean;
    resource: string;
    quantity: number;
    totalPrice: number;
    fees: number;
    resources: Record<string, number>;
    reputation: number;
  }> {
    return this.request('POST', '/market/quick-sell', { resource, quantity });
  }

  async getMarketHistory(limit: number = 50): Promise<any[]> {
    return this.request('GET', `/market/history?limit=${limit}`);
  }

  async getMarketPriceHistory(resource?: string, limit: number = 24): Promise<any[]> {
    const params = new URLSearchParams();
    if (resource) params.set('resource', resource);
    params.set('limit', String(limit));
    return this.request('GET', `/market/price-history?${params}`);
  }

  async getMarketAnalytics(): Promise<any> {
    return this.request('GET', '/market/analytics');
  }

  async getMarketMerchants(): Promise<any[]> {
    return this.request('GET', '/market/merchants');
  }

  async buyFromMerchant(merchantId: string, resource: string, quantity: number): Promise<any> {
    return this.request('POST', `/market/merchants/${merchantId}/buy`, { resource, quantity });
  }

  async createAuction(resource: string, quantity: number, startingPrice: number, buyoutPrice?: number, durationHours?: number): Promise<any> {
    return this.request('POST', '/market/auctions', { resource, quantity, startingPrice, buyoutPrice, durationHours });
  }

  async getAuctions(resource?: string): Promise<any[]> {
    const params = resource ? `?resource=${resource}` : '';
    return this.request('GET', `/market/auctions${params}`);
  }

  async placeBid(auctionId: string, amount: number): Promise<any> {
    return this.request('POST', `/market/auctions/${auctionId}/bid`, { amount });
  }

  async getAuctionHistory(): Promise<any[]> {
    return this.request('GET', '/market/auctions/history');
  }

  async createTradeRoute(fromRegion: string, toRegion: string, resource: string, quantity: number, travelHours?: number): Promise<any> {
    return this.request('POST', '/market/trade-routes', { fromRegion, toRegion, resource, quantity, travelHours });
  }

  async getTradeRoutes(): Promise<any[]> {
    return this.request('GET', '/market/trade-routes');
  }

  async getTradeRouteProfit(resource: string, quantity: number, buyPrice: number, sellPrice: number): Promise<any> {
    return this.request('GET', `/market/trade-routes/profit?resource=${resource}&quantity=${quantity}&buyPrice=${buyPrice}&sellPrice=${sellPrice}`);
  }

  async getMarketWatchlist(): Promise<any[]> {
    return this.request('GET', '/market/watchlist');
  }

  async setMarketWatchlist(items: Array<{ resource: string; targetPrice: number; direction: 'above' | 'below' }>): Promise<any> {
    return this.request('POST', '/market/watchlist', { items });
  }

  async getMarketAlerts(): Promise<any[]> {
    return this.request('GET', '/market/alerts');
  }

  async getOrderBook(resource?: string): Promise<any[]> {
    const params = resource ? `?resource=${resource}` : '';
    return this.request('GET', `/market/order-book${params}`);
  }

  async createFuture(resource: string, quantity: number, purchasePrice: number, maturityHours?: number): Promise<any> {
    return this.request('POST', '/market/futures', { resource, quantity, purchasePrice, maturityHours });
  }

  async getActiveFutures(): Promise<any[]> {
    return this.request('GET', '/market/futures');
  }

  async getMarketAchievements(): Promise<any[]> {
    return this.request('GET', '/market/achievements');
  }

  async getMarketReputation(): Promise<{ reputation: number; discountPercent: number }> {
    return this.request('GET', '/market/reputation');
  }

  async getMarketPnL(): Promise<{ netProfitLoss: number }> {
    return this.request('GET', '/market/pnl');
  }

  async getExchangeRates(): Promise<Record<string, number>> {
    return this.request('GET', '/market/exchange-rates');
  }

  async getDemandForecast(resource: string): Promise<{ nextDay: number; trend: string }> {
    return this.request('GET', `/market/demand-forecast?resource=${resource}`);
  }

  async getMarketSpotlight(): Promise<any> {
    return this.request('GET', '/market/spotlight');
  }

  async getMarketTutorial(): Promise<Array<{ title: string; text: string }>> {
    return this.request('GET', '/market/tutorial');
  }

  async getMarketNews(): Promise<string[]> {
    return this.request('GET', '/market/news');
  }

  async getMarketDailyDeals(): Promise<any[]> {
    return this.request('GET', '/market/daily-deals');
  }

  async searchMarketItems(query: string): Promise<any[]> {
    return this.request('GET', `/market/search?q=${encodeURIComponent(query)}`);
  }

  async compareMerchantPrices(): Promise<any[]> {
    return this.request('GET', '/market/compare');
  }

  async getMarketInflation(): Promise<{ inflationIndex: number }> {
    return this.request('GET', '/market/inflation');
  }

  async getMarketMiniWidget(): Promise<any[]> {
    return this.request('GET', '/market/mini-widget');
  }

  // Research
  async getResearchState(): Promise<any> {
    return this.request('GET', '/research');
  }

  async getAdvancedResearchState(season?: string): Promise<any> {
    const params = season ? `?season=${season}` : '';
    return this.request('GET', `/research/advanced${params}`);
  }

  async startResearch(researchId: string): Promise<any> {
    return this.request('POST', `/research/${researchId}/start`);
  }

  async cancelResearch(): Promise<{ refunded: Record<string, number> }> {
    return this.request('POST', '/research/cancel');
  }

  async queueResearch(researchId: string): Promise<{ queue: any[] }> {
    return this.request('POST', '/research/queue', { researchId });
  }

  async dequeueResearch(researchId: string): Promise<{ queue: any[] }> {
    return this.request('DELETE', `/research/queue/${researchId}`);
  }

  async undoResearch(): Promise<{ undone: string; refunded: Record<string, number> }> {
    return this.request('POST', '/research/undo');
  }

  async contributeResearch(playerName: string, points: number): Promise<{ contributions: any[] }> {
    return this.request('POST', '/research/contribute', { playerName, points });
  }

  async triggerResearchEvent(eventId: string): Promise<{ event: any }> {
    return this.request('POST', '/research/event', { eventId });
  }

  async searchResearch(query: string): Promise<{ results: any[] }> {
    return this.request('GET', `/research/search?q=${encodeURIComponent(query)}`);
  }

  async filterResearch(opts: { branch?: string; status?: string; effectType?: string }): Promise<{ results: any[] }> {
    const params = new URLSearchParams();
    if (opts.branch) params.set('branch', opts.branch);
    if (opts.status) params.set('status', opts.status);
    if (opts.effectType) params.set('effectType', opts.effectType);
    return this.request('GET', `/research/filter?${params}`);
  }

  async prestigeResearch(): Promise<{ kept: string[]; prestigeLevel: number }> {
    return this.request('POST', '/research/prestige');
  }

  async specializeResearch(branch: string, subPath: string): Promise<{ specialization: string }> {
    return this.request('POST', '/research/specialize', { branch, subPath });
  }

  async getResearchSpecializations(): Promise<{ specializations: Record<string, string> }> {
    return this.request('GET', '/research/specializations');
  }

  async exportResearchTree(): Promise<any> {
    return this.request('GET', '/research/export');
  }

  async compareResearchPaths(pathA: string[], pathB: string[]): Promise<any> {
    return this.request('POST', '/research/compare-paths', { pathA, pathB });
  }

  async setResearchNotificationPrefs(prefs: { onComplete: boolean; onQueueAdvance: boolean; onEvent: boolean }): Promise<any> {
    return this.request('POST', '/research/notification-prefs', prefs);
  }

  async getRecommendedPath(branch: string): Promise<{ path: any[] }> {
    return this.request('GET', `/research/recommended-path/${branch}`);
  }

  async getBranchEffects(branch: string): Promise<{ effects: Record<string, number> }> {
    return this.request('GET', `/research/branch-effects/${branch}`);
  }

  async getResearchAnnouncements(): Promise<{ announcements: any[] }> {
    return this.request('GET', '/research/announcements');
  }

  // Items & Equipment
  async getInventory(options?: { sortBy?: string; category?: string; rarity?: string; search?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.sortBy) params.set('sortBy', options.sortBy);
    if (options?.category) params.set('category', options.category);
    if (options?.rarity) params.set('rarity', options.rarity);
    if (options?.search) params.set('search', options.search);
    const qs = params.toString();
    return this.request('GET', `/items${qs ? `?${qs}` : ''}`);
  }

  async getItemTemplates(): Promise<any[]> {
    return this.request('GET', '/items/templates');
  }

  async getItemSets(): Promise<any[]> {
    return this.request('GET', '/items/sets');
  }

  async getEnchantments(): Promise<any[]> {
    return this.request('GET', '/items/enchantments');
  }

  async getGemEffects(): Promise<Record<string, Record<string, number>>> {
    return this.request('GET', '/items/gems');
  }

  async getItemCollection(): Promise<Record<string, { owned: number; total: number; percent: number }>> {
    return this.request('GET', '/items/collection');
  }

  async getItemLore(): Promise<Array<{ templateId: string; name: string; lore: string }>> {
    return this.request('GET', '/items/lore');
  }

  async getInventoryCapacity(): Promise<{ used: number; max: number }> {
    return this.request('GET', '/items/capacity');
  }

  async getRecommendedGear(heroId: string): Promise<Array<{ slot: string; currentTemplateId: string | null; recommendedTemplateId: string; reason: string }>> {
    return this.request('GET', `/items/recommended/${heroId}`);
  }

  async getItemPriceEstimate(templateId: string): Promise<{ templateId: string; estimatedPrice: number }> {
    return this.request('GET', `/items/price-estimate/${templateId}`);
  }

  async craftItem(templateId: string): Promise<{ item: any; resources: Record<string, number> }> {
    return this.request('POST', '/items/craft', { templateId });
  }

  async getCraftingRecipes(): Promise<any[]> {
    return this.request('GET', '/items/recipes');
  }

  async getMaterialSources(recipeId: string): Promise<Array<{ resource: string; sources: string[] }>> {
    return this.request('GET', `/items/recipes/${recipeId}/sources`);
  }

  async getCraftingState(): Promise<any> {
    return this.request('GET', '/items/crafting-state');
  }

  async queueCraft(recipeId: string): Promise<any> {
    return this.request('POST', '/items/crafting/queue', { recipeId });
  }

  async collectCrafting(): Promise<any> {
    return this.request('POST', '/items/crafting/collect');
  }

  async cancelCrafting(recipeId: string): Promise<any> {
    return this.request('POST', '/items/crafting/cancel', { recipeId });
  }

  async getCraftingHistory(): Promise<any[]> {
    return this.request('GET', '/items/crafting/history');
  }

  async discoverRecipe(recipeId: string): Promise<any> {
    return this.request('POST', '/items/crafting/discover', { recipeId });
  }

  async equipItem(heroId: string, itemId: string, slot: string): Promise<Hero> {
    return this.request('POST', '/items/equip', { heroId, itemId, slot });
  }

  async unequipItem(heroId: string, slot: string): Promise<Hero> {
    return this.request('POST', '/items/unequip', { heroId, slot });
  }

  async autoEquipBest(heroId: string): Promise<{ equipment: Record<string, string | null> }> {
    return this.request('POST', '/items/auto-equip', { heroId });
  }

  async getGearScore(heroId: string): Promise<any> {
    return this.request('GET', `/items/gear-score/${heroId}`);
  }

  async getSetBonuses(heroId: string): Promise<any[]> {
    return this.request('GET', `/items/set-bonuses/${heroId}`);
  }

  async repairItem(templateId: string): Promise<{ cost: number; durability: number }> {
    return this.request('POST', '/items/repair', { templateId });
  }

  async salvageItem(itemId: string, quantity?: number): Promise<{ recovered: Record<string, number> }> {
    return this.request('POST', '/items/salvage', { itemId, quantity: quantity || 1 });
  }

  async upgradeItem(itemId: string): Promise<{ newItem: any }> {
    return this.request('POST', '/items/upgrade', { itemId });
  }

  async toggleItemLock(itemId: string): Promise<{ locked: boolean }> {
    return this.request('POST', '/items/lock', { itemId });
  }

  async sellItems(items: Array<{ itemId: string; quantity: number }>): Promise<{ totalGold: number }> {
    return this.request('POST', '/items/sell', { items });
  }

  async setTransmog(itemId: string, transmogTemplateId: string | null): Promise<any> {
    return this.request('POST', '/items/transmog', { itemId, transmogTemplateId });
  }

  async enchantItem(itemId: string, enchantmentId: string): Promise<any> {
    return this.request('POST', '/items/enchant', { itemId, enchantmentId });
  }

  async disenchantItem(itemId: string, enchantmentId: string): Promise<any> {
    return this.request('POST', '/items/disenchant', { itemId, enchantmentId });
  }

  async socketGem(itemId: string, gemItemId: string, socketIndex: number): Promise<any> {
    return this.request('POST', '/items/socket-gem', { itemId, gemItemId, socketIndex });
  }

  async unsocketGem(itemId: string, socketIndex: number): Promise<any> {
    return this.request('POST', '/items/unsocket-gem', { itemId, socketIndex });
  }

  async saveEquipmentLoadout(heroId: string, name: string): Promise<any> {
    return this.request('POST', '/items/loadout', { heroId, name });
  }

  async expandStorage(): Promise<{ newMax: number; cost: number }> {
    return this.request('POST', '/items/expand-storage');
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
    moonPhase: {
      phase: string;
      label: string;
      icon: string;
      effects: { magicPotency: number; stealthBonus: number };
    };
    astronomicalEvents: Array<{ name: string; effects: Record<string, number> }>;
    severeAlerts: Array<{ alert: string; timestamp: string }>;
    biomeEffects: Record<string, number>;
  }> {
    return this.request('GET', '/world/state');
  }

  // Weather forecast (T-0777)
  async getWeatherForecast(): Promise<{
    forecast: Array<{
      date: string;
      highTemp: number;
      lowTemp: number;
      dominantCondition: string;
      avgHumidity: number;
      avgWindSpeed: number;
      totalRainMm: number;
    }>;
    pattern: {
      consecutiveDays: number;
      condition: string;
      trend: string;
      predictionBonus: number;
    } | null;
  }> {
    return this.request('GET', '/world/forecast');
  }

  // Weather history (T-0778)
  async getWeatherHistory(days: number = 7): Promise<{
    history: Array<{
      date: string;
      condition: string;
      temperature: number;
      humidity: number;
      windSpeed: number;
      rainMm: number;
    }>;
  }> {
    return this.request('GET', `/world/weather-history?days=${days}`);
  }

  // Weather comparison (T-0788)
  async compareWeather(regionIds: string[]): Promise<{
    comparison: Array<{
      regionId: string;
      condition: string;
      temperature: number;
      modifiers: Record<string, number>;
    }>;
  }> {
    return this.request('GET', `/world/weather-compare?regions=${regionIds.join(',')}`);
  }

  // Weather achievements (T-0789)
  async getWeatherAchievements(): Promise<{
    conditionsSeen: number;
    totalConditions: number;
    achieved: boolean;
    daysPlayed: number;
  }> {
    return this.request('GET', '/world/weather-achievements');
  }

  // Severe weather alerts (T-0787)
  async getWeatherAlerts(): Promise<{
    alerts: Array<{ alert: string; timestamp: string }>;
  }> {
    return this.request('GET', '/world/weather-alerts');
  }

  // Lunar calendar (T-0815)
  async getLunarCalendar(): Promise<{
    calendar: Array<{
      date: string;
      phase: string;
      label: string;
      icon: string;
    }>;
    currentPhase: {
      label: string;
      icon: string;
      magicPotency: number;
      stealthBonus: number;
      essenceDrops: number;
      huntBonus: number;
      morale: number;
    };
  }> {
    return this.request('GET', '/world/lunar-calendar');
  }

  // Data pipeline snapshot (T-0842)
  async getDataPipeline(): Promise<{
    fearGreed: { value: number; classification: string } | null;
    stockIndex: { index: string; value: number; changePct: number } | null;
    cryptoSentiment: { sentiment: number } | null;
    newsHeadlines: Array<{ title: string; sentiment: string; source: string }>;
    sportsEvents: Array<{ league: string; event: string }>;
    moonPhase: { phase: string; label: string; icon: string };
    astronomicalEvents: Array<{ name: string; fantasyName: string }>;
    celebrations: Array<{ fantasyName: string; description: string; significance: number }>;
    modifierSummary: Record<string, number>;
    sources: Array<{
      source: string;
      enabled: boolean;
      reliability: number;
      callCount: number;
      lastError: string | null;
    }>;
  }> {
    return this.request('GET', '/world/data-pipeline');
  }

  // Data pipeline health (T-0818)
  async getDataPipelineHealth(): Promise<{
    sources: Array<{
      source: string;
      enabled: boolean;
      lastFetch: number | null;
      lastSuccess: number | null;
      lastError: string | null;
      reliability: number;
      callCount: number;
      errorCount: number;
    }>;
    circuitBreakers: Array<{ source: string; state: string; failures: number }>;
  }> {
    return this.request('GET', '/world/data-pipeline/health');
  }

  // Data freshness (T-0830)
  async getDataFreshness(): Promise<{
    sources: Array<{
      source: string;
      lastUpdate: string | null;
      ageSeconds: number;
      isStale: boolean;
    }>;
  }> {
    return this.request('GET', '/world/data-pipeline/freshness');
  }

  // Data opt-out (T-0823)
  async getDataOptOut(): Promise<{ optedOut: boolean }> {
    return this.request('GET', '/world/data-pipeline/opt-out');
  }

  async setDataOptOut(optOut: boolean): Promise<{ optedOut: boolean }> {
    return this.request('POST', '/world/data-pipeline/opt-out', { optOut });
  }

  // Per-modifier toggle (T-0860)
  async setModifierEnabled(modifier: string, enabled: boolean): Promise<{ success: boolean }> {
    return this.request('POST', `/world/data-pipeline/modifiers/${modifier}`, { enabled });
  }

  // Modifier summary with compound effects (T-0822, T-0832)
  async getModifierSummary(): Promise<{
    modifiers: Record<string, number>;
    compoundEffects: Array<{
      name: string;
      description: string;
      modifiers: Record<string, number>;
    }>;
  }> {
    return this.request('GET', '/world/modifier-summary');
  }

  // Data pipeline changelog (T-0835)
  async getDataChangelog(): Promise<{ changes: string[] }> {
    return this.request('GET', '/world/data-pipeline/changelog');
  }

  // Impact report (T-0845)
  async getImpactReport(): Promise<{
    report: Array<{
      date: string;
      modifiers: Record<string, number>;
      moonPhase: string;
      celebrations: number;
    }>;
  }> {
    return this.request('GET', '/world/data-pipeline/impact-report');
  }

  // Observatory upgrades (T-0836)
  async getObservatoryUpgrades(): Promise<{
    upgrades: Array<{
      level: number;
      dataSources: string[];
      description: string;
    }>;
  }> {
    return this.request('GET', '/world/observatory-upgrades');
  }

  // Expedition weather modifiers (T-0783)
  async getExpeditionModifiers(): Promise<{
    weather: Record<string, unknown>;
    expeditionModifiers: {
      travelSpeed: number;
      huntBonus: number;
      floodRisk: number;
    };
    severeAlerts: Array<{ alert: string; timestamp: string }>;
  }> {
    return this.request('GET', '/world/expedition-modifiers');
  }

  // Data tutorial (T-0824)
  async getDataTutorial(): Promise<{
    steps: Array<{ title: string; text: string }>;
  }> {
    return this.request('GET', '/world/data-tutorial');
  }

  // API usage (T-0828)
  async getApiUsage(): Promise<{
    sources: Array<{ source: string; calls: number; errors: number; reliability: number }>;
    totalCalls: number;
    totalErrors: number;
  }> {
    return this.request('GET', '/world/data-pipeline/usage');
  }

  // Data source config (T-0821)
  async getDataSourceConfig(): Promise<Record<string, { enabled: boolean; priority: string; fetchIntervalMs: number }>> {
    return this.request('GET', '/world/data-pipeline/config');
  }

  async setDataSourceEnabled(source: string, enabled: boolean): Promise<{ success: boolean }> {
    return this.request('POST', `/world/data-pipeline/config/${source}`, { enabled });
  }

  // Cache refresh (T-0765)
  async refreshWeatherCache(): Promise<{ success: boolean }> {
    return this.request('POST', '/world/weather/refresh');
  }

  // Privacy info (T-0855)
  async getDataPrivacyInfo(): Promise<{
    policy: string;
    dataRetention: string;
    optOutAvailable: boolean;
  }> {
    return this.request('GET', '/world/data-pipeline/privacy');
  }

  // Integration docs (T-0852)
  async getDataSourceDocs(): Promise<{
    dataSources: Array<{ name: string; type: string; refreshRate: string; description: string }>;
    mappingRules: string;
  }> {
    return this.request('GET', '/world/data-pipeline/docs');
  }

  // Health check (T-0858)
  async getDataPipelineHealthCheck(): Promise<{
    status: string;
    sources: Array<{ source: string; reliability: number; lastError: string | null }>;
  }> {
    return this.request('GET', '/world/data-pipeline/healthcheck');
  }

  // Historical archive (T-0831)
  async getDataArchive(days: number = 30): Promise<{
    archive: Array<{ date: string; snapshot: unknown }>;
  }> {
    return this.request('GET', `/world/data-pipeline/archive?days=${days}`);
  }

  // Leaderboard (T-0849)
  async getPredictionLeaderboard(): Promise<{
    leaderboard: unknown[];
    message: string;
  }> {
    return this.request('GET', '/world/data-pipeline/leaderboard');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
