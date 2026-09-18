export class QuestManager {
    // Passamos a engine principal para que as missões possam afetar o jogador (dar XP, moedas)
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // Dicionário de estado para rastrear o progresso do jogador nas missões
        this.state = {
            mageQuestStatus: 'unstarted' // Pode ser: 'unstarted', 'active', 'completed'
        };
    }

    // Função disparada quando interagimos com o NPC "Mago"
    interactWithMage() {
        let title = "Mago Ancião";
        let content = "";

        // Árvore de Diálogo baseada no estado da missão
        if (this.state.mageQuestStatus === 'unstarted') {
            content = `
                <p>Saudações, viajante. Goblins roubaram meu artefato mágico.</p>
                <p>Você parece capaz. Aceita recuperá-lo para mim em troca de moedas?</p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-accept-quest" style="padding: 10px; cursor: pointer; background: #2b5c2b; color: white; border: 1px solid #4CAF50;">Aceitar Missão</button>
                    <button id="btn-decline-quest" style="padding: 10px; cursor: pointer; background: #5c2b2b; color: white; border: 1px solid #f44336;">Recusar</button>
                </div>
            `;
        } 
        else if (this.state.mageQuestStatus === 'active') {
            content = `
                <p>Você ainda não encontrou o artefato? Procure pelos arredores, eu confio em você!</p>
                <div style="margin-top: 20px; text-align: center;">
                    <button id="btn-close-dialog" style="padding: 10px; cursor: pointer;">Entendido</button>
                </div>
            `;
        }

        // Abre a janela de UI com o conteúdo gerado
        this.game.ui.openPanel(title, content);

        // POR QUÊ DO SETTIMEOUT?
        // Como o HTML acabou de ser injetado como string no DOM pela UI, 
        // os botões ainda não existem na memória imediata do JS. 
        // O setTimeout com 0ms joga a busca para o próximo ciclo (Event Loop), garantindo que os botões já renderizaram.
        setTimeout(() => {
            const btnAccept = document.getElementById('btn-accept-quest');
            const btnDecline = document.getElementById('btn-decline-quest');
            const btnClose = document.getElementById('btn-close-dialog');

            if (btnAccept) {
                btnAccept.addEventListener('click', () => {
                    this.state.mageQuestStatus = 'active';
                    this.game.ui.openPanel("Mago Ancião", "<p>Excelente! Retorne a mim quando tiver o artefato.</p>");
                });
            }

            if (btnDecline || btnClose) {
                const btnToBind = btnDecline || btnClose;
                btnToBind.addEventListener('click', () => {
                    this.game.ui.closePanel();
                });
            }
        }, 0);
    }
}
