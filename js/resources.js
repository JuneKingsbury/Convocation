import { CONFIG } from './config.js';

export class ResourceManager {
    constructor() {
        this.stockpile = { ...CONFIG.START_RESOURCES };
        this.weapons = [];
    }

    has(costs) {
        for (const [resource, amount] of Object.entries(costs)) {
            if ((this.stockpile[resource] || 0) < amount) return false;
        }
        return true;
    }

    deduct(costs) {
        for (const [resource, amount] of Object.entries(costs)) {
            this.stockpile[resource] = (this.stockpile[resource] || 0) - amount;
        }
    }

    add(resources) {
        for (const [resource, amount] of Object.entries(resources)) {
            this.stockpile[resource] = (this.stockpile[resource] || 0) + amount;
        }
    }

    addWeapon(weaponType) {
        this.weapons.push(weaponType);
    }

    takeWeapon() {
        if (this.weapons.length === 0) return null;
        this.weapons.sort((a, b) => b.damage - a.damage);
        return this.weapons.shift();
    }

    getWealth() {
        let wealth = 0;
        for (const [, amount] of Object.entries(this.stockpile)) {
            wealth += amount;
        }
        wealth += this.weapons.length * 10;
        return wealth;
    }
}
