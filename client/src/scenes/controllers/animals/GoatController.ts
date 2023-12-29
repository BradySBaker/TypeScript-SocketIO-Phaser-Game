import { Socket } from "socket.io-client";
import Game from "../../game";
import global from "../../global";

type goat = {container: Phaser.GameObjects.Container, vx: number, randomTimer: number};

export default class GoatController {
  game: Game;
  socket: Socket;
  curGoats: {[id: string]: goat} = {};
  goatsData: {[id: string]: {pos: GameObject, assigned: boolean}} = {}; //For sending to server
  otherGoats: {[id: string]: Phaser.GameObjects.Container} = {}; //Recieved goats

  size = 65;
  goatOffset = {leg: {x: this.size/3, y: this.size/4}, head: {x: this.size/1.5}};
  goatGroup!: Phaser.GameObjects.Group;
  lastSpawnPoint: GameObject = {x: 0, y: 0};
  goatCount = 0;

  constructor(game: Game, socket: Socket) {
      this.game = game;
      this.socket = socket;

      this.goatGroup = this.game.physics.add.group({
          classType: Phaser.GameObjects.Rectangle,
          createCallback: ((goat: Phaser.GameObjects.GameObject) => {
            goat.body!.setOffset(-this.size/2, -this.size/4);
          })
        });
      this.handleData();
  }

  spawn(pos: GameObject) {
    this.lastSpawnPoint = pos;

    let container = this.createGoat(pos);
    let id = this.goatCount + '' + global.curPlayerData.id;

    this.curGoats[id] = {container, vx: 0, randomTimer: 300};
    this.goatsData[id] = {pos: {x: pos.x, y: pos.y}, assigned: true};

    this.goatCount++;
  }

  createGoat(pos: GameObject): Phaser.GameObjects.Container {
    const body = this.game.add.rectangle(0, 0, this.size, this.size/2, 0xff).setName('body');
    const head = this.game.add.rectangle(this.goatOffset.head.x, 0, this.size/3, this.size/1.5, 0xff0000).setName('head');
    head.angle = -30;
    const leg1 = this.game.add.rectangle(-this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg1').setOrigin(0.5, 0);
    const leg2 = this.game.add.rectangle(this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg2').setOrigin(0.5, 0);

    const container = this.game.add.container(pos.x, pos.y);
    container.setData({frontLegForward: false});
    this.goatGroup.add(container);
    container.add([head, body, leg1, leg2]);

    return container;
  }

  handleRandom(goat: goat) {
    if (goat.randomTimer >= 300) {
      goat.randomTimer = 0;
      goat.vx = Math.floor((Math.random() * 5) - 2);
    } else {
      goat.randomTimer += 1 * this.game.deltaTime;
    }
  }


  goatInRenderDistance(pos: GameObject) {
    let distance = Math.sqrt((pos.x - global.curPlayerData.body.x) ** 2 + (pos.y - global.curPlayerData.body.y) ** 2);
    if (distance >= 2000) {
      return false
    }
    return true;
  }


  handleLimbs(container: Phaser.GameObjects.Container, newPos: GameObject) {
    const leg1 = container.getByName('leg1');
    const leg2 = container.getByName('leg2');
    let changeInX = newPos.x - container.x;
    let goatSpeed = Math.abs(changeInX);
    if (changeInX > 0) { //Handle flip
      if (container.scaleX === -1) {
        container.setScale(1, 1);
        container.body!.setOffset(-this.size/2, -this.size/4);
      }
    } else if (changeInX < 0) {
      if (container.scaleX === 1) {
        container.setScale(-1, 1);
        container.body!.setOffset(this.size/2, -this.size/4);
      }
    }
    if (goatSpeed > 0) {
      if (container.getData('frontLegForward')) {
        leg1.angle += goatSpeed * this.game.deltaTime;
        leg2.angle -= goatSpeed * this.game.deltaTime;
        if (leg1.angle >= goatSpeed * 30) {
          container.setData('frontLegForward', false);
        }
      } else {
        leg1.angle -= goatSpeed * this.game.deltaTime;
        leg2.angle += goatSpeed * this.game.deltaTime;
        if (leg2.angle >= goatSpeed * 30) {
          container.setData('frontLegForward', true);
        }
      }
    } else {
      leg1.angle = 0;
      leg2.angle = 0;
    }
  }

  handleMovement(goat: goat, id: number | string) {
    let goatMove = {x: 0, y: 0};
    let blockY: number;
    let groundCollision = this.game.physics.overlap(goat.container, this.game.TerrainHandler.blockGroup, (goatContainer, block) => {
      let curBlockY = block.y - block.height/2 - this.size/1.4
      if (block.x > goatContainer.x && goat.vx > 0) {
        blockY = curBlockY;
      } else if (block.x < goatContainer.x && goat.vx < 0) {
        blockY = curBlockY;
      } else if (!blockY) {
        blockY = curBlockY;
      }
    });
    if (groundCollision) {
      goat.container.y = blockY!;
      if (goat.vx + goat.container.x < 320) { //stop goat at edge
        return;
      }
      goatMove.x = goat.vx * this.game.deltaTime;
    } else {
      goatMove.y = 4 * this.game.deltaTime;
    }
    this.handleLimbs(goat.container, {x: goatMove.x + goat.container.x, y: goatMove.y + goat.container.y});
    goat.container.x += goatMove.x;
    goat.container.y += goatMove.y;
    this.goatsData[id].pos.x = goat.container.x;
    this.goatsData[id].pos.y = goat.container.y;
  }


  handleGoats() {
    for (const id in this.curGoats) {
      const curGoat = this.curGoats[id];
      this.handleRandom(curGoat);
      this.handleMovement(curGoat, id);
      if (!this.goatInRenderDistance(curGoat.container)) { //despawn goat
        this.curGoats[id].container.destroy();
        delete this.curGoats[id];
        this.goatsData[id].assigned = false;
      };
    }
  }


  handleData() {
    this.socket.on('updateGoats', (goatData: {[goatId: number]: {pos: GameObject, assigned: boolean}}) => {
      for (let id in goatData) {
        if (this.goatsData[id] && this.goatsData[id].assigned === false) { //Goat assignment changed
          delete this.goatsData[id];
        }

        let curGoat = goatData[id];

        if (curGoat.assigned === false || !this.goatInRenderDistance(curGoat.pos)) { //Goat assignment needs updating
          if (this.otherGoats[id]) {
            this.otherGoats[id].destroy();
            delete this.otherGoats[id];
          }
          if (curGoat.assigned === false) {
            this.socket.emit('requestGoatAssignment', id, curGoat);
          }
          return;
        }

        if (!this.otherGoats[id]) {
          this.otherGoats[id] = this.createGoat(curGoat.pos);
        } else {
          this.handleLimbs(this.otherGoats[id], {x: curGoat.pos.x, y: curGoat.pos.y});
          this.otherGoats[id].setPosition(curGoat.pos.x, curGoat.pos.y);
        }
      }
    })


    this.socket.on('goatAssignment', (id: string, goatData: {pos: GameObject, assigned: boolean}) => {
      let container = this.createGoat(goatData.pos);
      this.goatsData[id] = {pos: goatData.pos, assigned: true};
      this.curGoats[id] = {container, vx: 0, randomTimer: 0};
    });
  }

}
