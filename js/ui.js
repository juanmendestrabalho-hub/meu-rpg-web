export class UIManager {
    constructor() {
        // Cacheamos os elementos do DOM no construtor. 
        // Por que? Fazer document.getElementById repetidas vezes é uma operação cara para o navegador.
        
        // Elementos do HUD (Heads-Up Display)
        this.hpStat = document.getElementById('stat-hp');
        this.xpStat = document.getElementById('stat-xp');
        this.coinStat = document.getElementById('stat-coins');
        
        // Elementos do Painel Dinâmico (usado para Loja, Inventário, Missões)
        this.actionPanel = document.getElementById('action-panel');
        this.panelTitle = document.getElementById('panel-title');
        this.panelContent = document.getElementById('panel-content');
        this.btnClose = document.getElementById('btn-close-panel');
        
        // Prompt de Interação ("Pressione E")
        this.interactionPrompt = document.getElementById('interaction-prompt');

        this.bindEvents();
    }

    bindEvents() {
        // Fechar o painel ao clicar no botão vermelho de fechar
        this.btnClose.addEventListener('click', () => this.closePanel());
        
        // Acessibilidade e conveniência: Permitir fechar o painel apertando a tecla "ESC"
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.isPanelOpen()) {
                this.closePanel();
            }
        });
    }

    // Atualiza os valores visuais no canto da tela.
    // É chamado apenas quando o estado do jogador muda, e não a cada frame.
    updateHUD(player) {
        this.hpStat.innerText = player.hp;
        this.xpStat.innerText = player.xp;
        this.coinStat.innerText = player.coins;
    }

    // Mostra ou esconde o aviso flutuante de interação
    showInteractionPrompt(show) {
        if (show) {
            this.interactionPrompt.classList.remove('hidden');
        } else {
            this.interactionPrompt.classList.add('hidden');
        }
    }

    // Método genérico para abrir janelas de diálogo no jogo
    openPanel(title, htmlContent) {
        this.panelTitle.innerText = title;
        this.panelContent.innerHTML = htmlContent;
        this.actionPanel.classList.remove('hidden');
    }

    closePanel() {
        this.actionPanel.classList.add('hidden');
    }

    // Verifica se há alguma janela aberta para podermos bloquear o movimento do personagem
    isPanelOpen() {
        return !this.actionPanel.classList.contains('hidden');
    }
}
