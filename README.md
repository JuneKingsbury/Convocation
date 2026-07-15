# Convocation
A Rimworld-like Arcane Colony Management Sim

## About


## Glossary
### Colonists
Priorities - Each colonist has skill priorities (1-5, 0=disabled). Lower number = higher priority. Colonists pick tasks based on their priority settings.

Needs - Hunger and Rest decay over time. When critical (&lt;20), colonists interrupt work to eat or sleep.

Mood - Base 50 + sum of active thoughts. Affects work speed: Inspired (75+) = 1.2x, Content (40-74) = 1x, Stressed (20-39) = 0.7x, Breaking (&lt;20) = refuses work.

Thoughts - Temporary mood modifiers from events (good meals, nice rooms, deaths, etc.). Each has a duration before it fades.

Traits - Permanent modifiers assigned at spawn: Hard Worker, Lazy, Night Owl, Early Bird, Green Thumb, Iron Stomach, Socialite, Loner, Optimist, Pessimist, Tough, Pyromaniac, Gourmand.

Drafting - Manually control colonists. Drafted colonists ignore AI and move where you right-click. Select multiple with click-drag, then Draft All.

Skills - Building, Farming, Crafting, Cooking, Hauling. Higher skill = faster work completion for that task type.

### Building
Wall (█) - Blocks movement. Forms rooms when enclosing an area with doors.

Floor< (·) - Cosmetic. Makes rooms nicer.

Door (+) - Allows passage through walls. Acts as a room boundary.

Bed (B) - Colonists sleep here. Assign beds for mood bonus ("slept in bed").

Workbench (C) - Required for crafting recipes (planks, weapons, bricks).

Cauldron (F) - Required for brewing recipes (meals from raw food/crops).

Storage Chest (S) - Increases colony storage sense.

Torch (i) - Light source. Provides warmth in winter.

Fence (|) - Blocks movement like a wall but lighter to build.

Arcanum (R) - Required for researching new magic. Colonists study here to unlock the tech tree.

Beast Circle (A) - Required for binding creatures. Needs research: Beast Binding.

Mana Crystal (W) - Generates 10 mana. Needs research: Ley Channeling.

Glowstone (L) - Mana-powered light, radius 5. Consumes 2 mana.

Enchanting Table (P) - 2x crafting speed. Consumes 4 mana.

Ember Ward (H) - Warms nearby tiles (radius 4) in winter. Consumes 3 mana.

Arcane Sentinel (X) - Auto-attacks hostile enemies in range 4. Consumes 3 mana.

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
Planks - 2 wood → 3 planks. Used in beds, advanced buildings.

Bricks - 2 stone → 3 bricks.

Weapons - Wooden Club (3 wood), Etched Axe (2 stone + 1 wood, needs Runecraft), Runic Blade (3 runite, needs Runeforging), Void Blade (5 void essence + 2 runite, needs Void Forging). Equip to colonists from their info panel.

Void Armor - 4 void essence + 2 planks (needs Void Forging). -30% damage taken. Equip from colonist info panel.

Cooking - Converts raw crops/meat into food at the cauldron. Cooked meals give mood bonus. Raw food gives mood penalty (especially for Gourmand trait).

### Resources
Wood - Chop trees (T on map). Used in most buildings.

Stone - Mine stone deposits (o on map). Used in structures and crafting.

Runite - Rare magical ore found in rock clusters. Used for runic weapons.

Food - Consumed by colonists when hungry. Produced by cooking.

Meat - Dropped by hunted animals. Must be cooked.

Void Essence - Dropped by wave enemies at the Void Nexus. Used for void-tier weapons, armor, and buildings.

Global Stockpile - All resources are colony-wide. No physical hauling required.

### Seasons &amp; Weather
Year - 4 seasons, each ~600 ticks (~2 min real-time at 1x speed).

Spring - Normal growth, animals appear. Temp: 10-20°.

Summer - 1.5x crop growth, heat waves possible, fire risk. Temp: 20-35°.

Autumn - 0.8x growth, animal migrations. Temp: 5-15°.

Winter - No outdoor crop growth, snow, colonists need warmth (rooms/ember wards). Temp: -10 to 5°.

Rain - Boosts crop growth 1.3x. Extinguishes fires.

Thunderstorm - Can start fires via lightning.

Blizzard - Stops all crop growth. Winter only.

### Wildlife &amp; Beast Binding
Deer (d) - Passive. Flees colonists. Yields 3 meat when hunted.

Rabbit (r) - Passive. Fast. Yields 1 meat.

Wolf (w) - Passive. Yields 2 meat.

Hunting - Select an animal, click Hunt. Creates a task for a colonist to kill it.

Beast Binding - Requires Beast Binding research + Beast Circle. Bound creatures produce resources (eggs, milk, wool).

### Combat
Combat - Melee, 1-tile range. Damage = base + weapon bonus. Colonists auto-defend when attacked. Yellow ! appears when colonists strike, red ! when hit.

Weapons - Fists (5 dmg), Wooden Club (10), Etched Axe (15), Runic Blade (22), Void Blade (30). Craft and equip for better defense.

Armor - Void Armor (-30% damage taken). Craft at workbench with void essence. Equip from colonist info panel.

Peaceful Mode - Disables pyromaniac fires. All hostile combat comes from the Void Nexus wave defense system.

### Wave Defense (Void Nexus)
Void Nexus (V) - Build after researching Void Summoning. Click it to start a wave defense challenge. Enemies (E, purple) spawn from all directions and attack the nexus.

Waves - Each wave is harder than the last (more enemies, more HP/damage). Enemies drop void essence on death. Bonus essence awarded for completing a wave.

Nexus HP - The nexus has 200 HP. If destroyed, you lose the building and must rebuild. Wave progress (highest completed) is NOT reset.

Colony Cap - Your colony can support 3 + (waves completed) colonists, max 12. Complete waves to expand your population.

Void Essence - Rare material dropped by wave enemies. Used to craft Void Blade, Void Armor, Void Wall, and Void Turret.

Void Wall (▓) - Reinforced wall. Blocks movement. Requires Void Forging research.

Void Turret (Y) - Upgraded sentinel. 20 damage, range 5. Consumes 5 mana. Requires Void Forging research.

Tower Defense Strategy - Build walls to funnel enemies, place turrets along the path, station drafted colonists at chokepoints. Turret beams show as * traveling to targets.

### Events
Wanderer - A new colonist wants to join. More likely when colony is happy. Accept or reject.

Trade Caravan - Exchange resources at set rates (wood→food, stone→wood, food→planks).

Crop Blight - Destroys ~40% of growing crops. Summer/autumn.

Mineral Windfall - New stone deposits appear on the map.

Fire - Spreads to adjacent flammable tiles. Colonists auto-extinguish. Rain puts fires out.

Cold Snap - All outdoor crops die. Winter only.

Animal Migration - Group of deer passes through (hunting opportunity).

Inspiration - Random colonist gets +25 mood boost.

### Research (Arcanum required)
Arcanum required. Colonists study at the Arcanum to generate study points. Spend points to unlock research when you can afford it.

Runecraft → Etched Axe, unlocks Runeforging &amp; Warding

Druidcraft → Corn, Potatoes, unlocks Beast Binding

Ley Channeling → Mana Crystal, unlocks Luminance/Ember Magic/Arcane Infusion

Alchemy → Feast recipe

Runeforging → Runic Blade, Runic Pick

Warding → Arcane Sentinel

Void Summoning (requires Ley Channeling + Warding) → Void Nexus

Void Forging (requires Void Summoning + Runeforging) → Void Blade, Void Armor, Void Wall, Void Turret

### Mana (Leylines)
Net Mana - Generation (mana crystals) minus consumption (glowstones, enchanting tables, ember wards, arcane sentinels, void turrets). If negative, all mana-powered buildings stop working.

### Map Symbols
. Grass

, Dirt

\# Rock

~ Water (slow to cross)

T Tree

o Stone/Runite deposit

@ Colonist

E Void Enemy (wave)

V Void Nexus

▓ Void Wall

Y Void Turret

\* Turret beam / combat effect

! Melee hit
