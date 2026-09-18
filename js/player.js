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

        this.maxHp = 100;
        this.hp = 100;
        this.xp = 0;
        this.coins = 50;
        this.speed = 8; 
        
        this.baseDamage = 5;
        this.baseDefense = 0;

        this.inventory = [];
        this.equipment = { weapon: null, armor: null };

        this.playerBox = new THREE.Box3();
        this.nearestInteractable = null; 
        
        this.keys = { forward: false, backward: false, left: false, right: false };
        this.cameraOffset = new THREE.Vector3(0, 15, 10);

        this.setupMesh();
        this.setupControls();
        
        this.inventory.push(generateItem('sword', 'COMMON'));
        this.inventory.push(generateItem('potion_hp', 'RARE'));
        
        this.ui.updateHUD(this);
    }

    getTotalDamage() {
        let total = this.baseDamage;
        if (this.equipment.weapon) total += this.equipment.weapon.damage;
        return total;
    }

    getTotalDefense() {
        let total = this.baseDefense;
        if (this.equipment.armor) total += this.equipment.armor.defense;
        return total;
    }

    takeDamage(amount) {
        const def = this.getTotalDefense();
        const actualDamage = Math.max(1, amount - def); 
        
        this.hp -= actualDamage;
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.ui.updateHUD(this);
            this.ui.openPanel("Fim de Jogo", "<p style='color:red;'>Você morreu!</p><p>Recarregue a página para tentar novamente.</p>");
            return;
        }
        
        this.ui.updateHUD(this);
    }

    attack() {
        let closestDist = Infinity;
        let target = null;

        for (let i = 0; i < this.game.enemies.length; i++) {
            const enemy = this.game.enemies[i];
            if (enemy.isDead) continue;

            const dist = this.mesh.position.distanceTo(enemy.mesh.position);
            
            if (dist < 3.0 && dist < closestDist) {
                closestDist = dist;
                target = enemy;
            }
        }

        if (target) {
            const dmg = this.getTotalDamage();
            target.takeDamage(dmg);
        }
    }

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

        const loader = new GLTFLoader();
        loader.load(
            'assets/player.glb', 
            (gltf) => {
                this.mesh.remove(placeholder);
                const model = gltf.scene;
                model.traverse((child) => {
                    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
                });
                this.mesh.add(model);
            },
            undefined, () => {}
        );
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        window.addEventListener('keyup', (e) => this.handleKey(e.code, false));
    }

    handleKey(code, isPressed) {
        if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = isPressed;
        if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = isPressed;
        if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = isPressed;
        if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = isPressed;

        if (code === 'KeyE' && isPressed && this.nearestInteractable && !this.ui.isPanelOpen()) {
            this.nearestInteractable.onInteract();
        }

        if (code === 'Space' && isPressed && !this.ui.isPanelOpen()) {
            this.attack();
        }

        if (code === 'KeyI' && !isPressed) {
            if (!this.ui.isPanelOpen()) this.ui.openInventory(this);
            else this.ui.closePanel();
        }
    }

    update(delta) {
        if (this.ui.isPanelOpen()) return; 

        const direction = new THREE.Vector3(0, 0, 0);
        if (this.keys.forward) direction.z -= 1;
        if (this.keys.backward) direction.z += 1;
        if (this.keys.left) direction.x -= 1;
        if (this.keys.right) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            const moveX = direction.x * this.speed * delta;
            const moveZ = direction.z * this.speed * delta;
            this.mesh.position.x += moveX;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) this.mesh.position.x -= moveX; 
            this.mesh.position.z += moveZ;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) this.mesh.position.z -= moveZ; 
            const targetPosition = this.mesh.position.clone().add(direction);
            this.mesh.lookAt(targetPosition);
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
            this.ui.showInteractionPrompt(this.nearestInteractable !== null);
        }
    }
}
