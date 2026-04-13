/**
 * RegionService — Region discovery, reputation, travel, comparison, outposts, claims.
 *
 * T-1083: Region discovery system (fog-of-war)
 * T-1089–T-1091: Travel system with routes and time reduction
 * T-1092–T-1094: Outpost system
 * T-1095: Region danger level
 * T-1096: Region event pools
 * T-1098: Region achievement system
 * T-1100–T-1102: Faction reputation
 * T-1107: Region comparison
 * T-1111: Region unlock requirements
 * T-1112: Hidden region discovery
 * T-1113: Resource depletion and regeneration
 * T-1121: Exploration percentage
 * T-1127: Fast-travel between outposts
 * T-1131–T-1132: Region claim and defense
 * T-1135: Trade embargo
 * T-1136: Weather forecast overlay per region
 * T-1138–T-1139: Landmark discovery
 */
import {
  getAllRegions,
  getRegionById,
  getTravelTime,
  calculateMapDistance,
  getGridCoordinate,
  REGION_DEFINITIONS,
  HIDDEN_REGIONS,
} from '../data/regionData';
import type { RegionDefinition, RegionFaction, Landmark, OutpostSlot } from '../data/regionData';
import { WeatherService } from './WeatherService';

// In-memory state per player (in production, this would be in the database)
interface PlayerRegionState {
  discoveredRegions: Set<string>;
  factionReputation: Record<string, Record<string, number>>; // regionId -> factionId -> rep (-100 to 100)
  outposts: Record<string, OutpostSlot[]>; // regionId -> outpost slots
  claimedRegions: Set<string>;
  discoveredLandmarks: Set<string>;
  discoveredLore: Set<string>;
  explorationProgress: Record<string, number>; // regionId -> 0-100
  activeTravel: {
    fromRegionId: string;
    toRegionId: string;
    startedAt: number;
    arriveAt: number;
  } | null;
  embargoes: Set<string>; // region IDs under trade embargo
}

const playerStates = new Map<string, PlayerRegionState>();

function getPlayerState(playerId: string): PlayerRegionState {
  let state = playerStates.get(playerId);
  if (!state) {
    state = {
      discoveredRegions: new Set(['elderwood-forest', 'verdant-plains']),
      factionReputation: {},
      outposts: {},
      claimedRegions: new Set(),
      discoveredLandmarks: new Set(),
      discoveredLore: new Set(),
      explorationProgress: {},
      activeTravel: null,
      embargoes: new Set(),
    };
    playerStates.set(playerId, state);
  }
  return state;
}

export class RegionService {

  // ──── Discovery (T-1083, T-1084, T-1085) ────

  static getDiscoveredRegions(playerId: string): string[] {
    const state = getPlayerState(playerId);
    return Array.from(state.discoveredRegions);
  }

  static isRegionDiscovered(playerId: string, regionId: string): boolean {
    return getPlayerState(playerId).discoveredRegions.has(regionId);
  }

  /**
   * T-1083, T-1085: Discover a region. Returns true if newly discovered.
   */
  static discoverRegion(playerId: string, regionId: string, guildLevel: number): { success: boolean; message: string } {
    const state = getPlayerState(playerId);
    if (state.discoveredRegions.has(regionId)) {
      return { success: false, message: 'Region already discovered' };
    }

    const region = getRegionById(regionId);
    if (!region) {
      return { success: false, message: 'Unknown region' };
    }

    // T-1111: Check unlock requirements
    if (guildLevel < region.unlockRequirements.guildLevel) {
      return { success: false, message: `Requires guild level ${region.unlockRequirements.guildLevel}` };
    }

    state.discoveredRegions.add(regionId);
    state.explorationProgress[regionId] = 5; // Initial discovery = 5%
    return { success: true, message: `Discovered ${region.name}!` };
  }

  /**
   * T-1112: Hidden region discovery from rare expedition findings.
   */
  static discoverHiddenRegion(playerId: string, regionId: string): { success: boolean; message: string } {
    const hidden = HIDDEN_REGIONS.find(r => r.id === regionId);
    if (!hidden) {
      return { success: false, message: 'Not a hidden region' };
    }

    const state = getPlayerState(playerId);
    if (state.discoveredRegions.has(regionId)) {
      return { success: false, message: 'Already discovered' };
    }

    state.discoveredRegions.add(regionId);
    state.explorationProgress[regionId] = 1;
    return { success: true, message: `Discovered hidden region: ${hidden.name}!` };
  }

  // ──── Region Info (T-1082, T-1095, T-1096) ────

  /**
   * T-1082: Get full region detail including biome, resources, difficulty.
   */
  static getRegionDetail(playerId: string, regionId: string): object | null {
    const region = getRegionById(regionId);
    if (!region) return null;

    const state = getPlayerState(playerId);
    const discovered = state.discoveredRegions.has(regionId);

    // If not discovered, return minimal info (fog-of-war)
    if (!discovered) {
      return {
        id: region.id,
        name: '???',
        biome: { id: region.biome.id, name: 'Unknown', icon: '\u{2753}', color: 0x333333 },
        discovered: false,
        mapX: region.mapX,
        mapY: region.mapY,
        mapRadius: region.mapRadius,
      };
    }

    const explorationPct = state.explorationProgress[regionId] || 0;
    const factionRep = state.factionReputation[regionId] || {};
    const outposts = state.outposts[regionId] || [];
    const claimed = state.claimedRegions.has(regionId);
    const embargoActive = state.embargoes.has(regionId);

    // Populate faction reputation
    const factions = region.factions.map(f => ({
      ...f,
      reputation: factionRep[f.id] || 0,
    }));

    // Mark discovered landmarks and lore
    const landmarks = region.landmarks.map(l => ({
      ...l,
      discovered: state.discoveredLandmarks.has(l.id),
    }));

    const lore = region.lore.map(l => ({
      ...l,
      discovered: !l.discoveredByExploration || state.discoveredLore.has(l.id),
    }));

    const gridCoord = getGridCoordinate(region.mapX, region.mapY);

    return {
      id: region.id,
      name: region.name,
      biome: region.biome,
      climate: region.climate,
      mapX: region.mapX,
      mapY: region.mapY,
      mapRadius: region.mapRadius,
      gridCoordinate: gridCoord,
      difficulty: region.difficulty,
      dangerLevel: region.dangerLevel,
      resources: region.resources,
      factions,
      lore,
      landmarks,
      bosses: region.bosses,
      connections: region.connections,
      discovered: true,
      explorationPercent: explorationPct,
      outposts,
      outpostSlots: region.outpostSlots,
      claimed,
      claimable: region.claimable,
      musicTheme: region.musicTheme,
      craftingRecipes: region.craftingRecipes,
      encounterTable: region.encounterTable,
      merchantInventory: region.merchantInventory,
      weatherOverrides: region.weatherOverrides,
      embargoActive,
      isHidden: region.isHidden,
    };
  }

  // ──── Map overview (T-1071, T-1084, T-1099, T-1103, T-1106, T-1120) ────

  static getMapOverview(playerId: string): object[] {
    const state = getPlayerState(playerId);
    const allRegions = getAllRegions();

    return allRegions
      .filter(r => !r.isHidden || state.discoveredRegions.has(r.id))
      .map(r => {
        const discovered = state.discoveredRegions.has(r.id);
        if (!discovered) {
          return {
            id: r.id,
            mapX: r.mapX,
            mapY: r.mapY,
            mapRadius: r.mapRadius,
            discovered: false,
            fogOfWar: true,
          };
        }
        return {
          id: r.id,
          name: r.name,
          biome: { id: r.biome.id, name: r.biome.name, color: r.biome.color, icon: r.biome.icon },
          mapX: r.mapX,
          mapY: r.mapY,
          mapRadius: r.mapRadius,
          difficulty: r.difficulty,
          discovered: true,
          fogOfWar: false,
          explorationPercent: state.explorationProgress[r.id] || 0,
          hasOutpost: (state.outposts[r.id] || []).length > 0,
          claimed: state.claimedRegions.has(r.id),
          connections: r.connections,
          bossCount: r.bosses.length,
          resourceNodeCount: r.resources.length,
          gridCoordinate: getGridCoordinate(r.mapX, r.mapY),
        };
      });
  }

  // ──── Travel (T-1089, T-1090, T-1091, T-1127, T-1128) ────

  /**
   * T-1089: Start travel between regions.
   */
  static startTravel(
    playerId: string,
    fromRegionId: string,
    toRegionId: string,
    speedBonus: number = 0,
  ): { success: boolean; message: string; arriveAt?: number } {
    const state = getPlayerState(playerId);

    if (state.activeTravel) {
      return { success: false, message: 'Already travelling' };
    }

    if (!state.discoveredRegions.has(toRegionId)) {
      return { success: false, message: 'Destination not discovered' };
    }

    if (state.embargoes.has(toRegionId)) {
      return { success: false, message: 'Trade embargo blocks travel to this region' };
    }

    // T-1127: Fast travel between outposts
    const hasOutpostFrom = (state.outposts[fromRegionId] || []).length > 0;
    const hasOutpostTo = (state.outposts[toRegionId] || []).length > 0;

    let travelDays = getTravelTime(fromRegionId, toRegionId);
    if (travelDays < 0) {
      return { success: false, message: 'No route between these regions' };
    }

    // T-1091: Travel time reduction
    const reduction = Math.min(speedBonus, 0.5); // max 50% reduction
    travelDays = Math.max(1, Math.round(travelDays * (1 - reduction)));

    // Fast travel halves time
    if (hasOutpostFrom && hasOutpostTo) {
      travelDays = Math.max(1, Math.floor(travelDays / 2));
    }

    const now = Date.now();
    const arriveAt = now + travelDays * 24 * 60 * 60 * 1000;

    state.activeTravel = {
      fromRegionId,
      toRegionId,
      startedAt: now,
      arriveAt,
    };

    return {
      success: true,
      message: `Travelling to ${getRegionById(toRegionId)?.name || toRegionId}. Arrives in ${travelDays} day(s).`,
      arriveAt,
    };
  }

  static getTravelStatus(playerId: string): object | null {
    const state = getPlayerState(playerId);
    if (!state.activeTravel) return null;

    const now = Date.now();
    const travel = state.activeTravel;
    const totalMs = travel.arriveAt - travel.startedAt;
    const elapsedMs = now - travel.startedAt;
    const progress = Math.min(1, elapsedMs / totalMs);

    if (progress >= 1) {
      // Arrived
      state.activeTravel = null;
      return { arrived: true, regionId: travel.toRegionId };
    }

    const from = getRegionById(travel.fromRegionId);
    const to = getRegionById(travel.toRegionId);

    return {
      arrived: false,
      fromRegion: from?.name || travel.fromRegionId,
      toRegion: to?.name || travel.toRegionId,
      progress: Math.round(progress * 100),
      arriveAt: new Date(travel.arriveAt).toISOString(),
      // T-1090: Path line positions for visualization
      fromX: from?.mapX || 0,
      fromY: from?.mapY || 0,
      toX: to?.mapX || 0,
      toY: to?.mapY || 0,
      currentX: (from?.mapX || 0) + ((to?.mapX || 0) - (from?.mapX || 0)) * progress,
      currentY: (from?.mapY || 0) + ((to?.mapY || 0) - (from?.mapY || 0)) * progress,
    };
  }

  // ──── Outposts (T-1092, T-1093, T-1094) ────

  static buildOutpost(playerId: string, regionId: string, buildingType: string): { success: boolean; message: string } {
    const state = getPlayerState(playerId);
    if (!state.discoveredRegions.has(regionId)) {
      return { success: false, message: 'Region not discovered' };
    }

    const region = getRegionById(regionId);
    if (!region) return { success: false, message: 'Unknown region' };

    if (!state.outposts[regionId]) {
      state.outposts[regionId] = [];
    }

    if (state.outposts[regionId].length >= region.outpostSlots) {
      return { success: false, message: 'No available outpost slots' };
    }

    state.outposts[regionId].push({
      index: state.outposts[regionId].length,
      buildingType,
      level: 1,
    });

    return { success: true, message: `Built ${buildingType} outpost in ${region.name}` };
  }

  /**
   * T-1094: Calculate outpost resource production.
   */
  static getOutpostProduction(playerId: string, regionId: string): Array<{ resource: string; amount: number }> {
    const state = getPlayerState(playerId);
    const outposts = state.outposts[regionId] || [];
    if (outposts.length === 0) return [];

    const region = getRegionById(regionId);
    if (!region) return [];

    const production: Array<{ resource: string; amount: number }> = [];
    for (const resource of region.resources) {
      const baseAmount = resource.regenRatePerDay * resource.abundance * 0.3; // 30% of region rate
      const outpostBonus = outposts.length * 0.1; // 10% per outpost
      production.push({
        resource: resource.type,
        amount: Math.round(baseAmount * (1 + outpostBonus)),
      });
    }
    return production;
  }

  // ──── Faction Reputation (T-1100, T-1101, T-1102) ────

  static getFactionReputation(playerId: string, regionId: string): Array<{ factionId: string; name: string; reputation: number; disposition: string }> {
    const state = getPlayerState(playerId);
    const region = getRegionById(regionId);
    if (!region) return [];

    const rep = state.factionReputation[regionId] || {};
    return region.factions.map(f => ({
      factionId: f.id,
      name: f.name,
      reputation: rep[f.id] || 0,
      disposition: RegionService.getDisposition(rep[f.id] || 0, f.disposition),
    }));
  }

  static changeFactionReputation(playerId: string, regionId: string, factionId: string, delta: number): number {
    const state = getPlayerState(playerId);
    if (!state.factionReputation[regionId]) {
      state.factionReputation[regionId] = {};
    }
    const current = state.factionReputation[regionId][factionId] || 0;
    const newRep = Math.max(-100, Math.min(100, current + delta));
    state.factionReputation[regionId][factionId] = newRep;
    return newRep;
  }

  private static getDisposition(reputation: number, base: string): string {
    if (reputation >= 50) return 'friendly';
    if (reputation >= 0) return base === 'hostile' ? 'neutral' : base;
    if (reputation >= -50) return 'neutral';
    return 'hostile';
  }

  // ──── Exploration (T-1121, T-1097, T-1138, T-1139) ────

  /**
   * T-1121: Advance exploration progress.
   */
  static advanceExploration(playerId: string, regionId: string, amount: number): { progress: number; newDiscoveries: string[] } {
    const state = getPlayerState(playerId);
    const region = getRegionById(regionId);
    if (!region) return { progress: 0, newDiscoveries: [] };

    const current = state.explorationProgress[regionId] || 0;
    const newProgress = Math.min(100, current + amount);
    state.explorationProgress[regionId] = newProgress;

    const discoveries: string[] = [];

    // Discover landmarks at certain thresholds
    for (const landmark of region.landmarks) {
      if (!state.discoveredLandmarks.has(landmark.id) && newProgress >= 50) {
        state.discoveredLandmarks.add(landmark.id);
        discoveries.push(`Landmark: ${landmark.name}`);
      }
    }

    // Discover hidden lore
    for (const lore of region.lore) {
      if (lore.discoveredByExploration && !state.discoveredLore.has(lore.id) && newProgress >= 75) {
        state.discoveredLore.add(lore.id);
        discoveries.push(`Lore: ${lore.title}`);
      }
    }

    return { progress: newProgress, newDiscoveries: discoveries };
  }

  // ──── Claims (T-1131, T-1132) ────

  static claimRegion(playerId: string, regionId: string): { success: boolean; message: string } {
    const state = getPlayerState(playerId);
    const region = getRegionById(regionId);
    if (!region) return { success: false, message: 'Unknown region' };
    if (!region.claimable) return { success: false, message: 'Region cannot be claimed' };
    if (!state.discoveredRegions.has(regionId)) return { success: false, message: 'Region not discovered' };
    if (state.claimedRegions.has(regionId)) return { success: false, message: 'Already claimed' };

    const exploration = state.explorationProgress[regionId] || 0;
    if (exploration < 50) return { success: false, message: 'Need at least 50% exploration to claim' };

    state.claimedRegions.add(regionId);
    return { success: true, message: `Claimed ${region.name}!` };
  }

  /**
   * T-1132: Generate defense mission for a claimed region.
   */
  static getDefenseMission(playerId: string, regionId: string): object | null {
    const state = getPlayerState(playerId);
    if (!state.claimedRegions.has(regionId)) return null;

    const region = getRegionById(regionId);
    if (!region) return null;

    // Find a hostile faction to generate attack
    const hostileFaction = region.factions.find(f => f.disposition === 'hostile');
    if (!hostileFaction) return null;

    return {
      regionId,
      regionName: region.name,
      attacker: hostileFaction.name,
      difficulty: region.dangerLevel,
      reward: {
        reputation: 15,
        resources: region.resources.map(r => ({ type: r.type, amount: Math.round(r.regenRatePerDay * 2) })),
      },
    };
  }

  // ──── Embargo (T-1135) ────

  static setEmbargo(playerId: string, regionId: string, active: boolean): void {
    const state = getPlayerState(playerId);
    if (active) {
      state.embargoes.add(regionId);
    } else {
      state.embargoes.delete(regionId);
    }
  }

  // ──── Resource Depletion & Regeneration (T-1113) ────

  static depleteResource(regionId: string, resourceType: string, amount: number): boolean {
    const region = getRegionById(regionId);
    if (!region) return false;
    const resource = region.resources.find(r => r.type === resourceType);
    if (!resource) return false;
    resource.depleted = amount >= resource.maxCapacity;
    return true;
  }

  static regenerateResources(): void {
    for (const region of getAllRegions()) {
      for (const resource of region.resources) {
        if (resource.depleted && resource.regenRatePerDay > 0) {
          resource.depleted = false;
        }
      }
    }
  }

  // ──── Comparison (T-1107) ────

  static async compareRegions(regionIds: string[]): Promise<object[]> {
    const results = [];
    for (const id of regionIds.slice(0, 5)) {
      const region = getRegionById(id);
      if (!region) continue;

      let weather = null;
      try {
        weather = await WeatherService.fetchWeather(id);
      } catch { /* no-op */ }

      results.push({
        id: region.id,
        name: region.name,
        biome: region.biome.name,
        climate: region.climate,
        difficulty: region.difficulty,
        dangerLevel: region.dangerLevel,
        resourceTypes: region.resources.map(r => r.type),
        weather: weather ? {
          condition: weather.condition,
          temp: weather.temp,
          humidity: weather.humidity,
        } : null,
      });
    }
    return results;
  }

  // ──── Region Achievements (T-1098) ────

  static getRegionAchievements(playerId: string): object {
    const state = getPlayerState(playerId);
    const totalRegions = REGION_DEFINITIONS.length + HIDDEN_REGIONS.length;
    const discovered = state.discoveredRegions.size;
    const fullyExplored = Object.values(state.explorationProgress).filter(p => p >= 100).length;
    const claimed = state.claimedRegions.size;
    const landmarksFound = state.discoveredLandmarks.size;
    const totalLandmarks = getAllRegions().reduce((sum, r) => sum + r.landmarks.length, 0);

    return {
      regionsDiscovered: discovered,
      totalRegions,
      fullyExplored,
      regionsClaimed: claimed,
      landmarksFound,
      totalLandmarks,
      achievements: [
        { id: 'first-steps', name: 'First Steps', description: 'Discover your first region', earned: discovered >= 1 },
        { id: 'explorer', name: 'Explorer', description: 'Discover 5 regions', earned: discovered >= 5 },
        { id: 'cartographer', name: 'Cartographer', description: 'Discover all regions', earned: discovered >= totalRegions },
        { id: 'conqueror', name: 'Conqueror', description: 'Claim 3 regions', earned: claimed >= 3 },
        { id: 'landmark-hunter', name: 'Landmark Hunter', description: 'Find all landmarks', earned: landmarksFound >= totalLandmarks },
        { id: 'full-survey', name: 'Full Survey', description: 'Fully explore a region (100%)', earned: fullyExplored >= 1 },
      ],
    };
  }

  // ──── Search (T-1105) ────

  static searchRegions(query: string): object[] {
    const q = query.toLowerCase();
    return getAllRegions()
      .filter(r => r.name.toLowerCase().includes(q) || r.biome.name.toLowerCase().includes(q) || r.climate.toLowerCase().includes(q))
      .map(r => ({
        id: r.id,
        name: r.name,
        biome: r.biome.name,
        mapX: r.mapX,
        mapY: r.mapY,
      }));
  }

  // ──── Map Legend (T-1104) ────

  static getMapLegend(): object {
    return {
      biomes: Object.values(getAllRegions().reduce((acc: Record<string, object>, r) => {
        acc[r.biome.id] = { id: r.biome.id, name: r.biome.name, color: r.biome.color, icon: r.biome.icon };
        return acc;
      }, {})),
      icons: [
        { icon: '\u{2753}', label: 'Undiscovered Region' },
        { icon: '\u{1F3E0}', label: 'Outpost' },
        { icon: '\u{2694}', label: 'Boss Location' },
        { icon: '\u{2B50}', label: 'Landmark' },
        { icon: '\u{1F6E2}', label: 'Trade Route' },
        { icon: '\u{26A0}', label: 'Danger Zone' },
        { icon: '\u{1F3F3}', label: 'Claimed Territory' },
        { icon: '\u{1F6AB}', label: 'Trade Embargo' },
      ],
      difficultyScale: [
        { level: '1-3', label: 'Easy', color: '#4ecca3' },
        { level: '4-6', label: 'Medium', color: '#f5a623' },
        { level: '7-9', label: 'Hard', color: '#e94560' },
        { level: '10+', label: 'Extreme', color: '#9d4edd' },
      ],
    };
  }

  // ──── Night/Day overlay (T-1118) ────

  static getDayNightOverlay(): object {
    const now = new Date();
    const hour = now.getUTCHours();
    const isDay = hour >= 6 && hour < 20;
    return {
      utcHour: hour,
      isDay,
      sunPosition: ((hour - 6) / 14) * 100, // 0-100 across day
      overlayOpacity: isDay ? 0 : 0.3,
    };
  }

  // ──── Weather Forecast Overlay (T-1136) ────

  static async getWeatherOverlay(regionIds: string[]): Promise<object[]> {
    const results = [];
    for (const id of regionIds) {
      try {
        const weather = await WeatherService.fetchWeather(id);
        const region = getRegionById(id);
        results.push({
          regionId: id,
          regionName: region?.name || id,
          mapX: region?.mapX || 0,
          mapY: region?.mapY || 0,
          weather: {
            condition: weather.condition,
            temp: Math.round(weather.temp),
            humidity: Math.round(weather.humidity),
            windSpeed: Math.round(weather.windSpeed),
          },
        });
      } catch {
        // skip failed regions
      }
    }
    return results;
  }

  // ──── NPC Caravan Routes (T-1137) ────

  static getCaravanRoutes(): object[] {
    const routes: object[] = [];
    for (const region of getAllRegions()) {
      for (const route of region.caravanRoutes) {
        const target = getRegionById(route.targetRegionId);
        if (!target) continue;
        routes.push({
          fromId: region.id,
          fromName: region.name,
          fromX: region.mapX,
          fromY: region.mapY,
          toId: target.id,
          toName: target.name,
          toX: target.mapX,
          toY: target.mapY,
          travelDays: route.travelDays,
          goods: route.goods,
        });
      }
    }
    return routes;
  }

  // ──── Map Pins (T-1116) ────

  private static playerPins = new Map<string, Array<{ id: string; x: number; y: number; label: string; color: string }>>();

  static addPin(playerId: string, x: number, y: number, label: string, color: string): object {
    if (!RegionService.playerPins.has(playerId)) {
      RegionService.playerPins.set(playerId, []);
    }
    const pins = RegionService.playerPins.get(playerId)!;
    const pin = { id: `pin-${Date.now()}`, x, y, label, color };
    pins.push(pin);
    return pin;
  }

  static getPins(playerId: string): object[] {
    return RegionService.playerPins.get(playerId) || [];
  }

  static removePin(playerId: string, pinId: string): boolean {
    const pins = RegionService.playerPins.get(playerId);
    if (!pins) return false;
    const idx = pins.findIndex(p => p.id === pinId);
    if (idx < 0) return false;
    pins.splice(idx, 1);
    return true;
  }

  // ──── Population/Activity (T-1119) ────

  static getRegionPopulation(regionId: string): object {
    const region = getRegionById(regionId);
    if (!region) return { population: 0, activity: 'none' };

    // Simulate NPC activity based on difficulty and biome
    const basePop = Math.round((10 - region.difficulty) * 15 + 50);
    const hour = new Date().getHours();
    const activityMod = (hour >= 8 && hour <= 20) ? 1.0 : 0.5;

    return {
      population: Math.round(basePop * activityMod),
      activity: activityMod > 0.7 ? 'high' : 'low',
      merchants: region.merchantInventory.length,
      factions: region.factions.length,
    };
  }

  // ──── Region Gallery (T-1125) ────

  static getRegionGallery(playerId: string): object[] {
    const state = getPlayerState(playerId);
    return getAllRegions()
      .filter(r => state.discoveredRegions.has(r.id))
      .map(r => ({
        id: r.id,
        name: r.name,
        biome: r.biome.name,
        icon: r.biome.icon,
        description: r.biome.description,
        explorationPercent: state.explorationProgress[r.id] || 0,
      }));
  }

  // ──── Political Map Overlay (T-1114) ────

  static getPoliticalOverlay(playerId: string): object[] {
    const state = getPlayerState(playerId);
    const results: object[] = [];

    for (const region of getAllRegions()) {
      if (!state.discoveredRegions.has(region.id)) continue;

      const rep = state.factionReputation[region.id] || {};
      const dominantFaction = region.factions.reduce<{ name: string; rep: number } | null>((best, f) => {
        const r = rep[f.id] || 0;
        if (!best || r > best.rep) return { name: f.name, rep: r };
        return best;
      }, null);

      results.push({
        regionId: region.id,
        regionName: region.name,
        mapX: region.mapX,
        mapY: region.mapY,
        mapRadius: region.mapRadius,
        claimed: state.claimedRegions.has(region.id),
        dominantFaction: dominantFaction?.name || 'Unclaimed',
        factions: region.factions.map(f => ({
          name: f.name,
          disposition: f.disposition,
          reputation: rep[f.id] || 0,
        })),
      });
    }
    return results;
  }

  // ──── Active Event Indicators (T-1120) ────

  static getActiveEventIndicators(playerId: string): object[] {
    const state = getPlayerState(playerId);
    const indicators: object[] = [];

    for (const region of getAllRegions()) {
      if (!state.discoveredRegions.has(region.id)) continue;

      // Simulate active events based on region difficulty and time
      const hour = new Date().getHours();
      const hasEvent = (region.difficulty + hour) % 5 === 0;

      if (hasEvent) {
        const encounter = region.encounterTable[hour % region.encounterTable.length];
        indicators.push({
          regionId: region.id,
          regionName: region.name,
          mapX: region.mapX,
          mapY: region.mapY,
          eventName: encounter?.name || 'Unknown Event',
          eventType: 'encounter',
        });
      }
    }
    return indicators;
  }

  // ──── Map Share/Export (T-1126) ────

  static getMapExportData(playerId: string): object {
    const state = getPlayerState(playerId);
    const regions = getAllRegions()
      .filter(r => state.discoveredRegions.has(r.id))
      .map(r => ({
        id: r.id,
        name: r.name,
        biome: r.biome.name,
        mapX: r.mapX,
        mapY: r.mapY,
        explorationPercent: state.explorationProgress[r.id] || 0,
        claimed: state.claimedRegions.has(r.id),
      }));

    return {
      playerId,
      exportDate: new Date().toISOString(),
      totalDiscovered: state.discoveredRegions.size,
      totalClaimed: state.claimedRegions.size,
      totalLandmarks: state.discoveredLandmarks.size,
      regions,
    };
  }

  // ──── Distance Calculator (T-1134) ────

  static getDistance(regionAId: string, regionBId: string): { distance: number; travelDays: number } | null {
    const a = getRegionById(regionAId);
    const b = getRegionById(regionBId);
    if (!a || !b) return null;

    const distance = calculateMapDistance(a.mapX, a.mapY, b.mapX, b.mapY);
    const travelDays = getTravelTime(regionAId, regionBId);

    return {
      distance: Math.round(distance * 10) / 10,
      travelDays: travelDays > 0 ? travelDays : Math.max(1, Math.round(distance / 15)),
    };
  }
}
