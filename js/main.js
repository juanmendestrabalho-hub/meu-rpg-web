import { GameEngine } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando RPG Medieval Web...");
    const game = new GameEngine();
    game.start();
});
