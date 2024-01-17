import { Socket } from "socket.io-client";

import Game from '../../game.js';

import global from '../../global.js';
import createParticles from "../Particles.js";

type throwableObj = {obj: Phaser.GameObjects.Sprite, vel: GameObject, collidedInfo?: {type: string, id: number}, stuckPos?: GameObject, collider: Phaser.GameObjects.Rectangle, particles?: Phaser.GameObjects.Particles.ParticleEmitter};

let throwableReadySpeed = 2;

export default class ThrowWEPC {
  game: Game;
  activeThrowable?: Phaser.GameObjects.Sprite

  playerGroup!: Phaser.GameObjects.Group;
  curThrownObjData: {[id: number| string]: {pos: GameObject, angle: number, type: Throwable}} = {}
  curThrownObjs: {[id: number| string]: throwableObj} = {};

  otherThrownObjs: {[playerID: number]: {[objID: number]: Phaser.GameObjects.Sprite}} = {};
  otherCollidedObjs: {[playerID: number]: {[objID: number]: {collidedInfo?: {type: string, id: number}, stuckPos?: GameObject, obj: Phaser.GameObjects.Sprite, particles?: Phaser.GameObjects.Particles.ParticleEmitter}}} = {};
  curThrowableID = 0;
  throwableGroup!: Phaser.GameObjects.Group;
  socket: Socket;


  constructor(game: Game, socket: Socket, playerGroup: Phaser.GameObjects.Group) {
    this.socket = socket;
    this.game = game;
    this.playerGroup = playerGroup;
    this.throwableGroup = game.physics.add.group({classType: Phaser.GameObjects.Sprite,});

    // @ts-ignore
    game.physics.add.overlap(this.throwableGroup, this.playerGroup, this.handleThrowableCollide, null, this);
    // @ts-ignore
    game.physics.add.overlap(this.throwableGroup, this.game.MobController.mobGroup, this.handleThrowableCollide, null, this);

    this.handleIncomingThrowableData();
  }



  handleWeaponRotation(weapon: Phaser.GameObjects.Sprite, player: Player) {
    let mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
    let mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;
    let targetWeaponRad = Phaser.Math.Angle.Between(
      weapon.x, weapon.y,
      mouseWorldX, mouseWorldY
    );

    let weaponMouseAngle = Phaser.Math.RadToDeg(targetWeaponRad);
    let isMouseOnRight = (mouseWorldX > weapon.x);
    if (isMouseOnRight) {
      if (weapon.flipY) {
        if (this.activeThrowable) {
          this.activeThrowable.destroy();
          this.activeThrowable = undefined;
        } else {
          weapon.setFlipY(false);
        }
        player.direction = 'right';
      }
    } else {
      if (!weapon.flipY) {
        if (this.activeThrowable) {
          this.activeThrowable.destroy();
          this.activeThrowable = undefined;
        } else {
          weapon.setFlipY(true);
        }
        player.direction = 'left';
      }
    }
    weapon.angle = weaponMouseAngle;
  }



  handleObjThrow(player: Player) {
    if (!this.activeThrowable && this.game.input.activePointer.isDown && (global.equiped === global.equiped || global.equiped === 'rock')) { //Spawn throwable
      this.activeThrowable = this.game.add.sprite(player.pos.x, player.pos.y, global.equiped).setOrigin(0, .5).setDepth(1);
      this.activeThrowable.setData('type', global.equiped);
      if (player.direction === 'left') {
        this.activeThrowable.setFlipY(true);
      }
      this.handleWeaponRotation(this.activeThrowable, player); //Rotate right away
    }

    if (this.game.input.activePointer.isDown && this.activeThrowable && (global.equiped === global.equiped || global.equiped === 'rock')) { //Ready throwable obj
      if (Math.abs(this.activeThrowable.x - player.pos.x) < 50) {
        this.activeThrowable.x += (player.direction === 'left' ? throwableReadySpeed : -throwableReadySpeed) * this.game.deltaTime;
      } else {
        this.activeThrowable.y += (this.activeThrowable.y < player.pos.y ? throwableReadySpeed : -throwableReadySpeed) * this.game.deltaTime;
      }
    } else if (this.activeThrowable && this.activeThrowable.x !== player.pos.x) { //Throw obj
      const launchAngleInRadians = Phaser.Math.DegToRad(this.activeThrowable.angle);

      let collider = this.game.add.rectangle(this.activeThrowable.x, this.activeThrowable.y, 10, 10);
      collider.name = this.curThrowableID.toString();
      this.activeThrowable.setDepth(0);
      this.curThrownObjs[this.curThrowableID] = {obj: this.activeThrowable, vel: {x: 0, y: 0}, collider};
      this.curThrownObjData[this.curThrowableID] = {pos: {x: this.activeThrowable.x, y: this.activeThrowable.y}, angle: this.activeThrowable.angle, type: global.equiped};

      this.activeThrowable = undefined;

      const throwingForce = Math.abs(Math.floor((player.pos.x - this.curThrownObjs[this.curThrowableID].obj.x)/1.5));
      this.curThrownObjs[this.curThrowableID].vel.x = throwingForce * Math.cos(launchAngleInRadians);
      this.curThrownObjs[this.curThrowableID].vel.y = throwingForce * Math.sin(launchAngleInRadians);

      this.curThrowableID++;
    }
    this.handleThrownObjs();
  }



  getGameObject(info: {type: string, id: number | string}): Phaser.GameObjects.GameObject | false {
    let gameObject: Phaser.GameObjects.GameObject | false = false;
    if (info.type === 'goat' || info.type === 'skug') {
      if (global.curMobs[info.id]) {
        if (global.curMobs[info.id]) {
          gameObject = global.curMobs[info.id].container;
        }
      } else if (global.otherMobs[info.id]) {
        gameObject = global.otherMobs[info.id];
      }
    } else if(info.type === 'player') {
      if (global.playersData[info.id]) {
        gameObject  = global.playersData[info.id].body;
      }
    }
    return gameObject;
  }


  handleCollidedThrowable(thrownObj: throwableObj, id: number|string, groundCollision: boolean) { // ==================
    if (groundCollision) { //If throwable touches ground
      delete this.curThrownObjData[id];
      delete this.curThrownObjs[id];
      this.throwableGroup.remove(thrownObj.collider);
      thrownObj.collider.destroy();
      this.socket.emit('updateCollidedThrowable', global.curPlayerData.id, {id: id, stuckPos: {x: thrownObj.obj.x, y: thrownObj.obj.y }, angle: thrownObj.obj.angle, collidedPlayerID: undefined});
      return
    }

    let gameObject = this.getGameObject(thrownObj.collidedInfo!); //If throwable touched gameobject
    if (!gameObject) {
      this.throwableGroup.remove(thrownObj.collider);
      thrownObj.collider.destroy();
      thrownObj.obj.destroy();
      if (thrownObj.particles) {
        thrownObj.particles.destroy();
      }
      delete this.curThrownObjData[id];
      return;
    }

    let targetObject: any = gameObject.body;

    if (gameObject.getData('type') === 'player') {
      targetObject = gameObject;
    }

    thrownObj.obj.x = targetObject.x - thrownObj.stuckPos!.x;
    thrownObj.obj.y = targetObject.y - thrownObj.stuckPos!.y;

    if (!thrownObj.particles) {
      let type = gameObject.getData('type')
      if (type === 'goat' || type === 'skug') {
        this.game.MobController.damage(gameObject.getData('id'), {type, pos: targetObject.position, weaponType: thrownObj.obj.getData('type')});
      }
    }

    thrownObj.particles = this.handleBlood(thrownObj.obj, thrownObj.particles);

    if (this.curThrownObjData[id]) {
      delete this.curThrownObjData[id];
      this.throwableGroup.remove(thrownObj.collider);
      thrownObj.collider.destroy();
      this.socket.emit('updateCollidedThrowable', global.curPlayerData.id, {id: id, stuckPos: {x: thrownObj.stuckPos!.x, y: thrownObj.stuckPos!.y}, angle: thrownObj.obj.angle, collidedInfo: thrownObj.collidedInfo});
    }
  }               //=========================



  handleBlood(obj: {x: number, y: number, width: number, angle: number}, particles: Phaser.GameObjects.Particles.ParticleEmitter | undefined): Phaser.GameObjects.Particles.ParticleEmitter {
    const tipX = obj.x + obj.width * Math.cos(Phaser.Math.DegToRad(obj.angle));
    const tipY = obj.y + obj.width * Math.sin(Phaser.Math.DegToRad(obj.angle));
    if (!particles) {
      particles = createParticles(this.game, {x: tipX, y: tipY}, obj.angle + 180);
    } else {
      particles.setPosition(tipX, tipY);
    }
    return particles;
  }



  handleThrownObjs() {
    for (let id in this.curThrownObjs) {
      const thrownObj = this.curThrownObjs[id];
      const groundCollision = this.game.physics.overlap(thrownObj.collider, this.game.TerrainHandler.blockGroup);

      if (groundCollision || thrownObj.collidedInfo) {
        this.handleCollidedThrowable(thrownObj, id, groundCollision);
        continue;
      }


      thrownObj.obj.x += thrownObj.vel.x * this.game.deltaTime;
      thrownObj.obj.y += thrownObj.vel.y * this.game.deltaTime;
      if (Math.abs(thrownObj.vel.x) > 0) {
        thrownObj.vel.x -= .05;
      }
      let newAngle: number;
      let vel = Math.abs(thrownObj.vel.x);
      vel = vel < 1 ? 1 : vel;
      if (thrownObj.vel.x < 0 && Math.abs(thrownObj.obj.angle) > 100) {
        newAngle = -(4 / Math.sqrt(vel) * this.game.deltaTime);
      } else if (thrownObj.obj.angle < 90) {
        newAngle = (4 / Math.sqrt(vel)) * this.game.deltaTime;
      } else {
        newAngle = (vel < 0 ? -0.2 : 0.2);
      }

      thrownObj.obj.angle += newAngle;

      let newAngleRad = Phaser.Math.DegToRad(thrownObj.obj.angle);

      const objWidth = thrownObj.obj.width;       // Set the offset for the thrownObj collider
      const colliderPosX = objWidth * Math.cos(newAngleRad) + thrownObj.obj.x;
      const colliderPosY = objWidth * Math.sin(newAngleRad) + thrownObj.obj.y;
      thrownObj.collider.setPosition(colliderPosX, colliderPosY); //

      if (!thrownObj.collider.body) { //Add collider after position
        this.throwableGroup.add(thrownObj.collider);
      }

      thrownObj.vel.y += .5 * this.game.deltaTime;
      this.curThrownObjData[id].pos = {x: thrownObj.obj.x, y: thrownObj.obj.y};
      this.curThrownObjData[id].angle = thrownObj.obj.angle;
    }
  }




  handleThrowableCollide = (obj: Phaser.Types.Physics.Arcade.GameObjectWithBody, target: Phaser.Types.Physics.Arcade.GameObjectWithBody) => {
    let thrownObj = this.curThrownObjs[obj.name];
    let targetPos = target.getData('type') === 'player' ? target : target.body!;

    thrownObj.stuckPos = {x: targetPos.x - thrownObj.obj.x, y: targetPos.y - thrownObj.obj.y}
    thrownObj.collidedInfo = {type: target.getData('type'), id: target.getData('id')};
  }




  handleOtherCollidedThrowables() {
    for (let playerID in this.otherCollidedObjs) {
      for (let objID in this.otherCollidedObjs[playerID]) {
        let throwableData = this.otherCollidedObjs[playerID][objID];
        if (throwableData.collidedInfo === undefined) { //handle ground obj
          continue;
        }
        let gameObject = this.getGameObject(throwableData.collidedInfo);
        if (!gameObject) { //Handle gameObject destroyed
          throwableData.obj.destroy();
          if (throwableData.particles) {
            throwableData.particles.destroy();
          }
          delete this.otherCollidedObjs[playerID][objID];
          continue;
        }

        let targetObject: any = gameObject.body;

        if (gameObject.getData('type') === 'player') {
          targetObject = gameObject;
        }

        throwableData.obj.x = targetObject.x - throwableData.stuckPos!.x;
        throwableData.obj.y = targetObject.y - throwableData.stuckPos!.y;

        throwableData.particles = this.handleBlood(throwableData.obj, throwableData.particles);
      }
    }
  }









  handleIncomingThrowableData() {
    this.socket.on('updateThrowablePositions', (playerID: number, thrownObjsData: {[id: number]: {pos: GameObject, angle: number}}) => {
      for (let objID in thrownObjsData) {
        let curthrowableData = thrownObjsData[objID];
        let thrownObjs = this.otherThrownObjs;
        if (!thrownObjs[playerID]) {
          thrownObjs[playerID] = {};
        }
        if (!thrownObjs[playerID][objID]) {
          thrownObjs[playerID][objID] = this.game.add.sprite(curthrowableData.pos.x, curthrowableData.pos.y, global.equiped).setOrigin(0, .5).setDepth(0);
          thrownObjs[playerID][objID].angle = curthrowableData.angle;
        } else {
          let thrownObj = thrownObjs[playerID][objID];
            thrownObj.x = curthrowableData.pos.x;
            thrownObj.y = curthrowableData.pos.y;
            thrownObj.angle = curthrowableData.angle;
        }
      }
    });

    this.socket.on('updateCollidedThrowable', (playerID: number, throwableData: {id: number, stuckPos: GameObject, angle: number, collidedInfo: {type: string, id: number}}) => {
      this.handleCollidedthrowableData(playerID, throwableData);
    });
  }

  handleCollidedthrowableData(playerID: number, throwableData: {id: number, stuckPos: GameObject, angle: number, collidedInfo: {type: string, id: number}}) {
    if (!this.otherCollidedObjs[playerID]) {
      this.otherCollidedObjs[playerID] = {};
    }
    if (this.otherThrownObjs[playerID] && this.otherCollidedObjs[playerID][throwableData.id]) {
      this.otherThrownObjs[playerID][throwableData.id].destroy();
      delete this.otherThrownObjs[playerID][throwableData.id];
    }
    let x = 500;
    let y = 500;
    if (throwableData.collidedInfo === undefined) {
      x = throwableData.stuckPos.x;
      y = throwableData.stuckPos.y;
    }
    this.otherCollidedObjs[playerID][throwableData.id] = {...throwableData, obj: this.game.add.sprite(x, y, global.equiped).setOrigin(0, .5).setDepth(0)};
    this.otherCollidedObjs[playerID][throwableData.id].obj.angle = throwableData.angle;
  }

}