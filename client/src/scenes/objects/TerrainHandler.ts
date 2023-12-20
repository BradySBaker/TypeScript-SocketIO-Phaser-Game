import global from "../global";
import Game from "../game";

import seedrandom from 'seedrandom';

export default class TerrainHandler {
  game: Game;
  blockGroup!: Phaser.GameObjects.Group;
  rng = seedrandom('random');
  prevBlock!: Phaser.GameObjects.Rectangle;
  mountain = {up: false, down: false};
  chunkLength = 4;
  prevChunks: {'prev': Phaser.GameObjects.Rectangle[], 'cur': Phaser.GameObjects.Rectangle[]} = {'prev': [], 'cur': []};
  prevBlockPos: {[chunk: number]: {x: number, y: number}[]} = {};
  curChunk = 0;

  constructor(game: Game) {
    this.game = game;
    this.blockGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }

  deleteChunk(type: 'prev' | 'cur' = 'prev') {
    for (let i = 0; i < this.prevChunks[type].length; i++) {
      this.prevChunks[type][i].destroy();
    }
    this.prevChunks[type] = [];
    let other: 'prev' | 'cur' = type === 'prev' ? 'cur' : 'prev';
    this.prevChunks[type] = this.prevChunks[type].concat(this.prevChunks[other]);
    this.prevChunks[other] = [];
  }

  generateBlock(random: number, yDir: number, prevBlock: GameObject): Phaser.GameObjects.Rectangle {
    let moveY = random < .5 ? 0 : 1;
    prevBlock.y += moveY * yDir * 50;
    let curRect = this.game.add.rectangle(prevBlock.x + 50, prevBlock.y, 50, 50, 0xfffff);
    this.prevBlockPos[this.curChunk].push({x: prevBlock.x + 50, y: prevBlock.y});
    let index = 'prev';
    if (this.prevChunks['prev'].length > this.chunkLength - 1) {
      index = 'cur';
    }
    this.prevChunks[index].push(curRect); //fix me
    return curRect;
  }

  generateChunks() {
    this.deleteChunk();
    for (let i = 0; i < 2; i++) {
      this.generateChunk();
    }
  }

  generatePrevChunck() {
    if (!this.prevBlockPos[this.curChunk - 1]) {
      return;
    }
    this.curChunk--;
    this.prevBlockPos[this.curChunk].forEach((curPos,idx) => {
      let curRect = this.game.add.rectangle(curPos.x, curPos.y, 50, 50, 0xfffff);
      this.prevChunks['prev'][idx] = curRect;
      // if (idx === 0) {
      //   this.prevBlock = curRect;
      // }
    })
  }

  generateChunk() {
    this.prevBlockPos[this.curChunk] = [];
    let random = this.rng();

    let yDir = random > .5 ? 1 : -1;
    let prevBlock = this.prevBlock ? this.prevBlock : {x: 300 , y: global.ground};
    for (let i = 0; i < this.chunkLength; i++) {
      const curRect = this.generateBlock(random, yDir, prevBlock);
      prevBlock = curRect; //Fixes
      if (i === this.chunkLength - 1) { //end loop
        this.prevBlock = curRect;
        this.curChunk++;
        return;
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
      this.generateChunks();
      return;
    }
    if (this.prevBlock.x - player.x < 0) { //Forwards generate
      this.generateChunks();
    } else if (player.x - this.prevChunks['prev'][0].x < -50) { //Backward Generate
      this.deleteChunk('cur');
      this.generatePrevChunck();
    }
  }
}