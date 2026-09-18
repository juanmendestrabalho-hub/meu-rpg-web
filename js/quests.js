import { generateItem } from './items.js';

export class QuestManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // NOVO: Dicionário escalonável de missões
        this.quests = {
            mageQuest: {
                status: 'unstarted' // unstarted, active, artifact_found, completed
            },
            clericQuest: {
                status: 'unstarted', // unstarted, active, objective_met, completed
                targetEnemy: 'Ladino Sombrio',
                targetCount: 2,
                currentCount: 0
            }
        };
    }

    // ----------------------------------------------------
    // MISSÃO DE COLETA (MAGO)
    // ----------------------------------------------------
    interactWithMage() {
        let title = "Mago Ancião";
        let content = "";
        const q = this.quests.mageQuest;

        if (q.status === 'unstarted') {
            content = `
                <p>Saudações, viajante. Goblins roubaram meu <b>Artefato Mágico</b> (Cubo Amarelo).</p>
                <p>Aceita recuperá-lo para mim em troca de moedas e experiência?</p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-accept-mage" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white;">Aceitar Missão</button>
                    <button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Recusar</button>
                </div>
            `;
        } 
        else if (q.status === 'active') {
            content = `<p>Você ainda não encontrou o artefato? Procure por um cubo amarelo brilhante girando pelo mundo!</p>
                       <div style="margin-top: 20px; text-align: center;"><button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Entendido</button></div>`;
        }
        else if (q.status === 'artifact_found') {
            content = `
                <p>Pelos deuses, você encontrou! Muito obrigado, guerreiro.</p>
                <p style="color: #4CAF50; margin-top: 10px;"><b>Recompensa: +100 Moedas, +50 XP</b></p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-complete-mage" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white;">Concluir e Receber</button>
                </div>
            `;
        }
        else if (q.status === 'completed') {
            content = `<p>A magia flui mais forte agora graças a você. Boa sorte em sua jornada.</p>
                       <div style="margin-top: 20px; text-align: center;"><button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Adeus</button></div>`;
        }

        this.game.ui.openPanel(title, content);

        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-mage');
            const btnComplete = document.getElementById('btn-complete-mage');
            const btnClose = document.getElementById('btn-close-dialog');

            if (btnAccept) {
                btnAccept.addEventListener('click', () => {
                    q.status = 'active';
                    this.game.ui.openPanel("Mago Ancião", "<p>Excelente! Retorne a mim quando tiver o artefato.</p>");
                });
            }
            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    q.status = 'completed';
                    this.game.player.coins += 100;
                    this.game.player.xp += 50;
                    this.game.ui.updateHUD(this.game.player);
                    this.game.ui.openPanel("Mago Ancião", "<p>Recompensas recebidas com sucesso!</p>");
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
    // MISSÃO DE COMBATE (CLÉRIGO / MERCADOR)
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

        // Diálogo raiz do NPC de múltiplas funções
        let content = `
            <p>Que a luz guie seus passos. Deseja ver meus produtos ou precisa de algo mais?</p>
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
            content = `
                <p>Ladrões profanaram nosso templo! Você poderia dar o exemplo e derrotar <b>${q.targetCount} ${q.targetEnemy}s</b> nos arredores?</p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-accept-cleric" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white;">Aceitar</button>
                </div>
            `;
        } else if (q.status === 'active') {
            content = `<p>Você derrotou <b>${q.currentCount} de ${q.targetCount}</b> ${q.targetEnemy}s. A luz conta com você.</p>
            <div style="margin-top:15px; text-align: center;"><button id="btn-close-dialog" style="padding: 10px;">Entendido</button></div>`;
        } else if (q.status === 'objective_met') {
            content = `<p>A justiça foi feita! Pegue esta armadura sagrada e algumas moedas como agradecimento.</p>
            <div style="margin-top:15px; text-align: center;"><button id="btn-complete-cleric" style="padding: 10px; background: #2b5c2b; color: white;">Receber Recompensa</button></div>`;
        }
        
        this.game.ui.openPanel("Missão do Clérigo", content);
        
        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-cleric');
            const btnComplete = document.getElementById('btn-complete-cleric');
            const btnClose = document.getElementById('btn-close-dialog');
            
            if (btnAccept) {
                btnAccept.addEventListener('click', () => {
                    q.status = 'active';
                    this.game.ui.openPanel("Missão Aceita", "<p>Estarei orando por você. Cuidado com os ataques deles!</p>");
                });
            }
            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    q.status = 'completed';
                    this.game.player.coins += 150;
                    this.game.player.xp += 100;
                    
                    // Entrega uma Armadura Rara como recompensa!
                    const rewardItem = generateItem('armor_iron', 'RARE');
                    this.game.player.inventory.push(rewardItem);
                    
                    this.game.ui.updateHUD(this.game.player);
                    this.game.ui.openPanel("Missão Concluída", `<p>Recompensa Recebida: 150 Moedas, 100 XP e <b>${rewardItem.name}</b>!</p>`);
                });
            }
            if (btnClose) btnClose.addEventListener('click', () => this.game.ui.closePanel());
        }, 0);
    }

    // ----------------------------------------------------
    // NOVO: SISTEMA DE RASTREAMENTO DE ABATES (TRACKING)
    // ----------------------------------------------------
    onEnemyKilled(enemyName) {
        const q = this.quests.clericQuest;
        
        // Se a missão estiver ativa e o inimigo for o alvo correto
        if (q.status === 'active' && enemyName === q.targetEnemy) {
            q.currentCount++;
            console.log(`Missão Atualizada: ${q.currentCount}/${q.targetCount} ${enemyName}s derrotados.`);
            
            if (q.currentCount >= q.targetCount) {
                q.status = 'objective_met';
                
                // Exibe um aviso na tela para o jogador saber que concluiu
                setTimeout(() => {
                    this.game.ui.openPanel("Objetivo Concluído!", `<p>Você derrotou os ${q.targetCount} ${q.targetEnemy}s!</p><p>Retorne ao Clérigo para sua recompensa.</p>`);
                }, 2000); // Aparece 2 segundos após a tela de Loot
            }
        }
    }
}
