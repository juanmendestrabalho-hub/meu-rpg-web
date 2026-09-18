export class UIManager {
    constructor() {
        this.hpStat = document.getElementById('stat-hp');
        this.xpStat = document.getElementById('stat-xp');
        this.coinStat = document.getElementById('stat-coins');
        
        this.atkStat = document.getElementById('stat-atk');
        this.defStat = document.getElementById('stat-def');
        
        this.actionPanel = document.getElementById('action-panel');
        this.panelTitle = document.getElementById('panel-title');
        this.panelContent = document.getElementById('panel-content');
        this.btnClose = document.getElementById('btn-close-panel');
        
        this.interactionPrompt = document.getElementById('interaction-prompt');

        this.bindEvents();
    }

    bindEvents() {
        this.btnClose.addEventListener('click', () => this.closePanel());
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.isPanelOpen()) {
                this.closePanel();
            }
        });
    }

    updateHUD(player) {
        this.hpStat.innerText = player.hp;
        this.xpStat.innerText = player.xp;
        this.coinStat.innerText = player.coins;
        this.atkStat.innerText = player.getTotalDamage();
        this.defStat.innerText = player.getTotalDefense();
    }

    showInteractionPrompt(show) {
        if (show) {
            this.interactionPrompt.classList.remove('hidden');
        } else {
            this.interactionPrompt.classList.add('hidden');
        }
    }

    openPanel(title, htmlContent) {
        this.panelTitle.innerText = title;
        this.panelContent.innerHTML = htmlContent;
        this.actionPanel.classList.remove('hidden');
    }

    closePanel() {
        this.actionPanel.classList.add('hidden');
    }

    isPanelOpen() {
        return !this.actionPanel.classList.contains('hidden');
    }

    openInventory(player) {
        let content = `<div style="display: flex; gap: 20px;">`;
        
        content += `<div style="flex: 1; border-right: 1px solid #8b7355; padding-right: 15px;">
            <h3 style="color: #e2c08d; margin-bottom: 10px;">Equipado</h3>`;
            
        const renderEquip = (slotName, item) => {
            if (item) {
                return `<div style="background: rgba(0,0,0,0.5); padding: 10px; margin-bottom: 10px; border-left: 4px solid ${item.rarity.color};">
                    <b style="color: ${item.rarity.color}">${item.name}</b><br>
                    <small>${item.damage ? 'ATK: +'+item.damage : 'DEF: +'+item.defense}</small>
                    <button class="btn-unequip" data-uuid="${item.uuid}" style="margin-top: 5px; cursor:pointer; background:#4a1919; color:white; border:none; padding:3px 8px; font-size:12px;">Desequipar</button>
                </div>`;
            }
            return `<div style="background: rgba(0,0,0,0.3); padding: 10px; margin-bottom: 10px; color: #666;">${slotName} (Vazio)</div>`;
        };

        content += renderEquip('Arma', player.equipment.weapon);
        content += renderEquip('Armadura', player.equipment.armor);
        content += `</div>`;

        content += `<div style="flex: 2;">
            <h3 style="color: #e2c08d; margin-bottom: 10px;">Mochila</h3>
            <div style="max-height: 250px; overflow-y: auto;">`;
            
        if (player.inventory.length === 0) {
            content += `<p style="color: #666;">Sua mochila está vazia.</p>`;
        } else {
            player.inventory.forEach(item => {
                let stats = item.type === 'weapon' ? `ATK: +${item.damage}` : 
                            item.type === 'armor' ? `DEF: +${item.defense}` : 
                            `${item.effect} (${item.power})`;
                            
                let actionBtn = item.type === 'consumable' 
                    ? `<button class="btn-use" data-uuid="${item.uuid}" style="cursor:pointer; background:#2b5c2b; color:white; border:none; padding:3px 8px;">Usar</button>`
                    : `<button class="btn-equip" data-uuid="${item.uuid}" style="cursor:pointer; background:#8b7355; color:white; border:none; padding:3px 8px;">Equipar</button>`;

                content += `
                    <div style="background: rgba(0,0,0,0.5); padding: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${item.rarity.color};">
                        <div>
                            <span style="color: ${item.rarity.color}; font-weight: bold;">${item.name}</span> <small style="color: #aaa;">[${item.rarity.name}]</small><br>
                            <small>${stats} | Valor: ${item.value} moedas</small>
                        </div>
                        ${actionBtn}
                    </div>`;
            });
        }
        
        content += `</div></div>`;
        
        this.openPanel("Inventário", content);

        setTimeout(() => {
            document.querySelectorAll('.btn-equip').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    player.equipItem(e.target.getAttribute('data-uuid'));
                    this.openInventory(player); 
                });
            });
            document.querySelectorAll('.btn-unequip').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    player.unequipItem(e.target.getAttribute('data-uuid'));
                    this.openInventory(player);
                });
            });
            document.querySelectorAll('.btn-use').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    player.useItem(e.target.getAttribute('data-uuid'));
                    this.openInventory(player);
                });
            });
        }, 0);
    }
}
