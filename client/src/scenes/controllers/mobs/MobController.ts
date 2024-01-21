import { Socket } from "socket.io-client";
import Game from "../../game";
import global from "../../global";

import GoatController from "./GoatController";
import SkugController from "./SkugController";

export default class MobController {
  socket: Socket;
  game: Game;
  mobGroup!: Phaser.GameObjects.Group;
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
    let id = global.mobCount + '' + global.curPlayerData.id;
    let container = this.controllers[type].create(pos, id);

    global.curMobs[id] = {container, vx: 1, curMovementTimer: 300, onGround: false};
    global.curMobData[id] = {pos: {x: pos.x, y: pos.y}, type};

    global.mobCount++;
  }



  damage(id: number | string, info: {type: string, pos: GameObject, weaponName: Throwable}) {
    this.socket.emit('damageMob', id, {pos: {x: Math.round(info.pos.x), y: Math.round(info.pos.y)}, type: info.type, weaponName: info.weaponName, playerId: global.curPlayerData.id});
  }

  handleGround(mob: Mob, type: MobTypes) {
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
      mob.onGround = true;
      mob.container.y = blockY!;
    } else {
      mob.onGround = false;
    }
  }

  handleMovement(mob: Mob, type: MobTypes, id: string) {
    let mobMove = {x: 0, y: 0};
    if (!mob.onGround) {
      mob.vx = mob.vx /2;
      mobMove.y = 20 * this.game.deltaTime;
    }
    if (mob.vx + mob.container.x < 320) { //stop mob at edge
      mob.vx = 0;
    }
    mobMove.x = mob.vx * this.game.deltaTime;

    this.controllers[type].handleLimbs(mob.container, {x: mobMove.x + mob.container.x, y: mobMove.y + mob.container.y});
    mob.container.x += mobMove.x;
    mob.container.y += mobMove.y;
    global.curMobData[id].pos.x = mob.container.x;
    global.curMobData[id].pos.y = mob.container.y;
  }


  handleWander(mob: Mob, type: MobTypes) {
    if (mob.curMovementTimer >= 300) {
      mob.curMovementTimer = 0;
      mob.vx = Math.floor((Math.random() * this.controllers[type].speed) - (this.controllers[type].speed - 3));
    } else {
      mob.curMovementTimer += this.game.deltaTime;
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
      let type = global.curMobData[id].type;
      this.handleGround(curMob, type);
      if (curMob.damagedByPlayer !== undefined) {
        this.controllers[type].handleDamage(curMob);
      } else {
        this.handleWander(curMob, type);
      }
      this.handleMovement(curMob, type, id);
      if (!this.mobInRenderDistance(curMob.container)) { //despawn goat
        this.handleUnassignMob(id);
      };
    }

  }


  handleUnassignMob(id: number | string) {
    this.socket.emit('unassignMob', id, global.curMobData[id]);
    this.deleteMob(id);
  }

  deleteMob(id: number | string) {
    if (global.otherMobs[id]) {
      this.destroyedMobs[id] = true;
      global.otherMobs[id].destroy();
      this.mobGroup.remove(global.otherMobs[id]);
      delete global.otherMobs[id];
    }
    if (global.curMobData[id]) {
      delete global.curMobData[id];
    }
    if (global.curMobs[id]) {
      global.curMobs[id].container.destroy();
      this.mobGroup.remove(global.curMobs[id].container);
      delete global.curMobs[id];
    }
  }

  handleData() {
    this.socket.on('updateMobs', (mobData: {[goatId: number]: {pos: GameObject, assigned: boolean, type: MobTypes}}) => {
      for (let id in mobData) {
        if (this.destroyedMobs[id]) {
          delete this.destroyedMobs[id];
          return;
        }
        let curMob = mobData[id];
        let inRender = this.mobInRenderDistance(curMob.pos);

        if (!inRender) {
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
      console.log('assignedMob', id)
      if (global.curMobData[id]) {return;}
      let container = this.controllers[mobData.type].create(mobData.pos, id);
      global.curMobData[id] = {pos: mobData.pos, type: mobData.type};
      global.curMobs[id] = {container, vx: 0, curMovementTimer: 300, onGround: false};
    });


    this.socket.on('mobDied', (id: number | string) => {
      console.log(id, 'mob died');
      this.deleteMob(id);
    });

    this.socket.on('damagedMob', (mobId: string, playerId: number | string) => {
      if (!global.curMobData[mobId]) {
        return;
      }
      let mob = global.curMobs[mobId];
      mob.damagedByPlayer = playerId;
      mob.curMovementTimer = 0;
    });

    this.socket.on('unassignedMobs', (mobData: {[id: number | string]: {pos: GameObject, type: MobTypes}}) => {
      for (let id in mobData) {
        let curMob = mobData[id];
        this.deleteMob(id);
        if (this.mobInRenderDistance(curMob.pos)) {
          this.socket.emit('requestMobAssignment', id, curMob);
        }
      }
    });
  }
}
