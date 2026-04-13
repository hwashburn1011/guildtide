# Game Pitch and Specification: Living World Idle RPG

## Working Concept

This is a **web-based 2D idle RPG with light guild management, progression systems, and optional social interaction**, where the fantasy world is subtly influenced by **real-world events and conditions**.

The goal is not to make a pure clicker, not to make a hardcore MMORPG, and not to make a traditional mobile pay-to-win idle game. The goal is to make something that feels fresh, small enough for a solo developer to actually build, and interesting enough that a player can immediately say:

> "This feels a little alive. It feels like the game world is reacting to something bigger."

At its core, the game is about:

- Building and growing a guild or settlement
- Sending units or heroes on idle tasks, expeditions, farming runs, scavenging runs, and missions
- Managing resources, upgrades, gear, and progression
- Experiencing a world that changes based on real-world signals like weather, seasonal patterns, holidays, economic indicators, or major events
- Optionally interacting with other players asynchronously through guild cooperation, regional synergy, or light PvP

This should feel **cartoony, stylized, and systemic**, not realistic and not overproduced. The design should embrace the fact that it is a solo-indie project and use that constraint as a strength.

---

## Core Vision

The strongest version of this idea is:

A **living idle RPG** where players manage a guild in a fantasy world whose economy, crops, expeditions, events, and opportunities are influenced by real-world external factors. Players can progress while away, come back to meaningful changes, adapt to conditions, and gradually discover that the world is not just using random events. It is quietly reflecting reality.

The player may not initially know exactly why conditions changed.

They might simply notice:

- crops overperformed today
- one trade district crashed
- a storm-based event appeared
- certain expeditions are more profitable than usual
- one guild market is unstable
- rare creatures migrated into a zone
- another player in a different region has different opportunities

That mystery is part of the hook.

The game should not feel like an educational simulation or a finance game. It should feel like a **fantasy idle RPG with hidden real-world rhythms under the hood**.

---

## Why This Idea Is Interesting

This concept has a few things going for it that standard idle games do not:

### 1. It breaks deterministic min-maxing

Many idle games eventually collapse into solved builds. Players discover the most efficient route, share it, and the meta becomes static.

By tying some opportunities and pressures to real-world changing conditions, the game can disrupt static optimization. The best strategy this week may not be the best strategy next week.

### 2. It creates mystery without requiring AI inside the game

The game does not need in-game AI content generation. The freshness comes from **systems reacting to external reality**, not from an LLM writing quests.

### 3. It stays small enough to actually build

A solo developer can build this if it is scoped properly:

- 2D interface
- mostly UI-driven or text-assisted gameplay
- stylized art
- asynchronous systems
- limited combat complexity
- narrow initial API integration

### 4. It gives players something to talk about

A good hook for discovery is:

- "Why did the merchant district crash today?"
- "Why did your crops flood in Florida but mine froze?"
- "Why are East Coast guilds getting storm bonuses?"
- "Why is the solar region faction stronger this week?"

That kind of shared pattern recognition is interesting.

---

## Product Positioning

If this were pitched simply:

> A 2D web idle RPG where your guild grows over time, your world subtly reacts to real-world events, and players across different regions experience slightly different opportunities, risks, and strategies.

This is not trying to compete with massive live-service games.

This is aiming more at:

- players who like incremental progression
- players who like idle systems with depth
- players who like economy layers and RPG systems
- players who like discovering hidden systems
- players who like asynchronous guild cooperation
- players who enjoy weird small indie hooks

---

## Recommended Scope

This should start as a **browser-based game**, not a native Steam-first product.

Why browser first:

- easier deployment
- easier iteration
- lower installation friction
- easier to test and update
- simpler access to web APIs
- easier account/login model
- much easier to get a playable prototype in front of people

A browser game can later be wrapped for desktop if needed.

The goal should be:

### Phase 1
A playable demo with:
- one guild
- one map or regional view
- one crop/economy loop
- one expedition loop
- one real-world data source
- one or two event systems
- simple progression
- basic offline gains

### Phase 2
Expand into:
- regional differences
- guild specialization
- async player interactions
- light PvP/co-op
- multiple real-world data inputs

---

## Game Fantasy and Theme

The strongest thematic framing is probably not literal stock trading or literal weather reporting.

Instead, it should be **fantasy-translated**.

Real-world inputs should be mapped into fictional systems like:

- weather becomes seasonal magic, storms, harvest conditions, migrations, or elemental surges
- stock/economic changes become merchant guild volatility, caravan prices, resource scarcity, black market spikes, or trade opportunities
- holidays become world festivals, blessing events, guild feasts, celebration buffs
- regional differences become biome affinities, kingdom influences, trade routes, or celestial zones

This protects the game from feeling too on-the-nose while still preserving the core hook.

---

## Exact Game Pitch

## Title Placeholder
**Living World Guilds**  
Alternative names should come later, but this placeholder captures the concept.

## Pitch
You are the leader of a small fantasy guild in a world that never fully stands still. While you are away, your workers farm, craft, scavenge, trade, and explore. When you return, the world may have shifted. Storms may have enriched your harvest or destroyed part of it. Trade houses may be booming or collapsing. Rare opportunities may appear only under certain global conditions. Your guild grows through planning, specialization, and adaptation.

Other players in different regions may experience different world states. Some areas benefit from rain. Others from heat. Some gain access to seasonal events, migration waves, or market distortions. Over time, players can trade, cooperate, and compete through asynchronous systems, all while trying to understand the hidden logic behind the world.

The experience should feel like a blend of:
- idle progression
- light RPG systems
- light management
- asynchronous social play
- discovery through world reactivity

---

## Player Fantasy

The player fantasy is:

- I log in and my guild has been busy
- The world changed while I was away
- I need to react to current conditions
- My choices still matter
- I can build around the world instead of against a static spreadsheet
- I can specialize
- I can cooperate with players from other regions
- I can discover patterns other players have not figured out yet

---

## Core Gameplay Loop

The moment-to-moment gameplay loop should look like this:

### 1. Log in and collect idle results
When the player returns, they see:
- resources generated
- expedition results
- crafted items completed
- weather/event changes
- regional or world-state modifiers
- guild alerts
- rare finds
- market shifts

### 2. Assess world conditions
The player checks:
- current local or regional modifiers
- current guild bonuses and penalties
- available missions
- active trade conditions
- special event triggers
- social opportunities or conflicts

### 3. Make strategic assignments
The player decides how to allocate guild effort:
- farming
- crafting
- mining
- alchemy
- scouting
- trade caravans
- monster hunting
- salvage missions
- defense
- event participation

### 4. Upgrade and specialize
The player spends gains on:
- guild buildings
- worker tiers
- hero gear
- passive bonuses
- market unlocks
- expedition routes
- climate mitigation
- storage and production chains

### 5. Trigger active actions
Even though this is an idle game, active play should matter. The player can:
- resolve a rare event
- choose one of several branching responses
- launch a timed expedition
- enter a text-based or simplified combat challenge
- trade with another guild
- invest in a temporary strategic window

### 6. Leave the game running or close it
Progress continues. When they come back, things changed again.

That loop is simple, understandable, and expandable.

---

## Secondary Gameplay Loop

Under the main loop, there is a longer arc:

- unlock new systems
- discover deeper world behavior
- realize certain external factors affect gameplay
- optimize around changing rather than static conditions
- form relationships with other guilds
- specialize by region or strategy
- compete in asynchronous events
- unlock rare world-state dependent content

---

## RPG Elements

To keep this from becoming "just another idle game," it needs real RPG flavor.

### Guild-Based RPG Structure
Instead of one hero only, the player manages a guild with:
- a guild hall
- recruitable units or heroes
- gear slots
- skill training
- role assignments
- passive traits
- specialization trees

This allows progression depth without requiring complex hand-animated combat.

### Possible Roles
- Farmer
- Scout
- Merchant
- Blacksmith
- Alchemist
- Hunter
- Defender
- Mystic
- Caravan Master
- Archivist

Each role contributes to a different idle system.

### Hero or Worker Traits
Characters can have traits that interact with the world state:
- Stormborn: better in wet weather
- Sunblessed: increased solar production
- Frostward: immune to cold penalties
- Shrewd Trader: better returns during volatility
- Lucky Forager: higher rare drop chance during migration events
- Salvager: better value from downturn events

This creates meaningful build choices.

---

## Progression Systems

There should be several overlapping progression axes.

### 1. Guild Level
Global progression that unlocks:
- building tiers
- mission complexity
- max roster
- event access
- map expansion

### 2. Character Progression
Individual heroes/workers can level up through:
- successful assignments
- training
- survival
- event participation
- item usage

### 3. Building Progression
Upgrading the guild base improves:
- output
- storage
- recovery
- idle efficiency
- resilience against negative external conditions

### 4. Technology or Research
A simple research tree can unlock:
- irrigation
- flood control
- market forecasting
- storm harvesting
- cold storage
- trade insurance
- expedition logistics
- diplomatic channels

This is important because it converts real-world unpredictability into strategic preparation rather than pure randomness.

### 5. Itemization
Items should matter but stay manageable.

Possible item categories:
- tools
- charms
- armor
- weapons
- relics
- trade permits
- crop seeds
- transport upgrades

Items can be found through idle loops, crafted, or earned from events.

---

## Real-World Integration Philosophy

This is the defining mechanic and needs to be handled carefully.

The game should **not** directly expose raw real-world data in a boring way.

Instead, it should:
- consume real-world signals
- transform them into game-state modifiers
- optionally let advanced players discover the relationship

The world should feel influenced, not literally mirrored.

### Good Version
- heavy rain in player region -> increased crop growth but risk of rot/flood
- heat wave -> lower water reserves but increased drying/alchemy output
- market downturn -> merchant guild instability, discounted risk-assets, salvage opportunities
- holiday -> city festival, buffed morale, trade spike
- seasonal shift -> creature migration, biome changes

### Bad Version
- direct stock ticker with literal company names as a main gameplay feature
- exact CPI numbers shown as game stats
- boring real-world dashboard inside the game
- mechanics so literal that it feels like finance homework

The game should be fantasy first.

---

## External Factors to Use

Here are the most feasible categories.

## 1. Weather
This is the best first integration.

Why:
- easy to understand
- highly localized
- easy to fetch
- naturally translates to gameplay
- players immediately understand why it matters

What weather can affect:
- crop yield
- flood chance
- drought chance
- travel speed
- hunting success
- rare creature spawns
- elemental bonuses
- event generation

Example mappings:
- rain yesterday -> +20% crop growth, +10% fungus/rot chance
- thunderstorm -> storm essence event, expedition risk increase
- cold snap -> reduced agriculture, increased preservation efficiency
- sunny streak -> improved solar crafting or morale, lower water reserves

## 2. Seasonal / Calendar Data
Also easy and strong.

What it can affect:
- festivals
- visual themes
- migration windows
- holiday markets
- rare recipes
- guild morale events

## 3. Economic Signals
Use broad signals, not complex direct modeling.

Possible sources:
- market index direction
- commodity movement
- interest-rate changes
- exchange-rate shifts
- simple trend states, not raw complexity

What it affects in game:
- trade house stability
- caravan profits
- merchant prices
- risk/reward event windows
- black market opportunities
- temporary scarcity

Use economic data sparingly. It should add flavor and volatility, not dominate the whole game.

## 4. Major Public Events
Examples:
- sports finals
- major world festivals
- public holidays
- global celebrations

These can create:
- attendance festivals
- morale buffs
- tavern boosts
- limited-time decorations
- bonus social events

## 5. Region-Based Identity
The player's selected or detected region can influence:
- baseline climate
- available crop families
- faction affinity
- seasonal event weightings
- partnership value with players in other areas

This opens the door to cooperation across regions.

---

## Browser and Location Model

If this is web-based, location handling should be designed carefully.

### Recommended approach
Do not require precise location.

Instead:
- ask player permission for broad geolocation, or
- ask them to choose a city/region manually during onboarding

Manual city selection may actually be better than browser geolocation because:
- easier for privacy
- easier for testing
- easier for players who travel
- gives the player agency
- avoids weirdness with exact location tracking

Once selected, the game uses city-level or regional weather/event data.

That is enough. Hyper-local street precision is unnecessary.

---

## How Region Affects Gameplay

A player in South Florida and a player in Wisconsin should not have totally different games, but they should have **meaningfully different modifiers**.

### South Florida style possibilities
- rain-heavy harvests
- flood risk
- tropical event chains
- humidity buffs/debuffs
- storm season specials

### Wisconsin style possibilities
- snow season
- freeze preservation bonuses
- winter creature appearances
- slower agriculture in certain windows
- cold-hardy guild specializations

The key is to make regional variation feel flavorful, not unfair.

---

## Real-World Data Handling Architecture

You discussed concern about players seeing API calls directly. The best approach is to **not call third-party public APIs from the client**.

Instead:

### Recommended architecture
- backend service periodically fetches external data
- backend normalizes and transforms it
- backend stores results in your own database
- game client only calls your backend

This is the correct design.

### Why this is better
- hides third-party API keys
- gives you data control
- lets you cache aggressively
- lets you smooth or transform noisy data
- avoids exposing raw vendor requests
- reduces privacy concerns
- lets you test and replay data
- prevents clients from learning too much about exact trigger logic

### Storage
A central database like Cosmos DB is completely reasonable if that is your comfort zone. Any simple backend store would work.

Store things like:
- region
- timestamp
- weather summary
- derived game-state tags
- economic trend flags
- event seeds
- daily modifiers
- weekly modifiers

The important point is that the client should consume a **curated world-state payload**, not raw public API responses.

---

## Event Design Principles

This part matters a lot.

When external forces create negative outcomes, the game should not feel cruel or arbitrary. But that does **not** mean there can be no losses.

Losses are fine.

The right design is:
- losses should be recoverable
- negative events should usually open a new decision or opportunity
- downturns should be interesting, not dead ends

### Example
Bad weather floods crops:
- lose 15% harvest
- unlock salvage mud-crop event
- chance to discover rare root resource
- temporary alchemy ingredient bonus
- flood-control research becomes available

So the player still loses something, but the system creates gameplay.

That is the ideal pattern.

---

## Combat Model

To keep scope realistic, combat should start simple.

### Recommended MVP combat
Do **not** build a full action combat system first.

Start with one of these:
- text-based combat resolution
- auto-battler style combat
- squad assignment with stat-based outcomes
- turn-based lightweight battle scenes
- asynchronous challenge resolution

You can still make it feel RPG-like through:
- gear
- traits
- party composition
- enemy types
- event conditions
- bonuses from world state

### Example
The player sends:
- 1 scout
- 1 hunter
- 1 mystic

Into a marsh expedition during heavy rain.

That changes:
- encounter pool
- loot table
- risk profile
- status effect probabilities

This is rich enough without needing complicated real-time combat.

### Future possibility
If later you want guild-vs-guild or hero challenges, you can add:
- asynchronous duel simulation
- ladder-style encounters
- event-driven raid conflicts
- faction wars

---

## PvP and Co-op

This game can absolutely support social systems, but they should be **asynchronous first**.

### Why async first
- much easier technically
- much better for an idle game
- no netcode complexity
- fits browser deployment
- works across time zones
- supports casual players

### PvP ideas
- guild raids against rival outposts
- caravan interception
- economic competition
- ranked influence wars
- district control battles
- seasonal leaderboard contests

These do not need twitch gameplay.

### Co-op ideas
- trade pacts
- shared expeditions
- event collaboration
- weather-region synergy
- resource exchange
- alliance bonuses

### Strong social hook
Players in different regions may complement each other.

Examples:
- rainy guild produces more crops
- dry guild produces better preserved goods
- cold guild supplies frost resources
- warm guild supplies exotic herbs

That makes cross-region alliances actually interesting.

---

## The Hidden Discovery Layer

One of the strongest ideas from the discussion is that players may not immediately know what real-world forces are driving the game.

This should be done carefully.

The game should not lie. But it does not need to explain everything immediately.

A good version is:
- the world feels pattern-driven
- observant players discover those patterns
- later game systems may reveal some of the logic
- the community shares findings

This creates organic discovery.

### Example
Players notice:
- certain merchant houses crash after some real-world signal
- specific weather patterns trigger creature migrations
- some guilds seem better positioned during certain calendar windows

Then later you can unlock systems like:
- Forecast Tower
- Trade Observatory
- Seasonal Almanac
- Guild Astrologer
- Market Scribe

These systems reveal more predictive information in-game, which is elegant because it turns meta-discovery into progression.

---

## What the Player Actually Does In Game

Here is a more concrete list of activities.

### Idle Activities
- grow crops
- collect water
- harvest mushrooms
- mine ore
- cut wood
- brew potions
- train recruits
- send caravans
- run market stalls
- scout routes
- gather relic fragments

### Active Activities
- choose event responses
- equip heroes
- set guild priorities
- spend research points
- launch special expeditions
- respond to regional conditions
- trade with another player
- defend against an incursion
- invest in or hedge against market trends
- reorganize production

### Long-Term Activities
- unlock new districts
- specialize the guild
- form alliances
- optimize for region-based strengths
- discover hidden world logic
- compete in seasonal cycles

---

## Recommended MVP Feature Set

To keep this buildable, here is what the first real playable version should include.

## MVP Must-Haves
- browser-based client
- account save system
- one selected home region or city
- weather-based daily modifier system
- one main resource chain
- one farming system
- one expedition system
- one guild upgrade tree
- one roster system
- offline progress calculation
- event log
- simple item drops
- one or two special events triggered by external conditions

## MVP Nice-to-Haves
- simple trade system
- daily rotating market
- one social leaderboard
- simple guild name and emblem system
- one async guild event
- one weather-forecast building that previews likely conditions

## Not MVP
- real-time PvP
- full animated combat
- huge handcrafted world
- massive story campaign
- dozens of APIs
- complex 3D visuals
- massive character creator
- overly deep economy simulation

---

## Technical Stack Recommendation

Since the idea is browser-first, use a web stack.

### Frontend
Good options:
- plain HTML5 + Phaser
- React + Phaser
- PixiJS if you want more custom UI control

For this game, Phaser is likely the easiest fit if you want game-like scenes and UI.

### Backend
Use whatever you can move quickly in.

Given your background, a backend with:
- API layer
- scheduled jobs
- persistent save data
- external data ingestion
- world-state generation

would be straightforward.

### Database
Anything simple works. If you are comfortable with Cosmos DB, it is viable.

Likely tables/collections:
- players
- guilds
- heroes/workers
- inventory
- buildings
- region_state
- daily_events
- world_modifiers
- trade_market
- alliances

### Background jobs
You will need scheduled jobs for:
- fetching public data
- generating regional world-state
- calculating daily/periodic modifiers
- rotating events
- resolving async tasks

### Client-server split
The client should:
- render UI
- show state
- submit actions
- request results

The server should:
- compute outcomes
- validate timing
- handle external data
- generate world-state
- prevent tampering

Do not trust the client for progression math.

---

## APIs to Start With

Start with as few as possible.

## API 1: Weather
This is the best MVP input.
Needs:
- city/region weather
- current conditions
- previous day summary if possible
- temperature
- rainfall
- storm state

Use weather to drive:
- crop growth
- flood risk
- creature spawn states
- travel modifiers
- event generation

## API 2: Calendar / Holidays
Can be static or semi-static early on.
Use for:
- festivals
- buffs
- limited events
- cosmetic changes

## Optional API 3: Broad Economic Signal
Only after MVP.
Use something simple like:
- market up/down state
- volatility state
- rate change state

Map to:
- trade-house prices
- market opportunities
- crash/recovery mini-events

That is enough. Do not start with five APIs.

---

## Art Direction Recommendation

Because art is a real limitation, the visual style should be intentionally achievable.

### Do not chase
- realistic 3D
- detailed animated towns
- highly detailed humanoid modeling
- huge handcrafted visual scope

### Do chase
- stylized 2D
- icon-heavy UI
- cozy fantasy presentation
- map panels
- character portraits over full animation
- simple readable environments
- charming event illustrations
- strong visual identity through color and faction themes

This project should lean into:
- UI-first design
- panel-based progression
- visual feedback through icons, overlays, weather effects, maps, and portraits

That will give a much better result than overreaching on 3D production.

---

## Why This Is Buildable

This idea is realistic if scoped correctly because:
- idle systems are mostly state and timers
- browser games are viable for this genre
- external real-world data can be ingested centrally
- you do not need complex twitch combat
- you do not need advanced 3D art
- region variation can be mostly data-driven
- social systems can be async
- the strongest hook is systemic, not content-heavy

The project becomes unrealistic if you try to combine:
- full MMO scope
- full action combat
- tons of handcrafted narrative
- complex live economy
- advanced multiplayer netcode
- huge asset needs

So the rule is simple:

**Small world, deep systems, strong hook.**

---

## What Would Make This Better Than an 80/100 Idea

The concept is strong, but what elevates it is not more complexity. It is better integration and better consequences.

To move it from "interesting" to "really good", it needs:

### 1. Better player interpretation
Players should be able to notice patterns without reading documentation.

### 2. Good consequence design
External shifts should create:
- gain
- risk
- adaptation
- opportunity

not just random punishment.

### 3. A reason to log back in
The game must make the player curious:
- what changed
- what happened in my region
- what event appeared
- what opportunity I can exploit today

### 4. Region-based social depth
If guilds in different areas can complement each other, that is a major strength.

### 5. Elegant reveal of hidden systems
The player should gradually understand that the world has rules tied to reality, and that understanding itself should become part of progression.

---

## Example Day in the Game

A concrete example helps tie everything together.

A player in South Florida logs in after being away overnight.

The system sees:
- heavy rain yesterday
- high humidity
- no major holiday
- mild negative market trend flag for the week

The player returns to:
- crops grew faster than normal
- one lowland field partially flooded, losing part of its yield
- a rare marsh herb spawned because of moisture conditions
- caravan profits are slightly down because merchant confidence is reduced
- a salvage contract appears because one trade district is unstable
- a "Storm-Touched Beast" hunt event opens for 12 hours

The player then:
- collects resources
- assigns workers to repair and reinforce one field
- sends a hunter party after the rare beast
- crafts a flood-resistant irrigation upgrade
- sells surplus herbs into a shortage market
- checks alliance requests from a dry-region guild that needs moisture-grown ingredients

That is the kind of gameplay this concept can create.

---

## Example Regional Cooperation

A player in a rainy region and a player in a dry region team up.

The rainy player has:
- strong crops
- flood-related rare ingredients
- weak preservation efficiency

The dry-region player has:
- better preserved goods
- higher caravan reliability
- fewer fresh crop surpluses

Together they:
- trade region-specific outputs
- complete a joint contract
- cover each other’s deficiencies
- unlock a co-op bonus

This is elegant and scalable.

---

## Example Economic Event Translation

Instead of saying:
"NASDAQ dropped 2%"

The game says:
"The Sapphire Exchange has entered a panic cycle. Merchant contracts pay less, salvage rights are opening, and distressed caravans may carry rare inventory."

This is how real-world influence should be translated.

---

## Risks and Design Warnings

This idea has real strengths, but also risks.

### Risk 1: It becomes a gimmick
If external data only creates shallow novelty, the hook wears off.

Solution:
Tie real-world inputs into meaningful systems.

### Risk 2: It feels unfair
If players are punished too hard by external forces, they disengage.

Solution:
Allow losses, but attach recovery paths and opportunities.

### Risk 3: It becomes too complex to explain
If every system depends on hidden outside data, players get lost.

Solution:
Use a few consistent inputs and reveal logic gradually.

### Risk 4: Scope explosion
If you add too many systems, APIs, and multiplayer features too early, the project dies.

Solution:
Start with one region system, one weather model, one economy loop, one social feature.

### Risk 5: Privacy concerns
If you overuse precise geolocation, some players will dislike it.

Solution:
Use manual city selection or broad region selection.

---

## Strongest MVP Summary

If this had to be boiled down to the best first version:

Build a browser-based 2D fantasy guild idle game where the player selects a home region, grows crops, sends expeditions, upgrades their guild, and experiences daily modifiers based on local weather. Use that weather to create yield changes, rare events, travel conditions, and small strategic adjustments. Add one market system and one special event layer. Keep combat lightweight, progression satisfying, and art stylized. Build the backend so all external data is ingested centrally and transformed into game-state modifiers. Add asynchronous social interaction later.

That is a real, buildable game.

---

## Final Recommendation

If you want a first real game project that is:
- not too generic
- not too art-heavy
- not too dependent on advanced 3D
- achievable with web tech
- interesting enough to stand out

this is one of the better directions you could take.

The best form of it is **not**:
- a giant open-world RPG
- a direct finance simulator
- a pure clicker
- a full PvP battler

The best form is:
- a small but deep living idle RPG
- fantasy-translated real-world influence
- player adaptation over static optimization
- browser-first deployment
- stylized presentation
- asynchronous social depth

This is the version worth building.

---

## One-Sentence Elevator Pitch

**A browser-based 2D fantasy idle RPG where your guild grows while you are away, the world subtly reacts to real-world regional conditions, and players adapt, cooperate, and compete inside a living system that feels strangely connected to reality.**
