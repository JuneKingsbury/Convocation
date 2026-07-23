// ============================================================================
// GAME CONFIGURATION
// To add content: add entries to the relevant object below. The game systems
// will pick them up automatically. See RESEARCH for tech tree prerequisites.
// ============================================================================

// ----------------------------------------------------------------------------
// Global game config
// ----------------------------------------------------------------------------

// Initial game attributes like map size, tick rate, and starting items.
export const CONFIG = {
    MAP_WIDTH: 256,             // world size in tiles
    MAP_HEIGHT: 256,
    VIEWPORT_WIDTH: 80,         // visible tiles (columns) on screen
    VIEWPORT_HEIGHT: 40,        // visible tiles (rows) on screen
    TICK_RATE: 200,             // ms between game ticks (lower = faster simulation)
    TICKS_PER_SEASON: 1500,     // ticks per season (5 days at 300 ticks/day)
    TICKS_PER_DAY: 300,         // ticks per in-game day (60 seconds real-time at 1x)
    START_RESOURCES: { wood: 25, stone: 15, planks: 5, food: 20, meat: 0, wheat: 0, berries: 0, corn: 0, potatoes: 0, bricks: 0, runite: 0, eggs: 0, milk: 0, wool: 0, void_essence: 0 },
    PEACEFUL_MODE: false,       // disables raids and hostile animals
    GAME_SPEED: 1,              // default simulation speed multiplier
    STOCKPILE_ALERTS: { wood: 5, stone: 5, food: 5 },
};

// Characters and colors for non-building tiles (farms, snow, entities, designations).
// These get merged with BUILDINGS chars/colors to form TILE_CHARS and TILE_COLORS.
const BASE_TILE_CHARS = {
    farm_empty: '=', farm_growing: '%', farm_ready: '*',
    snow: '*',
};

const BASE_TILE_COLORS = {
    farm_empty: '#664400', farm_growing: '#55aa22', farm_ready: '#ffdd00',
    colonist: '#ffff00', raider: '#ff3333', deer: '#bb8855', rabbit: '#ccaa88', wolf: '#666666',
    snow: '#ffffff', snowBg: '#888888', cursor: '#ffffff',
    designation_chop: '#ff8800', designation_mine: '#8888ff', designation_build: '#88ff88', designation_deconstruct: '#ff4444',
};

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

// Pathfinding tuning. Used by pathfinding.js and combat.js.
export const PATHFINDING_CONFIG = {
    maxNodes: 1500,              // A* node limit for colonist pathfinding
    raiderRepathInterval: 15,    // ticks before raiders recalculate their path
    raiderSearchRadius: 100,     // how far raiders scan for colonists
    breakableCostPenalty: 10,    // extra path cost for breakable structures (makes raiders prefer open routes)
};

// ----------------------------------------------------------------------------
// Colonist config
// ----------------------------------------------------------------------------

// To add a skill: add entry here. Colonists auto-get it, priority panel shows it, tasks use skillRequired.
// baseLevel: starting range [min, max]. biasBonus: added when this is the colonist's skill bias.
export const SKILLS = {
    building: { name: 'Building', baseLevel: [2, 5], biasBonus: 3, description: 'Construction, mining, chopping, and repairs' },
    farming:  { name: 'Farming', baseLevel: [2, 5], biasBonus: 3, description: 'Planting and harvesting crops' },
    crafting: { name: 'Crafting', baseLevel: [2, 5], biasBonus: 3, description: 'Crafting items at workbenches' },
    cooking:  { name: 'Cooking', baseLevel: [2, 5], biasBonus: 3, description: 'Cooking meals at cauldrons' },
    animals:  { name: 'Animals', baseLevel: [1, 4], biasBonus: 3, description: 'Taming and handling animals' },
    research: { name: 'Research', baseLevel: [1, 3], biasBonus: 3, description: 'Studying and discovering new knowledge' },
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
    food_spoiled:      { text: 'Food is rotting', moodEffect: -5, duration: 150 },
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

// Colonist behavior tuning. Used by colonist.js for needs, mood, combat, and movement.
// Mood effects: positive = good thought, negative = bad thought. Duration in ticks.
// Thresholds: when a need drops below threshold, penalties apply.
export const COLONIST_CONFIG = {
    initialHunger: [80, 100],       // random range for new colonist hunger
    initialRest: [80, 100],         // random range for new colonist rest
    initialMood: 60,                // starting mood for new colonists
    maxHp: 100,                     // colonist hit points
    baseMood: 50,                   // neutral mood baseline before thoughts
    hungerMoodThreshold: 20,        // below this hunger level, mood penalty applies
    hungerMoodPenalty: -15,         // mood penalty when hungry
    restMoodThreshold: 20,          // below this rest level, mood penalty applies
    restMoodPenalty: -10,           // mood penalty when exhausted
    bedMoodBonus: 5,                // mood bonus for having an assigned bed
    sleepDuration: 30,              // ticks spent sleeping (without bed path)
    sleepAfterMoveDuration: 25,     // ticks sleeping after walking to bed
    restPerTick: 3,                 // rest recovered per sleep tick
    breakingWanderDuration: [30, 50], // ticks of aimless wandering when mood breaks
    wanderCooldown: [5, 15],        // tick range between idle wander attempts
    wanderChance: 0.3,              // probability of moving during wander state
    fightEngageDistance: 8,         // max distance to start fighting a hostile
    fleeHpThreshold: 20,           // flee when HP drops below this
    fleeDisengageDistance: 8,       // stop fleeing when threat is this far away
    hostileSearchRadius: 30,        // how far colonists scan for enemies
    socialRange: 3,                 // tile distance for socialite/loner trait checks
    skillWorkBonus: 0.15,           // work speed bonus per skill level (1 + skill * this)
    deconstructRecovery: 0.5,       // fraction of building cost returned on deconstruct
    combatDamageVariance: 3,        // random bonus damage range (0 to this-1)
    victoryMoodBonus: 5,            // mood bonus after killing an enemy
    victoryMoodDuration: 200,       // ticks the victory thought lasts
    cookedFoodRestore: 100,         // hunger restored by cooked food (full)
    rawFoodRestore: 35,             // hunger restored by raw foodstuff
    mealMoodBonus: 5,               // mood bonus from eating cooked food
    mealMoodDuration: 150,          // ticks the meal thought lasts
    rawFoodMoodPenalty: -4,         // mood penalty for eating raw food
    rawFoodMoodDuration: 100,       // ticks the raw food thought lasts
    starvingMoodPenalty: -20,       // mood penalty when no food available at all
    starvingMoodDuration: 100,
    sleptInRoomMoodBonus: 10,       // mood bonus for sleeping in bed inside a room
    sleptInRoomMoodDuration: 300,
    sleptInBedMoodBonus: 5,         // mood bonus for sleeping in bed (no room)
    sleptInBedMoodDuration: 200,
    sleptOnGroundMoodPenalty: -15,   // mood penalty for sleeping on the ground
    sleptOnGroundMoodDuration: 400,
    deathMoodPenalty: -40,           // mood penalty other colonists get when someone dies
    deathMoodDuration: 2000,         // how long grief lasts (ticks)
    nameColors: ['#ffff00', '#00ffff', '#00ff00'], // cycling colors for colonist names
};

// How fast needs drain per tick. Applied every tick in colonist.js updateNeeds().
export const NEED_DECAY = {
    hunger: 0.25,               // hunger lost per tick (0-100 scale, ~400 ticks to starve)
    rest: 0.1,                  // rest lost per tick (0-100 scale, ~1000 ticks to exhaust)
};

// Mood level boundaries. Determines colonist behavior (breaking = mental break) and work speed.
export const MOOD_THRESHOLDS = {
    inspired: 75,               // above this: inspired (bonus speed)
    content: 40,                // above this: content (normal speed)
    stressed: 20,               // above this: stressed (reduced speed)
    breaking: 0,                // at or below: mental break (stops working, wanders)
};

// Work speed multipliers applied based on mood level. Used in colonist.js getWorkSpeed().
export const MOOD_SPEED_MULT = {
    inspired: 1.2,
    content: 1.0,
    stressed: 0.7,
    breaking: 0,                // can't work during mental break
};

export const COLONIST_NAMES = [
    'Ada', 'Bob', 'Cal', 'Dee', 'Eve', 'Finn', 'Gail', 'Hank',
    'Iris', 'Jake', 'Kit', 'Lena', 'Max', 'Nora', 'Otto', 'Pia',
    'Davis', 'Morgan', 'Hugh', 'Matt', 'Sam', 'Paul', 'Jim', 'Mia',
    'Quinn', 'Rex', 'Sage', 'Tara', 'Uma', 'Vex', 'Wren', 'Xia',
    'Perry', 'Harper', 'Jules', 'Kris', 'Liam', 'Noah', 'Owen',
];

// Task work amounts and miscellaneous work tuning. Used by farming, building, research, crafting, taming.
export const WORK_CONFIG = {
    plantWork: 5,                // ticks to plant a crop
    harvestWork: 8,              // ticks to harvest a crop
    researchWork: 20,            // ticks per research task cycle at research desk
    deconstructWork: 10,         // ticks to deconstruct a building
    tameWork: 20,                // ticks to tame an animal
    poweredWorkbenchDivisor: 2,  // enchanting table divides craft time by this
    alchemyFoodBonus: 2,         // extra food per cook_meal when alchemy researched
    wealthPerWeapon: 10,         // wealth value added per weapon in stockpile (affects raid scaling)
    penWanderRadius: 3,          // max tiles a tamed animal wanders from its pen
    tamedMoveChance: 0.1,        // probability per tick a tamed animal moves
};

// Task reachability. When all colonists fail to path to a task this many times, auto-cancel it.
export const TASK_CONFIG = {
    unreachableFailThreshold: 3, // unique colonist failures before a task is deemed unreachable
    unreachableCheckInterval: 60, // ticks between reachability re-checks (avoids spam)
};

// ----------------------------------------------------------------------------
// Building & Crafting config
// ----------------------------------------------------------------------------

// To add a building: add an entry here. The game will pick it up automatically.
// Fields: char, color, cost, work, and optionally: hp, research, power, description.
// structureType: 'wall' | 'floor' | 'door' | 'furniture'. Drives room detection and placement mode.
// passable: { colonist, animal, enemy } — who can walk through. Defaults to all-true for furniture/floor.
// breakable: true if enemies will attack it when pathfinding. bg: background color for floor tiles.
// Power sub-object: { generates } or { consumes, radius?, warmRadius?, damage?, range? }
export const BUILD_CATEGORIES = ['Walls & Floors', 'Furniture', 'Production', 'Defense', 'Arcane'];

export const BUILDINGS = {
    wood_wall:         { char: '█', color: '#aa7744', cost: { wood: 2 }, work: 12, hp: 50, structureType: 'wall', category: 'Walls & Floors', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement. Forms rooms when enclosing an area with doors.' },
    stone_wall:        { char: '█', color: '#666666', cost: { stone: 2 }, work: 16, hp: 70, structureType: 'wall', category: 'Walls & Floors', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement. Forms rooms when enclosing an area with doors.' },
    brick_wall:        { char: '█', color: '#b2463c', cost: { bricks: 2 }, work: 20, hp: 90, structureType: 'wall', category: 'Walls & Floors', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement. Forms rooms when enclosing an area with doors.' },
    fence:             { char: '|', color: '#886644', cost: { wood: 1 }, work: 5, hp: 20, structureType: 'wall', category: 'Walls & Floors', passable: { colonist: false, animal: false, enemy: false }, breakable: true, description: 'Blocks movement like a wall but lighter to build.' },
    door:              { char: '+', color: '#cc9955', cost: { wood: 3 }, work: 15, hp: 30, structureType: 'door', category: 'Walls & Floors', passable: { colonist: true, animal: false, enemy: false }, breakable: true, description: 'Allows colonist passage. Blocks enemies. Room boundary.' },
    wood_floor:        { char: '·', color: '#aa7744', bg: '#3d2a14', cost: { wood: 1 }, work: 6, structureType: 'floor', category: 'Walls & Floors', description: 'Cosmetic flooring. Makes rooms nicer.' },
    stone_floor:       { char: '·', color: '#666666', bg: '#2a2a2a', cost: { stone: 1 }, work: 6, structureType: 'floor', category: 'Walls & Floors', description: 'Cosmetic flooring. Makes rooms nicer.' },
    brick_floor:       { char: '·', color: '#b2463c', bg: '#3a1a18', cost: { bricks: 1 }, work: 6, structureType: 'floor', category: 'Walls & Floors', description: 'Cosmetic flooring. Makes rooms nicer.' },
    torch:             { char: 'i', color: '#ffcc00', cost: { wood: 1 }, work: 4, structureType: 'furniture', category: 'Furniture', dragPlace: true, lightRadius: 5, description: 'Light source. Provides warmth in winter.' },
    bed:               { char: 'B', color: '#8855aa', cost: { wood: 5 }, work: 25, structureType: 'furniture', category: 'Furniture', description: 'Colonists sleep here. Assign for a mood bonus.' },
    food_chest:        { char: 'S', color: '#997744', cost: { planks: 4, stone: 2 }, work: 25, structureType: 'furniture', category: 'Furniture', description: 'Preserves food — reduces spoilage by 15% per chest (stacks up to 60%).' },
    workbench:         { char: 'C', color: '#bb8833', cost: { wood: 5, stone: 2 }, work: 30, structureType: 'furniture', category: 'Production', description: 'Required for crafting recipes (planks, weapons, bricks).' },
    cauldron:          { char: 'F', color: '#ff6633', cost: { stone: 3, wood: 1 }, work: 18, structureType: 'furniture', category: 'Production', description: 'Required for cooking meals from raw food and crops.' },
    research_desk:     { char: 'R', color: '#44aaff', cost: { wood: 5, stone: 3, planks: 2 }, work: 40, structureType: 'furniture', category: 'Production', description: 'Colonists study here to generate research points.' },
    beast_circle:      { char: 'A', color: '#9cf642', cost: { wood: 6 }, work: 28, structureType: 'furniture', category: 'Production', research: 'beast_binding', description: 'Required for binding creatures. Bound animals produce resources.' },
    void_nexus:        { char: 'V', color: '#9933ff', cost: { runite: 5, stone: 6, planks: 4 }, work: 60, structureType: 'furniture', category: 'Defense', passable: { colonist: false, animal: false, enemy: false }, research: 'void_summoning', description: 'Start wave defense here. Defend it from enemies to earn void essence.' },
    arcane_sentinel:   { char: 'X', color: '#ff4444', cost: { stone: 5, planks: 3 }, work: 50, structureType: 'furniture', category: 'Defense', passable: { colonist: false, animal: false, enemy: false }, research: 'warding', power: { consumes: 3, damage: 12, range: 4 }, description: 'Auto-attacks enemies in range 4, 12 dmg. Consumes 3 mana.' },
    void_wall:         { char: '▓', color: '#6622aa', cost: { stone: 3, void_essence: 2 }, work: 15, hp: 120, structureType: 'wall', category: 'Walls & Floors', passable: { colonist: false, animal: false, enemy: false }, breakable: true, research: 'void_forging', description: 'Reinforced wall (120 HP). Blocks enemies.' },
    void_turret:       { char: 'Y', color: '#aa33ff', cost: { stone: 5, planks: 3, void_essence: 4 }, work: 55, structureType: 'furniture', category: 'Defense', passable: { colonist: false, animal: false, enemy: false }, research: 'void_forging', power: { consumes: 5, damage: 20, range: 5 }, description: 'Auto-attacks enemies in range 5, 20 dmg. Consumes 5 mana.' },
    void_door:         { char: '▒', color: '#7733bb', cost: { stone: 3, planks: 2, void_essence: 3 }, work: 20, hp: 80, structureType: 'door', category: 'Walls & Floors', passable: { colonist: true, animal: false, enemy: false }, breakable: true, research: 'void_forging', description: 'Reinforced door (80 HP). Colonists pass through, enemies must break it.' },
    mana_crystal:      { char: 'W', color: '#aa44ff', cost: { wood: 8, stone: 4 }, work: 45, structureType: 'furniture', category: 'Arcane', passable: { colonist: false, animal: false, enemy: false }, research: 'ley_channeling', power: { generates: 10 }, description: 'Generates 10 mana for powering magical buildings.' },
    glowstone:         { char: 'L', color: '#ffff88', cost: { planks: 2, stone: 1 }, work: 14, structureType: 'furniture', category: 'Furniture', lightRadius: 10, research: 'luminance', power: { consumes: 2, radius: 5 }, description: 'Mana-powered light, radius 5. Consumes 2 mana.' },
    enchanting_table:  { char: 'P', color: '#bb88ff', cost: { planks: 4, stone: 3 }, work: 35, structureType: 'furniture', category: 'Production', research: 'arcane_infusion', power: { consumes: 4, speedMult: 2.0 }, description: '2x crafting speed. Consumes 4 mana.' },
    ember_ward:        { char: 'H', color: '#ff8844', cost: { stone: 4, planks: 2 }, work: 28, structureType: 'furniture', category: 'Arcane', research: 'ember_magic', power: { consumes: 3, warmRadius: 4 }, description: 'Warms nearby tiles (radius 4) in winter. Consumes 3 mana.' },
    ice_box:           { char: 'I', color: '#88ccff', cost: { runite: 2, stone: 4, planks: 2, void_essence: 2 }, work: 40, structureType: 'furniture', category: 'Furniture', research: 'alchemy', power: { consumes: 1 }, description: 'Magically chills food — reduces spoilage by 40%. Consumes 1 mana.' },
    rift_gate:         { char: 'Ω', color: '#33ccff', cost: { runite: 4, stone: 6, planks: 4, void_essence: 6 }, work: 60, structureType: 'furniture', category: 'Arcane', passable: { colonist: false, animal: false, enemy: false }, research: 'planar_rift', power: { consumes: 6 }, description: 'Send exploration parties to alternate dimensions. Consumes 6 mana.' },
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
// Station must exist as a buildable structure. Equipment outputs auto-detected from WEAPONS/ARMORS/TOOLS.
export const RECIPE_CATEGORIES = ['Materials', 'Equipment', 'Tools', 'Artifacts', 'Food & Potions'];

export const RECIPES = {
    craft_planks: { input: { wood: 2 }, output: { planks: 3 }, skill: 'crafting', ticks: 10, station: 'workbench', category: 'Materials' },
    craft_bricks: { input: { stone: 2 }, output: { bricks: 3 }, skill: 'crafting', ticks: 12, station: 'workbench', category: 'Materials' },
    craft_wooden_club: { input: { wood: 2, planks: 1 }, output: { wooden_club: 1 }, skill: 'crafting', ticks: 15, station: 'workbench', category: 'Equipment' },
    craft_etched_axe: { input: { stone: 2, planks: 1 }, output: { etched_axe: 1 }, skill: 'crafting', ticks: 18, station: 'workbench', research: 'runecraft', category: 'Equipment' },
    craft_runic_blade: { input: { runite: 2, planks: 1 }, output: { runic_blade: 1 }, skill: 'crafting', ticks: 25, station: 'workbench', research: 'runeforging', category: 'Equipment' },
    craft_void_blade: { input: { void_essence: 4, runite: 2, planks: 1 }, output: { void_blade: 1 }, skill: 'crafting', ticks: 30, station: 'workbench', research: 'void_forging', category: 'Equipment' },
    craft_void_armor: { input: { void_essence: 3, bricks: 2, planks: 1 }, output: { void_armor: 1 }, skill: 'crafting', ticks: 25, station: 'workbench', research: 'void_forging', category: 'Equipment' },
    craft_stone_pickaxe: { input: { stone: 2, planks: 1 }, output: { stone_pickaxe: 1 }, skill: 'crafting', ticks: 14, station: 'workbench', category: 'Tools' },
    craft_runic_pickaxe: { input: { runite: 2, planks: 1 }, output: { runic_pickaxe: 1 }, skill: 'crafting', ticks: 22, station: 'workbench', research: 'runeforging', category: 'Tools' },
    craft_woodcutter_axe: { input: { planks: 2, stone: 1 }, output: { woodcutter_axe: 1 }, skill: 'crafting', ticks: 16, station: 'workbench', category: 'Tools' },
    craft_harvesting_sickle: { input: { stone: 1, planks: 1, wood: 1 }, output: { harvesting_sickle: 1 }, skill: 'crafting', ticks: 14, station: 'workbench', research: 'druidcraft', category: 'Tools' },
    craft_boots_of_haste: { input: { void_essence: 2, planks: 2, runite: 1 }, output: { boots_of_haste: 1 }, skill: 'crafting', ticks: 28, station: 'workbench', research: 'void_forging', category: 'Artifacts' },
    brew_health_potion: { input: { berries: 3, wheat: 1 }, output: { health_potion: 1 }, skill: 'cooking', ticks: 12, station: 'cauldron', research: 'alchemy', category: 'Food & Potions' },
    brew_speed_potion: { input: { corn: 2, potatoes: 2, berries: 1 }, output: { speed_potion: 1 }, skill: 'cooking', ticks: 15, station: 'cauldron', research: 'alchemy', category: 'Food & Potions' },
    cook_meal: { input: { foodstuffs: 5 }, output: { food: 4 }, skill: 'cooking', ticks: 8, station: 'cauldron', category: 'Food & Potions' },
};

// To add a weapon: add entry here + a recipe with output: { <key>: 1 }. Auto-detected on craft.
// Optional stat bonuses: miningSpeed, choppingSpeed, farmingSpeed (multipliers applied during those tasks).
export const WEAPONS = {
    fists: { name: 'Fists', damage: 5 },
    wooden_club: { name: 'Wooden Club', damage: 10 },
    etched_axe: { name: 'Etched Axe', damage: 15 },
    runic_blade: { name: 'Runic Blade', damage: 22 },
    //runic_pick: { name: 'Runic Pick', damage: 12, miningSpeed: 1.4 }, // kept as an example of a weapon with non-combat stat bonuses
    void_blade: { name: 'Void Blade', damage: 30 },
};

// To add armor: add entry here + a recipe with output: { <key>: 1 }. Auto-detected on craft.
export const ARMORS = {
    void_armor: { name: 'Void Armor', damageReduction: 0.3 },
};

// To add a tool: add entry here + a recipe with output: { <key>: 1 }. Equipped in a separate slot from weapons.
// Stat bonuses stack with weapon bonuses. moveSpeedBonus: reduces move cooldown (fraction, e.g. 0.3 = 30% faster).
export const TOOLS = {
    stone_pickaxe: { name: 'Stone Pickaxe', miningSpeed: 1.3 },
    runic_pickaxe: { name: 'Runic Pickaxe', miningSpeed: 1.6 },
    woodcutter_axe: { name: "Woodcutter's Axe", choppingSpeed: 1.4 },
    harvesting_sickle: { name: 'Harvesting Sickle', farmingSpeed: 1.3 },
};

// To add an artifact: add entry here + a recipe with output: { <key>: 1 }. Equipped in a dedicated artifact slot.
// Artifacts are magical items with unique effects. Stat bonuses stack with weapon/tool bonuses.
export const ARTIFACTS = {
    boots_of_haste: { name: 'Boots of Haste', moveSpeedBonus: 0.3 },
};

// To add a potion: add entry here + a recipe. Colonists auto-use potions from stockpile when conditions are met.
// trigger: condition function name (checked in colonist update). cooldown: min ticks between uses per colonist.
// effect: what happens on use. duration: for timed effects, how long they last.
export const POTIONS = {
    health_potion: {
        name: 'Health Potion',
        trigger: 'lowHealth',         // used when HP < hpThreshold
        hpThreshold: 0.4,             // fraction of maxHp
        effect: 'heal',
        healAmount: 50,               // HP restored
        cooldown: 200,                // ticks between uses
    },
    speed_potion: {
        name: 'Speed Potion',
        trigger: 'hasTask',           // used when colonist has a task and is moving/working
        effect: 'speed',
        moveSpeedBonus: 0.5,          // 50% faster movement
        workSpeedBonus: 1.3,          // 30% faster work
        duration: 100,                // ticks the effect lasts
        cooldown: 400,                // ticks between uses
    },
};

// Raw food ingredients usable in cooking. Add new ones here rather than in resources.js.
export const FOODSTUFFS = ['wheat', 'berries', 'corn', 'potatoes', 'meat', 'eggs', 'milk'];

// Food spoilage system. Percentage of stockpile lost per decay interval, modulated by item type,
// season, and storage buildings. Cooking uses fast-rotting food first (sorted by decayMultipliers).
export const FOOD_DECAY_CONFIG = {
    decayInterval: 50,
    baseDecayRate: 0.02,
    decayMultipliers: {
        milk: 2.5,
        berries: 2.0,
        meat: 1.8,
        eggs: 1.5,
        potatoes: 0.7,
        corn: 0.6,
        wheat: 0.5,
        food: 0.3,
    },
    seasonDecayMult: {
        spring: 1.0,
        summer: 1.5,
        autumn: 1.0,
        winter: 0.5,
    },
    foodChestReduction: 0.15,
    foodChestMaxReduction: 0.6,
    iceBoxReduction: 0.4,
    maxTotalReduction: 0.9,
};

// To add a crop: add entry here, it auto-appears in zone mode. Set 'research' to gate behind tech.
export const CROPS = {
    wheat: { growthTicks: 200, harvestYield: 3, seasons: ['spring', 'summer', 'autumn'], char: '%', readyChar: '*', color: '#ccaa00' },
    berries: { growthTicks: 150, harvestYield: 2, seasons: ['spring', 'summer', 'autumn'], char: '%', readyChar: '*', color: '#cc44aa' },
    corn: { growthTicks: 250, harvestYield: 4, seasons: ['summer'], char: '%', readyChar: '*', color: '#ffcc00', research: 'druidcraft' },
    potatoes: { growthTicks: 180, harvestYield: 3, seasons: ['spring', 'autumn', 'winter'], char: '%', readyChar: '*', color: '#aa7744', research: 'druidcraft' },
};

// ----------------------------------------------------------------------------
// Research config
// ----------------------------------------------------------------------------

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
    planar_rift: { name: 'Planar Rift', cost: 200, requires: ['void_summoning', 'ley_channeling'], description: 'Open stable rifts for exploration expeditions' },
    deep_delving: { name: 'Deep Delving', cost: 250, requires: ['planar_rift'], description: 'Access deeper, more dangerous dimensions' },
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

// ----------------------------------------------------------------------------
// Wildlife & Raider config
// ----------------------------------------------------------------------------

// To add an animal: add entry here. Spawning, rendering, hunting, and taming handled automatically.
// tameable: true enables taming. tamed sub-object: what the animal produces once tamed.
// speed: movement rate (lower = slower). fleeRange/aggroRange: detection distance for behavior.
export const ANIMALS = {
    deer: { char: 'd', color: '#bb8855', hp: 40, speed: 0.5, hostile: false, meatYield: 3, fleeRange: 5 },
    rabbit: { char: 'r', color: '#ccaa88', hp: 10, speed: 0.7, hostile: false, meatYield: 1, fleeRange: 4 },
    wolf: { char: 'w', color: '#555555', hp: 60, speed: 0.6, hostile: true, meatYield: 2, damage: 8, aggroRange: 6 },
    chicken: { char: 'c', color: '#ddaa44', hp: 15, speed: 0.4, hostile: false, meatYield: 1, fleeRange: 3, tameable: true, tamed: { produces: 'eggs', produceRate: 80, produceAmount: 1, foodToTame: 2 } },
    cow: { char: 'C', color: '#aa7744', hp: 80, speed: 0.3, hostile: false, meatYield: 4, fleeRange: 4, tameable: true, tamed: { produces: 'milk', produceRate: 100, produceAmount: 2, foodToTame: 4 } },
    sheep: { char: 's', color: '#cccccc', hp: 40, speed: 0.35, hostile: false, meatYield: 2, fleeRange: 4, tameable: true, tamed: { produces: 'wool', produceRate: 120, produceAmount: 1, foodToTame: 3 } },
    okapi: { char: 'O', color: '#b3562e', hp: 100, speed: 0.8, hostile: false, meatYield: 5, fleeRange: 4, tameable: true, tamed: { produces: 'wool', produceRate: 120, produceAmount: 1, foodToTame: 5 } },
    tapir: { char: 't', color: '#f2e6e6', hp: 60, speed: 0.25, hostile: false, meatYield: 4, fleeRange: 4, tameable: true, tamed: { produces: 'wool', produceRate: 120, produceAmount: 1, foodToTame: 3 } },
};

// Wildlife spawning and behavior. Used by wildlife.js.
export const WILDLIFE_CONFIG = {
    maxCount: 15,                // max wild animals on map at once
    spawnWeights: { deer: 0.20, rabbit: 0.40, chicken: 0.50, sheep: 0.65, cow: 0.80, okapi: 0.85, tapir: 0.90 }, // cumulative probability thresholds - TODO: make this part of the ANIMALS object instead of a separate config
    passiveMoveChance: 0.3,      // chance per tick a passive animal moves randomly
    hostileIdleMoveChance: 0.2,  // chance per tick a hostile animal moves when no target nearby
    animalSearchRadius: 20,      // how far animals scan for colonists (flee/aggro)
    wolfNightThreshold: 0.75,    // fraction of day after which wolves can spawn (evening)
};

// Auto-derived from ANIMALS entries with tameable: true
export const TAMED_ANIMALS = Object.fromEntries(
    Object.entries(ANIMALS).filter(([, a]) => a.tameable).map(([k, a]) => [k, { char: a.char, color: a.color, hp: a.hp, ...a.tamed }])
);

// Raid system tuning. Used by combat.js. Raiders spawn at map edges and attack colonists.
export const RAID_CONFIG = {
    firstRaidTick: 1500,         // earliest tick a raid can happen
    minInterval: 1200,           // minimum ticks between raids
    maxInterval: 3000,           // maximum ticks between raids
    baseRaiders: 2,              // minimum raiders per raid
    wealthScaling: 0.005,        // extra raiders = wealth * this
    raiderHp: 60,                // hit points per raider
    raiderDamage: 6,             // base damage per hit (+ weapon bonus)
    raiderSpeed: 0.4,            // movement speed (lower = slower)
    fleeThreshold: 0.5,          // remaining fraction of raiders that triggers retreat
    timeout: 150,                // ticks after which remaining raiders flee
};

// ----------------------------------------------------------------------------
// Nexus & Exploration config
// ----------------------------------------------------------------------------

// Exploration / alternate dimensions. Used by exploration.js.
export const DIMENSIONS = {
    crystal_caves: {
        name: 'Crystal Caves', difficulty: 1,
        duration: [150, 250], encounters: 3,
        loot: [
            { resource: 'stone', weight: 40, amount: [5, 12] },
            { resource: 'runite', weight: 30, amount: [2, 5] },
            { resource: 'void_essence', weight: 10, amount: [1, 3] },
        ],
        enemies: { hp: [40, 60], damage: [5, 8], count: [2, 4] },
    },
    verdant_depths: {
        name: 'Verdant Depths', difficulty: 1,
        duration: [100, 180], encounters: 2,
        loot: [
            { resource: 'wood', weight: 50, amount: [8, 15] },
            { resource: 'wheat', weight: 20, amount: [5, 10] },
            { resource: 'berries', weight: 20, amount: [4, 8] },
        ],
        enemies: { hp: [30, 50], damage: [4, 6], count: [1, 3] },
    },
    shadow_realm: {
        name: 'Shadow Realm', difficulty: 2,
        duration: [250, 400], encounters: 5,
        loot: [
            { resource: 'void_essence', weight: 40, amount: [3, 7] },
            { resource: 'runite', weight: 25, amount: [3, 6] },
        ],
        enemies: { hp: [80, 120], damage: [8, 14], count: [3, 6] },
        research: 'deep_delving',
    },
};

export const EXPLORATION_CONFIG = {
    returnTimeMult: 1.2,
    encounterSpacing: 0.2,
    baseFistDamage: 5,
};

// Wave defense (void nexus) tuning. Used by waves.js.
export const WAVE_CONFIG = {
    baseEnemies: 4,              // enemies in wave 1
    enemiesPerWave: 2,           // additional enemies per wave after wave 1
    baseHp: 60,                  // enemy HP in wave 1
    hpPerWave: 15,               // additional HP per wave
    baseDamage: 6,               // enemy damage in wave 1
    damagePerWave: 2,            // additional damage per wave
    spawnInterval: 15,           // ticks between enemy spawns during a wave
    essencePerKill: 1,           // void essence earned per kill
    nexusHp: 200,                // starting HP of the void nexus
    nexusHpPerWave: 0,           // additional nexus HP per wave (0 = static)
    colonistCapBase: 3,          // starting colonist cap before any waves
    colonistCapScale: 2.5,       // scaling factor for cap increase per wave completed
    colonistCapMax: 12,          // maximum colonist cap
    enemySpeed: 0.45,            // wave enemy movement speed (lower = slower)
    enemyChar: 'E',              // character displayed for wave enemies
    enemyColor: '#ff2222',       // color of wave enemies
    repathInterval: 20,          // ticks before wave enemies recalculate path
    spawnDistance: { near: 25, far: 50, offsetRange: 10 }, // portal spawn distances from nexus
    maxPathNodes: 2000,          // A* node limit for wave enemy pathfinding
    bonusEssencePerWave: 2,      // multiplied by wave number for completion bonus
};

// ----------------------------------------------------------------------------
// Game world config
// ----------------------------------------------------------------------------

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

// Per-season modifiers. cropGrowthMult: farm speed multiplier. animalSpawnRate: chance per tick.
// tempRange: [min, max] temperature displayed in UI (cosmetic, affects freezing via winter check).
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
    rock:      { char: '#', color: '#999', bg: '#222', moveCost: 4, passable: { colonist: true, animal: false, enemy: true } },
    tall_rock: { char: '▲', color: '#777', bg: '#1a1a1a', moveCost: Infinity, passable: { colonist: false, animal: false, enemy: false } },
    water:     { char: '~', color: '#55aaff', bg: '#0a1a2e', moveCost: 3, passable: { colonist: true, animal: false, enemy: true } },
};

// To add a harvestable resource: add entry here. Rendering, gathering, and yields handled automatically.
// designation: 'chop' or 'mine'. yield: { resource: amount }. work: ticks to gather.
export const RESOURCES = {
    tree:       { char: 'T', color: '#8B6B3A', autumnColor: '#cc8822', designation: 'chop', work: 12, yield: { wood: 1 }, perAmount: true },
    stone:      { char: 'o', color: '#999', designation: 'mine', work: 18, yield: { stone: 1 }, perAmount: true },
    runite_ore: { char: 'o', color: '#44cccc', designation: 'mine', work: 22, yield: { runite: 1 }, perAmount: true },
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

// Map generator pipeline. Each entry runs in order during generateMap().
// name: identifier. enabled: toggle. weight/chance: probability of appearing (1.0 = always).
// params: passed to the generator function (defined in map.js).
export const MAP_GENERATORS = [
    {
        name: 'dirt_patches',
        enabled: true,
        params: {
            count: 12,          // patches per 100x80 area (scales with map size)
            radiusRange: [2, 5], // min/max patch radius
            fillChance: 0.6,    // chance per tile in radius to convert
        },
    },
    {
        name: 'rock_formations',
        enabled: true,
        params: {
            count: 6,           // formations per 100x80 area (scales with map size)
            sizeRange: [2, 4],  // min/max formation radius
            fillChance: 0.7,    // chance per tile in radius to place rock
            resourceChance: 0.5, // chance a rock tile gets a stone/runite deposit
            runiteChance: 0.2,  // fraction of resource tiles that are runite vs stone
            stoneAmount: [3, 5], // stone deposit amount range
            runiteAmount: [2, 3], // runite deposit amount range
        },
    },
    {
        name: 'mountain_ranges',
        enabled: true,
        params: {
            chance: 0.4,         // probability a map has a mountain range
            lengthRange: [15, 40], // spine length in tiles
            widthRange: [3, 6],  // half-width of the range
            tallRockChance: 0.4, // chance of tall_rock (impassable) vs regular rock
            resourceChance: 0.3, // chance a rock tile gets deposits
            runiteChance: 0.3,   // fraction of resource tiles that are runite
            stoneAmount: [3, 5],
            runiteAmount: [2, 4],
        },
    },
    {
        name: 'trees',
        enabled: true,
        params: {
            density: 0.12,      // chance per grass tile to spawn a tree
            amountRange: [3, 5], // wood amount per tree
        },
    },
    {
        name: 'river',
        enabled: true,
        params: {
            widthRange: [2, 3], // half-width of river (actual width = 2*w+1)
            bankChance: 0.85,   // chance of sand on tiles adjacent to water
            gravelChance: 0.5,  // chance of gravel on tiles 2 away from water
        },
    },
    {
        name: 'ruins',
        enabled: true,
        params: {
            count: 1,            // number of ruin placement attempts per map
            chance: 1,           // probability each attempt actually places a ruin
            margin: 30,          // min distance from map edge for placement
            decayChance: 0.33,   // chance each wall/door block is missing (ruined)
            floorDecayChance: 0.15, // chance each floor tile is missing
            // Blueprints: define structure layouts. Each has width, height, optional floorTerrain,
            // and a layout array of { x, y, type } entries (relative to top-left corner).
            // type must be a key from BUILDINGS. Add as many blueprints as you like.
            blueprints: [
                {
                    name: 'temple',
                    width: 9,
                    height: 7,
                    floorTerrain: 'dirt',
                    layout: (() => {
                        const l = [];
                        // Outer stone walls
                        for (let x = 0; x < 9; x++) { l.push({ x, y: 0, type: 'stone_wall' }); l.push({ x, y: 6, type: 'stone_wall' }); }
                        for (let y = 1; y < 6; y++) { l.push({ x: 0, y, type: 'stone_wall' }); l.push({ x: 8, y, type: 'stone_wall' }); }
                        // Door entrance
                        l.push({ x: 4, y: 6, type: 'door' });
                        // Stone floor interior
                        for (let y = 1; y < 6; y++) { for (let x = 1; x < 8; x++) { l.push({ x, y, type: 'stone_floor' }); } }
                        // Columns
                        l.push({ x: 2, y: 2, type: 'stone_wall' });
                        l.push({ x: 6, y: 2, type: 'stone_wall' });
                        l.push({ x: 2, y: 4, type: 'stone_wall' });
                        l.push({ x: 6, y: 4, type: 'stone_wall' });
                        return l;
                    })(),
                },
                {
                    name: 'watchtower',
                    width: 5,
                    height: 5,
                    floorTerrain: 'gravel',
                    layout: (() => {
                        const l = [];
                        // Square stone walls
                        for (let x = 0; x < 5; x++) { l.push({ x, y: 0, type: 'stone_wall' }); l.push({ x, y: 4, type: 'stone_wall' }); }
                        for (let y = 1; y < 4; y++) { l.push({ x: 0, y, type: 'stone_wall' }); l.push({ x: 4, y, type: 'stone_wall' }); }
                        // Door
                        l.push({ x: 2, y: 4, type: 'door' });
                        // Interior floor
                        for (let y = 1; y < 4; y++) { for (let x = 1; x < 4; x++) { l.push({ x, y, type: 'stone_floor' }); } }
                        return l;
                    })(),
                },
            ],
        },
    },
];

// ----------------------------------------------------------------------------
// Renderer config
// ----------------------------------------------------------------------------

// Rendering engine settings. Used by renderer.js for canvas, night overlay, and lighting.
// seasonDaylight: dawn/dusk as fraction of day (0-1). Dawn = transition to bright, dusk = transition to dark.
export const RENDER_CONFIG = {
    fontSize: 14,                // base font size in pixels
    fontHeightMult: 1.15,        // line height multiplier for tile cell height
    bgColor: '#111',             // canvas background (visible at map edges)
    cursorBg: '#444',            // background highlight under cursor
    selectionBgZone: '#2a3a2a',  // selection rectangle background in zone mode
    selectionBgBuild: '#3a2a2a', // selection rectangle background in build mode
    nightMaxDarkness: 0.55,      // maximum overlay opacity at full night (0-1)
    nightDawnDuskOffset: { duskEnd: 0.12, dawnStart: 0.10 }, // transition duration as fraction of day
    nightGradientSteps: 8,       // quantized darkness levels (higher = smoother, more fillRect calls)
    nightOverlayColor: [0, 0, 20], // RGB of night overlay tint
    lightSourceMargin: 8,        // extra tiles beyond viewport to check for light sources
    fireLightRadius: 2,          // light radius of burning tiles
    seasonDaylight: {
        summer: { dawn: 0.15, dusk: 0.75 },   // 60% daylight
        winter: { dawn: 0.25, dusk: 0.65 },   // 40% daylight
        spring: { dawn: 0.18, dusk: 0.72 },   // 54% daylight
        autumn: { dawn: 0.22, dusk: 0.68 },   // 46% daylight
        default: { dawn: 0.20, dusk: 0.70 },  // 50% daylight (fallback)
    },
};

// Visual effects for combat, portals, and turret shots. Used by renderer, colonist, combat, waves, power.
export const COMBAT_VISUALS = {
    hitChar: '!',                // character shown on hit
    hitColor: '#ffff00',         // color when colonist hits an enemy
    hitTtl: 2,                   // ticks the hit effect persists
    damageTakenColor: '#ff3333', // color when colonist takes damage
    nexusDamageColor: '#9933ff', // color when void nexus takes damage
    structureDamageColor: '#ff8800', // color when raiders/waves break structures
    portalChar: 'Ø',             // character for wave portals
    portalColor: '#ff55ff',      // portal foreground color
    portalBg: '#440044',         // portal background color
    portalPathColor: '#663388',  // path preview foreground
    portalPathBg: '#1a001a',     // path preview background
    shotColorArcane: '#ff4444',  // arcane sentinel shot color
    shotColorVoid: '#cc00ff',    // void turret shot color
};
