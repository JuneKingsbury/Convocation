# Convocation
A Rimworld-like Arcane Colony Management Sim

## About

Convocation is a browser-based ASCII colony management game inspired by Rimworld and Dwarf Fortress. Manage colonists, build defenses, research arcane technologies, and defend your settlement against waves of void creatures.

---

## Getting Started

When you start a new game, you'll have a handful of colonists and basic resources on a procedurally generated map. Your first priorities should be:

1. **Gather resources** — Designate trees for chopping (G mode) and rocks for mining.
2. **Build shelter** — Use Build mode (B) to create walls and doors. Enclosed rooms with beds give mood bonuses.
3. **Plant crops** — Use Farm Zone mode (Z) to designate fields. Wheat and berries are reliable starter crops.
4. **Set up cooking** — Build a Cauldron and cook raw food into meals for mood bonuses.
5. **Research** — Build an Arcanum and assign colonists to study. Research unlocks the rest of the game.

Use the in-game Glossary (accessible from Settings) for quick reference. The Inventory panel (I) is tabbed into Resources, Equipment, Consumables, and Animals for easy browsing.

---

## Your Colonists

Each colonist is an individual with skills, needs, traits, and moods that shape how they contribute to the colony.

### Skills & Priorities
Colonists have skills in Building, Farming, Crafting, Cooking, Hauling, and six Magic schools. Set task priorities (1-5, 0 = disabled) to control what each colonist works on. Lower numbers mean higher priority. Use "Copy Priorities From..." to quickly replicate setups.

### Needs & Mood
Hunger and Rest decay over time. When critical (<20), colonists interrupt work to eat or sleep. Mood is calculated as Base 50 + active thoughts, and it directly affects productivity:

| Mood Level | Range | Work Speed |
|---|---|---|
| Inspired | 75+ | 1.2x |
| Content | 40-74 | 1.0x |
| Stressed | 20-39 | 0.7x |
| Breaking | <20 | Refuses work |

Thoughts are temporary modifiers from events — good meals, nice rooms, and deaths all leave impressions that fade over time.

### Traits
Each colonist spawns with permanent traits: Hard Worker, Lazy, Night Owl, Early Bird, Green Thumb, Iron Stomach, Socialite, Loner, Optimist, Pessimist, Tough, Pyromaniac, or Gourmand. These subtly alter behavior and mood.

### Controlling Colonists
- **Drafting** — Take direct control. Drafted colonists move where you right-click. Select multiple with click-drag and use Draft All for quick combat response. They pulse red on the map.
- **Rally Point** — Right-click with multiple drafted colonists to send them in spread formation. A red flag (⚑) marks the spot.
- **Guard Mode** — A middle ground between full automation and drafting. Toggle the Guard button to make a colonist patrol their current position and proactively engage threats within 10 tiles. They still eat and sleep when critical, but skip all work tasks. No ongoing player input needed.
- **Fleeing** — Colonists automatically disengage from combat when HP drops below 20, retreating until the threat is 8+ tiles away.

### Equipment
Colonists have 4 gear slots:

- **Weapon** — Determines melee damage. Fists (5), Wooden Club (10), Etched Axe (15), Runic Blade (22), Runic Pick (12, +40% mine speed), Void Blade (30).
- **Magic Weapon** — Wands and staves trade melee power for spell amplification. Wooden Wand (+30% spell dmg), Runic Wand (+50%), Crystal Staff (+20%), Void Staff (+40%). Best for dedicated spellcasters.
- **Armor** — Void Armor reduces all incoming damage by 30%.
- **Tool** — Boosts work speed. Stone Pickaxe (+20% mining), Runic Pickaxe (+50%), Woodcutter's Axe (+30% chopping), Harvesting Sickle (+25% farming).
- **Artifact** — Special items. Boots of Haste (+30% move speed), Amulet of Fortune (+20% XP, trader exclusive).

Use "Auto-equip Best" to quickly gear up a colonist with the best available items from storage.

---

## Magic System

Magic is at the heart of Convocation. Colonists learn spells, channel mana, and reshape the world.

### Learning Spells
Colonists learn spells by studying Spell Tomes at the Arcanum. Equip a tome, assign the colonist to research, and they'll make progress on it alongside generating study points. Progress persists if you unequip and re-equip the tome. Completing a tome consumes it and permanently grants that spell.

### Mana & Casting
Each colonist has a personal mana pool (base 20 + bonuses from magic skill levels across all schools). Spells consume mana and go on cooldown. Mana regenerates over time. You can disable auto-casting for specific spells to conserve mana.

### The Six Schools
- **Evocation** — Ranged combat (Magic Missile, Fireball, Chain Lightning). Your primary offensive magic.
- **Enchantment** — Work buffs (Haste, Animate Golem). Makes colonists faster and more productive.
- **Abjuration** — Defense and healing (Heal, Shield, Mass Heal). Keeps your colony alive.
- **Conjuration** — Summoning and movement (Summon Familiar, Warp, Blink).
- **Transmutation** — Terrain manipulation (Circle of Growth, Raise Mountain, Level Field). Reshape the map itself.
- **Divination** — Probability manipulation (Foresight, Fair Winds, Merchant's Omen, Ward of Calamity, Fortunate Discovery). Influence weather, events, and raid timing.

### Potions
Brewed at the Cauldron and auto-consumed by colonists:
- **Health Potion** — Auto-used when HP drops below 50%. Heals 50 HP. (3 berries + 2 wheat)
- **Speed Potion** — Auto-used when working. +50% move, +30% work for 100 ticks. (2 corn + 2 potatoes + 1 berries)

---

## Building Your Colony

Press B to enter Build mode. Buildings are organized into 5 tabs (cycle with Tab/Shift+Tab):

### Walls & Floors
- **Wall** (█) — Blocks movement. 50-90 HP by material. Forms rooms when enclosing an area with doors.
- **Floor** (·) — Cosmetic. Wood, stone, or brick. Makes rooms nicer.
- **Door** (+) — Allows colonist passage. Blocks enemies. Room boundary.
- **Fence** (|) — Lighter wall alternative (20 HP).

### Furniture
- **Bed** (B) — Assign colonists for "slept in bed" mood bonus.
- **Torch** (i) — Light and warmth. Drag-placeable.

### Production
- **Workbench** (C) — Crafting station for weapons, tools, planks, bricks.
- **Cauldron** (F) — Cooking and potion brewing.
- **Food Chest** (S) — Each reduces food spoilage by 15% (stacks to 60%).

### Defense
- **Void Wall** (▓) — 120 HP reinforced wall. Requires Void Forging.
- **Void Door** (▒) — 80 HP reinforced door. Requires Void Forging.
- **Void Turret** (Y) — 20 damage, range 5. Consumes 5 mana. Requires Void Forging.

### Arcane
- **Arcanum** (R) — Research station. Colonists study here to unlock the tech tree and progress spell tomes.
- **Beast Circle** (A) — Required for taming creatures.
- **Mana Crystal** (W) — Generates 10 mana for the leyline network.
- **Glowstone** (L) — Mana-powered light, radius 5. Consumes 2 mana.
- **Enchanting Table** (P) — 2x crafting speed. Consumes 4 mana.
- **Ember Ward** (H) — Warms radius 4 in winter. Consumes 3 mana.
- **Arcane Sentinel** (X) — Auto-attacks enemies in range 4. Consumes 3 mana.
- **Ice Box** (I) — Reduces food spoilage by 40% (stacks with chests, max 90%). Consumes 1 mana.
- **Rift Gate** (Ω) — Portal to alternate dimensions. Consumes 6 mana.
- **Golem Forge** (Ğ) — Craft golems. Requires Golem Craft research.
- **Forge Core** (⚒) — Center of the Great Forge multi-block structure.
- **Ritual Core** (◎) — Center of the Ritual Circle multi-block structure.

### Rooms
Enclose an area with walls/fences and at least one door to form a room (max 100 tiles). Colonists sleeping in rooms get a mood bonus.

### Complex Structures (Multi-Block)
Late-game buildings that provide powerful bonuses when a specific pattern of tiles surrounds a core piece. Build the core from the Arcane tab, then assemble the pattern around it. Activation is automatic when complete — the core's info panel shows what's missing.

#### Great Forge
**Effect:** 2.5x equipment crafting speed for colonists working within 3 tiles.

```
 ███
 █⚒█    █ = Wall (any material)
 █+█    ⚒ = Forge Core (center)
            + = Door (exactly one side)
```

The Forge Core must be surrounded by walls on all sides except one, which must be a door. Any wall material works (wood, stone, brick, void). The door can be on any of the 4 sides.

#### Ritual Circle
**Effect:** Reduces spell cooldowns by 30% for all colonists within 6 tiles.

```
  █
 █ █
█ ◎ █   █ = Wall (any material)
 █ █    ◎ = Ritual Core (center)
  █
```

The Ritual Core must have walls placed in a diamond pattern at 8 positions: the 4 cardinal directions at distance 2, and the 4 diagonal directions at distance 1. The spaces between can be anything (floor, grass, empty).

---

## Farming & Food

### Setting Up Farms
Press Z to enter Farm Zone mode. Pick a crop, then drag over grass or dirt tiles. Colonists auto-plant and harvest.

| Crop | Seasons | Grow Time | Yield | Notes |
|---|---|---|---|---|
| Wheat | Spring/Summer/Autumn | 200 ticks | 3 | Reliable staple |
| Berries | Spring/Summer/Autumn | 150 ticks | 2 | Fast growing |
| Corn | Summer only | 250 ticks | 4 | High yield, seasonal |
| Potatoes | Spring/Autumn/Winter | 180 ticks | 3 | Hardy, grows in cold |

Growth is boosted by rain (1.3x) and summer (1.5x). No outdoor growth in winter except potatoes.

### Food Preservation
All food rots over time. Faster-rotting items (milk, berries) decay first. Combat spoilage with:
- **Food Chests** — -15% each (max 60%)
- **Ice Boxes** — -40% each (max 90% combined with chests, requires mana)
- **Season** — Winter slows rot 0.5x; summer accelerates 1.5x

Use the lock icon in the Inventory to reserve specific foodstuffs from cooking (for alchemy recipes, etc.).

### Cooking
Build a Cauldron, then queue recipes in the Craft panel (C). Cooked meals give a mood bonus; raw food gives a penalty. Set an Auto-Cook threshold to keep food levels topped up automatically. Use the x5 button for bulk crafting.

---

## Wildlife & Taming

### Wild Animals
- **Deer** (d) — Passive, flees. 3 meat when hunted.
- **Rabbit** (r) — Passive, fast. 1 meat.
- **Wolf** (w) — Hostile at night/winter. 2 meat. Tameable (dangerous).
- **Okapi** (k) — Passive. Pack animal when tamed.
- **Tapir** (t) — Passive. Happiness aura when tamed.
- **Chicken** (c) — Passive. Produces eggs when tamed.

Click an animal and press Hunt to create a hunting task.

### Beast Binding
Requires Beast Binding research + Beast Circle. Tamed animals fill different roles:
- **Production** — Chickens produce eggs over time.
- **Pack Animals** — Okapi speed up expeditions by 25% each.
- **Aura** — Tapirs boost mood for colonists within 4 tiles.
- **Guards** — Tamed wolves patrol near colonists and attack threats.

### Wolf Taming (Dangerous)
Wolves are a special case. The taming UI shows your success chance and warns about retaliation:
- **Base chance**: 40% + 6% per animal skill level (guaranteed at skill 10)
- **On failure**: The wolf bites for 12 damage and flees. Your colonist gets a mood penalty.
- **On success**: The wolf becomes a guard animal — following colonists, engaging hostiles in range, and retreating when HP is low.

---

## Combat & Defense

### How Combat Works
Melee combat is 1-tile range. Damage = base + weapon bonus. Colonists auto-defend when attacked. Colonists with Evocation spells (Magic Missile, Fireball, Chain Lightning) attack at range automatically.

### Raids
Raiders attack periodically (disabled in Peaceful Mode), scaling with colony wealth. They pathfind toward colonists, breaking through structures if needed. Individual raiders flee when their HP drops below 25%. If 75% of the raiding party is dead or fleeing, the rest rout. A long safety timeout ensures raiders eventually leave even in stalemates.

### Wave Defense (Void Nexus)
Build a Void Nexus after researching Void Summoning, then click it to start a wave challenge. Each wave is harder (more enemies, more HP). Enemies pathfind to the nexus and will break through walls.

- **Nexus HP**: 200. If destroyed, rebuild it (wave progress is kept).
- **Colony Cap**: 3 + waves completed (max 12). Complete waves to grow your colony.
- **Strategy**: Funnel enemies with walls/doors, line the path with turrets, and station drafted colonists at chokepoints.

### Guard/Patrol Mode
For ongoing defense without micromanagement: assign colonists to Guard mode. They patrol within 6 tiles of their post and engage threats within 10 tiles, returning if they chase beyond 12 tiles. Unlike drafting, this persists across saves and requires no ongoing input.

---

## Golems

Golems are animated stone workers — tireless, moodless, and specialized. They never eat, sleep, or count against your population cap.

### Crafting Golems
Research Golem Craft, build a Golem Forge, then click it to see available types:

| Type | Specialty | Skill | HP | Cost |
|---|---|---|---|---|
| Farmer | Farming | 6 | 150 | 10 stone, 3 runite, 2 void essence |
| Miner | Building/Mining | 6 | 180 | 12 stone, 4 runite, 2 void essence |
| Combat | Fighting | — | 250 | 15 stone, 5 runite, 4 void essence |
| Hauler | Hauling | 8 | 120 | 8 stone, 2 runite, 1 void essence |

### Limitations
Golems cannot be drafted, cannot equip items or learn spells, and have fixed skills (only their specialty). They display as 'G' on the map. Combat golems auto-fight with 20 damage.

---

## Exploration (Alternate Dimensions)

Build a Rift Gate after researching Planar Rift to send expeditions to other dimensions. This is one of the richest parts of the game — you can watch your colonists' journey unfold in real-time through the expedition event log.

### Sending an Expedition
Click the Rift Gate, choose a dimension, select colonists (and optional pack animals), then launch. The party walks to the gate and enters the dimension. While exploring, colonists are removed from your workforce.

### The Live Event Log
Click the Rift Gate while an expedition is active to see a scrolling, color-coded log of everything happening to your party:
- **Blue** — Status updates (entering dimension, returning)
- **Orange** — Combat events (attacks, misses, round-by-round fighting)
- **Red** — Danger (traps triggered, colonists defeated)
- **Green** — Victories and successful returns
- **Yellow** — Loot discovered (items found, caches opened)
- **Grey** — Ambient observations (flavor text unique to each dimension)

The panel also shows each party member's current HP and enemy counts during combat.

### Combat Resolution
Unlike surface combat, expedition fights play out round-by-round over multiple ticks. Each round, your colonists swing at enemies (with a chance to miss) and enemies strike back. Equipped weapons and armor matter. You'll see individual hit messages like "Aldric strikes an enemy for 14 damage" or "An enemy lands a blow on Mira (8 dmg)."

### Between Encounters
As your party explores, small events occur randomly:
- **Traps** — Spike traps, arcane wards, poison needles. Deal damage to a random party member.
- **Discoveries** — Hidden caches, supply stashes, gems pried from walls. Bonus loot.
- **Ambient** — Flavor text specific to each dimension that brings the environment to life.
- **Rare Events** — Low-chance special encounters unique to each dimension with bonus loot rewards.

### Dimensions

| Dimension | Difficulty | Duration | Loot | Rare Encounters | Research |
|---|---|---|---|---|---|
| Crystal Caves | 1 | 220-380 | Stone, Runite | Resonating chambers, dwarven caches | — |
| Verdant Depths | 1 | 150-280 | Wood, Wheat, Berries | Fertile seed caches, druid herb stashes | — |
| Arcane Library | 1 | 180-320 | Spell Tomes, Runite | Headmaster vaults, enchanting caches | Arcane Studies |
| Shadow Realm | 2 | 400-650 | Void Essence, Runite | Collapsing void crystals, sealed reliquaries | Deep Delving |

Each dimension has unique ambient text, trap descriptions, discovery messages, and rare encounters that can only happen there.

### Pack Animals & Survival
Tamed okapi reduce expedition duration by 25% each (stacks, minimum 50% of base). Defeated colonists return at 1 HP — there's no permadeath. If the entire party falls, they return empty-handed.

---

## Trading

When a Trade Caravan arrives, you can barter any of your resources for theirs through the trade panel.

### How Bartering Works
- The trader has a random inventory of resources and possibly a rare exclusive item.
- You sell resources at **70% of base value** (trader discount).
- You buy resources at **140% of base value** (trader markup).
- Your total offer value must meet or exceed what you're requesting.
- You can make **multiple trades** per visit — the trader stays until dismissed.

### Exclusive Items
Some items can only be obtained through trade:
- **Amulet of Fortune** — Artifact, +20% XP gain.
- **Enchanted Blade** — Weapon, 18 damage + 15% spell damage.
- **Wanderer's Cloak** — Armor, -15% damage + 20% move speed.

---

## Research Tree

Build an Arcanum and assign colonists to study. They generate study points over time. Spend points to unlock research.

| Research | Requires | Unlocks |
|---|---|---|
| Runecraft | — | Etched Axe. Unlocks Runeforging & Warding |
| Druidcraft | — | Corn, Potatoes. Unlocks Beast Binding |
| Ley Channeling | — | Mana Crystal. Unlocks Luminance, Ember Magic, Arcane Infusion |
| Alchemy | — | +2 bonus food per cooked meal |
| Runeforging | Runecraft | Runic Blade, Runic Pick, Runic Pickaxe, Boots of Haste |
| Warding | Runecraft | Arcane Sentinel |
| Ember Magic | Ley Channeling | Ember Ward |
| Luminance | Ley Channeling | Glowstone |
| Arcane Infusion | Ley Channeling | Enchanting Table |
| Void Summoning | Ley Channeling + Warding | Void Nexus |
| Void Forging | Void Summoning + Runeforging | Void Blade, Void Armor, Void Wall, Void Turret, Void Door |
| Golem Craft | Arcane Infusion + Void Forging | Golem Forge, all golem types, Forge Core, Ritual Core |
| Planar Rift | Void Summoning + Ley Channeling | Rift Gate |
| Deep Delving | Planar Rift | Shadow Realm dimension |

---

## Seasons & Weather

The year cycles through 4 seasons (1500 ticks each, about 5 minutes real-time at 1x speed).

| Season | Temperature | Crop Growth | Special |
|---|---|---|---|
| Spring | 10-20° | Normal | Animals appear |
| Summer | 20-35° | 1.5x | Heat waves, fire risk, faster rot |
| Autumn | 5-15° | 0.8x | Animal migrations |
| Winter | -10 to 5° | None (except potatoes) | Snow, need warmth |

**Weather events**: Rain (1.3x growth, extinguishes fires), Thunderstorm (can start fires), Blizzard (stops all growth, winter only).

---

## Mana & Leylines

Mana Crystals generate mana; arcane buildings consume it. If consumption exceeds generation, all mana-powered buildings shut off.

| Building | Mana Cost |
|---|---|
| Mana Crystal | +10 (generates) |
| Glowstone | -2 |
| Arcane Sentinel | -3 |
| Ember Ward | -3 |
| Enchanting Table | -4 |
| Void Turret | -5 |
| Rift Gate | -6 |
| Ice Box | -1 |

Plan your mana budget before expanding your arcane infrastructure.

---

## Events

Random events keep things interesting:

- **Wanderer** — A new colonist wants to join (more likely when mood is high). Accept or reject.
- **Trade Caravan** — A merchant arrives for bartering. See the Trading section above.
- **Crop Blight** — Destroys ~40% of growing crops. Summer/autumn.
- **Mineral Windfall** — New stone deposits appear at the map edge.
- **Fire** — Spreads to adjacent tiles. Colonists auto-extinguish. Rain helps.
- **Cold Snap** — All outdoor crops die instantly. Winter only.
- **Animal Migration** — Deer pass through (hunting opportunity).
- **Inspiration** — A random colonist gets +25 mood.

---

## The Map

### Terrain Types
- **.** Grass — Normal speed.
- **,** Dirt — Normal speed.
- **#** Rock — Slow (4x move cost). Can't build on it.
- **▲** Tall Rock — Impassable. Natural chokepoints.
- **~** Water — Slow (3x move cost). Can't build on it.

### Map Generation
Each map is procedurally generated with: dirt patches, rock formations (with stone/runite deposits), mountain ranges (impassable spines), forests, a winding river, and ancient ruins (pre-built structures you can repair).

### Map Symbols Reference
```
.  Grass           ,  Dirt            #  Rock (slow)
▲  Tall Rock       ~  Water (slow)    T  Tree
o  Deposit         @  Colonist        G  Golem
R  Raider          E  Void Enemy      V  Void Nexus
▓  Void Wall       ▒  Void Door       Y  Void Turret
Ω  Rift Gate       S  Food Chest      I  Ice Box
Ğ  Golem Forge     ⚒  Forge Core      ◎  Ritual Core
⚑  Rally Point     *  Turret Beam     !  Melee Hit
```

---

## Controls & Hotkeys

### Camera & Speed
| Key | Action |
|---|---|
| WASD / Arrows | Pan camera |
| +/= | Zoom in |
| - | Zoom out |
| Space | Pause / Unpause |
| < (Shift+,) | Speed down (min 1x) |
| > (Shift+.) | Speed up (max 5x) |

### Modes
| Key | Action |
|---|---|
| B | Build mode |
| Z | Farm Zone mode |
| G | Gather/Designate mode |
| Escape | Close panel / exit mode |

### Panels
| Key | Action |
|---|---|
| P | Priority panel |
| C | Craft panel |
| R | Research panel |
| T | Taming panel |
| I | Inventory panel |
| , | Settings panel |
| [ / ] | Cycle colonist selection |

### Mode-Specific
- **Build mode**: Tab/Shift+Tab to cycle categories, 1-9/0 to select items.
- **Designate mode**: Tab to switch between Chop and Mine.
- **Zone mode**: 1-9 to select crop type.

### Mouse
- **Left-click** — Select colonist/animal/tile. Drag to box-select.
- **Right-click** — Move drafted colonists / set rally point.
- **Left-drag (build)** — Place structures in a line or area.
- **Right-drag (build)** — Deconstruct.
- **Middle-drag** — Pan camera.
- **Hover** — Tile tooltip with terrain and structure info.

---

## Interface

### Status Bar
The top bar shows colony resources and mana at a glance. Speed controls ([<] [||] [>]) and a Settings gear are always accessible on the right side.

### Inventory Panel (I)
Tabbed into four categories for easy navigation:
- **Resources** — Raw materials with quantities and food preservation info.
- **Equipment** — Weapons, armor, tools, and artifacts in storage.
- **Consumables** — Potions and spell tomes.
- **Animals** — Tamed creatures and their roles.

### Glossary
Accessible from Settings during gameplay or from the start screen. Features:
- **Tabbed sections** matching this guide's topics for quick navigation.
- **Search bar** that filters across all sections — type "mana" to see every building, spell, and system that involves mana.
