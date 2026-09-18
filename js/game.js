export class SaveManager {
    constructor(game) {
        this.game = game;
        this.saveKey = 'meu_rpg_web_save';
    }

    saveGame() {
        const saveData = {
            level: this.game.currentLevel, // NOVO: Salva o ID da fase atual
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

        localStorage.setItem(this.saveKey, JSON.stringify(saveData));
        this.game.ui.openPanel("Progresso Salvo!", "<p>Seu jogo foi salvo com sucesso.</p>");
    }

    loadGame() {
        const savedString = localStorage.getItem(this.saveKey);
        
        if (savedString) {
            const data = JSON.parse(savedString);

            // NOVO: Carrega o mapa correto ANTES de posicionar o jogador
            if (data.level) {
                this.game.loadLevel(data.level);
            } else {
                this.game.loadLevel('village');
            }

            this.game.player.hp = data.player.hp;
            this.game.player.xp = data.player.xp;
            this.game.player.coins = data.player.coins;
            this.game.player.inventory = data.player.inventory || [];
            this.game.player.equipment = data.player.equipment || { weapon: null, armor: null };
            
            if (data.player.x !== undefined && data.player.z !== undefined) {
                this.game.player.mesh.position.set(data.player.x, this.game.player.mesh.position.y, data.player.z);
            }

            if (data.quests) {
                this.game.questManager.quests = data.quests;
            }

            return true;
        }
        
        return false;
    }
}
