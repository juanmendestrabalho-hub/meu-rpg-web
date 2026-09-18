import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { generateItem } from './items.js';

export class Enemy {
    constructor(game, name, x, z, hp, atk, def) {
        this.game = game; // Referência à engine central
        this.name = name;
        this.maxHp = hp;
        this.hp = hp;
        this.atk = atk;
        this.def = def;
        this.speed = 3;
        this.attackTimer = 0;
        this.isDead = false;

        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);
        
        // Placeholder: Um cilindro VERMELHO para diferenciar dos NPCs
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xcc2222, wireframe: true });
        const placeholder = new THREE.Mesh(geo, mat);
        placeholder.position.y = 0.9;
        this.mesh.add(placeholder);

        this.game.scene.add(this.mesh);

        // Bounding box para detecção (Hitbox)
        this.enemyBox = new THREE.Box3();
    }

    update(delta) {
        if (this.isDead || !this.game.player) return;

        // Diminui o tempo de espera do ataque
        if (this.attackTimer > 0) this.attackTimer -= delta;

        const playerPos = this.game.player.mesh.position;
        const dist = this.mesh.position.distanceTo(playerPos);

        // IA Simples: Agro Range (Raio de visão de 10 unidades)
        if (dist < 10 && dist > 1.8) {
            // Perseguir: Encontra o vetor direção até o jogador
            const direction = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
            direction.y = 0; // Impede que o inimigo voe ou afunde
            direction.normalize();

            this.mesh.position.x += direction.x * this.speed * delta;
            this.mesh.position.z += direction.z * this.speed * delta;

            // Faz o inimigo olhar para o jogador
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        } 
        else if (dist <= 1.8) {
            // Alcance de Ataque (Melee)
            if (this.attackTimer <= 0) {
                this.game.player.takeDamage(this.atk);
                this.attackTimer = 1.5; // Cooldown: Bate a cada 1.5 segundos
            }
        }

        this.enemyBox.setFromObject(this.mesh);
    }

    takeDamage(amount) {
        if (this.isDead) return;

        // A defesa reduz o dano. O dano mínimo sempre será 1 (para o inimigo não ser imortal)
        const actualDamage = Math.max(1, amount - this.def);
        this.hp -= actualDamage;
        
        console.log(`${this.name} recebeu ${actualDamage} de dano! HP Restante: ${this.hp}`);

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.game.scene.remove(this.mesh); // Some do mundo 3D
        
        // Recompensas em Moedas e XP
        const xpGained = 30;
        const coinsGained = Math.floor(Math.random() * 15) + 10;
        
        this.game.player.xp += xpGained;
        this.game.player.coins += coinsGained;
        
        // Sistema de Loot: Rolagem de Dados (RNG)
        const roll = Math.random();
        let droppedItem = null;
        
        if (roll > 0.90) {
            droppedItem = generateItem('axe', 'RARE'); // 10% de chance de Machado Raro
        } else if (roll > 0.50) {
            droppedItem = generateItem('potion_hp', 'COMMON'); // 40% de chance de Poção
        }

        // Monta o aviso visual da vitória
        let lootMsg = droppedItem ? `<p style="color:#a335ee; font-weight:bold;">Loot: ${droppedItem.name}</p>` : '';
        
        if (droppedItem) {
            this.game.player.inventory.push(droppedItem);
        }

        this.game.ui.openPanel("Inimigo Derrotado!", `
            <p>Você eliminou o ${this.name}.</p>
            <p style="color: #66b3ff;">+${xpGained} XP | +${coinsGained} Moedas</p>
            ${lootMsg}
            <div style="margin-top:15px; text-align:center;">
                <button id="btn-close-loot" style="padding: 10px; cursor: pointer;">Fechar</button>
            </div>
        `);

        setTimeout(() => {
            const btn = document.getElementById('btn-close-loot');
            if (btn) btn.addEventListener('click', () => this.game.ui.closePanel());
        }, 0);
        
        this.game.ui.updateHUD(this.game.player);
    }
}
