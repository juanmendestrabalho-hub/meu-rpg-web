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
        this.isDisposed = false; 
        this.isLoaded = false; 

        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);
        
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;

        this.game.scene.add(this.mesh);
        this.enemyBox = new THREE.Box3();

        // Sistema de Barra de Vida Flutuante (Sprite Canvas)
        this.hpCanvas = document.createElement('canvas');
        this.hpCanvas.width = 128;
        this.hpCanvas.height = 32;
        this.hpCtx = this.hpCanvas.getContext('2d');
        
        this.hpTexture = new THREE.CanvasTexture(this.hpCanvas);
        const spriteMat = new THREE.SpriteMaterial({ map: this.hpTexture, depthTest: false });
        this.hpSprite = new THREE.Sprite(spriteMat);
        this.hpSprite.position.set(0, 2.5, 0); 
        this.hpSprite.scale.set(1.5, 0.375, 1);
        this.mesh.add(this.hpSprite);
        this.updateHpBar(); 

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
            this.isLoaded = true;
        }, undefined, () => {
            const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
            const mat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
            const placeholder = new THREE.Mesh(geo, mat);
            placeholder.position.y = 0.9;
            this.mesh.add(placeholder);
            this.isLoaded = true;
        });
    }

    updateHpBar() {
        const ctx = this.hpCtx;
        ctx.clearRect(0, 0, 128, 32);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 128, 32);
        
        const percent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = percent > 0.5 ? '#4CAF50' : (percent > 0.25 ? '#FFEB3B' : '#F44336');
        ctx.fillRect(4, 4, 120 * percent, 24);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.floor(this.hp)}/${this.maxHp}`, 64, 18);
        
        this.hpTexture.needsUpdate = true;
    }

    playAnimation(name) {
        if (!this.mixer || !this.animations[name] || this.currentAction === this.animations[name]) return;
        
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
        if (!this.isLoaded) return;
        if (this.mixer) this.mixer.update(delta);
        
        if (this.isDead || !this.game.player || !this.game.player.isLoaded) return;

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
        if (this.isDead || !this.isLoaded) return;
        
        const actualDamage = Math.max(1, amount - this.def);
        this.hp -= actualDamage;
        this.updateHpBar(); 

        this.mesh.traverse((child) => {
            if (child.isMesh && child.material && !Array.isArray(child.material)) {
                if (!child.userData.origColor) child.userData.origColor = child.material.color.clone();
                child.material.color.setHex(0xff0000);
                setTimeout(() => {
                    if (child.material && child.userData.origColor) child.material.color.copy(child.userData.origColor);
                }, 200);
            }
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.hpSprite.visible = false; 
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

            // Verifica se a Missão do Caçador está ativa para dropar o Fragmento Sombrio
            const hq = this.game.questManager.quests.hunterQuest;
            if (hq && hq.status === 'active') {
                if (Math.random() > 0.40) { // 60% chance
                    this.game.spawnItem(this.mesh.position.x, this.mesh.position.z, 0x880088, () => {
                        return this.game.questManager.collectFragment();
                    });
                }
            }
            
            setTimeout(() => { 
                this.game.scene.remove(this.mesh); 
                this.isDisposed = true; 
            }, 3000);
        }, 1000);
    }
}
