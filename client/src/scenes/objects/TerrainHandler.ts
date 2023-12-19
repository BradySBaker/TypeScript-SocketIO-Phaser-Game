import global from "../global";
import Game from "../game";

import seedrandom from 'seedrandom';

export default class TerrainHandler {
  game: Game;
  platformGroup!: Phaser.GameObjects.Group;
  rng = seedrandom('seed');
  prevPlatform!: Phaser.GameObjects.Rectangle;
  min = 10;
  max = 1000;
  constructor(game: Game) {
    this.game = game;
    this.platformGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }
  spawnPlatforms() {
    let newPlatform;
    let player = global.curPlayerData.body;
    if (!player) {
      return;
    }
    if (!this.prevPlatform) {
      let width = Math.floor(this.rng() * (this.max - this.min + 1)) + this.min;
      newPlatform = this.game.add.rectangle(global.curPlayerData.body.x, this.game.gameHeight + 120, width, 30, 0xfffff);
    } else {
      return;
    }

    this.prevPlatform = newPlatform;
  }
}