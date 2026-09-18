
import { GameEngine } from './game.js';
// Em breve importaremos Player, UI, Quests aqui

// Aguarda o DOM carregar totalmente para evitar referências nulas ou erros de renderização
document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando RPG Medieval Web...");

    // Instancia o motor principal do jogo
    const game = new GameEngine();

    // Inicia o loop de renderização (Game Loop)
    game.start();
});
