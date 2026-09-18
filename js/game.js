import * as THREE from 'three';

export class GameEngine {
    constructor() {
        // Pega a div criada no index.html
        this.container = document.getElementById('game-container');
        
        // 1. CONFIGURAÇÃO DA CENA
        // A cena é o contêiner raiz onde todos os objetos 3D, luzes e câmeras existem.
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Cor de céu azul claro

        // 2. CONFIGURAÇÃO DO RENDERIZADOR
        // WebGLRenderer utiliza a GPU do usuário para desenhar o mundo na tela.
        this.renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias suaviza as bordas
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true; // Habilita cálculos de sombra
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras com bordas suaves
        
        // Injeta o Canvas gerado dentro da div do nosso HTML
        this.container.appendChild(this.renderer.domElement);

        // 3. CONFIGURAÇÃO DA CÂMERA (Top-Down RPG)
        // Parâmetros: Campo de visão (FOV), Proporção da tela, Distância Mínima, Distância Máxima
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Posicionamos a câmera no alto (Y=15) e um pouco para trás (Z=10)
        this.camera.position.set(0, 15, 10);
        // Apontamos a câmera para o centro do mundo
        this.camera.lookAt(0, 0, 0);

        // Relógio interno crucial para jogos: calcula o deltaTime (tempo entre os frames).
        // Evita que o personagem ande mais rápido em monitores de 144Hz e mais devagar em monitores de 60Hz.
        this.clock = new THREE.Clock();

        // 4. INICIALIZAÇÃO DOS COMPONENTES DA CENA
        this.setupEnvironment();
        this.setupLights();
        this.bindEvents();
    }

    setupEnvironment() {
        // Criação do chão do mundo
        // PlaneGeometry define o formato plano, MeshStandardMaterial reage fisicamente à luz.
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a7c59, // Verde estilo grama
            roughness: 0.8 // Deixa o material menos "plástico" e reflexivo
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        
        // O plano é criado em pé por padrão. Rotacionamos -90 graus no eixo X para deitá-lo.
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true; // Permite que objetos projetem sombra sobre o chão
        
        this.scene.add(this.ground);

        // Adicionando um objeto de teste (uma parede de pedra) para testarmos colisão e sombras depois
        const wallGeometry = new THREE.BoxGeometry(2, 2, 2);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8c89 });
        
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(5, 1, -5); // O Y é 1 para que metade do cubo não fique enterrada no chão
        wall.castShadow = true;      // A parede projeta sombra
        wall.receiveShadow = true;   // A parede recebe sombra
        
        // Vamos guardar os objetos de colisão em um array para checagem futura
        this.collidables = [];
        this.collidables.push(wall);
        this.scene.add(wall);
    }

    setupLights() {
        // Luz ambiente: ilumina a cena de forma global e impede que áreas de sombra fiquem 100% pretas.
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Luz direcional: simula um sol distante. Essencial para criar sombras projetadas direcionais.
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        
        // Configuração para aumentar a qualidade das sombras
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        
        // Define a área no mundo onde as sombras são calculadas (otimização)
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;

        this.scene.add(dirLight);
    }

    bindEvents() {
        // Ajusta a câmera e o canvas se o jogador redimensionar a janela do navegador
        // Usamos .bind(this) para não perdermos a referência da classe GameEngine dentro do evento
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        // O setAnimationLoop substitui o requestAnimationFrame nativo com melhor suporte no Three.js
        this.renderer.setAnimationLoop(this.update.bind(this));
    }

    update() {
        // delta é o tempo exato decorrido desde o último frame gerado.
        const delta = this.clock.getDelta();

        // [TODO] Atualizar o Player aqui no futuro
        // if (this.player) this.player.update(delta);

        // Renderiza o frame
        this.renderer.render(this.scene, this.camera);
    }
}
