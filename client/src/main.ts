import Phaser from "phaser";
import Game from "./scenes/game.js";


const config = {
	backgroundColor: '2c003e',
	type: Phaser.AUTO,
  width: window.innerWidth,
	height: Math.min(Math.max(window.innerHeight, 400), 800),
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: 0 },
			debug: true
		}
	}
}

const game = new Phaser.Game(config);
game.scene.add('game', Game);
game.scene.start('game');