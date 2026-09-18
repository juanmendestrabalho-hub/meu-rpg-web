import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Player } from './player.js';
import { UIManager } from './ui.js'; 
import { QuestManager } from './quests.js'; 
import { ShopManager } from './shop.js'; 
import { Enemy } from './enemy.js'; 
import { StealthManager } from './stealth.js'; 
import { SaveManager } from './save.js'; 

export class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        this.ui = new UIManager();
        this.questManager = new QuestManager(this); 
        this.shopManager = new ShopManager(this); 
        this.stealthManager = new StealthManager(this); 
        this.saveManager = new SaveManager(this); 
        
        this.scene = new THREE.Scene();
        
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
        this.enemies = []; 
        
        // NOVO: Gerenciamento de Zonas (Fases)
        this.levelObjects = []; 
        this.portals = [];
        this.isTransitioning = false;
        this.currentLevel = null;

        this.gltfLoader = new GLTFLoader();

        this.setupLights();
        
        this.player = new Player(this);
        
        // Inicializa a primeira fase ou carrega o Save
        if (!this.saveManager.loadGame()) {
            this.loadLevel('village');
        }
        
        this.ui.updateHUD(this.player);
        this.bindEvents();
    }

    // ==========================================
    // SISTEMA DE NÍVEIS (LEVEL DESIGN)
    // ==========================================

    clearLevel() {
        this.levelObjects.forEach(obj => {
            if (obj.parent) this.scene.remove(obj);
        });
        
        this.levelObjects.length = 0;
        this.collidables.length = 0;
        this.interactables.length = 0;
        this.visualItems.length = 0;
        this.enemies.length = 0;
        this.portals.length = 0;
    }

    createGround(colorHex) {
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true; 
        this.scene.add(ground);
        this.levelObjects.push(ground); 
    }

    buildMap(levelMatrix, wallColorHex) {
        const tileSize = 3; 
        const wallGeo = new THREE.BoxGeometry(tileSize, 3, tileSize); 
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColorHex }); 
        
        const offsetX = -(levelMatrix[0].length * tileSize) / 2;
        const offsetZ = -(levelMatrix.length * tileSize) / 2;

        for (let z = 0; z < levelMatrix.length; z++) {
            for (let x = 0; x < levelMatrix[z].length; x++) {
                if (levelMatrix[z][x] === 1) {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(offsetX + (x * tileSize), 1.5, offsetZ + (z * tileSize));
                    wall.castShadow = true; 
                    wall.receiveShadow = true;   
                    this.collidables.push(wall); 
                    this.scene.add(wall);
                    this.levelObjects.push(wall);
                }
            }
        }
    }

    spawnPortal(x, z, targetLevel, colorHex) {
        const geo = new THREE.TorusGeometry(1.5, 0.4, 16, 50); 
        const mat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.8 });
        const portal = new THREE.Mesh(geo, mat);
        portal.position.set(x, 1.5, z);
        
        this.scene.add(portal);
        this.levelObjects.push(portal);
        this.visualItems.push(portal); 
        this.portals.push({ mesh: portal, target: targetLevel });
    }

    transitionToLevel(levelId) {
        this.isTransitioning = true;
        this.ui.fade(true, () => {
            this.loadLevel(levelId);
            setTimeout(() => {
                this.ui.fade(false, () => {
                    this.isTransitioning = false;
                });
            }, 500);
        });
    }

    loadLevel(levelId) {
        this.clearLevel();
        this.currentLevel = levelId;

        if (levelId === 'village') {
            this.scene.background = new THREE.Color(0x87CEEB); 
            this.createGround(0x4a7c59); 
            
            const mapMatrix = [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ];
            this.buildMap(mapMatrix, 0x8b8c89); 

            this.createNPC("Mago Ancião", -6, -2, 0x8A2BE2, 'assets/Mago.gltf', () => this.questManager.interactWithMage(), 150, 25, 5);
            this.createNPC("Clérigo Mercador", 6, 2, 0xffaa00, 'assets/Clérigo.gltf', () => this.questManager.interactWithCleric(), 120, 15, 10);
            
            // O Portal para a Masmorra (Roxo)
            this.spawnPortal(0, -10, 'dungeon', 0xaa00ff);
            
            if (this.player) this.player.mesh.position.set(0, 0, 8);

        } 
        else if (levelId === 'dungeon') {
            this.scene.background = new THREE.Color(0x0a0a0a); 
            this.createGround(0x222222); 
            
            const mapMatrix = [
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 1, 0, 0, 1, 0, 1],
                [1, 0, 1, 0, 0, 1, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 1],
                [1, 1, 1, 1, 1, 1, 1, 1]
            ];
            this.buildMap(mapMatrix, 0x111111);

            this.spawnEnemy("Ladino Sombrio", 4, -4, 60, 10, 2, 'assets/Ladino.gltf');
            this.spawnEnemy("Ladino Sombrio", -4, -4, 60, 10, 2, 'assets/Ladino.gltf');
            this.spawnEnemy("Arqueiro Sombrio", 0, -8, 40, 15, 1, 'assets/Arqueiro.gltf');
            
            // O Portal de volta para a Vila (Azul)
            this.spawnPortal(0, 7, 'village', 0x00aaff);
            
            if (this.player) this.player.mesh.position.set(0, 0, 4);
        }
    }

    spawnEnemy(name, x, z, hp, atk, def, modelPath) {
        const enemy = new Enemy(this, name, x, z, hp, atk, def, modelPath);
        this.enemies.push(enemy);
        this.levelObjects.push(enemy.mesh); 
    }

    createNPC(name, x, z, colorHex, modelPath, onInteractCallback, hp, atk, def) {
        const npcGroup = new THREE.Group();
        npcGroup.position.set(x, 0, z);

        const placeholderGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
        const placeholderMat = new THREE.MeshStandardMaterial({ color: colorHex, wireframe: true });
        const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
        placeholder.position.y = 0.9;
        npcGroup.add(placeholder);
        
        this.scene.add(npcGroup);
        this.collidables.push(npcGroup);
        this.levelObjects.push(npcGroup); 
        
        const npcData = {
            mesh: npcGroup, isNPC: true, name: name, hp: hp, atk: atk, def: def,
            modelPath: modelPath, hasBeenRobbed: false, onInteract: onInteractCallback
        };
        this.interactables.push(npcData);

        this.gltfLoader.load(modelPath, (gltf) => {
            npcGroup.remove(placeholder);
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            });
            
            if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                const idleClip = gltf.animations.find(clip => clip.name.toLowerCase().includes('idle'));
                if (idleClip) {
                    mixer.clipAction(idleClip).play();
                    npcGroup.userData.mixer = mixer;
                }
            }
            npcGroup.add(model);
        }, undefined, () => {});
    }

    turnNpcIntoEnemy(npcData) {
        this.scene.remove(npcData.mesh);
        const index = this.interactables.indexOf(npcData);
        if (index > -1) this.interactables.splice(index, 1);
        
        const pos = npcData.mesh.position;
        this.spawnEnemy(npcData.name + " (Enfurecido)", pos.x, pos.z, npcData.hp, npcData.atk, npcData.def, npcData.modelPath);
        
        if (this.player && this.player.nearestInteractable === npcData) {
            this.player.nearestInteractable = null;
            this.ui.showInteractionPrompt(null);
        }
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    start() {
        this.renderer.setAnimationLoop(this.update.bind(this));
    }

    update() {
        const delta = this.clock.getDelta();
        
        if (this.player) this.player.update(delta);
        
        this.enemies.forEach(enemy => enemy.update(delta));
        this.enemies = this.enemies.filter(enemy => !enemy.isDead);
        
        this.visualItems.forEach(itemMesh => {
            if (itemMesh.parent) { 
                itemMesh.rotation.y += delta * 1.5;
                itemMesh.rotation.x += delta * 1.0;
            }
        });

        this.interactables.forEach(npc => {
            if (npc.mesh && npc.mesh.userData && npc.mesh.userData.mixer) {
                npc.mesh.userData.mixer.update(delta);
            }
        });

        // NOVO: Detecção de colisão com o Portal Mágico
        if (!this.isTransitioning && this.player) {
            for (let p of this.portals) {
                if (this.player.mesh.position.distanceTo(p.mesh.position) < 2.0) {
                    this.transitionToLevel(p.target);
                    break;
                }
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}
