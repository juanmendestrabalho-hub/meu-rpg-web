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
        
        this.levelObjects = []; 
        this.portals = [];
        this.isTransitioning = false;
        this.currentLevel = null;

        this.gltfLoader = new GLTFLoader();

        this.setupLights();
        
        this.player = new Player(this);
        
        if (!this.saveManager.loadGame()) {
            this.loadLevel('village');
        }
        
        this.ui.updateHUD(this.player);
        this.bindEvents();
        this.start();
    }

    clearLevel() {
        this.levelObjects.forEach(obj => {
            if (obj && obj.parent) this.scene.remove(obj);
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
        const wallGeo = new THREE.BoxGeometry(tileSize, 4, tileSize); 
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColorHex }); 
        
        let wallCount = 0;
        for (let z = 0; z < levelMatrix.length; z++) {
            for (let x = 0; x < levelMatrix[z].length; x++) {
                if (levelMatrix[z][x] === 1) wallCount++;
            }
        }

        const instancedMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;

        const offsetX = -(levelMatrix[0].length * tileSize) / 2;
        const offsetZ = -(levelMatrix.length * tileSize) / 2;
        const dummy = new THREE.Object3D();
        
        let i = 0;
        for (let z = 0; z < levelMatrix.length; z++) {
            for (let x = 0; x < levelMatrix[z].length; x++) {
                if (levelMatrix[z][x] === 1) {
                    dummy.position.set(offsetX + (x * tileSize), 2, offsetZ + (z * tileSize));
                    dummy.updateMatrix();
                    instancedMesh.setMatrixAt(i, dummy.matrix);
                    
                    const colMesh = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({visible: false}));
                    colMesh.position.copy(dummy.position);
                    this.collidables.push(colMesh);
                    this.scene.add(colMesh);
                    this.levelObjects.push(colMesh);

                    i++;
                }
            }
        }
        this.scene.add(instancedMesh);
        this.levelObjects.push(instancedMesh);
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
        if (this.isTransitioning) return;
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

    spawnItem(x, z, colorHex, onCollectCallback) {
        const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const mat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0.5, z); 
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.visualItems.push(mesh);
        this.levelObjects.push(mesh);

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

    loadLevel(levelId) {
        this.clearLevel();
        this.currentLevel = levelId;

        if (levelId === 'village') {
            this.scene.background = new THREE.Color(0x87CEEB); 
            this.createGround(0x4a7c59); 
            
            const mapMatrix = Array(15).fill(0).map((_, i) => {
                let row = Array(15).fill(0);
                if (i === 0 || i === 14) row = Array(15).fill(1);
                row[0] = 1; row[14] = 1;
                return row;
            });
            this.buildMap(mapMatrix, 0x8b8c89); 

            this.createNPC("Mago Ancião", -8, -5, 0x8A2BE2, 'assets/Mago.gltf', () => this.questManager.interactWithMage(), 150, 25, 5);
            this.createNPC("Clérigo Mercador", 8, 5, 0xffaa00, 'assets/Clérigo.gltf', () => this.questManager.interactWithCleric(), 120, 15, 10);
            
            this.createNPC("O Caçador", -10, 8, 0x228B22, 'assets/Arqueiro.gltf', () => this.questManager.interactWithHunter(), 150, 20, 5);
            this.createNPC("Ladino Misterioso", 12, -10, 0x333333, 'assets/Ladino.gltf', () => this.questManager.interactWithThief(), 150, 25, 10);

            this.spawnPortal(0, -15, 'dungeon', 0xaa00ff);
            
            if (this.player && this.player.mesh) this.player.mesh.position.set(0, 0, 10);

        } 
        else if (levelId === 'dungeon') {
            this.scene.background = new THREE.Color(0x0a0a0a); 
            this.createGround(0x222222); 
            
            const mapMatrix = Array(15).fill(0).map((_, i) => {
                let row = Array(15).fill(0);
                if (i === 0 || i === 14) row = Array(15).fill(1);
                row[0] = 1; row[14] = 1;
                return row;
            });
            mapMatrix[4][4] = 1; mapMatrix[4][10] = 1;
            mapMatrix[10][4] = 1; mapMatrix[10][10] = 1;
            this.buildMap(mapMatrix, 0x111111);

            this.spawnEnemy("Ladino Sombrio", 8, -8, 60, 10, 2, 'assets/Ladino.gltf');
            this.spawnEnemy("Ladino Sombrio", -8, -8, 60, 10, 2, 'assets/Ladino.gltf');
            this.spawnEnemy("Arqueiro Sombrio", 0, -12, 40, 15, 1, 'assets/Arqueiro.gltf');
            
            this.spawnEnemy("Rei Orc", 0, -6, 200, 25, 5, 'assets/Orc.gltf');
            
            this.spawnPortal(0, 15, 'village', 0x00aaff);
            
            if (this.player && this.player.mesh) this.player.mesh.position.set(0, 0, -10);
        }
    }

    spawnEnemy(name, x, z, hp, atk, def, modelPath) {
        const path = name === "Rei Orc" ? 'assets/Orc.gltf' : modelPath;
        const enemy = new Enemy(this, name, x, z, hp, atk, def, path);
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
        const animate = () => {
            requestAnimationFrame(animate);
            this.update();
        };
        animate();
    }

    update() {
        if (!this.clock) return; 
        const delta = this.clock.getDelta();
        
        if (this.player) this.player.update(delta);
        
        if (this.enemies) {
            this.enemies.forEach(enemy => { if(enemy && enemy.update) enemy.update(delta); });
            this.enemies = this.enemies.filter(enemy => enemy && !enemy.isDisposed);
        }
        
        if (this.visualItems) {
            this.visualItems.forEach(itemMesh => {
                if (itemMesh && itemMesh.parent) { 
                    itemMesh.rotation.y += delta * 1.5;
                    itemMesh.rotation.x += delta * 1.0;
                }
            });
        }

        
        if (this.interactables) {
            this.interactables.forEach(npc => {
                if (npc && npc.mesh && npc.mesh.userData && npc.mesh.userData.mixer) {
                    npc.mesh.userData.mixer.update(delta);
                }
            });
        }

        if (!this.isTransitioning && this.player && this.player.mesh) {
            for (let p of this.portals) {
                if (p && p.mesh && this.player.mesh.position.distanceTo(p.mesh.position) < 2.0) {
                    this.transitionToLevel(p.target);
                    break;
                }
            }
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
