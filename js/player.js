import * as THREE from 'three';

export class Player {
    constructor(scene, camera, collidables, interactables, ui) {
        this.scene = scene;
        this.camera = camera;
        this.collidables = collidables; 
        this.interactables = interactables; // Recebe o array de objetos interativos do mundo
        this.ui = ui; 

        this.hp = 100;
        this.xp = 0;
        this.coins = 50;
        this.speed = 8; 
        
        this.playerBox = new THREE.Box3();
        this.nearestInteractable = null; // Guarda referência do NPC/Item mais próximo
        
        this.keys = { forward: false, backward: false, left: false, right: false };
        this.cameraOffset = new THREE.Vector3(0, 15, 10);

        this.setupMesh();
        this.setupControls();
        this.ui.updateHUD(this);
    }

    setupMesh() {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x2244cc }); 
        this.mesh = new THREE.Mesh(geometry, material);
        
        this.mesh.position.y = 0.9; 
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        const faceGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const faceMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }); 
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.position.set(0, 0.5, 0.4); 
        this.mesh.add(face); 

        this.scene.add(this.mesh);
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        window.addEventListener('keyup', (e) => this.handleKey(e.code, false));
    }

    handleKey(code, isPressed) {
        if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = isPressed;
        if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = isPressed;
        if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = isPressed;
        if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = isPressed;

        // Lógica de Interação: Tecla E pressionada + Existe algo perto + Nenhuma janela aberta
        if (code === 'KeyE' && isPressed && this.nearestInteractable && !this.ui.isPanelOpen()) {
            this.nearestInteractable.onInteract();
        }
    }

    update(delta) {
        // Trava o movimento se estiver lendo um diálogo
        if (this.ui.isPanelOpen()) return; 

        const direction = new THREE.Vector3(0, 0, 0);

        if (this.keys.forward) direction.z -= 1;
        if (this.keys.backward) direction.z += 1;
        if (this.keys.left) direction.x -= 1;
        if (this.keys.right) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            
            const moveX = direction.x * this.speed * delta;
            const moveZ = direction.z * this.speed * delta;

            this.mesh.position.x += moveX;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) {
                this.mesh.position.x -= moveX; 
            }

            this.mesh.position.z += moveZ;
            this.playerBox.setFromObject(this.mesh);
            if (this.checkCollisions()) {
                this.mesh.position.z -= moveZ; 
            }

            const targetPosition = this.mesh.position.clone().add(direction);
            this.mesh.lookAt(targetPosition);
        }

        this.camera.position.copy(this.mesh.position).add(this.cameraOffset);
        this.camera.lookAt(this.mesh.position);

        // Checa distância para NPCs/Itens a cada frame
        this.checkInteractables();
    }

    checkCollisions() {
        for (let i = 0; i < this.collidables.length; i++) {
            const objectBox = new THREE.Box3().setFromObject(this.collidables[i]);
            if (this.playerBox.intersectsBox(objectBox)) return true; 
        }
        return false;
    }

    checkInteractables() {
        let closestDist = Infinity;
        let closestObj = null;

        for (let i = 0; i < this.interactables.length; i++) {
            const interactable = this.interactables[i];
            const dist = this.mesh.position.distanceTo(interactable.mesh.position);
            
            // Distância de 3.5 unidades no mundo 3D
            if (dist < 3.5 && dist < closestDist) {
                closestDist = dist;
                closestObj = interactable;
            }
        }

        if (this.nearestInteractable !== closestObj) {
            this.nearestInteractable = closestObj;
            this.ui.showInteractionPrompt(this.nearestInteractable !== null);
        }
    }
}
