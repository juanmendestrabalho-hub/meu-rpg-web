import * as THREE from 'three';
import { Player } from './player.js';
import { UIManager } from './ui.js'; 
import { QuestManager } from './quests.js'; 
import { ShopManager } from './shop.js'; 

export class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        
        this.ui = new UIManager();
        this.questManager = new QuestManager(this); 
        this.shopManager = new ShopManager(this); 
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); 

        this.renderer = new THREE.WebGLRenderer({ antialias: true }); 
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true; 
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.clock = new THREE.Clock();
        
        this.collidables = [];
        this.interactables = []; 
        this.visualItems = []; 

        this.setupEnvironment();
        this.setupLights();
        
        this.player = new Player(this.scene, this.camera, this.collidables, this.interactables, this.ui);

        this.bindEvents();
    }

    spawnItem(x, z, color, onCollectCallback) {
        const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);
        
        mesh.position.set(x, 0.5, z); 
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.visualItems.push(mesh);

        const itemObj = {
            mesh: mesh,
            onInteract: () => {
                const wasConsumed = onCollectCallback();
                if (wasConsumed) {
                    this.scene.remove(mesh);
                    const index = this.interactables.indexOf(itemObj);
                    if (index > -1) this.interactables.splice(index, 1);
                    
                    if (this.player && this.player.nearestInteractable === itemObj) {
                        this.player.nearestInteractable = null;
                        this.ui.showInteractionPrompt(false);
                    }
                }
            }
        };
        this.interactables.push(itemObj);
    }

    setupEnvironment() {
        // Chão
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.8 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true; 
        this.scene.add(this.ground);

        // Parede / Obstáculo
        const wallGeo = new THREE.BoxGeometry(2, 2, 2);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b8c89 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(5, 1, -5);
        wall.castShadow = true; wall.receiveShadow = true;   
        this.collidables.push(wall); this.scene.add(wall);

        // ----------------------------------------------------
        // 1. NPC: Mago de Missões (Roxo)
        const npcGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
        const npcMat = new THREE.MeshStandardMaterial({ color: 0x8A2BE2 }); 
        const npc = new THREE.Mesh(npcGeo, npcMat);
        npc.position.set(-5, 0.9, -2); 
        npc.castShadow = true; npc.receiveShadow = true;
        this.collidables.push(npc); this.scene.add(npc);

        this.interactables.push({
            mesh: npc,
            onInteract: () => this.questManager.interactWithMage()
        });

        // ----------------------------------------------------
        // 2. NPC: Mercador (Dourado/Laranja)
        const merchantGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
        const merchantMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 }); 
        const merchant = new THREE.Mesh(merchantGeo, merchantMat);
        merchant.position.set(6, 0.9, 3); // Posicionado do lado direito
        merchant.castShadow = true; merchant.receiveShadow = true;
        
        this.collidables.push(merchant); // Fica sólido
        this.scene.add(merchant);

        // Adiciona à lista de interações
        this.interactables.push({
            mesh: merchant,
            onInteract: () => this.shopManager.openShop()
        });
        // ----------------------------------------------------

        // Poções no chão
        this.spawnItem(4, 3, 0xff0000, () => {
            if (this.player.hp >= 100) {
                this.ui.openPanel("Aviso", "<p>Sua vida já está cheia!</p>");
                return false; 
            }
            this.player.hp = Math.min(100, this.player.hp + 20);
            this.ui.updateHUD(this.player);
            this.ui.openPanel("Poção de Vida", "<p>Você recuperou 20 HP.</p>");
            return true; 
        });

        this.spawnItem(0, 5, 0x006400, () => {
            this.player.hp -= 30;
            this.ui.updateHUD(this.player);
            this.ui.openPanel("Armadilha!", "<p>Você tocou em um lodo venenoso. Perdeu 30 HP!</p>");
            return true;
        });

        this.spawnItem(-8, -8, 0xffaa00, () => {
            return this.questManager.collectArtifact();
        });
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20; dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20; dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);
    }

    bindEvents() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.renderer.setAnimationLoop(this.update.bind(this));
    }

    update() {
        const delta = this.clock.getDelta();
        
        if (this.player) {
            this.player.update(delta);
        }

        this.visualItems.forEach(itemMesh => {
            if (itemMesh.parent) { 
                itemMesh.rotation.y += delta * 1.5;
                itemMesh.rotation.x += delta * 1.0;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }
}
