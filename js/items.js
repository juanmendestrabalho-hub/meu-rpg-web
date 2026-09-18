export const Rarity = {
    COMMON: { id: 'common', name: 'Comum', color: '#ffffff', mult: 1.0 },
    RARE: { id: 'rare', name: 'Raro', color: '#0070dd', mult: 1.5 },
    EPIC: { id: 'epic', name: 'Épico', color: '#a335ee', mult: 2.5 }
};

export const ItemDB = {
    'sword': { id: 'sword', name: 'Espada Longa', type: 'weapon', baseDamage: 10, baseValue: 20 },
    'axe': { id: 'axe', name: 'Machado de Batalha', type: 'weapon', baseDamage: 15, baseValue: 30 },
    'staff': { id: 'staff', name: 'Cajado Arcano', type: 'weapon', baseDamage: 12, baseValue: 25 },
    
    'armor_leather': { id: 'armor_leather', name: 'Armadura de Couro', type: 'armor', baseDefense: 5, baseValue: 40 },
    'armor_iron': { id: 'armor_iron', name: 'Armadura de Ferro', type: 'armor', baseDefense: 15, baseValue: 100 },
    
    'potion_hp': { id: 'potion_hp', name: 'Poção de Vida', type: 'consumable', effect: 'heal', power: 30, baseValue: 15 }
};

export function generateItem(itemId, rarityKey) {
    const template = ItemDB[itemId];
    const rarity = Rarity[rarityKey];

    if (!template) {
        console.error(`Item ${itemId} não existe no ItemDB!`);
        return null;
    }

    return {
        id: template.id,
        name: template.name,
        type: template.type,
        rarity: rarity,
        damage: template.baseDamage ? Math.floor(template.baseDamage * rarity.mult) : 0,
        defense: template.baseDefense ? Math.floor(template.baseDefense * rarity.mult) : 0,
        value: Math.floor(template.baseValue * rarity.mult),
        effect: template.effect,
        power: template.power,
        uuid: Math.random().toString(36).substring(2, 9) 
    };
}
