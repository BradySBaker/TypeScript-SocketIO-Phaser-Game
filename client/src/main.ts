import Phaser from "phaser";
import Game from "./scenes/game.ts";

const config = {
	backgroundColor: '2c003e',
	type: Phaser.AUTO,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: 0 },
			debug: false
		}
	}
}

const game = new Phaser.Game(config);
game.scene.add('game', Game);
game.scene.start('game');