import { generateItem } from './items.js';

export class QuestManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.quests = {
            mageQuest: { status: 'unstarted' }, // Fases: unstarted -> active -> artifact_found -> boss_active -> boss_defeated -> completed
            clericQuest: {
                status: 'unstarted', 
                targetEnemy: 'Ladino Sombrio',
                targetCount: 2,
                currentCount: 0
            }
        };
    }

    // ----------------------------------------------------
    // MISSÃO ÉPICA (MAGO - ARTEFATO + CHEFÃO)
    // ----------------------------------------------------
    interactWithMage() {
        let title = "Mago Ancião";
        let content = "";
        const q = this.quests.mageQuest;

        if (q.status === 'unstarted') {
            content = `
                <p>Saudações. Goblins roubaram meu <b>Artefato Mágico</b> (Cubo Amarelo).</p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-accept-mage" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white;">Aceitar Missão</button>
                    <button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Recusar</button>
                </div>`;
        } 
        else if (q.status === 'active') {
            content = `<p>Você ainda não encontrou o artefato? Procure por um cubo amarelo brilhante!</p>
                       <div style="margin-top: 20px; text-align: center;"><button id="btn-close-dialog" style="padding: 10px;">Entendido</button></div>`;
        }
        else if (q.status === 'artifact_found') {
            content = `
                <p>Excelente! Você trouxe o Artefato! Mas sinto uma energia sombria...</p>
                <p style="color: #ff6666; margin-top: 10px;"><b>Nova Tarefa: Vá até a Masmorra pelo Portal e elimine o Rei Orc!</b></p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-complete-mage" style="padding: 10px; cursor: pointer; background: #8A2BE2; color: white;">Aceitar Segunda Parte</button>
                </div>`;
        }
        else if (q.status === 'boss_active') {
            content = `<p>O Rei Orc vive nas profundezas da Masmorra. Passe pelo Portal Roxo e destrua-o!</p>
                       <div style="margin-top: 20px; text-align: center;"><button id="btn-close-dialog" style="padding: 10px;">Certo</button></div>`;
        }
        else if (q.status === 'boss_defeated') {
            content = `
                <p>A energia sombria sumiu! Você é um verdadeiro herói, salve esta recompensa.</p>
                <p style="color: #4CAF50; margin-top: 10px;"><b>Recompensa: +300 Moedas, +200 XP, Machado Épico</b></p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-finish-mage" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white;">Concluir e Receber</button>
                </div>`;
        }
        else if (q.status === 'completed') {
            content = `<p>A magia flui mais forte agora graças a você. Boa sorte em sua jornada.</p>
                       <div style="margin-top: 20px; text-align: center;"><button id="btn-close-dialog" style="padding: 10px;">Adeus</button></div>`;
        }

        this.game.ui.openPanel(title, content);

        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-mage');
            const btnComplete = document.getElementById('btn-complete-mage');
            const btnFinish = document.getElementById('btn-finish-mage');
            const btnClose = document.getElementById('btn-close-dialog');

            if (btnAccept) {
                btnAccept.addEventListener('click', () => {
                    q.status = 'active';
                    this.game.ui.openPanel("Mago Ancião", "<p>Retorne a mim quando tiver o artefato.</p>");
                });
            }
            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    q.status = 'boss_active';
                    this.game.ui.openPanel("Missão Atualizada", "<p>O Rei Orc o aguarda na Masmorra.</p>");
                });
            }
            if (btnFinish) {
                btnFinish.addEventListener('click', () => {
                    q.status = 'completed';
                    this.game.player.coins += 300;
                    this.game.player.xp += 200;
                    // Recompensa Épica
                    const espolio = generateItem('axe', 'EPIC');
                    this.game.player.inventory.push(espolio);
                    this.game.ui.updateHUD(this.game.player);
                    this.game.ui.openPanel("Mago Ancião", `<p>Recompensas recebidas: <b>${espolio.name}</b>!</p>`);
                });
            }
            if (btnClose) btnClose.addEventListener('click', () => this.game.ui.closePanel());
        }, 0);
    }

    collectArtifact() {
        if (this.quests.mageQuest.status === 'active') {
            this.quests.mageQuest.status = 'artifact_found';
            this.game.ui.openPanel("Item Coletado", "<p>Você recuperou o Artefato Mágico! Retorne ao Mago.</p>");
            return true; 
        } else {
            this.game.ui.openPanel("Aviso", "<p>Este item exala poder, mas você não tem motivos para pegá-lo agora.</p>");
            return false; 
        }
    }

    // ----------------------------------------------------
    // MISSÃO SECUNDÁRIA E LOJA (CLÉRIGO)
    // ----------------------------------------------------
    interactWithCleric() {
        const q = this.quests.clericQuest;
        let title = "Clérigo Mercador";
        
        let questButton = "";
        if (q.status === 'unstarted') {
            questButton = `<button id="btn-cleric-quest" style="padding: 10px; cursor: pointer; background: #2244cc; color: white;">Precisa de ajuda?</button>`;
        } else if (q.status === 'active') {
            questButton = `<button id="btn-cleric-quest" style="padding: 10px; cursor: pointer; background: #666; color: white;">Sobre a missão...</button>`;
        } else if (q.status === 'objective_met') {
            questButton = `<button id="btn-cleric-quest" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white; border: 2px solid #4CAF50; animation: pulse 1.5s infinite;">Entregar Missão</button>`;
        }

        let content = `
            <p>Deseja ver meus produtos ou precisa de algo mais?</p>
            <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                <button id="btn-cleric-shop" style="padding: 10px; cursor: pointer; background: #8b7355; color: white; font-weight: bold;">Ver Mercadorias (Loja)</button>
                ${questButton}
                <button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Adeus</button>
            </div>
        `;

        this.game.ui.openPanel(title, content);

        setTimeout(() => {
            const btnShop = document.getElementById('btn-cleric-shop');
            const btnQuest = document.getElementById('btn-cleric-quest');
            const btnClose = document.getElementById('btn-close-dialog');

            if (btnShop) btnShop.addEventListener('click', () => this.game.shopManager.openShop());
            if (btnClose) btnClose.addEventListener('click', () => this.game.ui.closePanel());
            if (btnQuest) btnQuest.addEventListener('click', () => this.handleClericQuest());
        }, 0);
    }

    handleClericQuest() {
        const q = this.quests.clericQuest;
        let content = "";
        
        if (q.status === 'unstarted') {
            content = `<p>Ladrões profanaram nosso templo! Derrote <b>${q.targetCount} ${q.targetEnemy}s</b> nos arredores!</p>
                <div style="margin-top: 20px; text-align: center;"><button id="btn-accept-cleric" style="padding: 10px; background: #2b5c2b; color: white;">Aceitar</button></div>`;
        } else if (q.status === 'active') {
            content = `<p>Você derrotou <b>${q.currentCount} de ${q.targetCount}</b> ${q.targetEnemy}s.</p>`;
        } else if (q.status === 'objective_met') {
            content = `<p>A justiça foi feita! Pegue esta armadura sagrada.</p>
            <div style="margin-top:15px; text-align: center;"><button id="btn-complete-cleric" style="padding: 10px; background: #2b5c2b; color: white;">Receber Recompensa</button></div>`;
        }
        
        this.game.ui.openPanel("Missão do Clérigo", content);
        
        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-cleric');
            const btnComplete = document.getElementById('btn-complete-cleric');
            
            if (btnAccept) {
                btnAccept.addEventListener('click', () => {
                    q.status = 'active';
                    this.game.ui.openPanel("Missão Aceita", "<p>Estarei orando por você.</p>");
                });
            }
            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    q.status = 'completed';
                    this.game.player.coins += 150;
                    this.game.player.xp += 100;
                    const rewardItem = generateItem('armor_iron', 'RARE');
                    this.game.player.inventory.push(rewardItem);
                    this.game.ui.updateHUD(this.game.player);
                    this.game.ui.openPanel("Missão Concluída", `<p>Recompensa Recebida: <b>${rewardItem.name}</b>!</p>`);
                });
            }
        }, 0);
    }

    // ----------------------------------------------------
    // ESCUTADOR DE ABATES GLOBAIS
    // ----------------------------------------------------
    onEnemyKilled(enemyName) {
        // Checa Missão do Clérigo (Ladinos)
        const cq = this.quests.clericQuest;
        if (cq.status === 'active' && enemyName === cq.targetEnemy) {
            cq.currentCount++;
            if (cq.currentCount >= cq.targetCount) {
                cq.status = 'objective_met';
                setTimeout(() => this.game.ui.openPanel("Objetivo Concluído!", `<p>Você derrotou os inimigos. Retorne ao Clérigo!</p>`), 2000); 
            }
        }
        
        // Checa Missão do Mago (Chefe da Masmorra)
        const mq = this.quests.mageQuest;
        if (mq.status === 'boss_active' && enemyName === 'Rei Orc') {
            mq.status = 'boss_defeated';
            setTimeout(() => this.game.ui.openPanel("Chefe Derrotado!", `<p>Você destruiu o Rei Orc! Retorne ao Mago na Vila para receber sua recompensa Épica.</p>`), 2000);
        }
    }
}
