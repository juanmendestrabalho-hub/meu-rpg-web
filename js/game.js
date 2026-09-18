import * as THREE from 'three';
import { Player } from './player.js'; // NOVO: Importação do módulo do jogador

export class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); 

        this.renderer = new THREE.WebGLRenderer({ antialias: true }); 
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true; 
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.clock = new THREE.Clock();
        
        // NOVO: Array centralizado para entidades sólidas (paredes, npcs, árvores)
        this.collidables = [];

        this.setupEnvironment();
        this.setupLights();
        
        // NOVO: Instanciamos o jogador, injetando a cena (para ele ser desenhado), 
        // a câmera (para ele controlá-la) e os collidables (para calcular colisões)
        this.player = new Player(this.scene, this.camera, this.collidables);

        this.bindEvents();
    }

    setupEnvironment() {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a7c59, 
            roughness: 0.8 
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true; 
        
        this.scene.add(this.ground);

        // NOVO: Adicionado 3 pilares para testar o sistema de colisão de forma prática
        const wallGeometry = new THREE.BoxGeometry(2, 2, 2);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8c89 });
        
        const positions = [
            { x: 5, y: 1, z: -5 },
            { x: -5, y: 1, z: -5 },
            { x: 0, y: 1, z: -8 }
        ];

        positions.forEach(pos => {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(pos.x, pos.y, pos.z);
            wall.castShadow = true;      
            wall.receiveShadow = true;   
            
            this.collidables.push(wall); // Adiciona no sistema de colisão
            this.scene.add(wall);
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

        // NOVO: Chama a lógica de movimentação, rotação e câmera a cada frame
        if (this.player) {
            this.player.update(delta);
        }

        this.renderer.render(this.scene, this.camera);
    }
}
