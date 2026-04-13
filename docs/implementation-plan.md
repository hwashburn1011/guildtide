# Living World Idle RPG — Implementation Plan

## Tech Stack Decision

### Frontend
- **Phaser 3** — 2D game framework with Canvas/WebGL rendering, scene management, tweens, sprite/UI support
- **HTML5 / CSS3** — shell page, overlays, modals, settings panels
- **Vanilla TypeScript** — type safety without framework overhead; Phaser has excellent TS support
- **Vite** — build tool (fast dev server, tree-shaking, easy Phaser integration)

Why Phaser over PixiJS or raw Canvas:
- Built-in scene management (perfect for guild view, map view, expedition view, etc.)
- Built-in timer/tween system (critical for idle game tick visualization)
- Sprite atlas support, bitmap text, particle effects — all useful for this art style
- Large community, mature ecosystem, well-documented
- Handles both game rendering AND UI panels without needing React alongside it

### Backend
- **Node.js + Express** (or Fastify for speed) — API server
- **TypeScript** — shared types between client and server
- **node-cron** or **Bull queue** — scheduled jobs (weather fetching, world-state generation, offline progress calculation)
- **JWT** — authentication tokens
- **bcrypt** — password hashing

### Database
- **PostgreSQL** — relational data fits this game perfectly (players, guilds, heroes, items, buildings all have clear relationships and schemas)
- **Prisma ORM** — type-safe queries, migrations, schema management
- Alternative: if you prefer NoSQL, **MongoDB** works too, but the relational nature of guild→heroes→items→buildings makes SQL the cleaner fit

### External APIs
- **OpenWeatherMap** (free tier: 1000 calls/day) — weather data by city/coordinates
- **Nager.Date** (free, no key) — public holidays by country
- **Fear & Greed Index / Yahoo Finance simple endpoints** — broad market sentiment (Phase 2)

### Hosting / Deployment
- **Frontend**: Any static host — Vercel, Netlify, Cloudflare Pages, or your own nginx
- **Backend**: Railway, Render, DigitalOcean App Platform, or a VPS
- **Database**: Managed Postgres (Railway, Supabase, Neon — all have free tiers)
- **Domain**: Point your domain, SSL via host provider or Let's Encrypt

---

## Project Structure

```
living-world-idle-rpg/
├── client/                          # Phaser 3 + TypeScript frontend
│   ├── public/
│   │   ├── index.html
│   │   └── assets/
│   │       ├── sprites/             # character portraits, icons, buildings
│   │       ├── ui/                  # panels, frames, buttons
│   │       ├── maps/               # region/world map tiles
│   │       ├── effects/            # weather overlays, particles
│   │       └── audio/              # ambient, sfx
│   ├── src/
│   │   ├── main.ts                 # Phaser game config, boot
│   │   ├── config.ts               # game constants, balance numbers
│   │   ├── scenes/
│   │   │   ├── BootScene.ts        # asset preloading
│   │   │   ├── LoginScene.ts       # auth UI
│   │   │   ├── RegionSelectScene.ts # onboarding city/region picker
│   │   │   ├── GuildHallScene.ts   # main hub — buildings, workers, status
│   │   │   ├── ExpeditionScene.ts  # send parties, view results
│   │   │   ├── MarketScene.ts      # trade, buy/sell, market state
│   │   │   ├── WorldMapScene.ts    # regional overview, weather, events
│   │   │   ├── EventScene.ts       # active event resolution
│   │   │   └── ResearchScene.ts    # tech tree / upgrades
│   │   ├── ui/
│   │   │   ├── Panel.ts            # base panel component
│   │   │   ├── ResourceBar.ts      # top HUD resource display
│   │   │   ├── WorkerCard.ts       # hero/worker display card
│   │   │   ├── BuildingPanel.ts    # building info + upgrade
│   │   │   ├── EventLogPanel.ts    # scrolling event feed
│   │   │   ├── TooltipManager.ts   # hover tooltips
│   │   │   └── ModalManager.ts     # confirmation/info modals
│   │   ├── systems/
│   │   │   ├── IdleEngine.ts       # client-side idle tick (visual only)
│   │   │   ├── WeatherRenderer.ts  # weather overlay effects
│   │   │   ├── NotificationSystem.ts
│   │   │   └── SaveSync.ts         # periodic save to server
│   │   ├── models/
│   │   │   ├── Guild.ts
│   │   │   ├── Hero.ts
│   │   │   ├── Building.ts
│   │   │   ├── Item.ts
│   │   │   ├── WorldState.ts
│   │   │   └── Event.ts
│   │   ├── api/
│   │   │   └── client.ts           # fetch wrapper for all server calls
│   │   └── utils/
│   │       ├── formatters.ts       # number formatting, time display
│   │       └── constants.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── server/                          # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts                # server entry, Express setup
│   │   ├── config.ts               # env vars, API keys, game constants
│   │   ├── routes/
│   │   │   ├── auth.ts             # register, login, session
│   │   │   ├── guild.ts            # guild CRUD, assignments
│   │   │   ├── heroes.ts           # roster management
│   │   │   ├── buildings.ts        # upgrades, construction
│   │   │   ├── expeditions.ts      # launch, resolve, results
│   │   │   ├── market.ts           # buy/sell, prices
│   │   │   ├── events.ts           # active events, responses
│   │   │   ├── world.ts            # world state, modifiers
│   │   │   └── social.ts           # leaderboard, trade, alliances
│   │   ├── services/
│   │   │   ├── IdleProgressService.ts    # offline gain calculation
│   │   │   ├── WeatherService.ts         # fetch + transform weather
│   │   │   ├── WorldStateService.ts      # generate daily modifiers
│   │   │   ├── EventGeneratorService.ts  # create events from world state
│   │   │   ├── MarketService.ts          # price generation, volatility
│   │   │   ├── ExpeditionService.ts      # resolve expedition outcomes
│   │   │   ├── CombatResolver.ts         # stat-based combat resolution
│   │   │   └── CalendarService.ts        # holiday/season detection
│   │   ├── jobs/
│   │   │   ├── scheduler.ts              # cron job registration
│   │   │   ├── fetchWeather.ts           # runs every 3-6 hours
│   │   │   ├── generateWorldState.ts     # runs daily at midnight UTC
│   │   │   ├── rotateMarket.ts           # runs daily
│   │   │   ├── resolveExpeditions.ts     # runs every 15 min
│   │   │   └── cleanupExpiredEvents.ts   # runs hourly
│   │   ├── middleware/
│   │   │   ├── auth.ts                   # JWT verification
│   │   │   ├── rateLimit.ts
│   │   │   └── validation.ts
│   │   ├── models/                       # Prisma schema maps to these
│   │   │   └── types.ts                  # shared TypeScript interfaces
│   │   └── utils/
│   │       ├── balanceFormulas.ts         # all progression math
│   │       ├── lootTables.ts
│   │       └── weatherMapping.ts         # weather → game modifier translation
│   ├── prisma/
│   │   └── schema.prisma                 # database schema
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                          # shared types between client/server
│   ├── types.ts                     # API request/response types
│   ├── constants.ts                 # shared game constants
│   └── enums.ts                     # roles, building types, resources, etc.
│
└── README.md
```

---

## Database Schema (Prisma)

```prisma
model Player {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  username      String   @unique
  regionId      String
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime
  lastTickAt    DateTime  // when idle progress was last calculated
  guild         Guild?
}

model Guild {
  id            String     @id @default(uuid())
  playerId      String     @unique
  player        Player     @relation(fields: [playerId], references: [id])
  name          String
  level         Int        @default(1)
  xp            Int        @default(0)
  resources     Json       // { gold, wood, stone, herbs, ore, water, food, ... }
  heroes        Hero[]
  buildings     Building[]
  inventory     Item[]
  expeditions   Expedition[]
  researchIds   String[]   // completed research IDs
  createdAt     DateTime   @default(now())
}

model Hero {
  id            String   @id @default(uuid())
  guildId       String
  guild         Guild    @relation(fields: [guildId], references: [id])
  name          String
  role          String   // farmer, scout, hunter, merchant, etc.
  level         Int      @default(1)
  xp            Int      @default(0)
  traits        String[] // stormborn, sunblessed, etc.
  stats         Json     // { strength, agility, intellect, endurance, luck }
  equipment     Json     // { weapon, armor, charm, tool }
  assignment    String?  // current task: farming, scouting, expedition, idle
  status        String   @default("idle") // idle, assigned, expedition, recovering
  hiredAt       DateTime @default(now())
}

model Building {
  id            String   @id @default(uuid())
  guildId       String
  guild         Guild    @relation(fields: [guildId], references: [id])
  type          String   // farm, mine, workshop, barracks, market, lab, etc.
  level         Int      @default(1)
  slot          Int      // position in guild layout
  metadata      Json?    // building-specific state
}

model Item {
  id            String   @id @default(uuid())
  guildId       String
  guild         Guild    @relation(fields: [guildId], references: [id])
  templateId    String   // references static item definition
  quantity      Int      @default(1)
  metadata      Json?    // durability, enchantments, etc.
}

model Expedition {
  id            String   @id @default(uuid())
  guildId       String
  guild         Guild    @relation(fields: [guildId], references: [id])
  type          String   // scavenge, hunt, explore, trade_caravan
  heroIds       String[]
  destination   String
  startedAt     DateTime @default(now())
  duration      Int      // seconds
  resolvedAt    DateTime?
  result        Json?    // loot, xp, events, losses
  status        String   @default("active") // active, resolved, failed
}

model RegionState {
  id            String   @id @default(uuid())
  regionId      String
  date          DateTime @db.Date
  weather       Json     // { condition, temp, humidity, wind, rain_mm }
  modifiers     Json     // { crop_growth, flood_risk, travel_speed, hunt_bonus, ... }
  activeEvents  Json     // [ { eventId, type, description, expiresAt } ]
  marketState   Json     // { trend, volatility, price_mods }
  createdAt     DateTime @default(now())

  @@unique([regionId, date])
}

model EventLog {
  id            String   @id @default(uuid())
  guildId       String
  type          String
  message       String
  data          Json?
  createdAt     DateTime @default(now())
}

model Region {
  id            String   @id @default(uuid())
  name          String
  country       String
  latitude      Float
  longitude     Float
  climate       String   // tropical, temperate, arid, cold, etc.
  timezone      String
}
```

---

## Implementation Phases

### Phase 0: Project Scaffold (Week 1)

**Goal**: Bootable client + server with auth and a blank guild screen.

| Task | Details |
|------|---------|
| 0.1 | Init monorepo: `client/`, `server/`, `shared/` with TypeScript configs |
| 0.2 | Set up Vite + Phaser 3 in `client/`, verify canvas renders |
| 0.3 | Set up Express + Prisma in `server/`, connect to Postgres |
| 0.4 | Run Prisma migration for Player + Guild tables |
| 0.5 | Build auth routes: `POST /register`, `POST /login` (JWT) |
| 0.6 | Build `LoginScene` in Phaser — email/password form, token storage |
| 0.7 | Build `RegionSelectScene` — searchable city list, saves to player record |
| 0.8 | Build skeleton `GuildHallScene` — loads guild data from API, shows name + level |
| 0.9 | Deploy: static frontend to Vercel/Netlify, backend to Railway/Render, DB to managed Postgres |

**Deliverable**: Player can register, log in, pick a region, see an empty guild hall.

---

### Phase 1: Core Idle Loop (Weeks 2–3)

**Goal**: Resources generate over time, buildings produce output, offline progress works.

| Task | Details |
|------|---------|
| 1.1 | Define resource types in `shared/enums.ts`: gold, wood, stone, herbs, ore, water, food, essence |
| 1.2 | Build `ResourceBar` UI — top-of-screen HUD showing all resources with per-second rates |
| 1.3 | Implement `IdleProgressService` on server — given guild state + elapsed seconds, compute resources gained |
| 1.4 | On login: server calculates offline gains since `lastTickAt`, applies to guild, returns delta to client |
| 1.5 | Client shows "While you were away..." summary panel with gains |
| 1.6 | Build `Building` system — define 6 starter buildings in static data: Farm, Lumber Mill, Quarry, Herb Garden, Mine, Well |
| 1.7 | Each building has: level, base output/sec, upgrade cost curve, max level |
| 1.8 | Build `BuildingPanel` UI — click building to see stats, upgrade button, cost display |
| 1.9 | `POST /buildings/:id/upgrade` — validates resources, deducts cost, increments level |
| 1.10 | Client-side idle tick: visual counter incrementing resources smoothly (cosmetic, server is authoritative) |
| 1.11 | `GuildHallScene` layout: grid of building slots, click to interact |

**Deliverable**: Player sees resources ticking up, can upgrade buildings, comes back after being away to real offline progress.

---

### Phase 2: Heroes & Assignments (Weeks 4–5)

**Goal**: Recruit heroes, assign them to buildings/tasks, hero traits affect output.

| Task | Details |
|------|---------|
| 2.1 | Hero generation system — random name, role, traits, base stats |
| 2.2 | `POST /heroes/recruit` — costs gold, generates hero, adds to roster |
| 2.3 | Define 6 initial roles: Farmer, Scout, Merchant, Blacksmith, Alchemist, Hunter |
| 2.4 | Define 8 initial traits: Stormborn, Sunblessed, Frostward, Shrewd Trader, Lucky Forager, Salvager, Hardy, Nimble |
| 2.5 | `WorkerCard` UI — portrait placeholder, name, role, level, traits, assignment |
| 2.6 | Assignment system: drag/assign hero to a building → boosts that building's output based on role match + stats |
| 2.7 | Role-building affinity matrix: Farmer→Farm = 1.5x, Farmer→Mine = 0.8x, etc. |
| 2.8 | Hero XP: gains XP while assigned, levels up, stats improve |
| 2.9 | `IdleProgressService` updated: factor in assigned heroes when calculating output |
| 2.10 | Roster panel: view all heroes, filter by role/status, manage equipment |

**Deliverable**: Player recruits heroes, assigns them to buildings for boosted output, heroes level up over time.

---

### Phase 3: Weather Integration & World State (Weeks 6–7)

**Goal**: Real weather data drives daily game modifiers. The world feels alive.

| Task | Details |
|------|---------|
| 3.1 | `WeatherService`: fetch OpenWeatherMap data for all active player regions every 4 hours |
| 3.2 | Store raw weather in `RegionState` table |
| 3.3 | `weatherMapping.ts` — transform weather into game modifiers: |
|      | - Rain: crop_growth +15-30%, flood_risk +10-25%, travel_speed -10% |
|      | - Heat: water_consumption +20%, alchemy_output +15%, herb_growth -10% |
|      | - Cold: agriculture -20%, preservation +25%, cold_creature_spawns +30% |
|      | - Storm: expedition_risk +30%, essence_drops +40%, event_chance +50% |
|      | - Clear: morale +10%, solar_crafting +20%, baseline normal |
| 3.4 | `WorldStateService`: runs daily, generates `RegionState` with modifiers + potential events |
| 3.5 | `GET /world/state` — returns current modifiers for player's region |
| 3.6 | Client: `WeatherRenderer` — ambient visual overlay (rain particles, sun rays, snow, storm clouds) |
| 3.7 | `GuildHallScene` shows current weather condition icon + active modifier list |
| 3.8 | `IdleProgressService` updated: apply world-state modifiers to all production calculations |
| 3.9 | Event log entries when weather changes affect output: "Heavy rains boosted your farm output by 22%" |

**Deliverable**: Player's production changes based on real local weather. Rain boosts crops, storms create risk, heat affects water. Visual weather overlay on guild hall.

---

### Phase 4: Events System (Weeks 8–9)

**Goal**: World state triggers special events with player choices and consequences.

| Task | Details |
|------|---------|
| 4.1 | Define event template system in static data: |
|      | ```json |
|      | { |
|      |   "id": "storm_beast_hunt", |
|      |   "trigger": { "weather": "storm", "chance": 0.3 }, |
|      |   "title": "Storm-Touched Beast Sighted", |
|      |   "description": "Lightning has awakened something in the marshes...", |
|      |   "duration_hours": 12, |
|      |   "choices": [ |
|      |     { "label": "Send hunters", "requires": { "heroes_role": "hunter", "min": 2 }, "rewards": {...}, "risk": 0.2 }, |
|      |     { "label": "Ignore it", "rewards": null }, |
|      |     { "label": "Set traps", "requires": { "research": "advanced_trapping" }, "rewards": {...}, "risk": 0.05 } |
|      |   ] |
|      | } |
|      | ``` |
| 4.2 | `EventGeneratorService`: given current world state, roll for events from template pool |
| 4.3 | 15 initial event templates across categories: weather, harvest, creature, trade, discovery |
| 4.4 | `EventScene`: shows event illustration placeholder, description, available choices |
| 4.5 | `POST /events/:id/respond` — validates choice, resolves outcome, applies rewards/penalties |
| 4.6 | Negative events always include recovery paths (flood → salvage opportunity, etc.) |
| 4.7 | `EventLogPanel` — scrollable feed of recent events and outcomes |
| 4.8 | Event notification badge on main HUD when active events exist |

**Deliverable**: Weather and world state trigger events. Player makes choices. Events create gain, risk, and opportunity — never dead ends.

---

### Phase 5: Expeditions (Weeks 10–11)

**Goal**: Send hero parties on timed missions with stat-based resolution.

| Task | Details |
|------|---------|
| 5.1 | Define expedition types: Scavenge (short, low risk), Hunt (medium), Explore (long, high reward), Trade Caravan (profit-focused) |
| 5.2 | Define 8 expedition destinations with different loot tables and difficulty |
| 5.3 | `ExpeditionScene`: select destination, assign 1-4 heroes, see estimated success/risk/duration |
| 5.4 | Success calculation: party stats + role composition + traits + world modifiers → success %, loot tier |
| 5.5 | `CombatResolver`: stat-based auto-resolution — party stats vs encounter difficulty, trait bonuses apply |
| 5.6 | Weather affects expeditions: rain in marsh = different encounters, storm = higher risk + better essence drops |
| 5.7 | `resolveExpeditions` cron job: checks completed expeditions every 15 min, resolves outcomes |
| 5.8 | Results screen: loot gained, XP earned, hero injuries (temporary debuff, not permadeath) |
| 5.9 | Heroes on expedition show "away" status, can't be reassigned until return |

**Deliverable**: Player assembles parties, sends them on timed expeditions, gets results influenced by weather and party composition.

---

### Phase 6: Market & Economy (Weeks 12–13)

**Goal**: Buy/sell resources at fluctuating prices, market reacts to world state.

| Task | Details |
|------|---------|
| 6.1 | `MarketService`: generate daily prices for all tradeable resources |
| 6.2 | Base prices + random variance + world-state modifiers (rain = cheap herbs, drought = expensive water) |
| 6.3 | `MarketScene`: resource price list, buy/sell interface, price trend indicators (↑↓→) |
| 6.4 | Buy/sell with server validation — `POST /market/buy`, `POST /market/sell` |
| 6.5 | Daily market rotation: some items available only on certain days or conditions |
| 6.6 | "Merchant Confidence" system: broad sentiment modifier from calendar/economic signals |
| 6.7 | Special market events: "Distressed Caravan" (rare items at discount), "Supply Shortage" (sell high) |
| 6.8 | Price history: last 7 days of prices shown as simple sparkline |

**Deliverable**: Functioning market with weather-influenced prices, buy/sell, daily rotation, and special market events.

---

### Phase 7: Research Tree (Week 14)

**Goal**: Unlock permanent upgrades that mitigate external forces and open new strategies.

| Task | Details |
|------|---------|
| 7.1 | Define research tree: 20 nodes across 4 branches |
|      | **Agriculture**: Irrigation → Flood Control → Greenhouse → Hydroponics |
|      | **Logistics**: Pathfinding → Weather Routing → Caravan Armor → Trade Insurance |
|      | **Knowledge**: Almanac → Forecast Tower → Market Observatory → Pattern Recognition |
|      | **Military**: Scouting → Advanced Trapping → Siege Defense → Elite Training |
| 7.2 | `ResearchScene`: visual tech tree, click to research, shows cost + time + unlock description |
| 7.3 | Research costs resources + time, one research active at a time |
| 7.4 | Research effects integrated into all relevant systems (Flood Control = -50% flood damage, etc.) |
| 7.5 | Knowledge branch is the "hidden discovery" progression — reveals more about what drives world state |

**Deliverable**: Research tree that converts unpredictability into strategic preparation. Knowledge branch reveals world logic.

---

### Phase 8: Items & Equipment (Week 15)

**Goal**: Meaningful itemization that interacts with world state.

| Task | Details |
|------|---------|
| 8.1 | Define 30 item templates across categories: tools, charms, armor, weapons, relics, seeds, trade permits |
| 8.2 | Items drop from expeditions, events, crafting, and market |
| 8.3 | Equipment slots on heroes: weapon, armor, charm, tool |
| 8.4 | Item effects: stat boosts, trait-like bonuses, weather resistances |
| 8.5 | Simple crafting: combine resources at Workshop building → produce items |
| 8.6 | Rarity tiers: Common, Uncommon, Rare, Legendary |
| 8.7 | Some items only obtainable during specific world conditions (storm relics, drought seeds) |

**Deliverable**: Items drop, equip, and craft. Some items only appear under specific world conditions.

---

### Phase 9: Calendar & Holidays (Week 16)

**Goal**: Real-world holidays create in-game festivals with buffs and special content.

| Task | Details |
|------|---------|
| 9.1 | `CalendarService`: detect holidays via Nager.Date API for player's country |
| 9.2 | Holiday → Festival mapping: Christmas → Winter Feast, Halloween → Shadow Festival, etc. |
| 9.3 | Festivals: 24-48 hour events with morale buffs, special shops, cosmetic decorations |
| 9.4 | Seasonal modifiers: spring growth bonus, summer heat, autumn harvest, winter preservation |
| 9.5 | Season affects guild hall visuals: foliage colors, snow, flowers |

**Deliverable**: Holidays trigger festivals. Seasons affect gameplay and visuals.

---

### Phase 10: Polish & MVP Launch (Weeks 17–18)

| Task | Details |
|------|---------|
| 10.1 | Tutorial/onboarding flow: guided first 5 minutes |
| 10.2 | Sound design: ambient loops per weather, UI sfx, event stingers |
| 10.3 | Art pass: consistent icon set, building illustrations, weather overlays, UI theme |
| 10.4 | Balance pass: progression curves, resource rates, cost scaling |
| 10.5 | Mobile-responsive layout (Phaser scales, but UI panels need responsive CSS) |
| 10.6 | Error handling, loading states, connection recovery |
| 10.7 | Analytics: basic event tracking for retention/engagement metrics |
| 10.8 | Landing page with game description |
| 10.9 | Deploy production environment |

**Deliverable**: Polished, playable MVP.

---

## Post-MVP Phases

### Phase 11: Async Social (Weeks 19–22)
- Leaderboard (guild level, wealth, expeditions completed)
- Player-to-player trade: post offers, accept/decline async
- Alliance system: 2-5 guilds, shared bonuses, cross-region resource exchange
- Regional synergy: rainy guild + dry guild alliance = mutual buffs
- Guild profile pages visible to others

### Phase 12: Economic Signals (Weeks 23–25)
- Integrate broad market sentiment API (Fear & Greed Index or similar)
- Map to merchant guild confidence, caravan volatility, salvage opportunities
- "Sapphire Exchange" in-game system reflecting economic trends
- Market Observatory research reveals hints about real-world economic connection

### Phase 13: Expanded Content (Weeks 26–30)
- 20 more event templates
- 4 new expedition regions
- Hero specialization trees (sub-classes)
- Rare world-state-dependent content (items/events only during specific combined conditions)
- Guild cosmetics and emblems

### Phase 14: Light PvP (Weeks 31–35)
- Async guild raids: attack rival outpost, stat-based resolution
- District control: guilds compete for influence over shared regions
- Seasonal ranked competitions
- Caravan interception mechanic

---

## Key Architecture Decisions

### 1. Server-Authoritative Everything
The client is a display layer. ALL progression math, loot rolls, combat resolution, and resource calculations happen server-side. The client shows animations and sends player intent.

### 2. Offline Progress Calculation
When player logs in:
1. Server reads `lastTickAt` timestamp
2. Calculates elapsed seconds (capped at 24 hours to prevent exploit)
3. Applies building output × hero bonuses × world modifiers × elapsed time
4. Resolves any completed expeditions
5. Returns full state + delta summary to client

### 3. World State Pipeline
```
External API → WeatherService (cron, every 4h)
     ↓
Raw weather stored in RegionState
     ↓
WorldStateService (cron, daily) transforms weather → game modifiers
     ↓
EventGeneratorService rolls for events based on modifiers
     ↓
Client fetches GET /world/state on login and periodically
```

### 4. Weather → Modifier Translation
The mapping layer is the most critical design piece. It must be:
- **Tunable**: coefficients in a config file, not hardcoded
- **Bounded**: modifiers capped at ±50% to prevent extreme swings
- **Layered**: weather + season + economic + event modifiers stack multiplicatively
- **Transparent enough**: player sees "Rain bonus: +22% crop growth" but not the raw API data

### 5. Anti-Cheat Basics
- Server validates all resource transactions
- Timestamps checked server-side (no client-reported time)
- Rate limiting on all endpoints
- Offline cap prevents infinite AFK farming
- No sensitive game logic in client code

---

## Art Asset Requirements (MVP)

Keep it minimal and stylized. These are the minimum assets needed:

| Category | Count | Description |
|----------|-------|-------------|
| Building icons | 6 | Farm, Mill, Quarry, Garden, Mine, Well (+ upgrade variants) |
| Hero portraits | 12 | 2 per role, simple bust illustrations |
| Resource icons | 8 | Gold, wood, stone, herbs, ore, water, food, essence |
| Item icons | 15 | Key item types |
| Weather overlays | 5 | Rain, snow, sun, storm, fog (particle effects or sprite overlays) |
| UI elements | ~20 | Panels, buttons, frames, progress bars, tabs |
| Event illustrations | 8 | Key event types (storm beast, flood, market crash, festival, etc.) |
| Map tiles/bg | 3 | Guild hall background, world map, expedition destination |
| Logo + favicon | 1 | Game title treatment |

**Total: ~80 assets**. Can use AI generation, asset packs, or commission gradually.

---

## Balance & Formula Reference

### Resource Generation
```
output_per_sec = building.base_output
    × (1 + building.level × 0.15)
    × hero_multiplier            // 1.0 if no hero, up to ~2.0 with matched role
    × world_modifier             // 0.5 to 1.5 range
    × research_bonus             // 1.0 to 1.5
```

### Building Upgrade Cost
```
cost = base_cost × (1.4 ^ (level - 1))
```

### Hero XP Curve
```
xp_to_next_level = 100 × (1.3 ^ (level - 1))
```

### Expedition Success
```
success_chance = clamp(
    0.3 + (party_power / difficulty) × 0.5
    + trait_bonus
    + weather_modifier,
    0.1, 0.95
)
```

### Offline Cap
```
max_offline_seconds = 86400  // 24 hours
```

---

## API Endpoint Summary

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Login, returns JWT + offline gains |

### Guild
| Method | Path | Description |
|--------|------|-------------|
| GET | /guild | Get full guild state |
| POST | /guild/collect | Trigger idle collection (called periodically by client) |

### Heroes
| Method | Path | Description |
|--------|------|-------------|
| GET | /heroes | List all heroes |
| POST | /heroes/recruit | Recruit new hero |
| POST | /heroes/:id/assign | Assign to building/task |
| POST | /heroes/:id/equip | Equip item |

### Buildings
| Method | Path | Description |
|--------|------|-------------|
| GET | /buildings | List buildings |
| POST | /buildings/:id/upgrade | Upgrade building |

### Expeditions
| Method | Path | Description |
|--------|------|-------------|
| GET | /expeditions | List active/completed |
| POST | /expeditions/launch | Send party on expedition |
| POST | /expeditions/:id/collect | Collect results |

### Market
| Method | Path | Description |
|--------|------|-------------|
| GET | /market | Current prices + available items |
| POST | /market/buy | Buy resource/item |
| POST | /market/sell | Sell resource/item |

### World
| Method | Path | Description |
|--------|------|-------------|
| GET | /world/state | Current region modifiers + weather |
| GET | /world/events | Active events for player |
| POST | /world/events/:id/respond | Choose event response |

### Research
| Method | Path | Description |
|--------|------|-------------|
| GET | /research | Tech tree state |
| POST | /research/:id/start | Begin researching |

---

## Development Workflow

1. **Local dev**: Vite dev server (client) + nodemon (server) + local Postgres (Docker or native)
2. **Shared types**: `shared/` package imported by both client and server — change once, both sides update
3. **Testing**: Vitest for unit tests on balance formulas and services; Playwright for basic client smoke tests later
4. **CI/CD**: GitHub Actions — lint, type-check, test on PR; auto-deploy main to staging
5. **Environment management**: `.env` files for API keys, DB connection strings; never committed

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| OpenWeatherMap rate limit | Cache aggressively (4h refresh), batch regions, fallback to last known state |
| Phaser performance on mobile | Keep sprite count low, use object pools, test on low-end devices early |
| Scope creep | Each phase has a concrete deliverable; don't start Phase N+1 until N ships |
| Art bottleneck | Use placeholder icons from game-icons.net (CC BY 3.0) during dev; replace later |
| Player retention | Focus Phase 10 polish on "return loop" — make coming back rewarding and surprising |
| Database costs | Start on free tier Postgres (Neon/Supabase); schema is simple, won't hit limits quickly |

---

## Getting Started Checklist

```
[ ] Install Node.js 20+, PostgreSQL (or Docker), Git
[ ] mkdir living-world-idle-rpg && cd living-world-idle-rpg
[ ] Initialize client: npm create vite@latest client -- --template vanilla-ts
[ ] Install Phaser: cd client && npm install phaser
[ ] Initialize server: mkdir server && cd server && npm init -y && npm install express prisma @prisma/client typescript
[ ] Initialize shared: mkdir shared
[ ] Set up tsconfig paths for shared imports
[ ] npx prisma init in server/
[ ] Create .env with DATABASE_URL and OPENWEATHERMAP_API_KEY
[ ] Get free API key from openweathermap.org
[ ] First Prisma migration with Player + Guild schema
[ ] Build BootScene → LoginScene → GuildHallScene skeleton
[ ] Deploy to staging
[ ] Start Phase 1
```
