export class SaveManager {
    constructor(game) {
        this.game = game;
        this.saveKey = 'meu_rpg_web_save';
    }

    saveGame() {
        // Coleta todos os dados importantes
        const saveData = {
            player: {
                hp: this.game.player.hp,
                xp: this.game.player.xp,
                coins: this.game.player.coins,
                inventory: this.game.player.inventory,
                equipment: this.game.player.equipment,
                x: this.game.player.mesh.position.x,
                z: this.game.player.mesh.position.z
            },
            quests: this.game.questManager.quests
        };

        // Converte para String e salva no navegador
        localStorage.setItem(this.saveKey, JSON.stringify(saveData));
        this.game.ui.openPanel("Progresso Salvo!", "<p>Seu jogo foi salvo com sucesso.</p><p>Você pode fechar o navegador e continuar de onde parou depois.</p>");
    }

    loadGame() {
        const savedString = localStorage.getItem(this.saveKey);
        
        if (savedString) {
            const data = JSON.parse(savedString);

            // Restaura o Jogador
            this.game.player.hp = data.player.hp;
            this.game.player.xp = data.player.xp;
            this.game.player.coins = data.player.coins;
            this.game.player.inventory = data.player.inventory || [];
            this.game.player.equipment = data.player.equipment || { weapon: null, armor: null };
            
            // Restaura a Posição
            if (data.player.x !== undefined && data.player.z !== undefined) {
                // Removemos colisões temporariamente para forçar o teleporte
                this.game.player.mesh.position.set(data.player.x, this.game.player.mesh.position.y, data.player.z);
            }

            // Restaura as Missões
            if (data.quests) {
                this.game.questManager.quests = data.quests;
            }

            console.log("Jogo carregado com sucesso!");
            return true;
        }
        
        console.log("Nenhum save encontrado. Iniciando novo jogo.");
        return false;
    }
}
