import { generateItem } from './items.js';

export class StealthManager {
    constructor(game) {
        this.game = game;
    }

    attemptSteal(target) {
        // Verifica se o objeto alvo é realmente uma pessoa (NPC)
        if (!target.isNPC) {
            this.game.ui.openPanel("Aviso", "<p>Não há nada de valor para roubar aqui.</p>");
            return;
        }

        if (target.hasBeenRobbed) {
            this.game.ui.openPanel("Aviso", "<p>Você já limpou os bolsos desta pessoa. Estão vazios!</p>");
            return;
        }

        // Rolar os dados (RNG) - 50% de chance de Sucesso
        const roll = Math.random();
        const successChance = 0.50; 

        if (roll <= successChance) {
            // SUCESSO!
            target.hasBeenRobbed = true;
            const moedasRoubadas = Math.floor(Math.random() * 60) + 20;
            this.game.player.coins += moedasRoubadas;
            
            // Pequena chance de roubar uma Poção de Vida
            let itemMsg = "";
            if (Math.random() > 0.6) {
                const potion = generateItem('potion_hp', 'COMMON');
                this.game.player.inventory.push(potion);
                itemMsg = `<br>Você também surrupiou uma <b>${potion.name}</b>!`;
            }

            this.game.ui.updateHUD(this.game.player);
            this.game.ui.openPanel("Mãos Leves!", `<p style="color:#4CAF50;">Você foi furtivo e roubou ${moedasRoubadas} moedas do ${target.name}!</p>${itemMsg}`);
        } else {
            // FALHA! O NPC descobre o roubo e vira um inimigo
            this.game.ui.openPanel("FALHA CRÍTICA!", `<p>O ${target.name} pegou você com a mão no bolso dele!</p><p style="color:red; font-weight:bold; font-size:18px; margin-top:10px;">Ele se tornou hostil e vai te atacar!</p>`);
            
            // Executa a função na engine que deleta o NPC pacífico e "spawna" um inimigo no lugar dele
            this.game.turnNpcIntoEnemy(target);
        }
    }
}
