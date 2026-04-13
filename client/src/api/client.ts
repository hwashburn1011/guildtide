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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('guildtide_token');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/auth/login', data);
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/auth/register', data);
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
