import * as THREE from 'three';
import { Player } from './player.js';
import { UIManager } from './ui.js'; 
import { QuestManager } from './quests.js'; 

export class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        
        this.ui = new UIManager();
        this.questManager = new QuestManager(this); // Instancia as missões
        
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
        this.interactables = []; // Guarda tudo que possui a ação [E]

        this.setupEnvironment();
        this.setupLights();
        
        this.player = new Player(this.scene, this.camera, this.collidables, this.interactables, this.ui);

        this.bindEvents();
    }

    setupEnvironment() {
        // Chão
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.8 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true; 
        this.scene.add(this.ground);

        // Objeto de Teste / Parede
        const wallGeometry = new THREE.BoxGeometry(2, 2, 2);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8c89 });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(5, 1, -5);
        wall.castShadow = true;      
        wall.receiveShadow = true;   
        this.collidables.push(wall); 
        this.scene.add(wall);

        // NPC Mago
        const npcGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
        const npcMaterial = new THREE.MeshStandardMaterial({ color: 0x8A2BE2 }); 
        const npcMesh = new THREE.Mesh(npcGeometry, npcMaterial);
        npcMesh.position.set(-5, 0.9, -2); 
        npcMesh.castShadow = true;
        npcMesh.receiveShadow = true;
        
        this.collidables.push(npcMesh); // Torna o NPC sólido
        this.scene.add(npcMesh);

        // Torna o NPC interagível
        this.interactables.push({
            mesh: npcMesh,
            onInteract: () => this.questManager.interactWithMage()
        });
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;

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
        this.renderer.render(this.scene, this.camera);
    }
}
