# Guildtide

A browser-based 2D fantasy idle RPG where real-world weather influences your guild's economy, expeditions, and market prices.

## Tech Stack

- **Client:** Phaser + TypeScript + Vite (browser-based 2D game)
- **Server:** Express + TypeScript + Prisma ORM + SQLite
- **Shared:** Common types, enums, and constants used by both client and server

## Prerequisites

- Node.js 18+
- npm 9+

## Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/hwashburn1011/guildtide.git
   cd guildtide
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` and set a real `JWT_SECRET` for production use.

4. **Initialize the database**
   ```bash
   cd server
   npx prisma db push
   cd ..
   ```

5. **Run the dev servers**
   ```bash
   # Terminal 1 — API server (port 4000)
   npm run dev:server

   # Terminal 2 — Client dev server (port 5173)
   npm run dev:client
   ```

6. Open `http://localhost:5173` in your browser.

## Project Structure

```
guildtide/
  client/          # Phaser game client (TypeScript + Vite)
    src/
      api/         # HTTP client for server API
      scenes/      # Phaser scenes (GuildHall, Market, Expedition, etc.)
      systems/     # Notification system
      ui/          # UI panels (ResourceBar, HeroRoster, BuildingPanel, etc.)
  server/          # Express API server (TypeScript + Prisma)
    src/
      data/        # Static game data (research, expeditions, items, events)
      middleware/  # Auth middleware (JWT)
      routes/      # REST API routes
      services/    # Business logic (IdleProgress, Weather, Market, etc.)
    prisma/        # Prisma schema and migrations
  shared/          # Shared types, enums, and constants
    src/
      enums.ts     # ResourceType, HeroRole, BuildingType, Climate, etc.
      types.ts     # Player, Guild, Hero, Building, WorldState, etc.
      constants.ts # Game balance values, building definitions
  docs/            # Design documents and implementation plan
```

## Weather Integration

Guildtide uses real-world weather data to influence gameplay. To enable live weather:

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Add it to `server/.env`:
   ```
   OPENWEATHERMAP_API_KEY=your-key-here
   ```

Without an API key, the game falls back to deterministic weather generation based on region and date.

## Documentation

See [docs/implementation-plan.md](docs/implementation-plan.md) for the full technical implementation plan.

## License

Private project.
