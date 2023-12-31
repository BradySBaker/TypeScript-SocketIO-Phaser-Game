import { Socket } from "socket.io-client";
import Game from "../../game";
import global from "../../global";

export default class GoatController {
  game: Game;
  socket: Socket;

  size = 65;
  goatOffset = {leg: {x: this.size/3, y: this.size/4}, head: {x: this.size/1.5}};
  goatGroup!: Phaser.GameObjects.Group;
  lastSpawnPoint: GameObject = {x: 0, y: 0};
  startHealth = 5;

  destroyedGoats: {[id: number|string]: boolean} = {};

  constructor(game: Game, socket: Socket) {
      this.game = game;
      this.socket = socket;

      this.goatGroup = this.game.physics.add.group({
          classType: Phaser.GameObjects.Rectangle,
          createCallback: ((goat: Phaser.GameObjects.GameObject) => {
            (goat.body as Phaser.Physics.Arcade.Body).setOffset(-this.size/2, -this.size/4);
          })
        });
      this.handleData();
  }

  damage(id: number | string) {
    this.socket.emit('damageGoat', id, 'goat');
  }


  spawn(pos: GameObject) {
    this.lastSpawnPoint = pos;

    let id = global.mobCount + '' + global.curPlayerData.id;
    let container = this.createGoat(pos, id);

    global.curMobs[id] = {container, vx: 1, randomTimer: 300};
    global.curMobData[id] = {pos: {x: pos.x, y: pos.y}, assigned: true, type: 'goat'};

    global.mobCount++;
  }

  createGoat(pos: GameObject, id: number | string): Phaser.GameObjects.Container {
    const body = this.game.add.rectangle(0, 0, this.size, this.size/2, 0xff).setName('body');
    const head = this.game.add.rectangle(this.goatOffset.head.x, 0, this.size/3, this.size/1.5, 0xff0000).setName('head');
    head.angle = -30;
    const leg1 = this.game.add.rectangle(-this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg1').setOrigin(0.5, 0);
    const leg2 = this.game.add.rectangle(this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg2').setOrigin(0.5, 0);


    const container = this.game.add.container(pos.x, pos.y).setDepth(1);
    container.setData({frontLegForward: false, type: 'goat', id, health: this.startHealth});
    this.goatGroup.add(container);
    container.add([head, body, leg1, leg2]);

    return container;
  }

  handleRandom(goat: animal) {
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
    const leg1 = container.getByName('leg1') as Phaser.GameObjects.Sprite;
    const leg2 = container.getByName('leg2') as Phaser.GameObjects.Sprite;
    let changeInX = newPos.x - container.x;
    let goatSpeed = Math.abs(changeInX);
    if (changeInX > 0) { //Handle flip
      if (container.scaleX === -1) {
        container.setScale(1, 1);
        (container.body as Phaser.Physics.Arcade.Body).setOffset(-this.size/2, -this.size/4);
      }
    } else if (changeInX < 0) {
      if (container.scaleX === 1) {
        container.setScale(-1, 1);
        (container.body as Phaser.Physics.Arcade.Body).setOffset(this.size/2, -this.size/4);
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

  handleMovement(goat: animal, id: number | string) {
    let goatMove = {x: 0, y: 0};
    let blockY: number;
    let groundCollision = this.game.physics.overlap(goat.container, this.game.TerrainHandler.blockGroup, (object1, object2) => {
      let block = object2 as Phaser.GameObjects.Rectangle;
      let goatContainer = object1 as Phaser.GameObjects.Container;

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
    global.curMobData[id].pos.x = goat.container.x;
    global.curMobData[id].pos.y = goat.container.y;
  }


  handleGoats() {
    for (const id in global.curMobs) {
      const curGoat = global.curMobs[id];
      this.handleRandom(curGoat);
      this.handleMovement(curGoat, id);
      if (!this.goatInRenderDistance(curGoat.container)) { //despawn goat
        global.unasignedMobs[id] = {x: curGoat.container.x, y: curGoat.container.y};
        global.curMobs[id].container.destroy();
        delete global.curMobs[id];
        global.curMobData[id].assigned = false;
      };
    }

    for (const id in global.unasignedMobs) {
      const curGoat = global.unasignedMobs[id];
      if (this.goatInRenderDistance(curGoat)) {
        delete global.unasignedMobs[id];
        global.curMobData[id] = {pos: curGoat, assigned: true, type: 'goat'};
        let container = this.createGoat(curGoat, id);
        global.curMobs[id] = {container, vx: 0, randomTimer: 0};
      }
    }
  }


  handleData() {
    this.socket.on('updateGoats', (goatData: {[goatId: number]: {pos: GameObject, assigned: boolean}}) => {
      for (let id in goatData) {
        if (global.curMobData[id] && global.curMobData[id].assigned === false) { //Goat assignment changed
          delete global.curMobData[id];
        }

        let curGoat = goatData[id];

        if (curGoat.assigned === false || !this.goatInRenderDistance(curGoat.pos)) { //Goat assignment needs updating
          if (global.otherMobs[id]) {
            global.otherMobs[id].destroy();
            delete global.otherMobs[id];
          }
          if (curGoat.assigned === false) {
            this.socket.emit('requestGoatAssignment', id, curGoat);
          }
          return;
        }

        if (!global.otherMobs[id]) {
          if (this.destroyedGoats[id]) {
            return;
          }
          global.otherMobs[id] = this.createGoat(curGoat.pos, id);
        } else {
          this.handleLimbs(global.otherMobs[id], {x: curGoat.pos.x, y: curGoat.pos.y});
          global.otherMobs[id].setPosition(curGoat.pos.x, curGoat.pos.y);
        }
      }
    })


    this.socket.on('goatAssignment', (id: string, goatData: {pos: GameObject, assigned: boolean}) => {
      if (global.curMobData[id]) {return;}
      let container = this.createGoat(goatData.pos, id);
      global.curMobData[id] = {pos: goatData.pos, assigned: true, type: 'goat'};
      global.curMobs[id] = {container, vx: 0, randomTimer: 0};
    });

    this.socket.on('disconnectGoatAssignment', (goatData: {[id: number]: {pos: GameObject, assigned: boolean, type: string}}) => {
        for (let id in goatData) {
          global.curMobData[id] = goatData[id];
          global.unasignedMobs[id] = goatData[id].pos;
          if (global.otherMobs[id]) {
            global.otherMobs[id].destroy();
            delete global.otherMobs[id];
          }
        }
    });


    this.socket.on('goatDied', (id: number | string) => {
      if (global.otherMobs[id]) {
        this.destroyedGoats[id] = true;
        global.otherMobs[id].destroy();
        delete global.otherMobs[id];
      } else {
        global.curMobs[id].container.destroy();
        delete global.curMobs[id];
        delete global.curMobData[id];
      }
    });
  }

}
