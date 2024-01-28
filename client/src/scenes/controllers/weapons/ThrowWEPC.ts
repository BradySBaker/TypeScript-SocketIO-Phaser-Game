import Game from '../../game.js';

import global from '../../global.js';
import createParticles from "../Particles.js";

import WeaponSettings from "./WeaponSettings.js";
import {externalSetPickup} from "../../../UI/index.js";

type throwableObj = {obj: Phaser.GameObjects.Sprite, vel: GameObject, collidedInfo?: {type: string, id: number}, stuckPos?: GameObject, collider: Phaser.GameObjects.Rectangle, particles?: Phaser.GameObjects.Particles.ParticleEmitter, damagedEnemy: boolean};

let throwableReadySpeed = 2;

export default class ThrowWEPC {
  game: Game;
  activeThrowable?: Phaser.GameObjects.Sprite

  playerGroup!: Phaser.GameObjects.Group;
  curThrownObjData: {[id: number| string]: {pos: GameObject, angle: number, name: Throwable}} = {};
  curThrownObjs: {[id: number| string]: throwableObj} = {};

  otherThrownObjs: {[ThrowableID: string]: Phaser.GameObjects.Sprite} = {};
  groundThrowableObjs: {[ThrowableID: string]: Phaser.GameObjects.Sprite} = {};
  attatchedThrowableObjs: {[ThrowableID:string]: {collidedInfo: {type: string, id: number}, stuckPos?: GameObject, obj: Phaser.GameObjects.Sprite, particles?: Phaser.GameObjects.Particles.ParticleEmitter}} = {};
  curThrowableID = 0;
  throwableGroup!: Phaser.GameObjects.Group;


  constructor(game: Game, playerGroup: Phaser.GameObjects.Group) {
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
    if (!this.activeThrowable && this.game.input.activePointer.isDown && (global.Throwables[global.equiped])) { //Spawn throwable
      this.activeThrowable = this.game.add.sprite(player.pos.x, player.pos.y, global.equiped).setOrigin(0, .5).setDepth(1);
      this.activeThrowable.setScale(WeaponSettings[global.equiped as Throwable].size);

      this.activeThrowable.setData('name', global.equiped);
      if (player.direction === 'left') {
        this.activeThrowable.setFlipY(true);
      }
      this.handleWeaponRotation(this.activeThrowable, player); //Rotate right away
    }

    if (this.game.input.activePointer.isDown && this.activeThrowable && global.Throwables[global.equiped]) { //Ready throwable obj
      if (Math.abs(this.activeThrowable.x - player.pos.x) < 50) {
        this.activeThrowable.x += (player.direction === 'left' ? throwableReadySpeed : -throwableReadySpeed) * this.game.deltaTime;
      } else {
        this.activeThrowable.y += (this.activeThrowable.y < player.pos.y ? throwableReadySpeed : -throwableReadySpeed) * this.game.deltaTime;
      }
    } else if (this.activeThrowable && this.activeThrowable.x !== player.pos.x && global.Throwables[global.equiped]) { //Throw obj [fix verify drop at some point]
      const launchAngleInRadians = Phaser.Math.DegToRad(this.activeThrowable.angle);

      let collider = this.game.add.rectangle(this.activeThrowable.x, this.activeThrowable.y, 10, 10);
      let id = global.curPlayerData.id + this.curThrowableID.toString()
      collider.name = id;
      this.activeThrowable.setDepth(0);
      this.curThrownObjs[id] = {obj: this.activeThrowable, vel: {x: 0, y: 0}, collider, damagedEnemy: false};

      let name: Throwable = this.activeThrowable.getData('name');

      this.curThrownObjData[id] = {pos: {x: this.activeThrowable.x, y: this.activeThrowable.y}, angle: this.activeThrowable.angle, name};

      this.activeThrowable = undefined;

      const throwingForce = Math.abs(Math.floor((player.pos.x - this.curThrownObjs[id].obj.x)/WeaponSettings[name].fallSpeedModifer));
      this.curThrownObjs[id].vel.x = throwingForce * Math.cos(launchAngleInRadians);
      this.curThrownObjs[id].vel.y = throwingForce * Math.sin(launchAngleInRadians);
      this.curThrowableID++;

      let itemName = this.curThrownObjData[id].name;

      // global.socket.emit('updatePickup', global.curPlayerData.id,{itemName, count: -1}); //fix if spawned in
      externalSetPickup({itemName, count: -1});
      if (global.inventory[itemName]) {
        global.inventory[itemName].count--;
      }
    }
    this.handleThrownObjs();
  }



  getGameObject(info: {type: string, id: number | string}): Phaser.GameObjects.GameObject | false {
    let gameObject: Phaser.GameObjects.GameObject | false = false;
    if (info.type === 'goat' || info.type === 'skug' || info.type === 'quilFluff') {
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


  handleNewCollidedThrowable(thrownObj: throwableObj, id: number|string, groundCollision: boolean) { // ==================
    let weaponName = this.curThrownObjData[id].name;

    let gameObject: Phaser.GameObjects.GameObject | false = false;
    if (!groundCollision) {
      gameObject = this.getGameObject(thrownObj.collidedInfo!); //If throwable touched gameobject
    }

    if(gameObject) {
      let targetObject: any = gameObject.body;

      if (gameObject.getData('type') === 'player') {
        targetObject = gameObject;
      }

      let type = gameObject.getData('type');
      if ((type === 'goat' || type === 'skug' || type === 'quilFluff') && !thrownObj.damagedEnemy /* Prevents repeated damage glitch */) {
        thrownObj.damagedEnemy = true;
        this.game.MobController.damage(gameObject.getData('id'), {type, pos: targetObject.position, weaponName});
      }
    }

    let stick = WeaponSettings[weaponName as Throwable].stick;

    if (!stick && !groundCollision) {
      thrownObj.vel.x = -thrownObj.vel.x/1.2; //Bounce
      thrownObj.collidedInfo = undefined;
      thrownObj.stuckPos = undefined;
      return;
    }

    let pos = thrownObj.stuckPos ? thrownObj.stuckPos : {x: thrownObj.obj.x, y: thrownObj.obj.y};
    global.socket.emit('newCollidedThrowable', {id: id, stuckPos: pos, angle: thrownObj.obj.angle, collidedInfo: thrownObj.collidedInfo, name: weaponName});
    delete this.curThrownObjs[id];
    delete this.curThrownObjData[id];
    thrownObj.obj.destroy();
    this.throwableGroup.remove(thrownObj.collider);
    thrownObj.collider.destroy();
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
        this.handleNewCollidedThrowable(thrownObj, id, groundCollision);
        if (!this.curThrownObjs[id]) { //If object stuck
          continue;
        }
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
    let type = target.getData('type');
    if (type === 'player') {
      if (target.getData('id') == global.curPlayerData.id) {
        return;
      }
    }
    let targetPos = type === 'player' ? target : target.body!;

    thrownObj.stuckPos = {x: targetPos.x - thrownObj.obj.x, y: targetPos.y - thrownObj.obj.y}
    thrownObj.collidedInfo = {type: target.getData('type'), id: target.getData('id')};
  }




  handleAttatchedCollidedThrowables() {
    for (let id in this.attatchedThrowableObjs) {
      let throwableData = this.attatchedThrowableObjs[id];
      let gameObject = this.getGameObject(throwableData.collidedInfo);
      if (!gameObject) { //Handle gameObject destroyed
        throwableData.obj.destroy();
        if (throwableData.particles) {
          throwableData.particles.destroy();
        }
        delete this.attatchedThrowableObjs[id];
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









  handleIncomingThrowableData() {
    global.socket.on('updateThrowablePositions', (thrownObjsData: {[id: number]: {pos: GameObject, angle: number, name: Throwable}}) => {
      for (let objID in thrownObjsData) {
        let curThrowableData = thrownObjsData[objID];
        let thrownObjs = this.otherThrownObjs;
        if (!thrownObjs[objID]) {
          thrownObjs[objID] = this.game.add.sprite(curThrowableData.pos.x, curThrowableData.pos.y, curThrowableData.name).setOrigin(0, .5).setDepth(0);
          thrownObjs[objID].angle = curThrowableData.angle;
        } else {
          let thrownObj = thrownObjs[objID];
            thrownObj.x = curThrowableData.pos.x;
            thrownObj.y = curThrowableData.pos.y;
            thrownObj.angle = curThrowableData.angle;
        }
      }
    });

    global.socket.on('newCollidedThrowable', (throwableData: {id: string, name: Throwable, stuckPos: GameObject, angle: number, collidedInfo: {type: string, id: number}}) => {
      this.handleCollidedthrowableData(throwableData);
    });
  }

  handleCollidedthrowableData(throwableData: {id: string, name: Throwable, stuckPos: GameObject, angle: number, collidedInfo: {type: string, id: number}}) {
    console.log(throwableData);
    if (this.otherThrownObjs[throwableData.id] && this.otherThrownObjs[throwableData.id]) {
      this.otherThrownObjs[throwableData.id].destroy();
      delete this.otherThrownObjs[throwableData.id];
    }
    let x = 500;
    let y = 500;
    if (throwableData.collidedInfo === undefined) { //Ground collision
      x = throwableData.stuckPos.x;
      y = throwableData.stuckPos.y;
    }

    let obj = this.game.add.sprite(x, y, throwableData.name).setOrigin(0, .5).setDepth(0).setScale(WeaponSettings[throwableData.name].size);
    obj.setData({'objType': 'throwable', id: throwableData.id}); //This is labeled for pickup
    if (throwableData.collidedInfo === undefined) {
      this.groundThrowableObjs[throwableData.id] = obj;
      this.game.EnvironmentController.envObjGroup.add(obj); //Makes only ground objects pickupable
      // @ts-ignore
      obj.body!.setSize(obj.width/2, obj.width/2);
      let objWidth = obj.width/2;
      let angleRad = Phaser.Math.DegToRad(throwableData.angle); //Position collider to center
      const colliderOffsetX = objWidth * Math.cos(angleRad);
      const colliderOffsetY = objWidth * Math.sin(angleRad);
      // @ts-ignore
      obj.body!.setOffset(colliderOffsetX, colliderOffsetY);
    } else {
      this.attatchedThrowableObjs[throwableData.id] = {...throwableData, obj};
    }
    obj.angle = throwableData.angle;
  }

}