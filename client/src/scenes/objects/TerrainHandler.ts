import global from "../global";
import Game from "../game";

import seedrandom from 'seedrandom';

export default class TerrainHandler {
  game: Game;
  blockGroup!: Phaser.GameObjects.Group;
  rng = seedrandom('random');
  prevBlock!: GameObject;
  prevChunks: {[chunk: number]: Phaser.GameObjects.Rectangle[]} = {};
  prevChunkData: {[chunk: number]: GameObject[]} = {};
  chunkDetails = {curChunk: 0, lastChunk: 0, chunkAmount: 2, chunkLength: 6};

  constructor(game: Game) {
    this.game = game;
    this.blockGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }

  generatePrevChunk() {
    let prevChunk = this.prevChunkData[this.chunkDetails.lastChunk - 1];
    if (!prevChunk) {
      return;
    }
    this.prevChunks[this.chunkDetails.lastChunk - 1] = [];
    prevChunk.forEach((pos, idx) => {
      let curRect = this.game.add.rectangle(pos.x, pos.y, 50, 50, 0xfffff);
      this.prevChunks[this.chunkDetails.lastChunk - 1][idx] = curRect;
    });
    this.deleteChunk(false);
  }


  deleteChunk(front = true) {
    let idx = front ? this.chunkDetails.lastChunk : this.chunkDetails.curChunk - 1;
    let curChunk = this.prevChunks[idx];
    curChunk.forEach((curBlock) => {
      curBlock.destroy();
    });
    delete this.prevChunks[idx];
    this.chunkDetails.lastChunk += front ? 1 : -1;
    if (!front) {
      this.chunkDetails.curChunk--;
      this.prevBlock = this.prevChunks[this.chunkDetails.curChunk - 1][this.prevChunks[this.chunkDetails.curChunk - 1].length - 1];
    }
  }

  generateChunk() {
    if ((this.chunkDetails.curChunk - this.chunkDetails.lastChunk) === this.chunkDetails.chunkAmount * 2) { //deletes chunk far enough away
      for (let i = 0; i < this.chunkDetails.chunkAmount; i++) {
        this.deleteChunk();
      }
    }
    this.prevChunkData[this.chunkDetails.curChunk] = [];
    this.prevChunks[this.chunkDetails.curChunk] = [];


    let random = this.rng();
    let yDir = random > .5 ? 1 : -1;

    for (let i = 0; i < this.chunkDetails.chunkLength; i++) { //Generate chunkLength chunks
      this.generateBlock(yDir, random);
      random = this.rng();
    }

    this.chunkDetails.curChunk++;
  }




  generateBlock(yDir: number, random: number) {
    if (!this.prevBlock) { //First block
      this.prevBlock = {x: 300, y: global.ground};
    }

    let moveY = random < .5 ? 0 : 1;
    let yPos = this.prevBlock.y + moveY * yDir * 50;

    let curRect = this.game.add.rectangle(this.prevBlock.x + 50, yPos, 50, 50, 0xfffff);
    this.prevChunkData[this.chunkDetails.curChunk].push({x: curRect.x, y: curRect.y});
    this.prevChunks[this.chunkDetails.curChunk].push(curRect);
    this.prevBlock = curRect;
  };




  spawnChunk() {
    let player = global.curPlayerData.body;
    if (!player) {
      return;
    }
    if (!this.prevBlock || this.prevBlock.x - player.x < 0) { //Forwards generate
      for (let i = 0; i < this.chunkDetails.chunkAmount; i++) {
        this.generateChunk();
      }
    } else if  (this.prevChunks[this.chunkDetails.lastChunk] && player.x - this.prevChunks[this.chunkDetails.lastChunk][0].x  < 0) { //Backward Generate
      this.generatePrevChunk();
    }
  }
}