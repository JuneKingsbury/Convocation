# Convocation
A Rimworld-like Arcane Colony Management Sim

## About

Convocation is a browser-based ASCII colony management game inspired by Rimworld and Dwarf Fortress. Manage colonists, build defenses, research arcane technologies, and defend your settlement against waves of void creatures. Features include a full magic system with six schools, spell tomes, mana-based casting, beast taming with animal roles (pack animals, happiness auras), weather/seasons, mood/needs simulation, tower defense mechanics, food spoilage, and interdimensional exploration.

## Glossary
### Colonists
Priorities - Each colonist has skill priorities (1-5, 0=disabled). Lower number = higher priority. Colonists pick tasks based on their priority settings. Use "Copy Priorities From..." to quickly match another colonist's setup.

Needs - Hunger and Rest decay over time. When critical (<20), colonists interrupt work to eat or sleep.

Mood - Base 50 + sum of active thoughts. Affects work speed: Inspired (75+) = 1.2x, Content (40-74) = 1x, Stressed (20-39) = 0.7x, Breaking (<20) = refuses work.

Thoughts - Temporary mood modifiers from events (good meals, nice rooms, deaths, etc.). Each has a duration before it fades.

Traits - Permanent modifiers assigned at spawn: Hard Worker, Lazy, Night Owl, Early Bird, Green Thumb, Iron Stomach, Socialite, Loner, Optimist, Pessimist, Tough, Pyromaniac, Gourmand.

Drafting - Manually control colonists. Drafted colonists ignore AI and move where you right-click. Select multiple with click-drag. Use Draft All/Undraft All buttons for quick combat response. Drafted colonists pulse red on the map.

Rally Point - Right-click with drafted colonists to send them all to a location (with spread positioning). A red flag (⚑) marks the destination.

Fleeing - Colonists automatically flee combat when HP drops below 20. They disengage once the threat is 8+ tiles away.

Exploring - Colonists sent on expeditions via the Rift Gate disappear from the map and show "EXPLORING" in the HUD. They return automatically when the expedition concludes.

Skills - Building, Farming, Crafting, Cooking, Hauling, and six Magic schools (Evocation, Enchantment, Abjuration, Conjuration, Transmutation, Divination). Higher skill = faster work completion. Magic skills increase by studying tomes and casting spells.

Equipment Slots - Colonists have 4 equipment slots: Weapon, Armor, Tool, and Artifact. Use "Auto-equip Best" to quickly gear up a colonist with the best available items.

Active Effects - Temporary buffs from potions (speed, healing) and magic spells (heal, haste, defense). Shown in colonist info with remaining duration. Colonists with active spell buffs pulse cyan on the map.

Magic - Colonists learn spells by studying Spell Tomes at the Arcanum. Each tome teaches one spell from a specific school. Progress is per-colonist per-tome and persists across unequip/re-equip. Completing a tome consumes it and permanently grants the spell. Casting spells also grants XP in that school.

Mana (Colonist) - Each colonist has a personal mana pool (base 20 + bonuses from magic skill levels). Spells consume mana and go on cooldown. Mana regenerates over time.

Known Spells - Colonists auto-cast known spells when conditions are met (heal when ally is hurt, buff speed when working, etc.). Use the disable checkbox next to each spell to prevent auto-casting specific spells for mana conservation.

Magic Schools:
- Evocation - Ranged combat spells (Magic Missile, Fireball, Chain Lightning). Damage enemies at range.
- Enchantment - Buffs for everyday tasks (Haste, Animate Golem). Speed up colonist work.
- Abjuration - Defensive/healing spells (Heal, Shield, Mass Heal). Keep colonists alive.
- Conjuration - Summoning and teleportation (Summon Familiar, Warp, Blink).
- Transmutation - Reshape the environment (Circle of Growth, Raise Mountain, Level Field). Boost crops and terrain.
- Divination - Manipulate odds (Foresight, Fair Winds, Merchant's Omen, Ward of Calamity, Fortunate Discovery). Influence weather, events, and raid timing.

### Equipment

Weapons - Fists (5 dmg), Wooden Club (10), Etched Axe (15), Runic Blade (22), Runic Pick (12, +40% mining speed), Void Blade (30). Weapons can provide task-specific speed bonuses in addition to damage.

Armor - Void Armor (-30% damage taken). Craft at workbench with void essence.

Tools - Equippable items that boost work speed. Stone Pickaxe (+20% mining), Runic Pickaxe (+50% mining), Woodcutter's Axe (+30% chopping), Harvesting Sickle (+25% farming).

Artifacts - Magical items in a dedicated slot. Boots of Haste (+30% movement speed). More artifacts planned for future updates.

### Potions
Health Potion - Auto-consumed when colonist HP drops below 50%. Heals 50 HP. 200 tick cooldown between uses.

Speed Potion - Auto-consumed when a colonist has active tasks. +50% move speed, +30% work speed for 100 ticks. 400 tick cooldown.

Potions are brewed at the cauldron and stored in the colony stockpile. Colonists consume them automatically when trigger conditions are met.

### Building
Build Menu Categories - Buildings are organized into 5 tabs: Walls & Floors, Furniture, Production, Defense, Arcane. Press Tab/Shift+Tab to cycle categories.

Floor Replacement - You can build walls or furniture directly on top of floors without deconstructing first.

Wall (█) - Blocks movement (50-90 HP depending on material). Forms rooms when enclosing an area with doors. Auto-repairs when damaged.

Floor (·) - Cosmetic. Makes rooms nicer. Available in wood, stone, and brick.

Door (+) - Allows colonist passage (30 HP). Blocks enemies. Acts as a room boundary.

Fence (|) - Blocks movement (20 HP) like a wall but lighter to build.

Bed (B) - Colonists sleep here. Assign beds for mood bonus ("slept in bed").

Workbench (C) - Required for crafting recipes (planks, weapons, bricks).

Cauldron (F) - Required for cooking and brewing recipes (meals, potions).

Food Chest (S) - Preserves food. Each reduces spoilage by 15% (stacks up to 60%).

Torch (i) - Light source. Provides warmth in winter. Drag-placeable.

Arcanum (R) - Required for researching new magic. Colonists study here to unlock the tech tree.

Beast Circle (A) - Required for binding creatures. Needs research: Beast Binding.

Mana Crystal (W) - Generates 10 mana. Needs research: Ley Channeling.

Glowstone (L) - Mana-powered light, radius 5. Consumes 2 mana.

Enchanting Table (P) - 2x crafting speed. Consumes 4 mana.

Ember Ward (H) - Warms nearby tiles (radius 4) in winter. Consumes 3 mana.

Arcane Sentinel (X) - Auto-attacks hostile enemies in range 4, 12 dmg. Consumes 3 mana.

Ice Box (I) - Magical preservation. Reduces food spoilage by 40% (stacks with Food Chests, max 90% combined). Consumes 1 mana.

Rift Gate (Ω) - Opens portals to alternate dimensions for exploration. Consumes 6 mana. Requires Planar Rift research.

### Rooms
Enclosed Room - An area fully surrounded by walls/fences with doors. Detected automatically. Colonists get mood bonuses for sleeping in rooms. Room size max: 100 tiles.

### Farming
Farm Zone - Designate with Z mode. Select a crop type, drag an area on grass/dirt. Colonists auto-plant and harvest.

Wheat - Grows in spring/summer/autumn. 200 ticks. Yields 3. Cook into meals.

Berries - Spring/summer/autumn. 150 ticks. Yields 2. Quick to cook.

Corn - Summer only. 250 ticks. Yields 4. High output but seasonal.

Potatoes - Spring/autumn/winter. 180 ticks. Yields 3. Hardy, grows in cold.

Growth - Affected by season multiplier and weather. No outdoor growth in winter (except potatoes). Rain boosts growth.

### Crafting & Cooking
Planks - 2 wood -> 3 planks. Used in beds, advanced buildings.

Bricks - 2 stone -> 3 bricks.

Weapons - Wooden Club (3 wood), Etched Axe (2 stone + 1 wood, needs Runecraft), Runic Blade (3 runite, needs Runeforging), Runic Pick (2 runite + 1 wood, needs Runeforging), Void Blade (5 void essence + 2 runite, needs Void Forging). Equip from colonist info panel dropdown.

Tools - Stone Pickaxe (2 stone + 1 wood), Runic Pickaxe (2 runite + 1 stone, needs Runeforging), Woodcutter's Axe (3 wood + 1 stone), Harvesting Sickle (2 wood + 1 stone).

Artifacts - Boots of Haste (3 runite + 2 planks, needs Runeforging).

Spell Tomes - Craft at workbench to teach colonists spells. Each school has multiple tomes at different skill levels. Equip a tome and study at the Arcanum to learn the spell.

Potions - Health Potion (3 berries + 2 wheat), Speed Potion (2 corn + 2 potatoes + 1 berries).

Void Armor - 4 void essence + 2 planks (needs Void Forging). -30% damage taken.

Cooking - Converts raw crops/meat into food at the cauldron. Cooked meals give mood bonus. Raw food gives mood penalty (especially for Gourmand trait). Alchemy research adds +2 bonus food per meal.

Bulk Crafting - Use the x5 button to queue 5 of the same recipe at once (stops early if resources run out).

Auto-Cook - Set a food target in the Food & Potions craft tab. Automatically queues cooking when food drops below target. Uses the fastest-rotting food first (milk, berries before wheat).

### Resources
Wood - Chop trees (T on map). Used in most buildings.

Stone - Mine stone deposits (o on map). Used in structures and crafting.

Runite - Rare magical ore found in rock clusters. Used for runic weapons and artifacts.

Food - Consumed by colonists when hungry. Produced by cooking.

Meat - Dropped by hunted animals. Must be cooked.

Void Essence - Dropped by wave enemies at the Void Nexus. Used for void-tier weapons, armor, and buildings.

Global Stockpile - All resources are colony-wide. No physical hauling required.

Stockpile Alerts - Resources flash red in the status bar when they drop below a threshold (default: wood/stone/food ≤ 5). Configure in CONFIG.STOCKPILE_ALERTS.

### Food Spoilage
Food Decay - All foodstuffs rot over time. Base decay rate: 2% per 50 ticks. Each food type has a decay multiplier: milk (2.5x), berries (2.0x), meat (1.8x), wheat (0.5x), cooked food (0.3x).

Season Effects - Summer accelerates rot (1.5x). Winter slows it (0.5x).

Storage Buildings - Food Chests (S) reduce decay by 15% each (max 60% from chests). Arcane Ice Boxes (I) reduce decay by 40% each (max 90% combined reduction). Ice Boxes consume 1 mana.

Cooking Priority - When colonists cook, faster-rotting food is consumed first (milk/berries before wheat).

Reserved Foodstuffs - Toggle the lock icon next to food items in the Inventory panel to reserve them. Reserved food won't be used for cooking (preserving it for alchemy or other specific recipes). Starving colonists override reservations as a last resort.

### Terrain
Grass (.) - Standard terrain. Normal movement speed.

Dirt (,) - Standard terrain. Normal movement speed.

Rock (#) - Slow terrain (4x move cost). Colonists and enemies can traverse but it takes much longer. Cannot build on rock. Animals cannot cross rock.

Tall Rock (▲) - Impassable terrain. Nothing can cross. Generated as part of mountain ranges.

Water (~) - Slow terrain (3x move cost). Cannot build on water. Animals cannot cross water. Colonists and enemies traverse slowly.

### Map Generation
Generator Pipeline - Map generation uses a configurable pipeline of generator functions. Each generator can be enabled/disabled and tuned independently.

Dirt Patches - Random patches of dirt terrain scattered across the grass base.

Rock Formations - Clusters of rock terrain with stone and runite deposits.

Mountain Ranges - Linear spines of tall rock (impassable) surrounded by regular rock. Creates natural chokepoints and barriers.

Trees - Forests of varying density across the map.

River - A winding river cutting across the map.

Ruins - Pre-built structures (temples, watchtowers) placed during generation. Each block has a chance to decay (not be placed), creating an aged/ruined appearance. Ruins spawn at full HP.

### Seasons & Weather
Year - 4 seasons, each ~600 ticks (~2 min real-time at 1x speed).

Spring - Normal growth, animals appear. Temp: 10-20 degrees.

Summer - 1.5x crop growth, heat waves possible, fire risk. Temp: 20-35 degrees.

Autumn - 0.8x growth, animal migrations. Temp: 5-15 degrees.

Winter - No outdoor crop growth, snow, colonists need warmth (rooms/ember wards). Temp: -10 to 5 degrees.

Rain - Boosts crop growth 1.3x. Extinguishes fires.

Thunderstorm - Can start fires via lightning.

Blizzard - Stops all crop growth. Winter only.

### Wildlife & Beast Binding
Deer (d) - Passive. Flees colonists. Yields 3 meat when hunted.

Rabbit (r) - Passive. Fast. Yields 1 meat.

Wolf (w) - Hostile. Attacks colonists at night or in winter. Yields 2 meat.

Okapi (k) - Passive. Pack animal when tamed — include in expeditions for 25% faster completion.

Tapir (t) - Passive. Happiness aura when tamed — nearby colonists (4-tile radius) get a mood bonus.

Chicken (c) - Passive. Produces eggs when tamed.

Hunting - Select an animal, click Hunt. Creates a task for a colonist to kill it.

Beast Binding - Requires Beast Binding research + Beast Circle. Bound creatures can have different roles:
- Production animals (chickens) produce resources over time (eggs, milk).
- Pack animals (okapi) can join expeditions to reduce travel time.
- Aura animals (tapir) passively boost nearby colonists' mood.

### Combat
Combat - Melee, 1-tile range. Damage = base + weapon bonus. Colonists auto-defend when attacked or when wave enemies are present. Yellow ! appears when colonists strike, red ! when hit.

Ranged Magic - Colonists with Evocation spells (Magic Missile, Fireball, Chain Lightning) attack enemies at range automatically during combat.

Weapons - Fists (5 dmg), Wooden Club (10), Etched Axe (15), Runic Blade (22), Runic Pick (12), Void Blade (30). Craft and equip for better defense.

Armor - Void Armor (-30% damage taken). Craft at workbench with void essence. Equip from colonist info panel.

Raids - Raiders attack periodically (disabled in Peaceful Mode). They scale with colony wealth. Raiders march toward the colony center, breaking through structures if needed. They flee when reduced to 40% strength or after a timeout.

Peaceful Mode - Disables raids, wolves, and pyromaniac fires. Wave defense at the Void Nexus still functions.

Structure HP - Walls, doors, and fences have hit points. Enemies break through structures to reach their targets. Colonists auto-repair damaged structures when idle.

### Wave Defense (Void Nexus)
Void Nexus (V) - Build after researching Void Summoning. Click it to start a wave defense challenge. Enemies (E, purple) spawn from portals and pathfind to the nexus, breaking through structures if needed.

Waves - Each wave is harder than the last (more enemies, more HP/damage). Enemies use A* pathfinding and will break walls/doors if no open path exists. Purple path preview shows their planned route.

Nexus HP - The nexus has 200 HP. If destroyed, you lose the building and must rebuild. Wave progress (highest completed) is NOT reset.

Colony Cap - Your colony can support 3 + (waves completed) colonists, max 12. Complete waves to expand your population.

Void Essence - Rare material dropped by wave enemies. Used to craft Void Blade, Void Armor, Void Wall, Void Turret, and Void Door.

Void Wall (▓) - Reinforced wall (120 HP). Blocks movement. Requires Void Forging research.

Void Door (▒) - Reinforced door (80 HP). Colonists pass through, enemies must break it. Requires Void Forging research.

Void Turret (Y) - Upgraded sentinel. 20 damage, range 5. Consumes 5 mana. Requires Void Forging research.

Tower Defense Strategy - Build walls/doors to funnel enemies, place turrets along the path, station drafted colonists at chokepoints. Turret beams show as * traveling to targets. During waves, colonists prioritize combat over other tasks.

### Exploration (Alternate Dimensions)
Rift Gate (Ω) - Build after researching Planar Rift. Click it to open the expedition panel. Consumes 6 mana. Colonists physically walk to the gate before departing.

Expeditions - Select colonists (and optional pack animals) and a dimension, then launch. The party walks to the Rift Gate, enters the dimension, auto-explores, and returns with loot. Colonists are removed from the workforce and map while exploring.

Pack Animals - Tamed okapi can join expeditions as pack animals, reducing expedition duration by 25% each (stacks, min 50% of original duration).

No Permadeath - Defeated colonists return at 1 HP. If the entire party is defeated, they return empty-handed. Returned low-HP colonists need rest and food to recover.

Dimensions:
- Crystal Caves (difficulty 1) - 150-250 ticks. Yields stone, runite. Available by default with Rift Gate.
- Verdant Depths (difficulty 1) - 100-180 ticks. Yields wood, wheat, berries. Available by default.
- Shadow Realm (difficulty 2) - 250-400 ticks. Yields void_essence, runite. Requires Deep Delving research.

Auto-Combat - Encounters resolve automatically. Party damage is based on equipped weapons; armor reduces incoming damage. Surviving encounters earns loot.

Live Status - The Rift Gate info panel updates in real-time showing expedition progress, combat log, and party status.

### Task System
Task Types - Build, Mine, Chop, Deconstruct, Plant, Harvest, Craft, Cook. Each requires a specific skill.

Unreachable Tasks - When multiple colonists fail to path to a task (e.g., surrounded by impassable terrain), the task is automatically cancelled after 3 failures.

Task Display - The colonist info panel shows their current task with a clickable link to jump the camera to that location.

### Events
Wanderer - A new colonist wants to join. More likely when colony is happy. Accept or reject.

Trade Caravan - Exchange resources at set rates (wood->food, stone->wood, food->planks).

Crop Blight - Destroys ~40% of growing crops. Summer/autumn.

Mineral Windfall - New stone deposits appear on the map.

Fire - Spreads to adjacent flammable tiles. Colonists auto-extinguish. Rain puts fires out.

Cold Snap - All outdoor crops die. Winter only.

Animal Migration - Group of deer passes through (hunting opportunity).

Inspiration - Random colonist gets +25 mood boost.

### Research (Arcanum required)
Arcanum required. Colonists study at the Arcanum to generate study points. Spend points to unlock research when you can afford it.

Runecraft -> Etched Axe, unlocks Runeforging & Warding

Druidcraft -> Corn, Potatoes, unlocks Beast Binding

Ley Channeling -> Mana Crystal, unlocks Luminance/Ember Magic/Arcane Infusion

Alchemy -> +2 bonus food per cooked meal

Runeforging -> Runic Blade, Runic Pick, Runic Pickaxe, Boots of Haste

Warding -> Arcane Sentinel

Ember Magic -> Ember Ward

Luminance -> Glowstone

Arcane Infusion -> Enchanting Table

Void Summoning (requires Ley Channeling + Warding) -> Void Nexus

Void Forging (requires Void Summoning + Runeforging) -> Void Blade, Void Armor, Void Wall, Void Turret, Void Door

Planar Rift (requires Void Summoning + Ley Channeling) -> Rift Gate

Deep Delving (requires Planar Rift) -> Shadow Realm dimension

### Mana (Leylines)
Net Mana - Generation (mana crystals) minus consumption (glowstones, enchanting tables, ember wards, arcane sentinels, void turrets, rift gates, ice boxes). If negative, all mana-powered buildings stop working.

### Visual Overlays
Progress Bars - Colonists display small progress bars at the bottom of their tile while working (crafting, building, mining, etc.).

Beam Effects - Turrets render actual line beams to targets on a transparent overlay canvas, without replacing the underlying tile characters.

### Controls & Hotkeys

#### Camera
W / Arrow Up - Pan camera up.

S / Arrow Down - Pan camera down.

A / Arrow Left - Pan camera left.

D / Arrow Right - Pan camera right.

+/= - Zoom in.

\- - Zoom out.

/ - Reset minimap size.

#### Game Speed
Space - Pause/Unpause.

\> (Shift+.) - Speed up (max 5x).

< (Shift+,) - Speed down (min 1x).

#### Modes
B - Toggle Build mode.

Z - Toggle Farm Zone mode.

G - Toggle Gather/Designate mode.

Escape - Close open panel, or exit current mode back to normal.

#### Mode-Specific
Tab (Build mode) - Cycle to next build category.

Shift+Tab (Build mode) - Cycle to previous build category.

1-9, 0 (Build mode) - Select item by position within current category.

Tab (Designate mode) - Switch between Chop and Mine.

1-9 (Zone mode) - Select crop type.

#### Panels
P - Toggle Priority panel.

C - Toggle Craft panel.

R - Toggle Research panel.

T - Toggle Taming panel.

I - Toggle Inventory panel.

, (comma) - Toggle Settings panel.

#### Colonist Selection
[ - Select previous colonist (centers camera).

] - Select next colonist (centers camera).

#### Mouse
Left-click (normal mode) - Select colonist, animal, or tile. Drag to box-select multiple colonists.

Right-click (normal mode) - Move drafted colonists to location / rally point (spreads formation if multiple).

Left-click/drag (build mode) - Place structures in a line or area.

Right-click/drag (build mode) - Deconstruct structures in an area.

Left-click/drag (zone mode) - Designate farm zone.

Right-click (zone mode) - Remove farm zone at tile.

Left-click/drag (designate mode) - Mark trees for chopping or rocks for mining.

Mouse hover - Shows tile tooltip with terrain, structure, resource, and designation info.

Middle-click drag - Pan camera.

### Map Symbols
. Grass

, Dirt

\# Rock (slow to cross)

▲ Tall Rock (impassable)

~ Water (slow to cross)

T Tree

o Stone/Runite deposit

@ Colonist (pulses red when drafted)

R Raider

E Void Enemy (wave)

V Void Nexus

▓ Void Wall

▒ Void Door

Y Void Turret

Ω Rift Gate (exploration portal)

S Food Chest

I Ice Box

⚑ Rally point (drafted colonist destination)

\* Turret beam / combat effect

! Melee hit
