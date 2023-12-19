import global from "../global";
import Game from "../game";

import seedrandom from 'seedrandom';
import { Tilemaps } from "phaser";

export default class TerrainHandler {
  game: Game;
  platformGroup!: Phaser.GameObjects.Group;
  rng = seedrandom('seed');
  prevPlatform!: Phaser.GameObjects.Rectangle;
  prevCorner!: {x: number, y: number};
  min = 10;
  max = 1000;
  constructor(game: Game) {
    this.game = game;
    this.platformGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }

  calculateCorner() {
    const angleInRadians = Phaser.Math.DegToRad(this.prevPlatform.angle);
    const x = this.prevPlatform.x + this.prevPlatform.width * Math.cos(angleInRadians);
    const y = this.prevPlatform.y + this.prevPlatform.width * Math.sin(angleInRadians);
    this.prevCorner = {x, y};
  }

  spawnPlatforms() {
    let player = global.curPlayerData.body;
    if (!player) {
      return;
    }
    if (this.prevCorner && this.prevCorner.x - player.x >= 40) {
      return;
    }

    let width = Math.floor(this.rng() * (this.max - this.min + 1)) + this.min;
    if (!this.prevPlatform) {
      this.prevPlatform = this.game.add.rectangle(global.curPlayerData.body.x - 50, this.game.gameHeight + 140, width, 30, 0xfffff).setOrigin(0, 0.5);
      this.calculateCorner();
    } else {
      let angle = Math.floor(this.rng() * (80) -40);
      this.prevPlatform = this.game.add.rectangle(this.prevCorner.x - 10, this.prevCorner.y, width, 30, 0xfffff).setOrigin(0, 0.5);
      this.prevPlatform.angle = angle;
      this.calculateCorner();
    }
  }
}