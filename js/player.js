import * as THREE from 'three';

export class Player {
    constructor(scene, camera, collidables) {
        this.scene = scene;
        this.camera = camera;
        
        // Array recebido do game.js contendo tudo o que é sólido no mundo
        this.collidables = collidables; 

        // Atributos de RPG do jogador
        this.hp = 100;
        this.xp = 0;
        this.coins = 50;

        this.speed = 8; // Velocidade em unidades do Three.js por segundo
        
        // A Bounding Box (AABB) é uma caixa invisível que envolve o modelo 3D. 
        // Usamos isso porque calcular colisão entre caixas é infinitamente mais 
        // leve para o navegador do que calcular colisão entre polígonos complexos.
        this.playerBox = new THREE.Box3();
        
        // Dicionário para rastrear quais teclas estão pressionadas neste exato frame
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        // Offset: É a distância fixa que a câmera manterá do jogador.
        // Y=15 (alto), Z=10 (um pouco para trás) cria o efeito isométrico/top-down.
        this.cameraOffset = new THREE.Vector3(0, 15, 10);

        this.setupMesh();
        this.setupControls();
    }

    setupMesh() {
        // Criando o corpo: Um cilindro é um excelente "placeholder" clássico para humanoides.
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x2244cc }); // Azul heroico
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Movemos no eixo Y para que o centro do cilindro suba e a base toque o chão (Y=0)
        this.mesh.position.y = 0.9; 
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Adicionando um "nariz/rosto" para ficar óbvio visualmente para onde ele está olhando
        const faceGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const faceMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }); // Cor de pele
        const face = new THREE.Mesh(faceGeo, faceMat);
        
        // O Z positivo no Three.js é "para a frente" relativo ao próprio objeto.
        face.position.set(0, 0.5, 0.4); 
        this.mesh.add(face); // Adicionar como filho garante que o rosto gire junto com o corpo

        this.scene.add(this.mesh);
    }

    setupControls() {
        // Mapeia o pressionamento (keydown) e a soltura (keyup) das teclas
        window.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        window.addEventListener('keyup', (e) => this.handleKey(e.code, false));
    }

    handleKey(code, isPressed) {
        // Suporta tanto o clássico WASD quanto as setas do teclado
        if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = isPressed;
        if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = isPressed;
        if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = isPressed;
        if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = isPressed;
    }

    update(delta) {
        // O vetor de direção começa zerado a cada frame
        const direction = new THREE.Vector3(0, 0, 0);

        // Subtrair no eixo Z move para "cima" (Norte) na tela, somar move para "baixo" (Sul)
        if (this.keys.forward) direction.z -= 1;
        if (this.keys.backward) direction.z += 1;
        if (this.keys.left) direction.x -= 1;
        if (this.keys.right) direction.x += 1;

        if (direction.lengthSq() > 0) {
            // Normalizar é OBRIGATÓRIO. Se você apertar Cima (1) e Direita (1), 
            // a distância total seria 1.41 (Teorema de Pitágoras). Normalizar força a 
            // soma dos vetores a nunca ultrapassar 1, evitando que o jogador ande mais rápido na diagonal.
            direction.normalize();

            // Deslocamento é Velocidade multiplicada pelo Tempo (delta).
            // O delta garante que o jogo rode na mesma velocidade em 60Hz ou 144Hz.
            const moveX = direction.x * this.speed * delta;
            const moveZ = direction.z * this.speed * delta;

            // 1. Aplicamos e validamos o movimento no Eixo X
            this.mesh.position.x += moveX;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) {
                this.mesh.position.x -= moveX; // Bateu? Desfaz apenas o X.
            }

            // 2. Aplicamos e validamos o movimento no Eixo Z
            this.mesh.position.z += moveZ;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) {
                this.mesh.position.z -= moveZ; // Bateu? Desfaz apenas o Z.
            }

            // Rotacionar o modelo: Calculamos um ponto imaginário um pouco à frente 
            // da direção em que estamos indo e dizemos para o modelo "olhar" para lá.
            const targetPosition = this.mesh.position.clone().add(direction);
            this.mesh.lookAt(targetPosition);
        }

        // Atualização da Câmera: Ela copia a posição do jogador e adiciona o offset definido.
        this.camera.position.copy(this.mesh.position).add(this.cameraOffset);
        this.camera.lookAt(this.mesh.position);
    }

    checkCollisions() {
        for (let i = 0; i < this.collidables.length; i++) {
            const object = this.collidables[i];
            
            // Gera uma Bounding Box ao redor do objeto que estamos testando
            const objectBox = new THREE.Box3().setFromObject(object);
            
            // A função intersectsBox matemática verifica se as duas caixas se sobrepõem
            if (this.playerBox.intersectsBox(objectBox)) {
                return true; 
            }
        }
        return false;
    }
}
