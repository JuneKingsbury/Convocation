import { CONFIG, SEASONS, SEASON_EFFECTS } from './config.js';

export class Weather {
    constructor() {
        this.season = 'spring';
        this.seasonIndex = 0;
        this.seasonTick = 0;
        this.temperature = 15;
        this.currentWeather = 'clear';
        this.weatherTimer = 0;
        this.year = 1;
    }

    update(tick) {
        this.seasonTick++;
        if (this.seasonTick >= CONFIG.TICKS_PER_SEASON) {
            this.seasonTick = 0;
            this.seasonIndex = (this.seasonIndex + 1) % 4;
            this.season = SEASONS[this.seasonIndex];
            if (this.seasonIndex === 0) this.year++;
        }

        const effects = SEASON_EFFECTS[this.season];
        const [minTemp, maxTemp] = effects.tempRange;
        const seasonProgress = this.seasonTick / CONFIG.TICKS_PER_SEASON;
        this.temperature = minTemp + (maxTemp - minTemp) * (0.5 + 0.3 * Math.sin(seasonProgress * Math.PI));
        this.temperature += (Math.random() - 0.5) * 3;

        this.weatherTimer--;
        if (this.weatherTimer <= 0) {
            this.rollWeather();
        }
    }

    rollWeather() {
        const roll = Math.random();
        if (this.season === 'winter') {
            if (roll < 0.1) { this.currentWeather = 'blizzard'; this.weatherTimer = 30 + Math.floor(Math.random() * 40); }
            else if (roll < 0.3) { this.currentWeather = 'snow'; this.weatherTimer = 40 + Math.floor(Math.random() * 60); }
            else { this.currentWeather = 'clear'; this.weatherTimer = 50 + Math.floor(Math.random() * 100); }
        } else if (this.season === 'summer') {
            if (roll < 0.05) { this.currentWeather = 'thunderstorm'; this.weatherTimer = 15 + Math.floor(Math.random() * 20); }
            else if (roll < 0.15) { this.currentWeather = 'rain'; this.weatherTimer = 20 + Math.floor(Math.random() * 30); }
            else if (roll < 0.25) { this.currentWeather = 'heatwave'; this.weatherTimer = 40 + Math.floor(Math.random() * 60); }
            else { this.currentWeather = 'clear'; this.weatherTimer = 60 + Math.floor(Math.random() * 100); }
        } else {
            if (roll < 0.1) { this.currentWeather = 'thunderstorm'; this.weatherTimer = 10 + Math.floor(Math.random() * 15); }
            else if (roll < 0.25) { this.currentWeather = 'rain'; this.weatherTimer = 25 + Math.floor(Math.random() * 40); }
            else { this.currentWeather = 'clear'; this.weatherTimer = 60 + Math.floor(Math.random() * 80); }
        }
    }

    getGrowthMultiplier() {
        let mult = SEASON_EFFECTS[this.season].cropGrowthMult;
        if (this.currentWeather === 'rain') mult *= 1.3;
        if (this.currentWeather === 'heatwave') mult *= 0.7;
        if (this.currentWeather === 'blizzard') mult = 0;
        return mult;
    }

    applySnow(map) {
        if (this.season === 'winter') {
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    const tile = map[y][x];
                    if (tile.terrain === 'grass' && !tile.structure && !tile.zone) {
                        tile.snowCovered = true;
                    }
                }
            }
        } else {
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    map[y][x].snowCovered = false;
                }
            }
        }
    }

    getSeasonDisplay() {
        const icons = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
        return `${icons[this.season]} Y${this.year}`;
    }

    getWeatherDisplay() {
        const icons = { clear: 'Clear', rain: 'Rain', thunderstorm: 'Storm', snow: 'Snow', blizzard: 'Blizzard', heatwave: 'Heat Wave' };
        return icons[this.currentWeather] || this.currentWeather;
    }
}
