export const CHANGELOG = [
    { date: '2026-07-23', message: 'Artifacts system: 14 artifacts with pedestal placement, AoE/global effects, combat targeting, expedition bonuses, durability & anvil repair' },
    { date: '2026-07-23', message: 'New buildings: Artifact Pedestal (place artifacts for radius buffs) and Anvil (repair broken artifacts)' },
    { date: '2026-07-23', message: 'Radius visualization: selecting pedestals, turrets, or heaters highlights affected tiles' },
    { date: '2026-07-23', message: 'Expedition loot is now kept even if all party members are defeated' },
    { date: '2026-07-23', message: 'Performance: Map-based O(1) colonist/task lookups, reusable renderer buffers, precomputed night lighting grid' },
    { date: '2026-07-23', message: 'Balance pass: ~2x longer mid-to-endgame (research costs, craft times, exploration durations, tome learning)' },
    { date: '2026-07-23', message: 'Raider AI overhaul: individual flee at 25% HP, group rout at 75% casualties, longer safety timeout' },
    { date: '2026-07-23', message: 'Dead colonists now sort to bottom of Colonists panel' },
    { date: '2026-07-23', message: 'New games start at 6:00 AM instead of midnight' },
    { date: '2026-07-23', message: 'Fix trader UI bug and add QoL to exploration info panel and easier to use starting screen' },
    { date: '2026-07-23', message: 'Way better glossary and exploration systems' },
    { date: '2026-07-23', message: 'Several todo list items like wolf taming and golems' },
    { date: '2026-07-23', message: 'Auto derived glossary from README.md' },
    { date: '2026-07-23', message: 'Wilderness update to make animals easier to extend' },
    { date: '2026-07-23', message: 'Divination school spells' },
    { date: '2026-07-23', message: 'Magic system and spell learning' },
    { date: '2026-07-23', message: 'Fixed config order' },
    { date: '2026-07-22', message: 'Reorganized config.js to make more sense to look at' },
    { date: '2026-07-22', message: 'Build list categorizing' },
    { date: '2026-07-22', message: 'Working on animal systems' },
    { date: '2026-07-22', message: 'Better research, multiple research benches allow for multiple colonists to work' },
    { date: '2026-07-20', message: 'Looking into unreachableFailers.add issue on game load' },
    { date: '2026-07-20', message: 'New overlay graphics, start of expedition system, food spoilage' },
    { date: '2026-07-18', message: 'Magic system todo' },
    { date: '2026-07-18', message: 'Dream todo list' },
    { date: '2026-07-17', message: 'Better recipes and randomized names' },
    { date: '2026-07-17', message: 'QoL changes' },
    { date: '2026-07-17', message: 'More item options and potions' },
    { date: '2026-07-17', message: 'More map generation options' },
    { date: '2026-07-17', message: 'All in config.js if possible' },
    { date: '2026-07-17', message: 'Better winter look and mobile top bar fix' },
    { date: '2026-07-17', message: 'Day-night light' },
    { date: '2026-07-17', message: 'Even more config.js centric extensibility' },
    { date: '2026-07-16', message: 'Fix mobile bug where info panel does not update when we go-to it' },
    { date: '2026-07-16', message: 'Reorganize file structure and improve color usability' },
    { date: '2026-07-16', message: 'Better colors' },
    { date: '2026-07-16', message: 'Big efficiency changes' },
    { date: '2026-07-16', message: 'Even more reliance on config.js' },
    { date: '2026-07-16', message: 'config.js overhaul' },
    { date: '2026-07-16', message: 'UI cleanup and tooltips' },
    { date: '2026-07-16', message: 'Way better mobile support' },
    { date: '2026-07-15', message: 'Implement wave system with void nexus defense mechanics' },
    { date: '2026-07-14', message: 'Add more names to COLONIST_NAMES array' },
    { date: '2026-07-14', message: 'UI overhaul' },
    { date: '2026-07-14', message: 'Clean up duplicate glossary entries' },
    { date: '2026-07-14', message: 'Enhance README with About section and heading updates' },
    { date: '2026-07-14', message: 'Enhance README with game mechanics and glossary' },
    { date: '2026-07-14', message: 'Fixing more bugs where buttons are destroyed mid-click' },
    { date: '2026-07-14', message: 'Optimize research panel HTML update logic' },
    { date: '2026-07-13', message: 'Add files via upload' },
    { date: '2026-07-13', message: 'Initial commit' },
];

export function renderChangelogHTML() {
    let html = '<div style="margin-bottom:12px;"><input type="text" id="changelog-search" placeholder="Search changelog..." style="width:100%;padding:6px 8px;background:#2a2a3e;border:1px solid #555;border-radius:4px;color:#ccc;font-family:inherit;font-size:12px;"></div>';
    html += '<div id="changelog-list">';
    html += _buildChangelogList(CHANGELOG);
    html += '</div>';
    return html;
}

function _buildChangelogList(entries) {
    let html = '';
    let lastDate = '';
    for (const entry of entries) {
        if (entry.date !== lastDate) {
            lastDate = entry.date;
            html += `<div style="color:#aaccff;font-weight:bold;margin-top:10px;margin-bottom:4px;font-size:11px;">${entry.date}</div>`;
        }
        html += `<div style="padding:2px 0 2px 12px;color:#ccc;font-size:12px;border-left:2px solid #444;margin-left:4px;">• ${entry.message}</div>`;
    }
    return html;
}

export function initChangelogInteraction() {
    const search = document.getElementById('changelog-search');
    const list = document.getElementById('changelog-list');
    if (!search || !list) return;
    search.addEventListener('input', () => {
        const q = search.value.toLowerCase().trim();
        if (!q) {
            list.innerHTML = _buildChangelogList(CHANGELOG);
            return;
        }
        const filtered = CHANGELOG.filter(e => e.message.toLowerCase().includes(q) || e.date.includes(q));
        list.innerHTML = filtered.length ? _buildChangelogList(filtered) : '<div style="color:#666;padding:8px;">No matching entries.</div>';
    });
}

export function renderCreditsHTML() {
    return `
<div style="text-align:center; padding:20px 0;">
    <div style="color:#ffcc00; font-size:16px; font-weight:bold; margin-bottom:16px;">~= CONVOCATION =~</div>
    <div style="color:#aaa; margin-bottom:20px;">A browser-based ASCII colony sim</div>
    <div style="color:#ccc; margin-bottom:8px;"><b>Design & Development</b></div>
    <div style="color:#aaa; margin-bottom:20px;">jurbani</div>
    <div style="color:#ccc; margin-bottom:8px;"><b>Built With</b></div>
    <div style="color:#aaa; margin-bottom:4px;">Vanilla JavaScript, HTML5 Canvas</div>
    <div style="color:#aaa; margin-bottom:20px;">No frameworks, no dependencies</div>
    <div style="color:#666; font-size:10px; margin-top:20px;">Version 0.1 — July 2026</div>
</div>`;
}
