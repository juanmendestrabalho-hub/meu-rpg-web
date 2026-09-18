import { generateItem } from './items.js';

export class QuestManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.quests = {
            mageQuest: { status: 'unstarted' }, 
            clericQuest: {
                status: 'unstarted', 
                targetEnemy: 'Ladino Sombrio',
                targetCount: 2,
                currentCount: 0
            },
            hunterQuest: {
                status: 'unstarted', 
                targetCount: 3, 
                currentCount: 0
            },
            thiefQuest: {
                status: 'unstarted', 
                targetNPC: 'Clérigo Mercador'
            }
        };
    }

    // ----------------------------------------------------
    // MISSÃO ÉPICA (MAGO)
    // ----------------------------------------------------
    interactWithMage() {
        let title = "Mago Ancião";
        let content = "";
        const q = this.quests.mageQuest;

        if (q.status === 'unstarted') {
            content = `<p>Saudações. Goblins roubaram meu <b>Artefato Mágico</b> (Cubo Amarelo).</p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-accept-mage" style="padding: 10px; background: #2b5c2b; color: white; cursor: pointer;">Aceitar Missão</button>
                </div>`;
        } else if (q.status === 'active') {
            content = `<p>Você ainda não encontrou o artefato? Procure por um cubo amarelo brilhante!</p>`;
        } else if (q.status === 'artifact_found') {
            content = `<p>Excelente! Mas sinto uma energia sombria...</p>
                <p style="color: #ff6666;"><b>Vá até a Masmorra pelo Portal e elimine o Rei Orc!</b></p>
                <div style="margin-top: 20px; text-align: center;"><button id="btn-complete-mage" style="padding: 10px; background: #8A2BE2; color: white; cursor: pointer;">Aceitar</button></div>`;
        } else if (q.status === 'boss_active') {
            content = `<p>O Rei Orc vive nas profundezas da Masmorra. Destrua-o!</p>`;
        } else if (q.status === 'boss_defeated') {
            content = `<p>A energia sombria sumiu! Você é um verdadeiro herói.</p>
                <div style="margin-top: 20px; text-align: center;"><button id="btn-finish-mage" style="padding: 10px; background: #2b5c2b; color: white; cursor: pointer;">Receber Recompensa Épica</button></div>`;
        } else if (q.status === 'completed') {
            content = `<p>A magia flui mais forte agora graças a você.</p>`;
        }

        this.game.ui.openPanel(title, content);

        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-mage');
            const btnComplete = document.getElementById('btn-complete-mage');
            const btnFinish = document.getElementById('btn-finish-mage');

            if (btnAccept) btnAccept.addEventListener('click', () => { q.status = 'active'; this.game.ui.closePanel(); });
            if (btnComplete) btnComplete.addEventListener('click', () => { q.status = 'boss_active'; this.game.ui.closePanel(); });
            if (btnFinish) btnFinish.addEventListener('click', () => {
                q.status = 'completed';
                this.game.player.coins += 300;
                this.game.player.xp += 200;
                const espolio = generateItem('axe', 'EPIC');
                this.game.player.inventory.push(espolio);
                this.game.ui.updateHUD(this.game.player);
                this.game.ui.openPanel("Mago Ancião", `<p>Recompensas recebidas: <b>${espolio.name}</b>!</p>`);
            });
        }, 0);
    }

    collectArtifact() {
        if (this.quests.mageQuest.status === 'active') {
            this.quests.mageQuest.status = 'artifact_found';
            this.game.ui.openPanel("Item Coletado", "<p>Você recuperou o Artefato Mágico! Retorne ao Mago.</p>");
            return true; 
        } else {
            this.game.ui.openPanel("Aviso", "<p>Você não tem motivos para pegar isso agora.</p>");
            return false; 
        }
    }

    // ----------------------------------------------------
    // MISSÃO SECUNDÁRIA E LOJA (CLÉRIGO)
    // ----------------------------------------------------
    interactWithCleric() {
        const q = this.quests.clericQuest;
        let questBtn = q.status === 'unstarted' ? `<button id="btn-cleric-quest" style="padding: 10px; background: #2244cc; color: white; cursor: pointer;">Precisa de ajuda?</button>` :
                       q.status === 'active' ? `<button id="btn-cleric-quest" style="padding: 10px; background: #666; color: white; cursor: pointer;">Sobre a missão...</button>` :
                       q.status === 'objective_met' ? `<button id="btn-cleric-quest" style="padding: 10px; background: #2b5c2b; color: white; cursor: pointer; border: 2px solid #4CAF50; animation: pulse 1.5s infinite;">Entregar Missão</button>` : '';

        this.game.ui.openPanel("Clérigo Mercador", `
            <p>Deseja ver meus produtos ou precisa de algo mais?</p>
            <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                <button id="btn-cleric-shop" style="padding: 10px; background: #8b7355; color: white; font-weight: bold; cursor: pointer;">Ver Mercadorias</button>
                ${questBtn}
            </div>
        `);

        setTimeout(() => {
            const btnShop = document.getElementById('btn-cleric-shop');
            const btnQuest = document.getElementById('btn-cleric-quest');
            if (btnShop) btnShop.addEventListener('click', () => this.game.shopManager.openShop());
            if (btnQuest) btnQuest.addEventListener('click', () => this.handleClericQuest());
        }, 0);
    }

    handleClericQuest() {
        const q = this.quests.clericQuest;
        if (q.status === 'unstarted') {
            this.game.ui.openPanel("Missão do Clérigo", `<p>Derrote <b>${q.targetCount} ${q.targetEnemy}s</b>!</p><button id="btn-accept-cleric" style="padding: 10px; background: #2b5c2b; color: white; margin-top: 15px; cursor: pointer;">Aceitar</button>`);
            setTimeout(() => document.getElementById('btn-accept-cleric').addEventListener('click', () => { q.status = 'active'; this.game.ui.closePanel(); }), 0);
        } else if (q.status === 'objective_met') {
            this.game.ui.openPanel("Missão do Clérigo", `<p>Pegue esta armadura sagrada.</p><button id="btn-complete-cleric" style="padding: 10px; background: #2b5c2b; color: white; margin-top: 15px; cursor: pointer;">Receber Recompensa</button>`);
            setTimeout(() => document.getElementById('btn-complete-cleric').addEventListener('click', () => {
                q.status = 'completed';
                this.game.player.coins += 150;
                this.game.player.xp += 100;
                const rewardItem = generateItem('armor_iron', 'RARE');
                this.game.player.inventory.push(rewardItem);
                this.game.ui.updateHUD(this.game.player);
                this.game.ui.openPanel("Missão Concluída", `<p>Você recebeu: <b>${rewardItem.name}</b>!</p>`);
            }), 0);
        } else if (q.status === 'active') {
            this.game.ui.openPanel("Missão do Clérigo", `<p>Você derrotou <b>${q.currentCount} de ${q.targetCount}</b> ${q.targetEnemy}s.</p>`);
        }
    }

    // ----------------------------------------------------
    // MISSÃO DO CAÇADOR (Coleta de Drops)
    // ----------------------------------------------------
    interactWithHunter() {
        const q = this.quests.hunterQuest;
        let content = "";
        
        if (q.status === 'unstarted') {
            content = `<p>Inimigos nas redondezas têm carregado <b>Fragmentos Sombrios</b> (Caixas Roxas). Quando derrotá-los, se tiver sorte, eles deixarão um cair.</p>
                       <p>Traga-me <b>${q.targetCount}</b> e eu pagarei bem.</p>
                       <div style="margin-top: 20px; text-align: center;"><button id="btn-accept-hunter" style="padding: 10px; background: #2b5c2b; color: white; cursor: pointer;">Aceitar Caçada</button></div>`;
        } else if (q.status === 'active') {
            content = `<p>Você encontrou <b>${q.currentCount} de ${q.targetCount}</b> fragmentos. Continue lutando!</p>`;
        } else if (q.status === 'objective_met') {
            content = `<p>Ótimo trabalho! Aqui está o seu ouro.</p>
                       <div style="margin-top:15px; text-align: center;"><button id="btn-complete-hunter" style="padding: 10px; background: #2b5c2b; color: white; cursor: pointer;">Receber Pagamento</button></div>`;
        } else if (q.status === 'completed') {
            content = `<p>Obrigado pela ajuda, caçador. Os fragmentos serão úteis.</p>`;
        }

        this.game.ui.openPanel("O Caçador", content);

        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-hunter');
            const btnComplete = document.getElementById('btn-complete-hunter');
            if (btnAccept) btnAccept.addEventListener('click', () => {
                q.status = 'active';
                this.game.ui.closePanel();
            });
            if (btnComplete) btnComplete.addEventListener('click', () => {
                q.status = 'completed';
                this.game.player.coins += 200;
                this.game.player.xp += 80;
                this.game.ui.updateHUD(this.game.player);
                this.game.ui.openPanel("O Caçador", `<p>Recompensa Recebida: <b>200 Moedas</b>!</p>`);
            });
        }, 0);
    }

    collectFragment() {
        const q = this.quests.hunterQuest;
        if (q.status === 'active') {
            q.currentCount++;
            if (q.currentCount >= q.targetCount) {
                q.status = 'objective_met';
                this.game.ui.openPanel("Missão Atualizada", "<p>Você juntou todos os Fragmentos! Retorne ao Caçador.</p>");
            } else {
                this.game.ui.openPanel("Fragmento Coletado", `<p>Você tem ${q.currentCount} de ${q.targetCount}.</p>`);
            }
            return true; 
        }
        return false;
    }

    // ----------------------------------------------------
    // MISSÃO DO LADINO (Furtividade)
    // ----------------------------------------------------
    interactWithThief() {
        const q = this.quests.thiefQuest;
        let content = "";
        
        if (q.status === 'unstarted') {
            content = `<p>Ei, psiu... O ${q.targetNPC} carrega uma rica <b>Pochete de Ouro</b>. Aproxime-se dele, use sua habilidade furtiva <b>[R]</b> para roubá-lo. Se conseguir sem ser notado, dividiremos os lucros!</p>
                       <div style="margin-top: 20px; text-align: center;"><button id="btn-accept-thief" style="padding: 10px; background: #2b5c2b; color: white; cursor: pointer;">Aceitar Roubo</button></div>`;
        } else if (q.status === 'active') {
            content = `<p>Ainda não conseguiu? Chegue perto do Clérigo e aperte <b>[R]</b>. Cuidado, se falhar ele vai ficar furioso!</p>`;
        } else if (q.status === 'objective_met') {
            content = `<p>Hehe, você tem mãos de veludo! Como prometido, aqui está sua parte, além de uma poção especial.</p>
                       <div style="margin-top:15px; text-align: center;"><button id="btn-complete-thief" style="padding: 10px; background: #2b5c2b; color: white; cursor: pointer;">Receber</button></div>`;
        } else if (q.status === 'completed') {
            content = `<p>Fique nas sombras, parceiro.</p>`;
        }

        this.game.ui.openPanel("Ladino Misterioso", content);

        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-thief');
            const btnComplete = document.getElementById('btn-complete-thief');
            if (btnAccept) btnAccept.addEventListener('click', () => {
                q.status = 'active';
                this.game.ui.closePanel();
            });
            if (btnComplete) btnComplete.addEventListener('click', () => {
                q.status = 'completed';
                this.game.player.coins += 250;
                const potion = generateItem('potion_hp', 'EPIC');
                this.game.player.inventory.push(potion);
                this.game.ui.updateHUD(this.game.player);
                this.game.ui.openPanel("Ladino Misterioso", `<p>Recompensa Recebida: <b>250 Moedas e ${potion.name}</b>!</p>`);
            });
        }, 0);
    }

    onStealSuccess(npcName) {
        const q = this.quests.thiefQuest;
        if (q.status === 'active' && npcName === q.targetNPC) {
            q.status = 'objective_met';
            setTimeout(() => {
                this.game.ui.openPanel("Roubo Perfeito!", "<p>Você conseguiu a Pochete de Ouro! Volte ao Ladino Misterioso para dividir o saque.</p>");
            }, 2500); 
        }
    }

    // ----------------------------------------------------
    // ESCUTADORES GLOBAIS
    // ----------------------------------------------------
    
    onEnemyKilled(enemyName) {
        const cq = this.quests.clericQuest;
        if (cq.status === 'active' && enemyName === cq.targetEnemy) {
            cq.currentCount++;
            if (cq.currentCount >= cq.targetCount) {
                cq.status = 'objective_met';
                setTimeout(() => this.game.ui.openPanel("Objetivo Concluído!", `<p>Você derrotou os inimigos. Retorne ao Clérigo!</p>`), 2000); 
            }
        }
        
        const mq = this.quests.mageQuest;
        if (mq.status === 'boss_active' && enemyName === 'Rei Orc') {
            mq.status = 'boss_defeated';
            setTimeout(() => this.game.ui.openPanel("Chefe Derrotado!", `<p>Você destruiu o Rei Orc! Retorne ao Mago na Vila.</p>`), 2000);
        }
    }
}
