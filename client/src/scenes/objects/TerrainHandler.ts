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

  generateChunk(player: Phaser.GameObjects.Rectangle, xDir: number) {
    this.deleteChunk();

    let random = this.rng();
    this.prevRandoms[this.curChunk] = [];

    let yDir = random > .5 ? 1 : -1;
    let prevBlock = xDir > 0 ? this.prevBlock ? this.prevBlock : {x: player.x, y: global.ground} : this.firstBlock;
    for (let i = 0; i < this.chunkLength; i++) {
      this.prevRandoms[this.curChunk].push(random);
      let moveY = random < .5 ? 0 : 1;
      let yOffset = moveY * yDir * 50;
      let curRect = this.game.add.rectangle(prevBlock.x + 50 * xDir, prevBlock.y + yOffset, 50, 50, 0xfffff);
      this.prevChunk.push(curRect);
      prevBlock = curRect;
      if (i === this.chunkLength - 1) {
        if (xDir > 0) {
          this.prevBlock = curRect;
        } else {
          this.firstBlock = curRect;
        }
        this.curChunk += xDir > 1 ? 1 : -1;
      }
      if (i === 0) {
        if (xDir > 0) {
          this.firstBlock = curRect;
        } else {
          this.prevBlock = curRect;
        }
      }
      random = this.rng();
    }
  }

  spawnChunk() {
    let player = global.curPlayerData.body;
    if (!player) {
      return;
    }
    if (!this.prevBlock) {
      this.generateChunk(player, 1);
      return;
    }
    console.log(player.x - this.firstBlock.x);
    if (this.prevBlock.x - player.x < 10) { //Forwards generate
      this.generateChunk(player, 1);
    } else if (player.x - this.firstBlock.x < -80) { //Backward Generate
      this.generateChunk(player, -1);
    }
  }
}