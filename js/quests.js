export class QuestManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.state = {
            mageQuestStatus: 'unstarted' // 'unstarted', 'active', 'artifact_found', 'completed'
        };
    }

    interactWithMage() {
        let title = "Mago Ancião";
        let content = "";

        if (this.state.mageQuestStatus === 'unstarted') {
            content = `
                <p>Saudações, viajante. Goblins roubaram meu <b>Artefato Mágico</b> (Cubo Amarelo).</p>
                <p>Aceita recuperá-lo para mim em troca de moedas e experiência?</p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-accept-quest" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white;">Aceitar Missão</button>
                    <button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Recusar</button>
                </div>
            `;
        } 
        else if (this.state.mageQuestStatus === 'active') {
            content = `
                <p>Você ainda não encontrou o artefato? Procure por um cubo amarelo brilhante girando pelo mundo!</p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Entendido</button>
                </div>
            `;
        }
        else if (this.state.mageQuestStatus === 'artifact_found') {
            content = `
                <p>Pelos deuses, você encontrou! Muito obrigado, guerreiro.</p>
                <p style="color: #4CAF50; margin-top: 10px;"><b>Recompensa: +100 Moedas, +50 XP</b></p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-complete-quest" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white;">Concluir e Receber</button>
                </div>
            `;
        }
        else if (this.state.mageQuestStatus === 'completed') {
            content = `
                <p>A magia flui mais forte agora graças a você. Boa sorte em sua jornada.</p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Adeus</button>
                </div>
            `;
        }

        this.game.ui.openPanel(title, content);

        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-quest');
            const btnComplete = document.getElementById('btn-complete-quest');
            const btnClose = document.getElementById('btn-close-dialog');

            if (btnAccept) {
                btnAccept.addEventListener('click', () => {
                    this.state.mageQuestStatus = 'active';
                    this.game.ui.openPanel("Mago Ancião", "<p>Excelente! Retorne a mim quando tiver o artefato.</p>");
                });
            }

            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    this.state.mageQuestStatus = 'completed';
                    // Dá as recompensas ao jogador e atualiza o HUD
                    this.game.player.coins += 100;
                    this.game.player.xp += 50;
                    this.game.ui.updateHUD(this.game.player);
                    this.game.ui.openPanel("Mago Ancião", "<p>Recompensas recebidas com sucesso!</p>");
                });
            }

            if (btnClose) {
                btnClose.addEventListener('click', () => this.game.ui.closePanel());
            }
        }, 0);
    }

    // Chamado pelo game.js quando o jogador tenta pegar o artefato no chão
    collectArtifact() {
        if (this.state.mageQuestStatus === 'active') {
            this.state.mageQuestStatus = 'artifact_found';
            this.game.ui.openPanel("Item Coletado", "<p>Você recuperou o Artefato Mágico! Retorne ao Mago.</p>");
            return true; // Retorna true para avisar o game.js que o item pode sumir do chão
        } else {
            this.game.ui.openPanel("Aviso", "<p>Este item exala poder, mas você não tem motivos para pegá-lo agora.</p>");
            return false; // Retorna false para o item continuar no chão
        }
    }
}
