import { Socket } from "socket.io-client";
import Game from "../../game";
import global from "../../global";

import GoatController from "./GoatController";
import SkugController from "./SkugController";

export default class MobController {
  socket: Socket;
  game: Game;
  mobGroup!: Phaser.GameObjects.Group;
  lastSpawnPoint: GameObject = {x: 0, y: 0};
  controllers!: {'goat': GoatController, 'skug': SkugController};

  destroyedMobs: {[id: number|string]: boolean} = {};



  constructor(game: Game, socket: Socket) {
    this.controllers = {
      goat: new GoatController(game),
      skug: new SkugController(game),
    };

    this.game = game;
    this.socket = socket;

    this.mobGroup = this.game.physics.add.group({
      classType: Phaser.GameObjects.Rectangle,
    });
    this.handleData();
  }



  spawn(pos: GameObject, type: MobTypes) {

    this.lastSpawnPoint = pos;

    let id = global.mobCount + '' + global.curPlayerData.id;
    let container = this.controllers[type].create(pos, id);

    global.curMobs[id] = {container, vx: 1, randomTimer: 300};
    global.curMobData[id] = {pos: {x: pos.x, y: pos.y}, assigned: true, type};

    global.mobCount++;
  }



  damage(id: number | string, info: {type: string, pos: GameObject}) {
    this.socket.emit('damageMob', id, {pos: {x: Math.round(info.pos.x), y: Math.round(info.pos.y)}, type: info.type});
  }

  handleMovement(mob: Mob, id: number | string) {
    let type: MobTypes = mob.container.getData('type')
    let goatMove = {x: 0, y: 0};
    let blockY: number;
    let groundCollision = this.game.physics.overlap(mob.container, this.game.TerrainHandler.blockGroup, (object1, object2) => {
    let block = object2 as Phaser.GameObjects.Rectangle;
    let mobContainer = object1 as Phaser.GameObjects.Container;

    let curBlockY = block.y - block.height/2 - (mobContainer.body as Phaser.Physics.Arcade.Body)!.height/2 + this.controllers[type].bodyYOffset;
    if (block.x > mobContainer.x && mob.vx > 0) {
      blockY = curBlockY;
    } else if (block.x < mobContainer.x && mob.vx < 0) {
      blockY = curBlockY;
    } else if (!blockY) {
      blockY = curBlockY;
    }
  });
    if (groundCollision) {
      mob.container.y = blockY!;
      if (mob.vx + mob.container.x < 320) { //stop mob at edge
        return;
      }
      goatMove.x = mob.vx * this.game.deltaTime;
    } else {
      goatMove.y = 4 * this.game.deltaTime;
    }
    this.controllers[type].handleLimbs(mob.container, {x: goatMove.x + mob.container.x, y: goatMove.y + mob.container.y});
    mob.container.x += goatMove.x;
    mob.container.y += goatMove.y;
    global.curMobData[id].pos.x = mob.container.x;
    global.curMobData[id].pos.y = mob.container.y;
  }

  handleRandom(mob: Mob) {
    let type: MobTypes = mob.container.getData('type');
    if (mob.randomTimer >= 300) {
      mob.randomTimer = 0;
      mob.vx = Math.floor((Math.random() * this.controllers[type].speed) - (this.controllers[type].speed - 3));
    } else {
      mob.randomTimer += 1 * this.game.deltaTime;
    }
  }

  mobInRenderDistance(pos: GameObject) {
    let distance = Math.sqrt((pos.x - global.curPlayerData.body.x) ** 2 + (pos.y - global.curPlayerData.body.y) ** 2);
    if (distance >= 2000) {
      return false
    }
    return true;
  }



  handleMobs() {
    for (const id in global.curMobs) {
      const curMob = global.curMobs[id];
      this.handleRandom(curMob);
      this.handleMovement(curMob, id);
      if (!this.mobInRenderDistance(curMob.container)) { //despawn goat
        global.unasignedMobs[id] = {x: curMob.container.x, y: curMob.container.y, type: curMob.container.getData('type')};
        global.curMobs[id].container.destroy();
        delete global.curMobs[id];
        global.curMobData[id].assigned = false;
      };
    }

    for (const id in global.unasignedMobs) {
      const curMob = global.unasignedMobs[id];
      if (this.mobInRenderDistance(curMob)) {
        delete global.unasignedMobs[id];
        global.curMobData[id] = {pos: curMob, assigned: true, type: curMob.type};
        let container = this.controllers[curMob.type].create(curMob, id);
        global.curMobs[id] = {container, vx: 0, randomTimer: 0};
      }
    }
  }





  handleData() {
    this.socket.on('updateMobs', (mobData: {[goatId: number]: {pos: GameObject, assigned: boolean, type: MobTypes}}) => {
      for (let id in mobData) {
        if (global.curMobData[id] && global.curMobData[id].assigned === false) { //Mob assigned to new client
          delete global.unasignedMobs[id];
          delete global.curMobData[id];
        }

        let curMob = mobData[id];

        if (curMob.assigned === false || !this.mobInRenderDistance(curMob.pos)) { //Mob needs new client controller
          if (global.otherMobs[id]) {
            global.otherMobs[id].destroy();
            delete global.otherMobs[id];
          }
          if (curMob.assigned === false) {
            this.socket.emit('requestMobAssignment', id, curMob);
          }
          return;
        }

        if (!global.otherMobs[id]) {
          if (this.destroyedMobs[id]) {
            return;
          }
          global.otherMobs[id] = this.controllers[curMob.type].create(curMob.pos, id);
        } else {
          this.controllers[curMob.type].handleLimbs(global.otherMobs[id], {x: curMob.pos.x, y: curMob.pos.y});
          global.otherMobs[id].setPosition(curMob.pos.x, curMob.pos.y);
        }
      }
    })


    this.socket.on('mobAssignment', (id: string, mobData: {pos: GameObject, assigned: boolean, type: MobTypes}) => {
      if (global.curMobData[id]) {return;}
      let container = this.controllers[mobData.type].create(mobData.pos, id);
      global.curMobData[id] = {pos: mobData.pos, assigned: true, type: mobData.type};
      global.curMobs[id] = {container, vx: 0, randomTimer: 300};
    });

    this.socket.on('mobDisconnectAssignment', (mobData: {[id: number]: {pos: GameObject, assigned: boolean, type: MobTypes}}) => {
        for (let id in mobData) {
          global.curMobData[id] = mobData[id];
          global.unasignedMobs[id] = {x: mobData[id].pos.x, y: mobData[id].pos.y, type: mobData[id].type};
          if (global.otherMobs[id]) {
            global.otherMobs[id].destroy();
            delete global.otherMobs[id];
          }
        }
    });


    this.socket.on('mobDied', (id: number | string) => {
      if (global.otherMobs[id]) {
        this.destroyedMobs[id] = true;
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
