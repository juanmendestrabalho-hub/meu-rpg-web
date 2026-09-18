import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { generateItem } from './items.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;
        this.collidables = game.collidables; 
        this.interactables = game.interactables; 
        this.ui = game.ui; 

        // Status base
        this.maxHp = 100;
        this.hp = 100;
        this.xp = 0;
        this.coins = 50;
        this.speed = 8; 
        this.baseDamage = 5;
        this.baseDefense = 0;

        // Inventário e Equipamento
        this.inventory = [];
        this.equipment = { weapon: null, armor: null };

        this.playerBox = new THREE.Box3();
        this.nearestInteractable = null; 
        
        this.keys = { forward: false, backward: false, left: false, right: false };
        this.cameraOffset = new THREE.Vector3(0, 15, 10);

        // Sistema de Animação
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.isAttacking = false;

        this.setupMesh();
        this.setupControls();
        
        // Itens iniciais
        this.inventory.push(generateItem('sword', 'COMMON'));
        this.inventory.push(generateItem('potion_hp', 'RARE'));
        this.ui.updateHUD(this);
    }

    // Cálculos de combate
    getTotalDamage() { return this.baseDamage + (this.equipment.weapon ? this.equipment.weapon.damage : 0); }
    getTotalDefense() { return this.baseDefense + (this.equipment.armor ? this.equipment.armor.defense : 0); }

    takeDamage(amount) {
        const actualDamage = Math.max(1, amount - this.getTotalDefense()); 
        this.hp -= actualDamage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.playAnimation('death');
            this.ui.updateHUD(this);
            this.ui.openPanel("Fim de Jogo", "<p style='color:red;'>Você morreu!</p><p>Recarregue a página (ou aperte F5 para carregar o último Save) para tentar novamente.</p>");
            return;
        }
        this.ui.updateHUD(this);
    }

    attack() {
        if (this.isAttacking) return;
        
        this.isAttacking = true;
        this.playAnimation('attack');

        setTimeout(() => {
            let closestDist = Infinity;
            let target = null;
            
            for (let i = 0; i < this.game.enemies.length; i++) {
                const enemy = this.game.enemies[i];
                if (enemy.isDead) continue;
                
                const dist = this.mesh.position.distanceTo(enemy.mesh.position);
                
                // Hitbox ampliado para 4.5
                if (dist < 4.5 && dist < closestDist) {
                    closestDist = dist;
                    target = enemy;
                }
            }

            if (target) {
                target.takeDamage(this.getTotalDamage());
            }
            this.isAttacking = false;
        }, 500); 
    }

    // Ações de Inventário
    equipItem(uuid) {
        const itemIndex = this.inventory.findIndex(i => i.uuid === uuid);
        if (itemIndex === -1) return;
        const item = this.inventory[itemIndex];
        if (this.equipment[item.type]) this.inventory.push(this.equipment[item.type]);
        this.equipment[item.type] = item;
        this.inventory.splice(itemIndex, 1);
        this.ui.updateHUD(this);
    }

    unequipItem(uuid) {
        let type = null;
        if (this.equipment.weapon && this.equipment.weapon.uuid === uuid) type = 'weapon';
        if (this.equipment.armor && this.equipment.armor.uuid === uuid) type = 'armor';
        if (type) {
            this.inventory.push(this.equipment[type]);
            this.equipment[type] = null;
            this.ui.updateHUD(this);
        }
    }

    useItem(uuid) {
        const itemIndex = this.inventory.findIndex(i => i.uuid === uuid);
        if (itemIndex === -1) return;
        const item = this.inventory[itemIndex];
        if (item.effect === 'heal') {
            if (this.hp >= this.maxHp) return alert("Sua vida já está cheia!");
            this.hp = Math.min(this.maxHp, this.hp + item.power);
            this.inventory.splice(itemIndex, 1);
            this.ui.updateHUD(this);
        }
    }

    setupMesh() {
        this.mesh = new THREE.Group();
        this.mesh.position.y = 0;

        // Placeholder temporário
        const placeholderGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
        const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x2244cc, wireframe: true });
        const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
        placeholder.position.y = 0.9;
        
        const faceGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const face = new THREE.Mesh(faceGeo, placeholderMat);
        face.position.set(0, 0.5, 0.4);
        placeholder.add(face);
        
        this.mesh.add(placeholder);
        this.scene.add(this.mesh);

        // Carregando o Modelo Real 3D (Guerreiro)
        const loader = new GLTFLoader();
        loader.load(
            'assets/Guerreiro.gltf', 
            (gltf) => {
                this.mesh.remove(placeholder);
                const model = gltf.scene;
                model.traverse((child) => {
                    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
                });
                this.mesh.add(model);

                // Configuração das animações
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach((clip) => {
                        const name = clip.name.toLowerCase();
                        if (name.includes('idle')) this.animations['idle'] = this.mixer.clipAction(clip);
                        if (name.includes('run') || name.includes('walk')) this.animations['run'] = this.mixer.clipAction(clip);
                        if (name.includes('attack') || name.includes('slash')) this.animations['attack'] = this.mixer.clipAction(clip);
                        if (name.includes('death') || name.includes('die')) this.animations['death'] = this.mixer.clipAction(clip);
                    });
                    this.playAnimation('idle');
                }
            },
            undefined, 
            () => { console.warn("Modelo 'assets/Guerreiro.gltf' não encontrado. Mantendo placeholder."); }
        );
    }

    playAnimation(name) {
        if (!this.animations[name] || this.currentAction === this.animations[name]) return;
        
        const action = this.animations[name];
        if (this.currentAction) {
            this.currentAction.fadeOut(0.2); 
        }
        
        if (name === 'attack' || name === 'death') {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true; 
        } else {
            action.setLoop(THREE.LoopRepeat);
        }

        action.reset().fadeIn(0.2).play();
        this.currentAction = action;

        if (name === 'attack') {
            this.mixer.addEventListener('finished', () => {
                this.isAttacking = false;
                this.playAnimation('idle');
            });
        }
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        window.addEventListener('keyup', (e) => this.handleKey(e.code, false));
    }

    handleKey(code, isPressed) {
        // Movimentação
        if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = isPressed;
        if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = isPressed;
        if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = isPressed;
        if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = isPressed;

        // Interação [E]
        if (code === 'KeyE' && isPressed && this.nearestInteractable && !this.ui.isPanelOpen()) {
            this.nearestInteractable.onInteract();
        }
        
        // Furtividade/Roubo [R]
        if (code === 'KeyR' && isPressed && this.nearestInteractable && !this.ui.isPanelOpen()) {
            this.game.stealthManager.attemptSteal(this.nearestInteractable);
        }

        // Combate [Espaço]
        if (code === 'Space' && isPressed && !this.ui.isPanelOpen() && !this.isAttacking) {
            this.attack();
        }
        
        // Inventário [I]
        if (code === 'KeyI' && !isPressed) {
            if (!this.ui.isPanelOpen()) this.ui.openInventory(this);
            else this.ui.closePanel();
        }

        // Salvar Jogo [K]
        if (code === 'KeyK' && !isPressed && !this.ui.isPanelOpen()) {
            if (this.game.saveManager) {
                this.game.saveManager.saveGame();
            }
        }
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
        if (this.ui.isPanelOpen() || this.hp <= 0) return; 

        const direction = new THREE.Vector3(0, 0, 0);
        if (this.keys.forward) direction.z -= 1;
        if (this.keys.backward) direction.z += 1;
        if (this.keys.left) direction.x -= 1;
        if (this.keys.right) direction.x += 1;

        if (direction.lengthSq() > 0 && !this.isAttacking) {
            direction.normalize();
            
            this.mesh.position.x += direction.x * this.speed * delta;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) this.mesh.position.x -= direction.x * this.speed * delta; 
            
            this.mesh.position.z += direction.z * this.speed * delta;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) this.mesh.position.z -= direction.z * this.speed * delta; 
            
            const targetPosition = this.mesh.position.clone().add(direction);
            this.mesh.lookAt(targetPosition);
            
            this.playAnimation('run'); 
        } else if (!this.isAttacking) {
            this.playAnimation('idle'); 
        }

        this.camera.position.copy(this.mesh.position).add(this.cameraOffset);
        this.camera.lookAt(this.mesh.position);
        this.checkInteractables();
    }

    checkCollisions() {
        for (let i = 0; i < this.collidables.length; i++) {
            const objectBox = new THREE.Box3().setFromObject(this.collidables[i]);
            if (this.playerBox.intersectsBox(objectBox)) return true; 
        }
        return false;
    }

    checkInteractables() {
        let closestDist = Infinity;
        let closestObj = null;
        for (let i = 0; i < this.interactables.length; i++) {
            const interactable = this.interactables[i];
            const dist = this.mesh.position.distanceTo(interactable.mesh.position);
            if (dist < 3.5 && dist < closestDist) {
                closestDist = dist;
                closestObj = interactable;
            }
        }
        if (this.nearestInteractable !== closestObj) {
            this.nearestInteractable = closestObj;
            this.ui.showInteractionPrompt(this.nearestInteractable);
        }
    }
}
