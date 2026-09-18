export class ShopManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // Catálogo de itens disponíveis na loja
        this.items = [
            { id: 'potion_hp', name: 'Poção de Cura', price: 20, effect: 'Recupera 30 HP' },
            { id: 'potion_xp', name: 'Elixir de Sabedoria', price: 50, effect: 'Concede 20 XP' }
        ];
    }

    openShop() {
        let title = "Mercador Viajante";
        
        // Montamos o cabeçalho do HTML da loja, mostrando as moedas atuais do jogador
        let content = `
            <p>Seja bem-vindo! Dê uma olhada nas minhas mercadorias.</p>
            <p style="margin-top: 10px; font-size: 18px;">Suas moedas: <b style="color: #ffd700;">${this.game.player.coins}</b></p>
            <hr style="border-color: #8b7355; margin: 15px 0;">
            <ul style="list-style: none; padding: 0;">
        `;

        // Geramos a lista de itens dinamicamente
        this.items.forEach(item => {
            content += `
                <li style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px;">
                    <div>
                        <strong style="color: #e2c08d;">${item.name}</strong><br>
                        <small style="color: #aaa;">${item.effect}</small>
                    </div>
                    <button id="btn-buy-${item.id}" style="padding: 8px 15px; cursor: pointer; background: #8b7355; color: white; border: 1px solid #e2c08d; font-weight: bold;">
                        ${item.price} Moedas
                    </button>
                </li>
            `;
        });

        content += `
            </ul>
            <div style="margin-top: 20px; text-align: center;">
                <button id="btn-close-shop" style="padding: 10px 20px; cursor: pointer; background: #4a1919; color: white; border: 1px solid #ff4444;">Sair da Loja</button>
            </div>
        `;

        // Usamos a UI já existente para exibir o painel
        this.game.ui.openPanel(title, content);

        // O setTimeout garante que o HTML acima já foi injetado antes de tentarmos buscar os botões
        setTimeout(() => {
            // Atrela o evento de clique (comprar) para cada botão gerado
            this.items.forEach(item => {
                const btnBuy = document.getElementById(`btn-buy-${item.id}`);
                if (btnBuy) {
                    btnBuy.addEventListener('click', () => this.buyItem(item));
                }
            });

            // Botão de fechar
            const btnClose = document.getElementById('btn-close-shop');
            if (btnClose) {
                btnClose.addEventListener('click', () => this.game.ui.closePanel());
            }
        }, 0);
    }

    buyItem(item) {
        // Validação de saldo
        if (this.game.player.coins < item.price) {
            // Um simples alert do navegador serve como feedback de "saldo insuficiente"
            alert("Mercador: Você não tem moedas suficientes para isso!");
            return;
        }

        // Aplicação do efeito do item
        if (item.id === 'potion_hp') {
            if (this.game.player.hp >= 100) {
                alert("Sua vida já está cheia!");
                return; 
            }
            this.game.player.hp = Math.min(100, this.game.player.hp + 30);
        } 
        else if (item.id === 'potion_xp') {
            this.game.player.xp += 20;
        }

        // Desconta o valor do jogador
        this.game.player.coins -= item.price;
        
        // Atualiza a tela (HUD)
        this.game.ui.updateHUD(this.game.player);
        
        // Reabre a loja para forçar a atualização visual do saldo de moedas no painel
        this.openShop(); 
    }
}
