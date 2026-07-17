import { CONFIG, FOODSTUFFS, WORK_CONFIG } from '../core/config.js';

export { FOODSTUFFS };

export class ResourceManager {
    constructor() {
        this.stockpile = { ...CONFIG.START_RESOURCES };
        this.weapons = [];
        this.armors = [];
    }

    getFoodstuffTotal() {
        let total = 0;
        for (const item of FOODSTUFFS) {
            total += this.stockpile[item] || 0;
        }
        return total;
    }

    has(costs) {
        for (const [resource, amount] of Object.entries(costs)) {
            if (resource === 'foodstuffs') {
                if (this.getFoodstuffTotal() < amount) return false;
            } else {
                if ((this.stockpile[resource] || 0) < amount) return false;
            }
        }
        return true;
    }

    deduct(costs) {
        for (const [resource, amount] of Object.entries(costs)) {
            if (resource === 'foodstuffs') {
                this.deductFoodstuffs(amount);
            } else {
                this.stockpile[resource] = (this.stockpile[resource] || 0) - amount;
            }
        }
    }

    deductFoodstuffs(amount) {
        let remaining = amount;
        for (const item of FOODSTUFFS) {
            if (remaining <= 0) break;
            const available = this.stockpile[item] || 0;
            const take = Math.min(available, remaining);
            this.stockpile[item] -= take;
            remaining -= take;
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

    addArmor(armor) {
        this.armors.push(armor);
    }

    takeArmor() {
        if (this.armors.length === 0) return null;
        this.armors.sort((a, b) => b.damageReduction - a.damageReduction);
        return this.armors.shift();
    }

    getWealth() {
        let wealth = 0;
        for (const [, amount] of Object.entries(this.stockpile)) {
            wealth += amount;
        }
        wealth += this.weapons.length * WORK_CONFIG.wealthPerWeapon;
        return wealth;
    }
}
