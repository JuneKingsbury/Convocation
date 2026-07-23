export const GLOSSARY = [
    {
        title: 'Colonists',
        entries: [
            ['Priorities', 'Each colonist has skill priorities (1-5, 0=disabled). Lower number = higher priority. Colonists pick tasks based on their priority settings.'],
            ['Needs', 'Hunger and Rest decay over time. When critical (<20), colonists interrupt work to eat or sleep.'],
            ['Mood', 'Base 50 + sum of active thoughts. Affects work speed: Inspired (75+) = 1.2x, Content (40-74) = 1x, Stressed (20-39) = 0.7x, Breaking (<20) = refuses work.'],
            ['Thoughts', 'Temporary mood modifiers from events (good meals, nice rooms, deaths, etc.). Each has a duration before it fades.'],
            ['Traits', 'Permanent modifiers assigned at spawn: Hard Worker, Lazy, Night Owl, Early Bird, Green Thumb, Iron Stomach, Socialite, Loner, Optimist, Pessimist, Tough, Pyromaniac, Gourmand.'],
            ['Drafting', 'Manually control colonists. Drafted colonists ignore AI and move where you right-click. Select multiple with click-drag, then Draft All.'],
            ['Skills', 'Building, Farming, Crafting, Cooking, Hauling, and six Magic schools (Evocation, Enchantment, Abjuration, Conjuration, Transmutation, Divination). Higher skill = faster work completion. Magic skills increase by studying tomes and casting spells.'],
            ['Equipment Slots', 'Weapon, Armor, Tool, and Artifact. Use "Auto-equip Best" to quickly gear up a colonist with the best available items.'],
            ['Active Effects', 'Temporary buffs from potions (speed, healing) and magic spells (heal, haste, defense). Shown in colonist info with remaining duration. Colonists with active spell buffs pulse cyan on the map.'],
        ]
    },
    {
        title: 'Magic System',
        entries: [
            ['Spell Tomes', 'Colonists learn spells by studying Spell Tomes at the Arcanum. Each tome teaches one spell from a specific school. Progress is per-colonist per-tome and persists across unequip/re-equip. Completing a tome consumes it and permanently grants the spell.'],
            ['Colonist Mana', 'Each colonist has a personal mana pool (base 20 + bonuses from magic skill levels). Spells consume mana and go on cooldown. Mana regenerates over time.'],
            ['Auto-Cast', 'Colonists auto-cast known spells when conditions are met (heal when ally is hurt, buff speed when working, etc.). Use the disable checkbox next to each spell to prevent auto-casting for mana conservation.'],
            ['Casting XP', 'Casting spells grants XP in that spell\'s school, in addition to studying tomes.'],
            ['Evocation', 'Ranged combat spells (Magic Missile, Fireball, Chain Lightning). Damage enemies at range.'],
            ['Enchantment', 'Buffs for everyday tasks (Haste, Animate Golem). Speed up colonist work.'],
            ['Abjuration', 'Defensive/healing spells (Heal, Shield, Mass Heal). Keep colonists alive.'],
            ['Conjuration', 'Summoning and teleportation (Summon Familiar, Warp, Blink).'],
            ['Transmutation', 'Reshape the environment (Circle of Growth, Raise Mountain, Level Field). Boost crops and terrain.'],
            ['Divination', 'Manipulate odds (Foresight, Fair Winds, Merchant\'s Omen, Ward of Calamity, Fortunate Discovery). Influence weather, events, and raid timing.'],
        ]
    },
    {
        title: 'Building',
        entries: [
            ['Wall', '(█) Blocks movement. Forms rooms when enclosing an area with doors.'],
            ['Floor', '(·) Cosmetic. Makes rooms nicer.'],
            ['Door', '(+) Allows passage through walls. Counts as room boundary.'],
            ['Bed', '(B) Colonists sleep here. Assign beds for mood bonus ("slept in bed").'],
            ['Workbench', '(C) Required for crafting recipes (planks, weapons, bricks).'],
            ['Cauldron', '(F) Required for brewing recipes (meals from raw food/crops).'],
            ['Food Chest', '(S) Preserves food. Each reduces spoilage by 15% (stacks up to 60%).'],
            ['Torch', '(i) Light source. Provides warmth in winter.'],
            ['Fence', '(|) Blocks movement like a wall but lighter to build.'],
            ['Arcanum', '(R) Required for researching new magic. Colonists study here to unlock the tech tree and progress spell tomes.'],
            ['Beast Circle', '(A) Required for binding creatures. Needs research: Beast Binding.'],
            ['Mana Crystal', '(W) Generates 10 mana. Needs research: Ley Channeling.'],
            ['Glowstone', '(L) Mana-powered light, radius 5. Consumes 2 mana.'],
            ['Enchanting Table', '(P) 2x crafting speed. Consumes 4 mana.'],
            ['Ember Ward', '(H) Warms nearby tiles (radius 4) in winter. Consumes 3 mana.'],
            ['Arcane Sentinel', '(X) Auto-attacks hostile enemies in range 4. Consumes 3 mana.'],
            ['Ice Box', '(I) Magical preservation. Reduces food spoilage by 40%. Consumes 1 mana.'],
            ['Rift Gate', '(Ω) Opens portals to alternate dimensions for exploration. Consumes 6 mana. Requires Planar Rift research.'],
            ['Void Nexus', '(V) Click to start wave defense. Needs research: Void Summoning.'],
            ['Void Wall', '(▓) Reinforced wall (120 HP). Needs research: Void Forging.'],
            ['Void Door', '(▒) Reinforced door (80 HP). Colonists pass, enemies must break. Needs research: Void Forging.'],
            ['Void Turret', '(Y) Stronger sentinel, range 5, 20 dmg. Consumes 5 mana. Needs research: Void Forging.'],
        ]
    },
    {
        title: 'Farming',
        entries: [
            ['Farm Zone', 'Designate with Z mode. Select a crop type, drag an area on grass/dirt. Colonists auto-plant and harvest.'],
            ['Wheat', 'Grows in spring/summer/autumn. 200 ticks. Yields 3. Cook into meals.'],
            ['Berries', 'Spring/summer/autumn. 150 ticks. Yields 2. Quick to cook.'],
            ['Corn', 'Summer only. 250 ticks. Yields 4. High output but seasonal.'],
            ['Potatoes', 'Spring/autumn/winter. 180 ticks. Yields 3. Hardy, grows in cold.'],
            ['Growth', 'Affected by season multiplier and weather. No outdoor growth in winter (except potatoes). Rain boosts growth.'],
        ]
    },
    {
        title: 'Crafting & Cooking',
        entries: [
            ['Planks', '2 wood → 3 planks. Used in beds, advanced buildings.'],
            ['Bricks', '2 stone → 3 bricks.'],
            ['Weapons', 'Wooden Club (3 wood), Etched Axe (2 stone + 1 wood, needs Runecraft), Runic Blade (3 runite, needs Runeforging), Void Blade (5 void essence + 2 runite, needs Void Forging). Equip from info panel.'],
            ['Tools', 'Stone Pickaxe (+20% mining), Runic Pickaxe (+50% mining), Woodcutter\'s Axe (+30% chopping), Harvesting Sickle (+25% farming).'],
            ['Spell Tomes', 'Craft tomes at workbench to teach colonists spells. Each school has multiple tomes at different skill levels.'],
            ['Void Armor', '4 void essence + 2 planks (needs Void Forging). -30% damage taken.'],
            ['Potions', 'Health Potion (3 berries + 2 wheat), Speed Potion (2 corn + 2 potatoes + 1 berries). Auto-consumed when trigger conditions are met.'],
            ['Cooking', 'Converts raw crops/meat into food at the cauldron. Cooked meals give mood bonus. Raw food gives mood penalty.'],
            ['Auto-Cook', 'Set a food target in the Food & Potions craft tab. Automatically queues cooking when food drops below target.'],
        ]
    },
    {
        title: 'Resources',
        entries: [
            ['Wood', 'Chop trees (T on map). Used in most buildings.'],
            ['Stone', 'Mine stone deposits (o on map). Used in structures and crafting.'],
            ['Runite', 'Rare magical ore found in rock clusters. Used for runic weapons.'],
            ['Food', 'Consumed by colonists when hungry. Produced by cooking.'],
            ['Meat', 'Dropped by hunted animals. Must be cooked.'],
            ['Void Essence', 'Dropped by wave enemies. Used for void-tier crafting and buildings.'],
            ['Global Stockpile', 'All resources are colony-wide. No physical hauling required.'],
        ]
    },
    {
        title: 'Seasons & Weather',
        entries: [
            ['Year', '4 seasons, each ~600 ticks (~2 min real-time at 1x speed).'],
            ['Spring', 'Normal growth, animals appear. Temp: 10-20°.'],
            ['Summer', '1.5x crop growth, heat waves possible, fire risk. Temp: 20-35°.'],
            ['Autumn', '0.8x growth, animal migrations. Temp: 5-15°.'],
            ['Winter', 'No outdoor crop growth, snow, colonists need warmth (rooms/ember wards). Temp: -10 to 5°.'],
            ['Rain', 'Boosts crop growth 1.3x. Extinguishes fires.'],
            ['Thunderstorm', 'Can start fires via lightning.'],
            ['Blizzard', 'Stops all crop growth. Winter only.'],
        ]
    },
    {
        title: 'Wildlife & Beast Binding',
        entries: [
            ['Deer', '(d) Passive. Flees colonists. Yields 3 meat when hunted.'],
            ['Rabbit', '(r) Passive. Fast. Yields 1 meat.'],
            ['Wolf', '(w) Hostile. Attacks colonists at night/winter. Yields 2 meat.'],
            ['Okapi', '(k) Passive. Pack animal when tamed — include in expeditions for 25% faster completion.'],
            ['Tapir', '(t) Passive. Happiness aura when tamed — nearby colonists (4-tile radius) get a mood bonus.'],
            ['Chicken', '(c) Passive. Produces eggs when tamed.'],
            ['Hunting', 'Select an animal, click Hunt. Creates a task for a colonist to kill it.'],
            ['Beast Binding', 'Requires Beast Binding research + Beast Circle. Bound creatures can have different roles: production (eggs, milk), pack animals (speed up expeditions), or aura (passive mood boost).'],
        ]
    },
    {
        title: 'Combat',
        entries: [
            ['Combat', 'Melee, 1-tile range. Damage = base + weapon bonus. Colonists auto-defend when attacked. Yellow ! = colonist strikes, red ! = colonist hit.'],
            ['Ranged Magic', 'Colonists with Evocation spells (Magic Missile, Fireball, Chain Lightning) attack enemies at range automatically.'],
            ['Weapons', 'Fists (5 dmg), Wooden Club (10), Etched Axe (15), Runic Blade (22), Void Blade (30). Craft and equip for better defense.'],
            ['Armor', 'Void Armor (-30% damage taken). Craft with void essence. Equip from colonist info panel.'],
            ['Raids', 'Raiders attack periodically (disabled in Peaceful Mode). Scale with colony wealth.'],
            ['Structure HP', 'Walls/doors/fences have HP. Enemies break through them. Auto-repairs when idle.'],
            ['Peaceful Mode', 'Disables raids, wolves, and pyromaniac fires. Void Nexus still works.'],
        ]
    },
    {
        title: 'Wave Defense (Void Nexus)',
        entries: [
            ['Void Nexus', '(V) Build after researching Void Summoning. Click to start a wave defense challenge.'],
            ['Waves', 'Each wave is harder (more enemies, more HP/dmg). Enemies (E, purple) spawn from portals and attack the nexus.'],
            ['Nexus HP', '200 HP. If destroyed, you must rebuild. Wave progress is kept.'],
            ['Colony Cap', '3 + (waves completed) colonists, max 12. Complete waves to grow your colony.'],
            ['Void Essence', 'Dropped by wave enemies. Used for Void Blade, Void Armor, Void Wall, Void Turret, Void Door.'],
            ['Strategy', 'Build walls/doors to funnel enemies, place turrets along path, draft colonists at chokepoints.'],
        ]
    },
    {
        title: 'Exploration (Rift Gate)',
        entries: [
            ['Rift Gate', '(Ω) Build after researching Planar Rift. Click to open the expedition panel. Consumes 6 mana.'],
            ['Expeditions', 'Select colonists (and optional pack animals) and a dimension, then launch. Party walks to the gate, explores, and returns with loot.'],
            ['Pack Animals', 'Tamed okapi can join expeditions as pack animals, reducing expedition duration by 25% each.'],
            ['Crystal Caves', 'Difficulty 1. 150-250 ticks. Yields stone, runite. Available by default with Rift Gate.'],
            ['Verdant Depths', 'Difficulty 1. 100-180 ticks. Yields wood, wheat, berries. Available by default.'],
            ['Shadow Realm', 'Difficulty 2. 250-400 ticks. Yields void essence, runite. Requires Deep Delving research.'],
            ['No Permadeath', 'Defeated colonists return at 1 HP. Entire party defeated = return empty-handed.'],
        ]
    },
    {
        title: 'Events',
        entries: [
            ['Wanderer', 'A new colonist wants to join. More likely when colony is happy. Accept or reject.'],
            ['Trade Caravan', 'Exchange resources at set rates (wood→food, stone→wood, food→planks).'],
            ['Crop Blight', 'Destroys ~40% of growing crops. Summer/autumn.'],
            ['Mineral Windfall', 'New stone deposits appear on the map.'],
            ['Fire', 'Spreads to adjacent flammable tiles. Colonists auto-extinguish. Rain puts fires out.'],
            ['Cold Snap', 'All outdoor crops die. Winter only.'],
            ['Animal Migration', 'Group of deer passes through (hunting opportunity).'],
            ['Inspiration', 'Random colonist gets +25 mood boost.'],
        ]
    },
    {
        title: 'Research (Arcanum required)',
        entries: [
            ['Arcanum required', 'Colonists study at the Arcanum to generate study points. Spend points to unlock research.'],
            ['Runecraft', '→ Etched Axe, unlocks Runeforging & Warding'],
            ['Druidcraft', '→ Corn, Potatoes, unlocks Beast Binding'],
            ['Ley Channeling', '→ Mana Crystal, unlocks Luminance/Ember Magic/Arcane Infusion'],
            ['Alchemy', '→ +2 bonus food per cooked meal'],
            ['Runeforging', '→ Runic Blade, Runic Pick, Runic Pickaxe, Boots of Haste'],
            ['Warding', '→ Arcane Sentinel'],
            ['Ember Magic', '→ Ember Ward'],
            ['Luminance', '→ Glowstone'],
            ['Arcane Infusion', '→ Enchanting Table'],
            ['Void Summoning', '(Ley Channeling + Warding) → Void Nexus'],
            ['Void Forging', '(Void Summoning + Runeforging) → Void Blade, Void Armor, Void Wall, Void Turret, Void Door'],
            ['Planar Rift', '(Void Summoning + Ley Channeling) → Rift Gate'],
            ['Deep Delving', '(Planar Rift) → Shadow Realm dimension'],
        ]
    },
    {
        title: 'Mana (Leylines)',
        entries: [
            ['Net Mana', 'Generation (mana crystals) minus consumption (glowstones, enchanting tables, ember wards, arcane sentinels, void turrets, rift gates, ice boxes). If negative, all mana-powered buildings stop working.'],
        ]
    },
    {
        title: 'Wolf Taming',
        entries: [
            ['Dangerous Tame', 'Wolves are dangerous to tame. Success chance = 40% base + 6% per Animals skill level. At skill 10, success is guaranteed.'],
            ['Retaliation', 'On tame failure, the wolf attacks the colonist for 12 damage and flees. The colonist gets negative mood thoughts.'],
            ['Guard Wolves', 'Once tamed, wolves become guard animals. They patrol near colonists and automatically attack raiders, wave enemies, and hostile wildlife within range 8.'],
            ['Guard States', 'Patrolling (following colonists), Engaging (attacking threats), Retreating (low HP, returning to safety).'],
        ]
    },
    {
        title: 'Golems',
        entries: [
            ['Overview', 'Golems are animated stone workers. They never eat, sleep, or have mood swings. Each specializes in one skill.'],
            ['Golem Forge', 'Build a Golem Forge (requires Golem Craft research) and click it to craft golems. Costs stone, runite, and void essence.'],
            ['Types', 'Farmer (farming 6), Miner (building 6), Combat (dmg 20, auto-fights), Hauler (hauling 8, fast speed).'],
            ['Limitations', 'Cannot equip tomes or learn spells. Cannot be drafted. Do not count toward colonist cap.'],
        ]
    },
    {
        title: 'Complex Structures',
        entries: [
            ['Pattern Activation', 'Build the core piece, then surround it with the required pattern. Activation is automatic when the pattern is complete. Destroying any piece deactivates the bonus.'],
            ['Great Forge', '3×3 room: Forge Core (⚒) at center, walls on all sides except one door. Effect: 2.5x equipment crafting speed for colonists within 3 tiles. Requires: Masterwork research.'],
            ['Ritual Circle', '5×5 diamond: Ritual Core (◎) at center, walls at 8 positions forming a diamond. Effect: -30% spell cooldowns within radius 6. Requires: Advanced Arcana research.'],
        ]
    },
    {
        title: 'Trading',
        entries: [
            ['Barter System', 'When a caravan arrives, open the trade panel to barter any resources. Your offer value must meet or exceed request value.'],
            ['Trade Values', 'Each resource has a base value. You sell at 70% (discount) and buy at 140% (markup) of base value.'],
            ['Exclusive Items', 'Traders occasionally carry rare items unavailable through crafting: Amulet of Fortune, Enchanted Blade, Wanderer\'s Cloak, Merchant\'s Ring.'],
        ]
    },
    {
        title: 'Guard/Patrol',
        entries: [
            ['Guard Mode', 'Toggle Guard on a colonist to make them patrol their current position instead of doing tasks. They engage hostiles within a wider radius than normal.'],
            ['Guard Radius', 'Guards patrol within 6 tiles of their post and engage threats within 10 tiles.'],
            ['Needs Priority', 'Guards still eat and sleep when needs are critical, then return to their post.'],
        ]
    },
    {
        title: 'Controls',
        entries: [
            ['WASD / Arrows', 'Pan camera.'],
            ['+/- ', 'Zoom in/out.'],
            ['Space', 'Pause/Unpause.'],
            ['< / >', 'Speed down/up (1x to 5x).'],
            ['B', 'Toggle Build mode.'],
            ['Z', 'Toggle Farm Zone mode.'],
            ['G', 'Toggle Gather/Designate mode.'],
            ['P', 'Toggle Priority panel.'],
            ['C', 'Toggle Craft panel.'],
            ['R', 'Toggle Research panel.'],
            ['T', 'Toggle Taming panel.'],
            ['I', 'Toggle Inventory panel.'],
            ['[ / ]', 'Select previous/next colonist (centers camera).'],
            ['Tab (Build)', 'Cycle build categories.'],
            ['Tab (Designate)', 'Switch between Chop and Mine.'],
            ['Click', 'Select colonist/animal/tile. Drag to box-select.'],
            ['Right-click', 'Move drafted colonists / rally point.'],
            ['Escape', 'Close panel or exit mode.'],
        ]
    },
    {
        title: 'Map Symbols',
        symbols: [
            ['.', 'Grass', '#22aa22'],
            [',', 'Dirt', '#88aa44'],
            ['#', 'Rock (slow)', '#666666'],
            ['▲', 'Tall Rock (impassable)', '#444444'],
            ['~', 'Water (slow)', '#4488cc'],
            ['T', 'Tree', '#228822'],
            ['o', 'Stone/Runite', '#aaaaaa'],
            ['@', 'Colonist', '#00ccff'],
            ['R', 'Raider', '#ff6600'],
            ['E', 'Void Enemy', '#ff2222'],
            ['V', 'Void Nexus', '#9933ff'],
            ['▓', 'Void Wall', '#6622aa'],
            ['Y', 'Void Turret', '#aa33ff'],
            ['Ω', 'Rift Gate', '#66aaff'],
            ['Ğ', 'Golem Forge', '#cc8833'],
            ['⚒', 'Forge Core', '#ff8844'],
            ['◎', 'Ritual Core', '#aa44ff'],
            ['G', 'Golem', '#888888'],
            ['!', 'Melee hit', '#ffff00'],
            ['*', 'Turret beam', '#ff4444'],
        ]
    },
];

export function renderGlossaryHTML() {
    let html = '';
    for (const section of GLOSSARY) {
        html += `<div style="color:#88ccff; font-weight:bold; margin-top:${html ? '12' : '10'}px;">-- ${section.title} --</div>`;
        if (section.symbols) {
            html += '<div style="font-family:monospace; color:#aaa;">';
            for (const [char, label, color] of section.symbols) {
                html += `<span style="color:${color}">${char}</span> ${label} &nbsp; `;
            }
            html += '</div>';
        } else {
            for (const [term, desc] of section.entries) {
                html += `<div><b style="color:#fff">${term}</b> — ${desc}</div>`;
            }
        }
    }
    return html;
}
