// ============================================================================
// GAME CONFIGURATION
// To add content: add entries to the relevant object below. The game systems
// will pick them up automatically. See RESEARCH for tech tree prerequisites.
// ============================================================================

export const CONFIG = {
    MAP_WIDTH: 150,
    MAP_HEIGHT: 80,
    VIEWPORT_WIDTH: 80,
    VIEWPORT_HEIGHT: 40,
    TICK_RATE: 200,
    TICKS_PER_SEASON: 600,
    TICKS_PER_DAY: 100,
    START_RESOURCES: { wood: 25, stone: 15, planks: 5, food: 20, meat: 0, wheat: 0, berries: 0, corn: 0, potatoes: 0, bricks: 0, runite: 0, eggs: 0, milk: 0, wool: 0 },
    PEACEFUL_MODE: false,
    GAME_SPEED: 1,
};

export const TILE_CHARS = {
    grass: '.', dirt: ',', rock: '#', water: '~',
    tree: 'T', stone_resource: 'o',
    wall: '█', floor: '·', door: '+',
    bed: 'B', workbench: 'C', cauldron: 'F',
    storage_chest: 'S', torch: 'i', fence: '|',
    arcanum: 'R', beast_circle: 'A',
    mana_crystal: 'W', glowstone: 'L', enchanting_table: 'P',
    ember_ward: 'H', arcane_sentinel: 'X',
    farm_empty: '=', farm_growing: '%', farm_ready: '*',
    snow: '*',
};

export const TILE_COLORS = {
    grass: '#5a8c3a', dirt: '#a07040', rock: '#777', water: '#4488ff',
    tree: '#2d7a2d', tree_autumn: '#cc8822', stone_resource: '#999', runite_ore: '#44cccc',
    wall: '#aa7744', floor: '#666666', door: '#cc9955',
    bed: '#8855aa', workbench: '#bb8833', cauldron: '#ff6633',
    storage_chest: '#997744', torch: '#ffcc00', fence: '#886644',
    arcanum: '#44aaff', beast_circle: '#77aa44',
    mana_crystal: '#aa44ff', glowstone: '#ffff88', enchanting_table: '#bb88ff',
    ember_ward: '#ff8844', arcane_sentinel: '#ff4444',
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

// To add a crop: add entry here, it auto-appears in zone mode
export const CROPS = {
    wheat: { growthTicks: 200, harvestYield: 3, seasons: ['spring', 'summer', 'autumn'], char: '%', readyChar: '*', color: '#ccaa00' },
    berries: { growthTicks: 150, harvestYield: 2, seasons: ['spring', 'summer', 'autumn'], char: '%', readyChar: '*', color: '#cc44aa' },
    corn: { growthTicks: 250, harvestYield: 4, seasons: ['summer'], char: '%', readyChar: '*', color: '#ffcc00' },
    potatoes: { growthTicks: 180, harvestYield: 3, seasons: ['spring', 'autumn', 'winter'], char: '%', readyChar: '*', color: '#aa7744' },
};

export const BUILD_COSTS = {
    wall: { wood: 2 },
    floor: { stone: 1 },
    door: { wood: 3 },
    bed: { wood: 5 },
    workbench: { wood: 5, stone: 2 },
    cauldron: { stone: 3, wood: 1 },
    storage_chest: { wood: 4 },
    torch: { wood: 1 },
    fence: { wood: 1 },
    arcanum: { wood: 5, stone: 3, planks: 2 },
    beast_circle: { wood: 6 },
    mana_crystal: { wood: 8, stone: 4 },
    glowstone: { planks: 2, stone: 1 },
    enchanting_table: { planks: 4, stone: 3 },
    ember_ward: { stone: 4, planks: 2 },
    arcane_sentinel: { stone: 5, planks: 3 },
};

export const BUILD_WORK = {
    wall: 12, floor: 6, door: 15, bed: 25,
    workbench: 30, cauldron: 18, storage_chest: 20,
    torch: 4, fence: 5, arcanum: 40,
    beast_circle: 28, mana_crystal: 45, glowstone: 14,
    enchanting_table: 35, ember_ward: 28, arcane_sentinel: 50,
};

// To add a recipe: add entry here. Set 'research' field to gate behind tech.
// Station must exist as a buildable structure. Output weapons need handling in colonist.js completeTask.
export const RECIPES = {
    craft_planks: { input: { wood: 2 }, output: { planks: 3 }, skill: 'crafting', ticks: 10, station: 'workbench' },
    craft_bricks: { input: { stone: 2 }, output: { bricks: 3 }, skill: 'crafting', ticks: 12, station: 'workbench' },
    craft_wooden_club: { input: { wood: 3 }, output: { wooden_club: 1 }, skill: 'crafting', ticks: 15, station: 'workbench' },
    craft_etched_axe: { input: { stone: 2, wood: 1 }, output: { etched_axe: 1 }, skill: 'crafting', ticks: 18, station: 'workbench', research: 'runecraft' },
    craft_runic_blade: { input: { runite: 3 }, output: { runic_blade: 1 }, skill: 'crafting', ticks: 25, station: 'workbench', research: 'runeforging' },
    craft_runic_pick: { input: { runite: 2, wood: 1 }, output: { runic_pick: 1 }, skill: 'crafting', ticks: 20, station: 'workbench', research: 'runeforging' },
    cook_meal: { input: { wheat: 2 }, output: { food: 3 }, skill: 'cooking', ticks: 8, station: 'cauldron' },
    cook_berries: { input: { berries: 2 }, output: { food: 2 }, skill: 'cooking', ticks: 5, station: 'cauldron' },
    cook_meat: { input: { meat: 1 }, output: { food: 2 }, skill: 'cooking', ticks: 6, station: 'cauldron' },
    cook_stew: { input: { meat: 1, potatoes: 1 }, output: { food: 4 }, skill: 'cooking', ticks: 10, station: 'cauldron' },
    cook_feast: { input: { meat: 2, wheat: 2, eggs: 1 }, output: { food: 8 }, skill: 'cooking', ticks: 15, station: 'cauldron', research: 'alchemy' },
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
};

export const WEAPONS = {
    fists: { name: 'Fists', damage: 5 },
    wooden_club: { name: 'Wooden Club', damage: 10 },
    etched_axe: { name: 'Etched Axe', damage: 15 },
    runic_blade: { name: 'Runic Blade', damage: 22 },
    runic_pick: { name: 'Runic Pick', damage: 12 },
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
];

export const EVENTS = {
    wanderer: { weight: 10, minTick: 300, cooldown: 800 },
    blight: { weight: 8, minTick: 200, cooldown: 600, seasons: ['summer', 'autumn'] },
    caravan: { weight: 6, minTick: 400, cooldown: 1000 },
    windfall: { weight: 5, minTick: 500, cooldown: 1200 },
    fire: { weight: 4, minTick: 200, cooldown: 400, seasons: ['summer'] },
    cold_snap: { weight: 7, minTick: 100, cooldown: 600, seasons: ['winter'] },
    migration: { weight: 8, minTick: 300, cooldown: 800, seasons: ['autumn', 'spring'] },
    inspiration: { weight: 12, minTick: 100, cooldown: 300 },
};

export const RAID_CONFIG = {
    firstRaidTick: 1200,
    minInterval: 800,
    maxInterval: 2000,
    baseRaiders: 2,
    wealthScaling: 0.01,
    raiderHp: 80,
    raiderDamage: 8,
    raiderSpeed: 0.4,
    fleeThreshold: 0.4,
    timeout: 200,
};

// To add research: add entry here with requires:[] for prerequisites.
// Then gate buildings in building.js BUILDING_RESEARCH_REQS or recipes via 'research' field.
export const RESEARCH = {
    runecraft: { name: 'Runecraft', cost: 50, requires: [], unlocks: { recipes: ['craft_etched_axe'] }, description: 'Etch runes into stone weapons' },
    druidcraft: { name: 'Druidcraft', cost: 80, requires: [], unlocks: { crops: ['corn', 'potatoes'] }, description: 'Unlock corn and potatoes' },
    beast_binding: { name: 'Beast Binding', cost: 100, requires: ['druidcraft'], unlocks: { buildings: ['beast_circle'] }, description: 'Bind and pen creatures' },
    ley_channeling: { name: 'Ley Channeling', cost: 120, requires: ['runecraft'], unlocks: { buildings: ['mana_crystal'] }, description: 'Tap leylines for mana' },
    luminance: { name: 'Luminance', cost: 80, requires: ['ley_channeling'], unlocks: { buildings: ['glowstone'] }, description: 'Mana-powered light' },
    arcane_infusion: { name: 'Arcane Infusion', cost: 150, requires: ['ley_channeling'], unlocks: { buildings: ['enchanting_table'] }, description: 'Faster enchanted crafting' },
    runeforging: { name: 'Runeforging', cost: 130, requires: ['runecraft'], unlocks: { recipes: ['craft_runic_blade', 'craft_runic_pick'] }, description: 'Forge runic weapons' },
    alchemy: { name: 'Alchemy', cost: 60, requires: [], unlocks: { recipes: ['cook_feast'] }, description: 'Cook feasts for mood boost' },
    warding: { name: 'Warding', cost: 100, requires: ['runecraft'], unlocks: { buildings: ['arcane_sentinel'] }, description: 'Conjure defensive wards' },
    ember_magic: { name: 'Ember Magic', cost: 90, requires: ['ley_channeling'], unlocks: { buildings: ['ember_ward'] }, description: 'Warmth wards for winter' },
    brilliance: { name: 'Brilliance', cost: 160, requires: ['luminance'], unlocks: { buildings: ['beacon'] }, description: 'Radiant beacon lights large areas' },
    mana_weaving: { name: 'Mana Weaving', cost: 180, requires: ['arcane_infusion'], unlocks: { recipes: ['craft_mana_robes'] }, description: 'Weave mana into protective garb' },
    pyroclasm: { name: 'Pyroclasm', cost: 200, requires: ['ember_magic', 'warding'], unlocks: { buildings: ['fire_ward'] }, description: 'Fire ward incinerates nearby foes' },
    verdant_growth: { name: 'Verdant Growth', cost: 140, requires: ['beast_binding', 'alchemy'], unlocks: { crops: ['herbs'] }, description: 'Grow rare herbs for potent brews' },
    masterwork: { name: 'Masterwork', cost: 220, requires: ['runeforging', 'arcane_infusion'], unlocks: { recipes: ['craft_masterwork_blade'] }, description: 'Forge legendary enchanted weapons' },
};

// To add a tameable animal: add entry here. Needs beast_binding research.
export const TAMED_ANIMALS = {
    chicken: { char: 'c', color: '#ddaa44', hp: 15, produces: 'eggs', produceRate: 80, produceAmount: 1, foodToTame: 2 },
    cow: { char: 'C', color: '#aa7744', hp: 80, produces: 'milk', produceRate: 100, produceAmount: 2, foodToTame: 4 },
    sheep: { char: 's', color: '#cccccc', hp: 40, produces: 'wool', produceRate: 120, produceAmount: 1, foodToTame: 3 },
};

// Mana stats for magical buildings (build costs/work are in BUILD_COSTS/BUILD_WORK)
export const POWER_BUILDINGS = {
    mana_crystal: { generates: 10 },
    glowstone: { consumes: 2, radius: 5 },
    enchanting_table: { consumes: 4, speedMult: 2.0 },
    ember_ward: { consumes: 3, warmRadius: 4 },
    arcane_sentinel: { consumes: 3, damage: 12, range: 4 },
};
