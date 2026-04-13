import { API_BASE_URL } from '../config';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  SetRegionRequest,
  CreateGuildRequest,
  Guild,
} from '@shared/types';

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
}

export const apiClient = new ApiClient(API_BASE_URL);
