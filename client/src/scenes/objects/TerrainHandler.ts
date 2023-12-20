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
  prevChunks: {'prev': Phaser.GameObjects.Rectangle[], 'cur': Phaser.GameObjects.Rectangle[]} = {'prev': [], 'cur': []};
  prevRandoms: {[chunk: number]: {x: number, y: number}} = {};
  curChunk = 0;

  constructor(game: Game) {
    this.game = game;
    this.blockGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }

  deleteChunk() {
    for (let i = 0; i < this.prevChunks['prev'].length; i++) {
      let curBlock = this.prevChunks['prev'][i];
      curBlock.destroy();
    }
    this.prevChunks['prev'] = [];
    this.prevChunks['prev'].concat(this.prevChunks['cur']);
  }

  generateBlock(random: number, yDir: number, prevBlock: GameObject): Phaser.GameObjects.Rectangle {
    let moveY = random < .5 ? 0 : 1;
    prevBlock.y += moveY * yDir * 50;
    let curRect = this.game.add.rectangle(prevBlock.x + 50, prevBlock.y, 50, 50, 0xfffff);
    let index = 'prev';
    if (this.prevChunks['prev'].length > 9) {
      index = 'cur';
    }
    this.prevChunks[index].push(curRect); //fix me
    return curRect;
  }

  generateChunks() {
    this.deleteChunk();
    for (let i = 0; i < 2; i++) {
      this.generateChunk(); //Fix me
    }
  }

  generateChunk() {
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
      if (i === 0) {
        this.firstBlock = curRect;
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
    } else if (player.x - this.firstBlock.x < -50) { //Backward Generate
      // this.generateChunks();
    }
  }
}