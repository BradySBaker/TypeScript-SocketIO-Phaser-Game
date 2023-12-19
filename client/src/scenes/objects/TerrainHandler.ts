import global from "../global";
import Game from "../game";

import seedrandom from 'seedrandom';

export default class TerrainHandler {
  game: Game;
  blockGroup!: Phaser.GameObjects.Group;
  rng = seedrandom('random');
  prevBlock!: Phaser.GameObjects.Rectangle;
  firstBlock!: Phaser.GameObjects.Rectangle;
  mountain = {up: false, down: false};
  chunkLength = 10;
  prevChunk: Phaser.GameObjects.Rectangle[] = [];
  prevRandoms: {[chunk: number]: number[]} = {};
  curChunk = 0;

  constructor(game: Game) {
    this.game = game;
    this.blockGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }

  deleteChunk() {
    this.prevChunk.forEach((curBlock) => {
      curBlock.destroy();
    });
    this.prevChunk = [];
  }

  // generatePrevChunck(player: Phaser.GameObjects.Rectangle) {
  //   this.deleteChunk();
  //   let randoms = this.prevRandoms[this.curChunk];
  //   let yDir = randoms[0];
  //   randoms.forEach((curRandom) => {

  //   });
  // }

  generateChunk(player: Phaser.GameObjects.Rectangle) {
    this.deleteChunk();

    let random = this.rng();
    this.prevRandoms[this.curChunk] = []

    let yDir = random > .5 ? 1 : -1;
    let prevY = this.prevBlock ? this.prevBlock.y : global.ground;
    for (let i = 0; i < this.chunkLength; i++) {
      this.prevRandoms[this.curChunk].push(random);
      let moveY = random < .5 ? 0 : 1;
      prevY += moveY * yDir * 50;
      let curRect = this.game.add.rectangle(player.x + (i * 51), prevY, 50, 50, 0xfffff);
      this.prevChunk.push(curRect);
      prevY = curRect.y;
      if (i === this.chunkLength - 1) {
        this.prevBlock = curRect;
        return;
      }
      if (i === 0) {
        this.firstBlock = curRect;
      }
      random = this.rng();
    }
    this.curChunk++;
  }

  spawnChunk() {
    let player = global.curPlayerData.body;
    if (!player) {
      return;
    }
    if (!this.prevBlock) {
      this.generateChunk(player);
      return;
    }
    if (this.prevBlock.x - player.x < 10) { //Forwards generate
      this.generateChunk(player);
    } else if (player.x - this.prevBlock.x < 10) { //Backward Generate
      // this.generatePrevChunck(player);
    }
  }
}