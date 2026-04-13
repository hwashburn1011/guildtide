/**
 * financialMappings.ts — Detailed rules mapping financial data to in-game effects.
 *
 * T-0991: Stock data API integration config
 * T-0996: S&P 500 daily change -> merchant guild prosperity
 * T-0997: Positive market day effect: +15% trade values
 * T-0998: Negative market day effect: -10% trade, +5% rare item chance
 * T-0999: Commodity price tracking (gold, silver, oil, wheat)
 * T-1000: Gold price -> in-game gold value fluctuation
 * T-1001: Oil price -> in-game fuel resource cost
 * T-1002: Wheat price -> in-game food production modifier
 * T-1003: Silver price -> in-game equipment material cost
 * T-1005: Economic indicator mapping to cycle phase
 * T-1006: Economic indicator -> in-game economic cycle
 * T-1010: Crypto volatility index calculation
 * T-1011: Crypto bull market -> expedition risk/reward modifier
 * T-1012: Crypto bear market -> defensive strategy bonus
 * T-1015: Fear index -> NPC merchants offer defensive items cheaply
 * T-1016: Greed index -> NPC merchants inflate luxury prices
 * T-1017: VIX -> expedition danger modifier
 * T-1019: Currency exchange rate tracking
 * T-1020: Exchange rate -> cross-region trade modifiers
 * T-1022: Interest rate -> in-game loan/credit system
 * T-1025: Financial data anomaly detection
 * T-1027: Financial data normalization to percentage modifiers
 * T-1028: Sector rotation -> building efficiency
 * T-1029: Tech sector -> Observatory bonuses
 * T-1030: Healthcare sector -> Temple bonuses
 * T-1031: Energy sector -> Mine bonuses
 * T-1032: Agriculture sector -> Farm bonuses
 */

// ---- Types ----

export interface CommodityQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  timestamp: string;
}

export interface EconomicIndicator {
  name: string;
  value: number;
  previousValue: number;
  unit: string;
  timestamp: string;
}

export interface SectorPerformance {
  sector: string;
  changePct: number;
  fantasyBuilding: string;
  timestamp: string;
}

export interface CurrencyRate {
  pair: string;
  rate: number;
  change: number;
  changePct: number;
  timestamp: string;
}

export interface FinancialAnomaly {
  type: 'extreme_move' | 'record_high' | 'record_low' | 'crash' | 'rally';
  source: string;
  description: string;
  severity: number; // 0-1
  timestamp: string;
}

// ---- Fantasy Translation ----

/** Maps raw financial concepts to in-game lore terminology */
export const FANTASY_TRANSLATIONS: Record<string, string> = {
  'S&P 500': 'Sapphire Exchange Index',
  'NASDAQ': 'Arcane Commerce Collective',
  'Dow Jones': 'Iron Merchants Consortium',
  'Bitcoin': 'Aethercoin',
  'gold': 'True Gold',
  'silver': 'Moonsilver',
  'oil': 'Darkfire Essence',
  'wheat': 'Golden Grain',
  'inflation': 'Currency Dilution',
  'interest rate': 'Lending Guild Rate',
  'GDP': 'Realm Prosperity Index',
  'unemployment': 'Idle Hands Count',
  'bull market': 'Rising Tide',
  'bear market': 'Winter Approach',
  'market crash': 'Great Collapse',
  'IPO': 'Guild Charter Launch',
  'dividend': 'Venture Yield',
  'recession': 'The Lean Times',
  'VIX': 'Storm Index',
  'bond yield': 'Guild Bond Return',
  'tech sector': 'Arcane Sciences',
  'healthcare sector': 'Healing Arts',
  'energy sector': 'Elemental Forges',
  'agriculture sector': 'Harvest Guilds',
  'Fear & Greed': 'Courage & Avarice Index',
};

/** T-0996/T-0997/T-0998: S&P 500 daily change -> merchant guild effects */
export function stockMarketToMerchantEffect(dailyChangePct: number): {
  tradeValueModifier: number;
  rareItemChanceBonus: number;
  merchantMood: 'panic' | 'anxious' | 'calm' | 'optimistic' | 'euphoric';
  fantasyDescription: string;
} {
  if (dailyChangePct <= -3) {
    return {
      tradeValueModifier: 0.80,
      rareItemChanceBonus: 0.15,
      merchantMood: 'panic',
      fantasyDescription: 'The Sapphire Exchange has entered a panic cycle. Merchant contracts pay less, but salvage rights are opening up.',
    };
  } else if (dailyChangePct <= -1) {
    return {
      tradeValueModifier: 0.90,
      rareItemChanceBonus: 0.05,
      merchantMood: 'anxious',
      fantasyDescription: 'Merchant guilds report declining confidence. Trade values have softened, though opportunists find rare goods.',
    };
  } else if (dailyChangePct <= 1) {
    return {
      tradeValueModifier: 1.0,
      rareItemChanceBonus: 0,
      merchantMood: 'calm',
      fantasyDescription: 'The Sapphire Exchange holds steady. Merchants trade at fair rates.',
    };
  } else if (dailyChangePct <= 3) {
    return {
      tradeValueModifier: 1.15,
      rareItemChanceBonus: 0,
      merchantMood: 'optimistic',
      fantasyDescription: 'Prosperity flows through the merchant guilds! Trade values rise as confidence grows.',
    };
  } else {
    return {
      tradeValueModifier: 1.25,
      rareItemChanceBonus: -0.05,
      merchantMood: 'euphoric',
      fantasyDescription: 'The Sapphire Exchange surges with euphoria! Merchants pay premium prices, though rare finds grow scarce.',
    };
  }
}

// ---- Commodity Mappings (T-0999 through T-1003) ----

export interface CommodityGameEffect {
  resource: string;
  productionModifier: number;
  costModifier: number;
  fantasyName: string;
  fantasyDescription: string;
}

/** T-1000: Real gold price change -> in-game gold value fluctuation */
export function goldPriceToEffect(changePct: number): CommodityGameEffect {
  const modifier = 1.0 + (changePct / 100) * 0.5; // 50% dampened
  return {
    resource: 'gold',
    productionModifier: clampModifier(2.0 - modifier), // inverse: expensive gold = less production
    costModifier: clampModifier(modifier),
    fantasyName: 'True Gold',
    fantasyDescription: changePct > 2
      ? 'True Gold veins shimmer brighter than usual. Miners report richer yields, but smelters charge more.'
      : changePct < -2
        ? 'True Gold loses its luster in the markets. Cheaper to acquire, but mines produce less.'
        : 'True Gold holds its eternal value. The mines produce at steady rates.',
  };
}

/** T-1001: Real oil price change -> in-game fuel resource cost */
export function oilPriceToEffect(changePct: number): CommodityGameEffect {
  const modifier = 1.0 + (changePct / 100) * 0.4;
  return {
    resource: 'fuel',
    productionModifier: clampModifier(1.0 - (changePct / 100) * 0.3),
    costModifier: clampModifier(modifier),
    fantasyName: 'Darkfire Essence',
    fantasyDescription: changePct > 3
      ? 'Darkfire Essence reserves run scarce. Forge operations slow as fuel costs climb.'
      : changePct < -3
        ? 'Darkfire Essence flows freely from the deep wells. Forge masters rejoice at lower costs.'
        : 'Darkfire Essence supplies remain stable across the realm.',
  };
}

/** T-1002: Real wheat price change -> in-game food production modifier */
export function wheatPriceToEffect(changePct: number): CommodityGameEffect {
  const modifier = 1.0 + (changePct / 100) * 0.6;
  return {
    resource: 'food',
    productionModifier: clampModifier(1.0 - (changePct / 100) * 0.4),
    costModifier: clampModifier(modifier),
    fantasyName: 'Golden Grain',
    fantasyDescription: changePct > 2
      ? 'Golden Grain harvests fall short. Granaries tighten rations as prices climb.'
      : changePct < -2
        ? 'An abundance of Golden Grain fills the silos! Food costs drop across all settlements.'
        : 'Golden Grain fields produce their usual bounty. The realm eats well.',
  };
}

/** T-1003: Real silver price change -> in-game equipment material cost */
export function silverPriceToEffect(changePct: number): CommodityGameEffect {
  const modifier = 1.0 + (changePct / 100) * 0.45;
  return {
    resource: 'equipment_materials',
    productionModifier: clampModifier(1.0 - (changePct / 100) * 0.25),
    costModifier: clampModifier(modifier),
    fantasyName: 'Moonsilver',
    fantasyDescription: changePct > 2
      ? 'Moonsilver grows dear as jewelers and armorers compete for dwindling stocks.'
      : changePct < -2
        ? 'Moonsilver floods the market. Smiths craft equipment at reduced material costs.'
        : 'Moonsilver trades at its usual rate. Smiths work with steady supply.',
  };
}

// ---- Economic Indicators (T-1005, T-1006) ----

export type EconomicCyclePhase =
  | 'expansion'
  | 'peak'
  | 'contraction'
  | 'trough'
  | 'recovery';

export interface EconomicCycleEffect {
  phase: EconomicCyclePhase;
  fantasyName: string;
  description: string;
  priceMultiplier: number;
  demandMultiplier: number;
  buildingEfficiency: number;
  morale: number;
}

/** T-1005/T-1006: Map economic indicators to in-game economic cycle phase */
export function economicIndicatorsToPhase(indicators: {
  gdpGrowth?: number;
  unemployment?: number;
  inflation?: number;
}): EconomicCycleEffect {
  const gdp = indicators.gdpGrowth ?? 2.0;
  const unemployment = indicators.unemployment ?? 4.0;
  const inflation = indicators.inflation ?? 2.0;

  // Composite score: positive = good economy
  const score = (gdp * 2) - (unemployment * 0.5) - (Math.abs(inflation - 2) * 1.5);

  if (score > 5) {
    return {
      phase: 'expansion',
      fantasyName: 'Age of Prosperity',
      description: 'The realm flourishes! Trade routes bustle and guilds expand their influence.',
      priceMultiplier: 1.15,
      demandMultiplier: 1.20,
      buildingEfficiency: 1.10,
      morale: 1.10,
    };
  } else if (score > 2) {
    return {
      phase: 'peak',
      fantasyName: 'Golden Zenith',
      description: 'Prosperity reaches its height. Wise merchants prepare for the turning of the wheel.',
      priceMultiplier: 1.20,
      demandMultiplier: 1.10,
      buildingEfficiency: 1.05,
      morale: 1.05,
    };
  } else if (score > -2) {
    return {
      phase: 'recovery',
      fantasyName: 'Dawn of Renewal',
      description: 'The realm stirs from hardship. New opportunities emerge from the ashes.',
      priceMultiplier: 1.0,
      demandMultiplier: 1.0,
      buildingEfficiency: 1.0,
      morale: 1.0,
    };
  } else if (score > -5) {
    return {
      phase: 'contraction',
      fantasyName: 'The Tightening',
      description: 'Commerce slows across the land. Guilds cut costs and hoard resources.',
      priceMultiplier: 0.90,
      demandMultiplier: 0.85,
      buildingEfficiency: 0.90,
      morale: 0.90,
    };
  } else {
    return {
      phase: 'trough',
      fantasyName: 'The Lean Times',
      description: 'Hardship grips the realm. Only the resourceful survive these dark days.',
      priceMultiplier: 0.75,
      demandMultiplier: 0.70,
      buildingEfficiency: 0.80,
      morale: 0.80,
    };
  }
}

// ---- Crypto Mappings (T-1010, T-1011, T-1012) ----

/** T-1010: Calculate crypto volatility index from price swing data */
export function calculateCryptoVolatilityIndex(priceChanges: number[]): number {
  if (priceChanges.length === 0) return 50;
  const mean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const variance = priceChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / priceChanges.length;
  const stdDev = Math.sqrt(variance);
  // Normalize to 0-100 scale (typical crypto stddev 2-15%)
  return Math.min(100, Math.round(stdDev * 6.67));
}

/** T-1011: Crypto bull market -> expedition risk/reward */
export function cryptoBullMarketToExpedition(sentiment: number): {
  riskMultiplier: number;
  rewardMultiplier: number;
  fantasyDescription: string;
} {
  if (sentiment > 50) {
    return {
      riskMultiplier: 1.25,
      rewardMultiplier: 1.40,
      fantasyDescription: 'Aethercoin surges! Bold ventures into the unknown promise greater rewards, but dangers multiply.',
    };
  } else if (sentiment > 20) {
    return {
      riskMultiplier: 1.10,
      rewardMultiplier: 1.15,
      fantasyDescription: 'The Aethercoin winds blow favorably. Expeditions report modestly improved findings.',
    };
  }
  return {
    riskMultiplier: 1.0,
    rewardMultiplier: 1.0,
    fantasyDescription: 'The Aethercoin markets rest quietly. Expeditions proceed at standard risk.',
  };
}

/** T-1012: Crypto bear market -> defensive strategy bonus */
export function cryptoBearMarketToDefense(sentiment: number): {
  defenseBonus: number;
  resourcePreservation: number;
  fantasyDescription: string;
} {
  if (sentiment < -50) {
    return {
      defenseBonus: 1.25,
      resourcePreservation: 1.20,
      fantasyDescription: 'Aethercoin winter grips the realm. Cautious guilds who fortify their defenses prosper.',
    };
  } else if (sentiment < -20) {
    return {
      defenseBonus: 1.10,
      resourcePreservation: 1.10,
      fantasyDescription: 'Aethercoin weakens. Prudent guilds find advantage in defensive strategies.',
    };
  }
  return {
    defenseBonus: 1.0,
    resourcePreservation: 1.0,
    fantasyDescription: 'No particular advantage to defensive posturing at this time.',
  };
}

// ---- Fear & Greed NPC Effects (T-1015, T-1016) ----

export interface FearGreedMerchantEffect {
  defensiveItemDiscount: number;   // T-1015: Fear = cheaper defensive items
  luxuryItemInflation: number;     // T-1016: Greed = inflated luxury prices
  merchantBehavior: string;
  fantasyDescription: string;
}

export function fearGreedToMerchantBehavior(index: number): FearGreedMerchantEffect {
  if (index <= 20) {
    return {
      defensiveItemDiscount: 0.25,
      luxuryItemInflation: 0.0,
      merchantBehavior: 'fearful',
      fantasyDescription: 'Merchants desperately offload shields and armor at steep discounts, preparing for the worst.',
    };
  } else if (index <= 40) {
    return {
      defensiveItemDiscount: 0.10,
      luxuryItemInflation: 0.0,
      merchantBehavior: 'cautious',
      fantasyDescription: 'Cautious merchants favor practical goods. Defensive equipment sells at modest discounts.',
    };
  } else if (index <= 60) {
    return {
      defensiveItemDiscount: 0.0,
      luxuryItemInflation: 0.0,
      merchantBehavior: 'balanced',
      fantasyDescription: 'Merchants trade all goods at fair market value. Neither fear nor greed drives their hand.',
    };
  } else if (index <= 80) {
    return {
      defensiveItemDiscount: 0.0,
      luxuryItemInflation: 0.15,
      merchantBehavior: 'greedy',
      fantasyDescription: 'Merchants sense opportunity and inflate luxury prices. Demand for fine goods rises sharply.',
    };
  } else {
    return {
      defensiveItemDiscount: 0.0,
      luxuryItemInflation: 0.30,
      merchantBehavior: 'exuberant',
      fantasyDescription: 'Extreme avarice! Luxury goods carry absurd markups as merchants exploit booming demand.',
    };
  }
}

// ---- VIX / Volatility (T-1017) ----

export function vixToExpeditionDanger(vixValue: number): {
  dangerModifier: number;
  fantasyName: string;
  fantasyDescription: string;
} {
  if (vixValue > 35) {
    return {
      dangerModifier: 1.30,
      fantasyName: 'Raging Storm',
      fantasyDescription: 'The Storm Index rages! Expeditions face heightened peril as chaos spreads across trade routes.',
    };
  } else if (vixValue > 20) {
    return {
      dangerModifier: 1.10,
      fantasyName: 'Gathering Clouds',
      fantasyDescription: 'The Storm Index rises. Expedition scouts report increasing uncertainty on the roads.',
    };
  } else {
    return {
      dangerModifier: 0.95,
      fantasyName: 'Clear Skies',
      fantasyDescription: 'The Storm Index rests low. Safe passage is all but guaranteed for careful travelers.',
    };
  }
}

// ---- Currency Exchange (T-1019, T-1020) ----

export function exchangeRateToTradeModifier(changePct: number): {
  crossRegionTradeModifier: number;
  importCostModifier: number;
  exportValueModifier: number;
  fantasyDescription: string;
} {
  if (changePct > 2) {
    return {
      crossRegionTradeModifier: 1.15,
      importCostModifier: 0.90,
      exportValueModifier: 1.10,
      fantasyDescription: 'The crown strengthens against foreign currencies. Imports cheapen while exports gain prestige.',
    };
  } else if (changePct < -2) {
    return {
      crossRegionTradeModifier: 0.90,
      importCostModifier: 1.10,
      exportValueModifier: 0.90,
      fantasyDescription: 'Foreign coins buy more of our goods. Imports grow dear, but our merchants find eager buyers abroad.',
    };
  }
  return {
    crossRegionTradeModifier: 1.0,
    importCostModifier: 1.0,
    exportValueModifier: 1.0,
    fantasyDescription: 'Currency markets hold steady. Cross-border trade proceeds at normal rates.',
  };
}

// ---- Interest Rates (T-1022) ----

export function interestRateToLoanEffect(rate: number): {
  loanInterestRate: number;
  savingsReturn: number;
  buildingLoanCost: number;
  fantasyDescription: string;
} {
  if (rate > 5) {
    return {
      loanInterestRate: 0.12,
      savingsReturn: 0.08,
      buildingLoanCost: 1.25,
      fantasyDescription: 'The Lending Guild demands steep interest. Loans cost dearly, but guild coffers grow from savings.',
    };
  } else if (rate > 2) {
    return {
      loanInterestRate: 0.06,
      savingsReturn: 0.04,
      buildingLoanCost: 1.0,
      fantasyDescription: 'The Lending Guild sets moderate rates. Borrowing and saving proceed at balanced terms.',
    };
  } else {
    return {
      loanInterestRate: 0.02,
      savingsReturn: 0.01,
      buildingLoanCost: 0.80,
      fantasyDescription: 'The Lending Guild offers cheap loans! Building expansions cost less, though savings earn little.',
    };
  }
}

// ---- Anomaly Detection (T-1025) ----

export function detectFinancialAnomalies(
  currentData: {
    stockChangePct?: number;
    cryptoChangePct?: number;
    goldChangePct?: number;
    vix?: number;
  },
  historicalAvg: {
    stockChangePct?: number;
    cryptoChangePct?: number;
    goldChangePct?: number;
    vix?: number;
  },
): FinancialAnomaly[] {
  const anomalies: FinancialAnomaly[] = [];
  const now = new Date().toISOString();

  if (currentData.stockChangePct !== undefined) {
    if (currentData.stockChangePct < -5) {
      anomalies.push({
        type: 'crash',
        source: 'stock',
        description: 'The Sapphire Exchange suffers a devastating collapse!',
        severity: Math.min(1, Math.abs(currentData.stockChangePct) / 10),
        timestamp: now,
      });
    } else if (currentData.stockChangePct > 5) {
      anomalies.push({
        type: 'rally',
        source: 'stock',
        description: 'The Sapphire Exchange erupts in a historic rally!',
        severity: Math.min(1, currentData.stockChangePct / 10),
        timestamp: now,
      });
    }
  }

  if (currentData.cryptoChangePct !== undefined && Math.abs(currentData.cryptoChangePct) > 10) {
    anomalies.push({
      type: currentData.cryptoChangePct > 0 ? 'rally' : 'crash',
      source: 'crypto',
      description: currentData.cryptoChangePct > 0
        ? 'Aethercoin skyrockets beyond all expectations!'
        : 'Aethercoin plunges into the abyss!',
      severity: Math.min(1, Math.abs(currentData.cryptoChangePct) / 20),
      timestamp: now,
    });
  }

  if (currentData.vix !== undefined && currentData.vix > 40) {
    anomalies.push({
      type: 'extreme_move',
      source: 'volatility',
      description: 'The Storm Index reaches extreme levels. All markets shudder with uncertainty.',
      severity: Math.min(1, currentData.vix / 60),
      timestamp: now,
    });
  }

  return anomalies;
}

// ---- Normalization (T-1027) ----

/** Normalize any financial change to a bounded percentage modifier */
export function normalizeToModifier(
  value: number,
  minInput: number,
  maxInput: number,
  minOutput: number = 0.7,
  maxOutput: number = 1.3,
): number {
  const clamped = Math.max(minInput, Math.min(maxInput, value));
  const normalized = (clamped - minInput) / (maxInput - minInput);
  return minOutput + normalized * (maxOutput - minOutput);
}

// ---- Sector Rotation (T-1028 through T-1032) ----

export interface SectorBuildingEffect {
  building: string;
  efficiencyModifier: number;
  fantasyDescription: string;
}

/** T-1028: Map sector performance to building efficiency */
export function sectorToBuilding(sector: string, changePct: number): SectorBuildingEffect {
  const modifier = clampModifier(1.0 + (changePct / 100) * 0.5);

  switch (sector) {
    case 'technology': // T-1029
      return {
        building: 'observatory',
        efficiencyModifier: modifier,
        fantasyDescription: changePct > 1
          ? 'The Arcane Sciences flourish! Observatory discoveries accelerate.'
          : changePct < -1
            ? 'The Arcane Sciences languish. Observatory insights slow to a trickle.'
            : 'The Arcane Sciences hold steady. Observatory functions normally.',
      };
    case 'healthcare': // T-1030
      return {
        building: 'temple',
        efficiencyModifier: modifier,
        fantasyDescription: changePct > 1
          ? 'The Healing Arts prosper! Temple restorations grow more potent.'
          : changePct < -1
            ? 'The Healing Arts wane. Temple remedies lose some of their virtue.'
            : 'The Healing Arts continue their ancient traditions.',
      };
    case 'energy': // T-1031
      return {
        building: 'mine',
        efficiencyModifier: modifier,
        fantasyDescription: changePct > 1
          ? 'The Elemental Forges burn bright! Mine output surges with renewed energy.'
          : changePct < -1
            ? 'The Elemental Forges dim. Mine productivity suffers without fuel.'
            : 'The Elemental Forges maintain their steady flame.',
      };
    case 'agriculture': // T-1032
      return {
        building: 'farm',
        efficiencyModifier: modifier,
        fantasyDescription: changePct > 1
          ? 'Harvest Guilds report bumper yields! Farm production climbs.'
          : changePct < -1
            ? 'Harvest Guilds struggle with poor conditions. Farm output declines.'
            : 'Harvest Guilds report normal seasonal patterns.',
      };
    default:
      return {
        building: 'general',
        efficiencyModifier: 1.0,
        fantasyDescription: 'No notable sector influence on this building.',
      };
  }
}

// ---- Helpers ----

function clampModifier(value: number, min: number = 0.5, max: number = 1.5): number {
  return Math.max(min, Math.min(max, value));
}

/** Translate a raw financial term to fantasy equivalent */
export function translateToFantasy(term: string): string {
  return FANTASY_TRANSLATIONS[term] || term;
}

/** Generate a fantasy-themed headline from financial data */
export function generateFantasyHeadline(data: {
  type: 'stock' | 'crypto' | 'commodity' | 'economic';
  direction: 'up' | 'down' | 'neutral';
  magnitude: number; // 0-1
  subject: string;
}): string {
  const fantasySubject = translateToFantasy(data.subject);
  const headlines: Record<string, Record<string, string[]>> = {
    stock: {
      up: [
        `${fantasySubject} soars as merchant guilds celebrate unprecedented prosperity`,
        `Trading halls overflow with coin as the ${fantasySubject} rises`,
        `Optimism sweeps the ${fantasySubject} — guilds expand operations`,
      ],
      down: [
        `${fantasySubject} crumbles — merchants board up their stalls`,
        `Dark days for the ${fantasySubject} as confidence evaporates`,
        `The ${fantasySubject} slides into uncertainty — caution rules the trading halls`,
      ],
      neutral: [
        `${fantasySubject} holds steady amid quiet trading`,
        `No surprises from the ${fantasySubject} — merchants carry on`,
      ],
    },
    crypto: {
      up: [
        `Aethercoin miners report astonishing yields from the digital depths`,
        `Speculation fever grips the realm as Aethercoin surges`,
      ],
      down: [
        `Aethercoin plunges — digital prospectors abandon their claims`,
        `The great Aethercoin freeze deepens as values crumble`,
      ],
      neutral: [
        `Aethercoin drifts sideways — neither bulls nor bears hold sway`,
      ],
    },
    commodity: {
      up: [
        `${fantasySubject} prices climb as supply dwindles across the realm`,
        `Demand for ${fantasySubject} outstrips what the land can provide`,
      ],
      down: [
        `${fantasySubject} gluts the market — warehouses overflow`,
        `Prices for ${fantasySubject} tumble as caravans arrive en masse`,
      ],
      neutral: [
        `${fantasySubject} trades at expected levels this season`,
      ],
    },
    economic: {
      up: [
        `The Realm Prosperity Index rises — a new age dawns`,
        `Economic winds favor the guilds as growth continues`,
      ],
      down: [
        `Dark clouds gather over the realm's economy`,
        `The Lean Times approach as prosperity fades`,
      ],
      neutral: [
        `The realm's economy holds its course, neither waxing nor waning`,
      ],
    },
  };

  const pool = headlines[data.type]?.[data.direction] || [`${fantasySubject} news arrives from distant lands.`];
  const index = Math.floor(Math.abs(data.magnitude * 1000)) % pool.length;
  return pool[index];
}
