import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { generateItem } from './items.js';

export class Enemy {
    constructor(game, name, x, z, hp, atk, def, modelPath) {
        this.game = game; 
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
        
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;

        this.game.scene.add(this.mesh);
        this.enemyBox = new THREE.Box3();

        const loader = new GLTFLoader();
        loader.load(modelPath, (gltf) => {
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            });
            this.mesh.add(model);

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    const animName = clip.name.toLowerCase();
                    if (animName.includes('idle')) this.animations['idle'] = this.mixer.clipAction(clip);
                    if (animName.includes('run') || animName.includes('walk')) this.animations['run'] = this.mixer.clipAction(clip);
                    if (animName.includes('attack') || animName.includes('slash')) this.animations['attack'] = this.mixer.clipAction(clip);
                    if (animName.includes('death') || animName.includes('die')) this.animations['death'] = this.mixer.clipAction(clip);
                });
                this.playAnimation('idle');
            }
        }, undefined, () => {
            const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
            const mat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
            const placeholder = new THREE.Mesh(geo, mat);
            placeholder.position.y = 0.9;
            this.mesh.add(placeholder);
        });
    }

    playAnimation(name) {
        if (!this.animations[name] || this.currentAction === this.animations[name]) return;
        
        const action = this.animations[name];
        if (this.currentAction) this.currentAction.fadeOut(0.2);
        
        if (name === 'attack' || name === 'death') {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
        } else {
            action.setLoop(THREE.LoopRepeat);
        }

        action.reset().fadeIn(0.2).play();
        this.currentAction = action;
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
        if (this.isDead || !this.game.player) return;

        if (this.attackTimer > 0) this.attackTimer -= delta;

        const playerPos = this.game.player.mesh.position;
        const dist = this.mesh.position.distanceTo(playerPos);

        if (dist < 10 && dist > 1.8) {
            const direction = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
            direction.y = 0; 
            direction.normalize();

            this.mesh.position.x += direction.x * this.speed * delta;
            this.mesh.position.z += direction.z * this.speed * delta;
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
            
            if (this.attackTimer <= 0) this.playAnimation('run');
        } 
        else if (dist <= 1.8) {
            if (this.attackTimer <= 0) {
                this.playAnimation('attack');
                setTimeout(() => { if(!this.isDead) this.game.player.takeDamage(this.atk); }, 500);
                this.attackTimer = 1.5; 
            }
        } else {
            this.playAnimation('idle');
        }

        this.enemyBox.setFromObject(this.mesh);
    }

    takeDamage(amount) {
        if (this.isDead) return;
        const actualDamage = Math.max(1, amount - this.def);
        this.hp -= actualDamage;

        if (this.hp <= 0) this.die();
    }

    die() {
        this.isDead = true;
        this.playAnimation('death');
        
        this.game.questManager.onEnemyKilled(this.name);
        
        setTimeout(() => {
            const xpGained = 30;
            const coinsGained = Math.floor(Math.random() * 15) + 10;
            this.game.player.xp += xpGained;
            this.game.player.coins += coinsGained;
            
            const roll = Math.random();
            let droppedItem = null;
            if (roll > 0.90) droppedItem = generateItem('axe', 'RARE');
            else if (roll > 0.50) droppedItem = generateItem('potion_hp', 'COMMON'); 

            if (droppedItem) this.game.player.inventory.push(droppedItem);
            this.game.ui.updateHUD(this.game.player);
            
            setTimeout(() => { this.game.scene.remove(this.mesh); }, 3000);
        }, 1000);
    }
}
