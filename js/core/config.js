// ============================================================================
// GAME CONFIGURATION
// To add content: add entries to the relevant object below. The game systems
// will pick them up automatically. See RESEARCH for tech tree prerequisites.
// ============================================================================

export const CONFIG = {
    MAP_WIDTH: 256,
    MAP_HEIGHT: 256,
    VIEWPORT_WIDTH: 80,
    VIEWPORT_HEIGHT: 40,
    TICK_RATE: 200,
    TICKS_PER_SEASON: 600,
    TICKS_PER_DAY: 100,
    START_RESOURCES: { wood: 25, stone: 15, planks: 5, food: 20, meat: 0, wheat: 0, berries: 0, corn: 0, potatoes: 0, bricks: 0, runite: 0, eggs: 0, milk: 0, wool: 0, void_essence: 0 },
    PEACEFUL_MODE: false,
    GAME_SPEED: 1,
};

const BASE_TILE_CHARS = {
    farm_empty: '=', farm_growing: '%', farm_ready: '*',
    snow: '*',
};

const BASE_TILE_COLORS = {
    farm_empty: '#664400', farm_growing: '#55aa22', farm_ready: '#ffdd00',
    colonist: '#ffff00', raider: '#ff3333', deer: '#bb8855', rabbit: '#ccaa88', wolf: '#666666',
    snow: '#ffffff', cursor: '#ffffff',
    designation_chop: '#ff8800', designation_mine: '#8888ff', designation_build: '#88ff88', designation_deconstruct: '#ff4444',
};

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_EFFECTS = {
    spring: { cropGrowthMult: 1.0, animalSpawnRate: 0.02, tempRange: [10, 20] },
    summer: { cropGrowthMult: 1.5, animalSpawnRate: 0.01, tempRange: [20, 35] },
    autumn: { cropGrowthMult: 0.8, animalSpawnRate: 0.03, tempRange: [5, 15] },
    winter: { cropGrowthMult: 0, animalSpawnRate: 0.005, tempRange: [-10, 5] },
};

// To add terrain: add entry here. Used by map generation, rendering, and pathfinding.
// passable: { colonist, animal, enemy }. moveCost applies to colonists only.
export const TERRAIN = {
    grass:  { char: '.', color: '#6aad44', bg: '#1a2a12', moveCost: 1, passable: { colonist: true, animal: true, enemy: true } },
    dirt:   { char: ',', color: '#bb8850', bg: '#2a1e14', moveCost: 1, passable: { colonist: true, animal: true, enemy: true } },
    sand:   { char: '∙', color: '#e0c878', bg: '#2a2618', moveCost: 1, passable: { colonist: true, animal: true, enemy: true } },
    gravel: { char: ':', color: '#a09888', bg: '#1e1c1a', moveCost: 1, passable: { colonist: true, animal: true, enemy: true } },
    rock:   { char: '#', color: '#999', bg: '#222', moveCost: 4, passable: { colonist: true, animal: false, enemy: false } },
    water:  { char: '~', color: '#55aaff', bg: '#0a1a2e', moveCost: 3, passable: { colonist: true, animal: false, enemy: false } },
};

// To add a harvestable resource: add entry here. Rendering, gathering, and yields handled automatically.
// designation: 'chop' or 'mine'. yield: { resource: amount }. work: ticks to gather.
export const RESOURCES = {
    tree:       { char: 'T', color: '#8B6B3A', autumnColor: '#cc8822', designation: 'chop', work: 12, yield: { wood: 1 }, perAmount: true },
    stone:      { char: 'o', color: '#999', designation: 'mine', work: 18, yield: { stone: 1 }, perAmount: true },
    runite_ore: { char: 'o', color: '#44cccc', designation: 'mine', work: 22, yield: { runite: 1 }, perAmount: true },
};

// To add a skill: add entry here. Colonists auto-get it, priority panel shows it, tasks use skillRequired.
// baseLevel: starting range [min, max]. biasBonus: added when this is the colonist's skill bias.
export const SKILLS = {
    building: { name: 'Building', baseLevel: [2, 5], biasBonus: 3, description: 'Construction, mining, chopping, and repairs' },
    farming:  { name: 'Farming', baseLevel: [2, 5], biasBonus: 3, description: 'Planting and harvesting crops' },
    crafting: { name: 'Crafting', baseLevel: [2, 5], biasBonus: 3, description: 'Crafting items at workbenches' },
    cooking:  { name: 'Cooking', baseLevel: [2, 5], biasBonus: 3, description: 'Cooking meals at cauldrons' },
    animals:  { name: 'Animals', baseLevel: [1, 4], biasBonus: 3, description: 'Taming and handling animals' },
};

// To add weather: add entry here. Seasons reference weather types by key.
// growthMult: crop growth multiplier. display: shown in UI.
export const WEATHER_TYPES = {
    clear:        { display: 'Clear', growthMult: 1.0 },
    rain:         { display: 'Rain', growthMult: 1.3, extinguishesFire: true },
    thunderstorm: { display: 'Storm', growthMult: 1.0, extinguishesFire: true, fireChance: true },
    snow:         { display: 'Snow', growthMult: 0.5 },
    blizzard:     { display: 'Blizzard', growthMult: 0 },
    heatwave:     { display: 'Heat Wave', growthMult: 0.7 },
};

// Season-specific weather tables. Each entry: [weatherType, probability, durationRange].
// Evaluated in order; first match wins. Remainder = clear.
export const SEASON_WEATHER = {
    spring: [
        ['thunderstorm', 0.10, [10, 24]],
        ['rain', 0.25, [25, 64]],
    ],
    summer: [
        ['thunderstorm', 0.05, [15, 34]],
        ['rain', 0.15, [20, 49]],
        ['heatwave', 0.25, [40, 99]],
    ],
    autumn: [
        ['thunderstorm', 0.10, [10, 24]],
        ['rain', 0.25, [25, 64]],
    ],
    winter: [
        ['blizzard', 0.10, [30, 69]],
        ['snow', 0.30, [40, 99]],
    ],
};

// To add a thought: add entry here. Used by game systems to apply mood effects.
// moodEffect: positive = good, negative = bad. duration: ticks (-1 = permanent).
export const THOUGHTS = {
    built_something:   { text: 'Built something', moodEffect: 3, duration: 100 },
    good_work:         { text: 'Good honest work', moodEffect: 2, duration: 80 },
    harvested:         { text: 'Harvested crops', moodEffect: 3, duration: 100 },
    crafted:           { text: 'Crafted something', moodEffect: 4, duration: 120 },
    cooked:            { text: 'Cooked a meal', moodEffect: 3, duration: 100 },
    tamed_animal:      { text: 'Tamed an animal', moodEffect: 6, duration: 150 },
    put_out_fire:      { text: 'Put out a fire', moodEffect: 5, duration: 150 },
    repaired:          { text: 'Repaired a structure', moodEffect: 3, duration: 100 },
    deconstructed:     { text: 'Tore something down', moodEffect: 2, duration: 80 },
    new_colonist:      { text: 'New colonist arrived', moodEffect: 5, duration: 200 },
    freezing:          { text: 'Freezing outside', moodEffect: -8, duration: 50 },
    fire_panic:        { text: 'Colony on fire!', moodEffect: -20, duration: 200 },
    crops_died:        { text: 'Crops died', moodEffect: -15, duration: 300 },
    cold_snap:         { text: 'Freezing cold snap', moodEffect: -12, duration: 300 },
    inspired:          { text: 'Feeling inspired!', moodEffect: 25, duration: 300 },
};

// To add a crop: add entry here, it auto-appears in zone mode. Set 'research' to gate behind tech.
export const CROPS = {
    wheat: { growthTicks: 200, harvestYield: 3, seasons: ['spring', 'summer', 'autumn'], char: '%', readyChar: '*', color: '#ccaa00' },
    berries: { growthTicks: 150, harvestYield: 2, seasons: ['spring', 'summer', 'autumn'], char: '%', readyChar: '*', color: '#cc44aa' },
    corn: { growthTicks: 250, harvestYield: 4, seasons: ['summer'], char: '%', readyChar: '*', color: '#ffcc00', research: 'druidcraft' },
    potatoes: { growthTicks: 180, harvestYield: 3, seasons: ['spring', 'autumn', 'winter'], char: '%', readyChar: '*', color: '#aa7744', research: 'druidcraft' },
};

// To add a building: add an entry here. The game will pick it up automatically.
// Fields: char, color, cost, work, and optionally: hp, research, power, description.
// structureType: 'wall' | 'floor' | 'door' | 'furniture'. Drives room detection and placement mode.
// passable: { colonist, animal, enemy } — who can walk through. Defaults to all-true for furniture/floor.
// breakable: true if enemies will attack it when pathfinding. bg: background color for floor tiles.
// Power sub-object: { generates } or { consumes, radius?, warmRadius?, damage?, range? }
export const BUILDINGS = {
    wood_wall:         { char: '█', color: '#aa7744', cost: { wood: 2 }, work: 12, hp: 50, structureType: 'wall', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement. Forms rooms when enclosing an area with doors.' },
    stone_wall:        { char: '█', color: '#666666', cost: { stone: 2 }, work: 16, hp: 70, structureType: 'wall', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement. Forms rooms when enclosing an area with doors.' },
    brick_wall:        { char: '█', color: '#b2463c', cost: { bricks: 2 }, work: 20, hp: 90, structureType: 'wall', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement. Forms rooms when enclosing an area with doors.' },
    wood_floor:        { char: '·', color: '#aa7744', bg: '#3d2a14', cost: { wood: 1 }, work: 6, structureType: 'floor', description: 'Cosmetic flooring. Makes rooms nicer.' },
    stone_floor:       { char: '·', color: '#666666', bg: '#2a2a2a', cost: { stone: 1 }, work: 6, structureType: 'floor', description: 'Cosmetic flooring. Makes rooms nicer.' },
    brick_floor:       { char: '·', color: '#b2463c', bg: '#3a1a18', cost: { bricks: 1 }, work: 6, structureType: 'floor', description: 'Cosmetic flooring. Makes rooms nicer.' },
    door:              { char: '+', color: '#cc9955', cost: { wood: 3 }, work: 15, hp: 30, structureType: 'door', passable: { colonist: true, animal: false, enemy: false }, breakable: true, description: 'Allows colonist passage. Blocks enemies. Room boundary.' },
    bed:               { char: 'B', color: '#8855aa', cost: { wood: 5 }, work: 25, structureType: 'furniture', description: 'Colonists sleep here. Assign for a mood bonus.' },
    workbench:         { char: 'C', color: '#bb8833', cost: { wood: 5, stone: 2 }, work: 30, structureType: 'furniture', description: 'Required for crafting recipes (planks, weapons, bricks).' },
    cauldron:          { char: 'F', color: '#ff6633', cost: { stone: 3, wood: 1 }, work: 18, structureType: 'furniture', description: 'Required for cooking meals from raw food and crops.' },
    storage_chest:     { char: 'S', color: '#997744', cost: { wood: 4 }, work: 20, structureType: 'furniture', description: 'Increases colony storage capacity.' },
    torch:             { char: 'i', color: '#ffcc00', cost: { wood: 1 }, work: 4, structureType: 'furniture', dragPlace: true, description: 'Light source. Provides warmth in winter.' },
    fence:             { char: '|', color: '#886644', cost: { wood: 1 }, work: 5, hp: 20, structureType: 'wall', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement like a wall but lighter to build.' },
    arcanum:           { char: 'R', color: '#44aaff', cost: { wood: 5, stone: 3, planks: 2 }, work: 40, structureType: 'furniture', description: 'Colonists study here to generate research points.' },
    beast_circle:      { char: 'A', color: '#77aa44', cost: { wood: 6 }, work: 28, structureType: 'furniture', research: 'beast_binding', description: 'Required for binding creatures. Bound animals produce resources.' },
    mana_crystal:      { char: 'W', color: '#aa44ff', cost: { wood: 8, stone: 4 }, work: 45, structureType: 'furniture', passable: { colonist: false, animal: false, enemy: false }, research: 'ley_channeling', power: { generates: 10 }, description: 'Generates 10 mana for powering magical buildings.' },
    glowstone:         { char: 'L', color: '#ffff88', cost: { planks: 2, stone: 1 }, work: 14, structureType: 'furniture', research: 'luminance', power: { consumes: 2, radius: 5 }, description: 'Mana-powered light, radius 5. Consumes 2 mana.' },
    enchanting_table:  { char: 'P', color: '#bb88ff', cost: { planks: 4, stone: 3 }, work: 35, structureType: 'furniture', research: 'arcane_infusion', power: { consumes: 4, speedMult: 2.0 }, description: '2x crafting speed. Consumes 4 mana.' },
    ember_ward:        { char: 'H', color: '#ff8844', cost: { stone: 4, planks: 2 }, work: 28, structureType: 'furniture', research: 'ember_magic', power: { consumes: 3, warmRadius: 4 }, description: 'Warms nearby tiles (radius 4) in winter. Consumes 3 mana.' },
    arcane_sentinel:   { char: 'X', color: '#ff4444', cost: { stone: 5, planks: 3 }, work: 50, structureType: 'furniture', passable: { colonist: false, animal: false, enemy: false }, research: 'warding', power: { consumes: 3, damage: 12, range: 4 }, description: 'Auto-attacks enemies in range 4, 12 dmg. Consumes 3 mana.' },
    void_nexus:        { char: 'V', color: '#9933ff', cost: { runite: 5, stone: 6, planks: 4 }, work: 60, structureType: 'furniture', passable: { colonist: false, animal: false, enemy: false }, research: 'void_summoning', description: 'Start wave defense here. Defend it from enemies to earn void essence.' },
    void_wall:         { char: '▓', color: '#6622aa', cost: { stone: 3, void_essence: 2 }, work: 15, hp: 120, structureType: 'wall', passable: { colonist: false, animal: false, enemy: false }, breakable: true, research: 'void_forging', description: 'Reinforced wall (120 HP). Blocks enemies.' },
    void_turret:       { char: 'Y', color: '#aa33ff', cost: { stone: 5, planks: 3, void_essence: 4 }, work: 55, structureType: 'furniture', passable: { colonist: false, animal: false, enemy: false }, research: 'void_forging', power: { consumes: 5, damage: 20, range: 5 }, description: 'Auto-attacks enemies in range 5, 20 dmg. Consumes 5 mana.' },
    void_door:         { char: '▒', color: '#7733bb', cost: { stone: 3, planks: 2, void_essence: 3 }, work: 20, hp: 80, structureType: 'door', passable: { colonist: true, animal: false, enemy: false }, breakable: true, research: 'void_forging', description: 'Reinforced door (80 HP). Colonists pass through, enemies must break it.' },
};

// Auto-derived from BUILDINGS (terrain chars/colors + building chars/colors merged)
export const TILE_CHARS = { ...BASE_TILE_CHARS, ...Object.fromEntries(Object.entries(BUILDINGS).map(([k, v]) => [k, v.char])) };
export const TILE_COLORS = { ...BASE_TILE_COLORS, ...Object.fromEntries(Object.entries(BUILDINGS).map(([k, v]) => [k, v.color])) };

// Auto-derived passability/behavior sets from BUILDINGS metadata.
// Structures impassable to colonists (passable.colonist === false)
export const IMPASSABLE_STRUCTURES = new Set(
    Object.entries(BUILDINGS).filter(([, b]) => b.passable && !b.passable.colonist).map(([k]) => k)
);
// Structures that block enemies (passable.enemy === false)
export const ENEMY_BLOCKED_STRUCTURES = new Set(
    Object.entries(BUILDINGS).filter(([, b]) => b.passable && !b.passable.enemy).map(([k]) => k)
);
// Structures that enemies will attack to break through
export const BREAKABLE_STRUCTURES = new Set(
    Object.entries(BUILDINGS).filter(([, b]) => b.breakable).map(([k]) => k)
);
// Walls and fences — used for room detection
export const WALL_STRUCTURES = new Set(
    Object.entries(BUILDINGS).filter(([, b]) => b.structureType === 'wall').map(([k]) => k)
);
// Doors — used for room detection boundaries
export const DOOR_STRUCTURES = new Set(
    Object.entries(BUILDINGS).filter(([, b]) => b.structureType === 'door').map(([k]) => k)
);
// Drag-placeable types (walls, floors, doors, plus anything with dragPlace: true)
export const DRAG_BUILD_TYPES = new Set(
    Object.entries(BUILDINGS).filter(([, b]) => b.structureType === 'wall' || b.structureType === 'floor' || b.structureType === 'door' || b.dragPlace).map(([k]) => k)
);
// Single-place types (furniture that isn't drag-placeable)
export const SINGLE_PLACE_TYPES = new Set(
    Object.entries(BUILDINGS).filter(([, b]) => b.structureType === 'furniture' && !b.dragPlace).map(([k]) => k)
);

// To add a recipe: add entry here. Set 'research' field to gate behind tech.
// Station must exist as a buildable structure. Equipment outputs auto-detected from WEAPONS/ARMORS.
export const RECIPE_CATEGORIES = ['Materials', 'Equipment', 'Food & Potions'];

export const RECIPES = {
    craft_planks: { input: { wood: 2 }, output: { planks: 3 }, skill: 'crafting', ticks: 10, station: 'workbench', category: 'Materials' },
    craft_bricks: { input: { stone: 2 }, output: { bricks: 3 }, skill: 'crafting', ticks: 12, station: 'workbench', category: 'Materials' },
    craft_wooden_club: { input: { wood: 3 }, output: { wooden_club: 1 }, skill: 'crafting', ticks: 15, station: 'workbench', category: 'Equipment' },
    craft_etched_axe: { input: { stone: 2, wood: 1 }, output: { etched_axe: 1 }, skill: 'crafting', ticks: 18, station: 'workbench', research: 'runecraft', category: 'Equipment' },
    craft_runic_blade: { input: { runite: 3 }, output: { runic_blade: 1 }, skill: 'crafting', ticks: 25, station: 'workbench', research: 'runeforging', category: 'Equipment' },
    craft_runic_pick: { input: { runite: 2, wood: 1 }, output: { runic_pick: 1 }, skill: 'crafting', ticks: 20, station: 'workbench', research: 'runeforging', category: 'Equipment' },
    craft_void_blade: { input: { void_essence: 5, runite: 2 }, output: { void_blade: 1 }, skill: 'crafting', ticks: 30, station: 'workbench', research: 'void_forging', category: 'Equipment' },
    craft_void_armor: { input: { void_essence: 4, planks: 2 }, output: { void_armor: 1 }, skill: 'crafting', ticks: 25, station: 'workbench', research: 'void_forging', category: 'Equipment' },
    cook_meal: { input: { foodstuffs: 5 }, output: { food: 4 }, skill: 'cooking', ticks: 8, station: 'cauldron', category: 'Food & Potions' },
};

// To add a trait: add entry here. Trait effects are checked in colonist.js updateNeeds/getWorkSpeed.
export const TRAITS = {
    hard_worker: { name: 'Hard Worker', workSpeedMult: 1.2, description: '+20% work speed' },
    lazy: { name: 'Lazy', workSpeedMult: 0.85, idleMoodBonus: 5, description: '-15% work speed, happy when idle' },
    night_owl: { name: 'Night Owl', nightSpeedMult: 1.2, daySpeedMult: 0.9, description: '+20% at night, -10% during day' },
    early_bird: { name: 'Early Bird', daySpeedMult: 1.2, nightSpeedMult: 0.9, description: '+20% during day, -10% at night' },
    green_thumb: { name: 'Green Thumb', farmingSpeedMult: 1.3, description: '+30% farming speed' },
    iron_stomach: { name: 'Iron Stomach', hungerDecayMult: 0.5, description: 'Gets hungry half as fast' },
    socialite: { name: 'Socialite', nearOthersMoodBonus: 8, aloneMoodPenalty: -5, description: 'Happy near others, sad alone' },
    loner: { name: 'Loner', aloneMoodBonus: 8, nearOthersMoodPenalty: -5, description: 'Happy alone, stressed near others' },
    optimist: { name: 'Optimist', positiveThoughtMult: 1.5, description: 'Positive thoughts 50% stronger' },
    pessimist: { name: 'Pessimist', negativeThoughtMult: 1.5, description: 'Negative thoughts 50% stronger' },
    tough: { name: 'Tough', damageTakenMult: 0.7, description: 'Takes 30% less damage' },
    pyromaniac: { name: 'Pyromaniac', fireChance: 0.001, description: 'Rare chance to start fires' },
    gourmand: { name: 'Gourmand', cookedFoodMoodBonus: 8, rawFoodMoodPenalty: -12, description: 'Loves cooked food, hates raw' },
};

export const ANIMALS = {
    deer: { char: 'd', color: '#bb8855', hp: 40, speed: 0.5, hostile: false, meatYield: 3, fleeRange: 5 },
    rabbit: { char: 'r', color: '#ccaa88', hp: 10, speed: 0.7, hostile: false, meatYield: 1, fleeRange: 4 },
    wolf: { char: 'w', color: '#555555', hp: 60, speed: 0.6, hostile: true, meatYield: 2, damage: 8, aggroRange: 6 },
    chicken: { char: 'c', color: '#ddaa44', hp: 15, speed: 0.4, hostile: false, meatYield: 1, fleeRange: 3, tameable: true, tamed: { produces: 'eggs', produceRate: 80, produceAmount: 1, foodToTame: 2 } },
    cow: { char: 'C', color: '#aa7744', hp: 80, speed: 0.3, hostile: false, meatYield: 4, fleeRange: 4, tameable: true, tamed: { produces: 'milk', produceRate: 100, produceAmount: 2, foodToTame: 4 } },
    sheep: { char: 's', color: '#cccccc', hp: 40, speed: 0.35, hostile: false, meatYield: 2, fleeRange: 4, tameable: true, tamed: { produces: 'wool', produceRate: 120, produceAmount: 1, foodToTame: 3 } },
};

// To add a weapon: add entry here + a recipe with output: { <key>: 1 }. Auto-detected on craft.
export const WEAPONS = {
    fists: { name: 'Fists', damage: 5 },
    wooden_club: { name: 'Wooden Club', damage: 10 },
    etched_axe: { name: 'Etched Axe', damage: 15 },
    runic_blade: { name: 'Runic Blade', damage: 22 },
    runic_pick: { name: 'Runic Pick', damage: 12 },
    void_blade: { name: 'Void Blade', damage: 30 },
};

// To add armor: add entry here + a recipe with output: { <key>: 1 }. Auto-detected on craft.
export const ARMORS = {
    void_armor: { name: 'Void Armor', damageReduction: 0.3 },
};

export const NEED_DECAY = {
    hunger: 0.25,
    rest: 0.1,
};

export const MOOD_THRESHOLDS = {
    inspired: 75,
    content: 40,
    stressed: 20,
    breaking: 0,
};

export const MOOD_SPEED_MULT = {
    inspired: 1.2,
    content: 1.0,
    stressed: 0.7,
    breaking: 0,
};

export const COLONIST_NAMES = [
    'Ada', 'Bob', 'Cal', 'Dee', 'Eve', 'Finn', 'Gail', 'Hank',
    'Iris', 'Jake', 'Kit', 'Lena', 'Max', 'Nora', 'Otto', 'Pia',
    'Davis', 'Morgan', 'Hugh', 'Matt', 'Sam', 'Paul', 'Jim', 'Mia',
    'Quinn', 'Rex', 'Sage', 'Tara', 'Uma', 'Vex', 'Wren', 'Xia',
];

// To add an event: add an entry here with an 'effect' type. Data-driven effects
// are handled automatically. Supported effects:
//   'deposit'       - places resources on the map (see meteorite, windfall, forest_growth)
//   'spawn_animals' - spawns animals at map edges (see migration)
//   'mood'          - gives a random colonist a thought (see inspiration)
//   'crop_damage'   - destroys growing crops (see blight, cold_snap)
//   'custom'        - requires a handler method in events.js (wanderer, caravan, fire)
export const EVENTS = {
    wanderer: { weight: 10, minTick: 300, cooldown: 800, effect: 'custom' },
    caravan: { weight: 6, minTick: 400, cooldown: 1000, effect: 'custom' },
    fire: { weight: 4, minTick: 200, cooldown: 400, seasons: ['summer'], effect: 'custom' },

    blight: {
        weight: 8, minTick: 200, cooldown: 600, seasons: ['summer', 'autumn'],
        effect: 'crop_damage',
        chance: 0.4,
        thought: 'Crops died', moodChange: -15, moodDuration: 300,
        notification: 'Crop blight! {count} plants destroyed.',
        logMessage: 'Crop blight destroyed {count} plants', logType: 'danger',
    },
    cold_snap: {
        weight: 7, minTick: 100, cooldown: 600, seasons: ['winter'],
        effect: 'crop_damage',
        chance: 1.0,
        thought: 'Freezing cold snap', moodChange: -12, moodDuration: 300,
        notification: 'Cold snap! All outdoor crops frozen.',
        logMessage: 'Cold snap froze all outdoor crops', logType: 'danger',
    },

    windfall: {
        weight: 5, minTick: 500, cooldown: 1200,
        effect: 'deposit',
        location: 'anywhere', radius: 1, terrain: ['grass'], fillChance: 0.6,
        deposits: [{ type: 'stone', amount: [3, 5] }],
        notification: 'Mineral vein discovered! {count} new stone deposits.',
        logMessage: 'Mineral windfall: {count} new stone deposits', logType: 'event',
    },
    meteorite: {
        weight: 5, minTick: 600, cooldown: 1500,
        effect: 'deposit',
        location: 'edge', radius: 2, terrain: ['grass', 'dirt'], fillChance: 0.5,
        deposits: [
            { type: 'runite_ore', weight: 3, amount: [2, 3] },
            { type: 'stone', weight: 7, amount: [4, 7] },
        ],
        notification: 'Meteorite impact! {count} deposits found.',
        logMessage: 'Meteorite: {count} deposits at map edge', logType: 'event',
    },
    forest_growth: {
        weight: 7, minTick: 400, cooldown: 1000,
        effect: 'deposit',
        location: 'edge', radius: 3, terrain: ['grass'], fillChance: 0.55,
        deposits: [{ type: 'tree', amount: [3, 5] }],
        notification: 'Forest growth! {count} new trees appeared.',
        logMessage: 'Forest growth: {count} new trees near map edge', logType: 'event',
    },

    migration: {
        weight: 8, minTick: 300, cooldown: 800, seasons: ['autumn', 'spring'],
        effect: 'spawn_animals',
        animals: [{ type: 'deer', count: [4, 7] }],
        notification: 'Animal migration! {count} deer passing through.',
        logMessage: 'Animal migration: {count} deer passing through', logType: 'event',
    },
    inspiration: {
        weight: 12, minTick: 100, cooldown: 300,
        effect: 'mood',
        thought: 'Feeling inspired!', moodChange: 25, moodDuration: 300,
        notification: '{name} is feeling inspired!',
        logMessage: '{name} is feeling inspired!', logType: 'success',
    },
};

// To add a trade: add an entry here. Caravan event auto-generates choices from this.
export const CARAVAN_TRADES = [
    { give: { wood: 5 }, receive: { food: 4 } },
    { give: { stone: 3 }, receive: { wood: 4 } },
    { give: { food: 4 }, receive: { planks: 3 } },
    { give: { food: 6 }, receive: { stone: 5 } },
    { give: { stone: 8 }, receive: { runite: 2 } },
];

export const RAID_CONFIG = {
    firstRaidTick: 1500,
    minInterval: 1200,
    maxInterval: 3000,
    baseRaiders: 2,
    wealthScaling: 0.005,
    raiderHp: 60,
    raiderDamage: 6,
    raiderSpeed: 0.4,
    fleeThreshold: 0.5,
    timeout: 150,
};

// To add research: add entry here with requires:[] for prerequisites.
// Buildings, recipes, and crops gate themselves via their own 'research' field — no need to list them here.
// The 'unlocks' object is auto-derived below from those fields.
export const RESEARCH = {
    runecraft: { name: 'Runecraft', cost: 50, requires: [], description: 'Etch runes into stone weapons' },
    druidcraft: { name: 'Druidcraft', cost: 80, requires: [], description: 'Unlock corn and potatoes' },
    beast_binding: { name: 'Beast Binding', cost: 100, requires: ['druidcraft'], description: 'Bind and pen creatures' },
    ley_channeling: { name: 'Ley Channeling', cost: 120, requires: ['runecraft'], description: 'Tap leylines for mana' },
    luminance: { name: 'Luminance', cost: 80, requires: ['ley_channeling'], description: 'Mana-powered light' },
    arcane_infusion: { name: 'Arcane Infusion', cost: 150, requires: ['ley_channeling'], description: 'Faster enchanted crafting' },
    runeforging: { name: 'Runeforging', cost: 130, requires: ['runecraft'], description: 'Forge runic weapons' },
    alchemy: { name: 'Alchemy', cost: 60, requires: [], description: 'Cooking produces +2 bonus food per meal' },
    warding: { name: 'Warding', cost: 100, requires: ['runecraft'], description: 'Conjure defensive wards' },
    ember_magic: { name: 'Ember Magic', cost: 90, requires: ['ley_channeling'], description: 'Warmth wards for winter' },
    brilliance: { name: 'Brilliance', cost: 160, requires: ['luminance'], description: 'Radiant beacon lights large areas' },
    mana_weaving: { name: 'Mana Weaving', cost: 180, requires: ['arcane_infusion'], description: 'Weave mana into protective garb' },
    pyroclasm: { name: 'Pyroclasm', cost: 200, requires: ['ember_magic', 'warding'], description: 'Fire ward incinerates nearby foes' },
    verdant_growth: { name: 'Verdant Growth', cost: 140, requires: ['beast_binding', 'alchemy'], description: 'Grow rare herbs for potent brews' },
    masterwork: { name: 'Masterwork', cost: 220, requires: ['runeforging', 'arcane_infusion'], description: 'Forge legendary enchanted weapons' },
    void_summoning: { name: 'Void Summoning', cost: 150, requires: ['ley_channeling', 'warding'], description: 'Open portals to summon waves of enemies' },
    void_forging: { name: 'Void Forging', cost: 180, requires: ['void_summoning', 'runeforging'], description: 'Forge void essence into powerful gear' },
};

// Auto-derive unlocks from the 'research' field on buildings, recipes, and crops.
for (const [key, tech] of Object.entries(RESEARCH)) {
    tech.unlocks = { buildings: [], recipes: [], crops: [] };
}
for (const [name, b] of Object.entries(BUILDINGS)) {
    if (b.research && RESEARCH[b.research]) RESEARCH[b.research].unlocks.buildings.push(name);
}
for (const [name, r] of Object.entries(RECIPES)) {
    if (r.research && RESEARCH[r.research]) RESEARCH[r.research].unlocks.recipes.push(name);
}
for (const [name, c] of Object.entries(CROPS)) {
    if (c.research && RESEARCH[c.research]) RESEARCH[c.research].unlocks.crops.push(name);
}

// Auto-derived from ANIMALS entries with tameable: true
export const TAMED_ANIMALS = Object.fromEntries(
    Object.entries(ANIMALS).filter(([, a]) => a.tameable).map(([k, a]) => [k, { char: a.char, color: a.color, hp: a.hp, ...a.tamed }])
);


// Raw food ingredients usable in cooking. Add new ones here rather than in resources.js.
export const FOODSTUFFS = ['wheat', 'berries', 'corn', 'potatoes', 'meat', 'eggs', 'milk'];

export const WAVE_CONFIG = {
    baseEnemies: 4,
    enemiesPerWave: 2,
    baseHp: 60,
    hpPerWave: 15,
    baseDamage: 6,
    damagePerWave: 2,
    spawnInterval: 15,
    essencePerKill: 1,
    nexusHp: 200,
    nexusHpPerWave: 0,
    colonistCapBase: 3,
    colonistCapScale: 2.5,
    colonistCapMax: 12,
};
