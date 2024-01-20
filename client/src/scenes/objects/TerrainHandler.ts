import global from "../global";
import Game from "../game";

import seedrandom from 'seedrandom';

export default class TerrainHandler {
  game: Game;
  blockGroup!: Phaser.GameObjects.Group;
  rng = seedrandom('random');
  prevBlock!: GameObject;
  prevChunks: {[chunk: number]: Phaser.GameObjects.TileSprite[]} = {};
  prevChunkData: {[chunk: number]: GameObject[]} = {};
  chunkDetails = {curChunk: 0, lastChunk: 0, chunkAmount: 5, chunkLength: 10}; //Chunk length must be atleast 5
  blockDetails = {height: 500, width: 50};

  chunksGenerating = false;
  curChunk = 0;
  chunkAmount = 0;

  chunkWidth = this.chunkDetails.chunkLength * this.blockDetails.width * this.chunkDetails.chunkAmount;

  constructor(game: Game) {
    this.game = game;
    this.blockGroup = game.physics.add.group({classType: Phaser.GameObjects.TileSprite});
  }

  generatePrevChunk(lastChunk: boolean, forwards: boolean) {
    let index = forwards ? this.curChunk : this.chunkDetails.lastChunk - 1;
    let prevChunk = this.prevChunkData[index];
    if (!prevChunk) {
      return;
    }
    this.prevChunks[index] = [];
    prevChunk.forEach((pos, idx) => {
      let curRect = this.game.add.tileSprite(pos.x, pos.y, this.blockDetails.width, this.blockDetails.height, 'grass').setDepth(1);
      this.blockGroup.add(curRect);
      this.prevChunks[index][idx] = curRect;
      if (idx === prevChunk.length - 1 && lastChunk) {
        if (forwards) {
          this.prevBlock = curRect;
        }
        this.chunksGenerating = false;
      }
    });
    this.deleteChunk(forwards);
  }


  deleteChunk(front = true) {
    let idx = front ? this.chunkDetails.lastChunk : this.chunkDetails.curChunk - 1;
    let curChunk = this.prevChunks[idx];
    curChunk.forEach((curBlock) => {
      this.blockGroup.remove(curBlock, true);
      curBlock.destroy();
    });
    delete this.prevChunks[idx];
    this.chunkDetails.lastChunk += front ? 1 : -1;
    if (!front) {
      this.chunkDetails.curChunk--;
      this.prevBlock = this.prevChunks[this.chunkDetails.curChunk - 1][this.prevChunks[this.chunkDetails.curChunk - 1].length - 1];
    }
  }

  generateChunk(lastChunk: boolean) {
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
      let lastBlock = lastChunk && i === this.chunkDetails.chunkLength - 1 ? true : false;
      this.generateBlock(yDir, random, lastBlock);
      random = this.rng();
    }

    this.chunkDetails.curChunk++;
  }




  generateBlock(yDir: number, random: number, lastBlock: boolean) {
    if (!this.prevBlock) { //First block
      this.prevBlock = {x: 300, y: global.ground};
    }

    let moveY = random < .5 ? 0 : 1;
    let yPos = this.prevBlock.y + moveY * yDir * this.blockDetails.width;

    let curRect = this.game.add.tileSprite(this.prevBlock.x + this.blockDetails.width, yPos, this.blockDetails.width, this.blockDetails.height, 'grass').setDepth(1);
    this.game.EnvironmentController.validateAndCreateEnvObj({x: curRect.x, y: curRect.y - this.blockDetails.height/2}); //Plant handler controls if it should spawn

    this.blockGroup.add(curRect);
    this.prevChunkData[this.chunkDetails.curChunk].push({x: curRect.x, y: curRect.y});
    this.prevChunks[this.chunkDetails.curChunk].push(curRect);
    this.prevBlock = curRect;
    if (lastBlock) {
      this.chunksGenerating = false;
    }
  };




  spawnChunks() {
    let player = global.curPlayerData.body;
    if (!player) {
      return;
    }
    if (this.chunksGenerating) {
      return;
    }
    if (!this.prevBlock || this.prevBlock.x - player.x < this.chunkWidth/2) { //Forwards generate
      this.chunksGenerating = true;
      if (this.curChunk < this.chunkAmount) {
        for (let i = 0; i < this.chunkDetails.chunkAmount; i++) {
          const lastChunk = i === this.chunkDetails.chunkAmount - 1 ? true : false;
          this.generatePrevChunk(lastChunk, true);
          this.chunkDetails.curChunk++;
          this.curChunk++;
        }
        return;
      }
      for (let i = 0; i < this.chunkDetails.chunkAmount; i++) {
        const lastChunk = i === this.chunkDetails.chunkAmount - 1 ? true : false;
        this.generateChunk(lastChunk);
        this.chunkAmount++;
        this.curChunk++;
      }
    } else if  (this.prevChunks[this.chunkDetails.lastChunk] && player.x - this.prevChunks[this.chunkDetails.lastChunk][0].x  < this.chunkWidth/3 && this.curChunk - this.chunkDetails.chunkAmount > this.chunkDetails.chunkAmount) { //Backward Generate
      this.chunksGenerating = true;
      for (let i = 0; i < this.chunkDetails.chunkAmount; i++) {
        const lastChunk = i === this.chunkDetails.chunkAmount - 1 ? true : false;
        this.generatePrevChunk(lastChunk, false);
        this.curChunk--;
      }
    }
  }
}