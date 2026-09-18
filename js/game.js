import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Player } from './player.js';
import { UIManager } from './ui.js'; 
import { QuestManager } from './quests.js'; 
import { ShopManager } from './shop.js'; 
import { Enemy } from './enemy.js'; 
import { StealthManager } from './stealth.js'; 
import { SaveManager } from './save.js'; // 1. Importar SaveManager

export class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        this.ui = new UIManager();
        this.questManager = new QuestManager(this); 
        this.shopManager = new ShopManager(this); 
        this.stealthManager = new StealthManager(this); 
        this.saveManager = new SaveManager(this); // 2. Instanciar SaveManager
        
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
        this.enemies = []; 
        this.gltfLoader = new GLTFLoader();

        this.setupEnvironment();
        this.setupLights();
        
        this.player = new Player(this);
        
        // 3. Tenta carregar o save logo após o player ser criado
        this.saveManager.loadGame();
        // Atualiza a tela (HUD) com as estatísticas carregadas
        this.ui.updateHUD(this.player); 

        this.bindEvents();
    }

    // [Funções spawnEnemy, createNPC, turnNpcIntoEnemy e spawnItem se mantêm 100% iguais]
    spawnEnemy(name, x, z, hp, atk, def, modelPath) {
        const enemy = new Enemy(this, name, x, z, hp, atk, def, modelPath);
        this.enemies.push(enemy);
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
        
        const npcData = {
            mesh: npcGroup,
            isNPC: true,
            name: name,
            hp: hp,
            atk: atk,
            def: def,
            modelPath: modelPath,
            hasBeenRobbed: false,
            onInteract: onInteractCallback
        };
        this.interactables.push(npcData);

        this.gltfLoader.load(modelPath, (gltf) => {
            npcGroup.remove(placeholder);
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
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
        }, undefined, () => {
            console.warn(`Modelo ${modelPath} ausente. Usando placeholder.`);
        });
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

    // NOVO: Sistema Automático de Geração de Cenários (Level Design)
    buildMap() {
        // Matriz do Mapa (1 = Parede/Muralha, 0 = Chão Livre)
        // Isso cria uma arena fechada com algumas paredes no meio para cobertura
        const levelMap = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ];

        const tileSize = 3; // Tamanho de cada bloco
        const wallGeo = new THREE.BoxGeometry(tileSize, 3, tileSize); // 3 de altura
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555 }); // Cinza escuro
        
        // Offset para centralizar o mapa na tela (o jogador começa no 0,0,0)
        const offsetX = -(levelMap[0].length * tileSize) / 2;
        const offsetZ = -(levelMap.length * tileSize) / 2;

        for (let z = 0; z < levelMap.length; z++) {
            for (let x = 0; x < levelMap[z].length; x++) {
                if (levelMap[z][x] === 1) {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    // O Y = 1.5 faz a caixa (altura 3) ficar com a base exatamente no chão (0)
                    wall.position.set(offsetX + (x * tileSize), 1.5, offsetZ + (z * tileSize));
                    wall.castShadow = true; 
                    wall.receiveShadow = true;   
                    this.collidables.push(wall); 
                    this.scene.add(wall);
                }
            }
        }
    }

    setupEnvironment() {
        // Chão Gigante
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.8 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true; 
        this.scene.add(this.ground);

        // Constrói o Level Design usando a Matriz
        this.buildMap();

        // Como o mapa agora tem limites de paredes (e é menor que o infinito de antes), 
        // reposicionamos os NPCs/Inimigos para caírem dentro da arena de jogo.
        
        this.createNPC("Mago Ancião", -8, -4, 0x8A2BE2, 'assets/Mago.gltf', () => this.questManager.interactWithMage(), 150, 25, 5);
        this.createNPC("Clérigo Mercador", 8, 4, 0xffaa00, 'assets/Clérigo.gltf', () => this.questManager.interactWithCleric(), 120, 15, 10);

        this.spawnEnemy("Ladino Sombrio", 12, -8, 60, 10, 2, 'assets/Ladino.gltf');
        this.spawnEnemy("Ladino Sombrio", 15, -10, 60, 10, 2, 'assets/Ladino.gltf');
        this.spawnEnemy("Ladino Sombrio", 8, -12, 60, 10, 2, 'assets/Ladino.gltf');
        this.spawnEnemy("Arqueiro Renegado", -12, 10, 30, 5, 0, 'assets/Arqueiro.gltf');

        // Itens
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
        
        this.renderer.render(this.scene, this.camera);
    }
}
