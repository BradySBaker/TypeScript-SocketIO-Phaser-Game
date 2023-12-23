import { Socket } from "socket.io-client";

import Game from '../game.js';

import global from '../global.js';

let spearReadySpeed = 2;

export default class ThrowWEPC {
  playerGroup!: Phaser.GameObjects.Group;
  game: Game;
  spear?: Phaser.GameObjects.Sprite;
  curSpearData: {[id: number]: {pos: GameObject, angle: number, collidedPlayerID: number}} = {}
  curThrownSpears: {[id: number]: {spear: Phaser.GameObjects.Sprite, vel: GameObject, collidedPlayerID: number, stuckPos: GameObject, collider: Phaser.GameObjects.Rectangle}} = {};
  otherThrownSpears: {[playerID: number]: {[spearID: number]: Phaser.GameObjects.Sprite}} = {};
  otherCollidedSpears: {[playerID: number]: {[spearID: number]: {collidedPlayerID: number, stuckPos: GameObject, spear: Phaser.GameObjects.Sprite}}} = {};
  curSpearId = 0;
  spearGroup!: Phaser.GameObjects.Group;
  socket: Socket;


  constructor(game: Game, socket: Socket, playerGroup: Phaser.GameObjects.Group) {
    this.socket = socket;
    this.game = game;
    this.playerGroup = playerGroup;
    this.spearGroup = game.physics.add.group({classType: Phaser.GameObjects.Sprite,});

    game.physics.add.overlap(this.spearGroup, this.playerGroup, this.handleSpearCollide, null, this);
  }

  handleWeaponRotation(weapon: Phaser.GameObjects.Sprite, player: Player, type: string) {
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
        if (this.spear) {
          this.spear.destroy();
          this.spear = undefined;
        } else {
          weapon.setFlipY(false);
        }
        player.direction = 'right';
      }
    } else {
      if (!weapon.flipY) {
        if (this.spear) {
          this.spear.destroy();
          this.spear = undefined;
        } else {
          weapon.setFlipY(true);
        }
        player.direction = 'left';
      }
    }
    weapon.angle = weaponMouseAngle;
  }

  handleSpearThrow(player: Player) {
    if (!this.spear && this.game.input.activePointer.isDown && global.equiped === 'spear') { //Spawn spear
      this.spear = this.game.add.sprite(player.pos.x, player.pos.y, 'spear').setOrigin(0, .5).setDepth(1);
      if (player.direction === 'left') {
        this.spear.setFlipY(true);
      }
      this.handleWeaponRotation(this.spear, player, 'spear'); //Rotate right away
    }

    if (this.game.input.activePointer.isDown && this.spear && global.equiped === 'spear') { //Ready spear
      if (Math.abs(this.spear.x - player.pos.x) < 50) {
        this.spear.x += (player.direction === 'left' ? spearReadySpeed : -spearReadySpeed) * this.game.deltaTime;
      } else {
        this.spear.y += (this.spear.y < player.pos.y ? spearReadySpeed : -spearReadySpeed) * this.game.deltaTime;
      }
    } else if (this.spear && this.spear.x !== player.pos.x) { //Throw spear
      const launchAngleInRadians = Phaser.Math.DegToRad(this.spear.angle);

      let collider = this.game.add.rectangle(this.spear.x, this.spear.y, 10, 10);
      collider.name = this.curSpearId.toString();

      this.curThrownSpears[this.curSpearId] = {spear: this.spear, vel: {x: 0, y: 0}, collider};
      this.curSpearData[this.curSpearId] = {pos: {x: this.spear.x, y: this.spear.y}, angle: this.spear.angle};

      this.spear = undefined;

      const throwingForce = Math.abs(Math.floor((player.pos.x - this.curThrownSpears[this.curSpearId].spear.x)/1.5));
      this.curThrownSpears[this.curSpearId].vel.x = throwingForce * Math.cos(launchAngleInRadians);
      this.curThrownSpears[this.curSpearId].vel.y = throwingForce * Math.sin(launchAngleInRadians);

      this.curSpearId++;
    }
    this.handleThrownSpears();
  }


  handleThrownSpears() {
    for (let id in this.curThrownSpears) {
      const spearObj = this.curThrownSpears[id];
      const groundCollision = this.game.physics.overlap(spearObj.collider, this.game.TerrainHandler.blockGroup);

      if (groundCollision) { //If spear touches ground
        delete this.curSpearData[id];
        delete this.curThrownSpears[id];
        this.spearGroup.remove(spearObj.collider);
        spearObj.collider.destroy();
        this.socket.emit('updateCollidedSpear', global.curPlayerData.id, {id: id, stuckPos: {x: spearObj.spear.x, y: spearObj.spear.y * 1.15 }, angle: spearObj.spear.angle, collidedPlayerID: undefined});
        continue;
      }
      if (spearObj.collidedPlayerID) { //If spear collided with player

        if (!global.playersData[spearObj.collidedPlayerID]) {
          this.spearGroup.remove(spearObj.collider);
          spearObj.collider.destroy();
          spearObj.spear.destroy();
          delete this.curSpearData[id];
          continue;
        }
        spearObj.spear.x = global.playersData[spearObj.collidedPlayerID].body.x - spearObj.stuckPos.x;
        spearObj.spear.y = global.playersData[spearObj.collidedPlayerID].body.y - spearObj.stuckPos.y;
        if (this.curSpearData[id]) {
          delete this.curSpearData[id];
          this.spearGroup.remove(spearObj.collider);
          spearObj.collider.destroy();
          this.socket.emit('updateCollidedSpear', global.curPlayerData.id, {id: id, stuckPos: {x: spearObj.stuckPos.x, y: spearObj.stuckPos.y}, angle: spearObj.spear.angle, collidedPlayerID: spearObj.collidedPlayerID});
        }
        continue;
      }

      spearObj.spear.x += spearObj.vel.x * this.game.deltaTime;
      spearObj.spear.y += spearObj.vel.y * this.game.deltaTime;
      if (Math.abs(spearObj.vel.x) > 0) {
        spearObj.vel.x -= .05;
      }
      let newAngle: number;
      let vel = Math.abs(spearObj.vel.x);
      vel = vel < 1 ? 1 : vel;
      if (spearObj.vel.x < 0 && Math.abs(spearObj.spear.angle) > 100) {
        newAngle = -(4 / Math.sqrt(vel) * this.game.deltaTime);
      } else if (spearObj.spear.angle < 90) {
        newAngle = (4 / Math.sqrt(vel)) * this.game.deltaTime;
      } else {
        newAngle = (vel < 0 ? -0.2 : 0.2);
      }

      spearObj.spear.angle += newAngle;

      let newAngleRad = Phaser.Math.DegToRad(spearObj.spear.angle);

      const spearWidth = spearObj.spear.width;       // Set the offset for the spear collider
      const colliderPosX = spearWidth * Math.cos(newAngleRad) + spearObj.spear.x;
      const colliderPosY = spearWidth * Math.sin(newAngleRad) + spearObj.spear.y;
      spearObj.collider.setPosition(colliderPosX, colliderPosY); //

      if (!spearObj.collider.body) { //Add collider after position
        this.spearGroup.add(spearObj.collider);
      }

      spearObj.vel.y += .5 * this.game.deltaTime;
      this.curSpearData[id].pos = {x: spearObj.spear.x, y: spearObj.spear.y};
      this.curSpearData[id].angle = spearObj.spear.angle;
    }
  }


  handleSpearCollide(spear: Phaser.GameObjects.Rectangle, player: Phaser.GameObjects.Rectangle) {
    let spearObj = this.curThrownSpears[spear.name];
    spearObj.stuckPos = {x: player.x - spearObj.spear.x, y: player.y - spearObj.spear.y}
    spearObj.collidedPlayerID = player.name;
  }


  handleOtherCollidedSpears() {
    for (let playerID in this.otherCollidedSpears) {
      for (let spearID in this.otherCollidedSpears[playerID]) {
        let spearData = this.otherCollidedSpears[playerID][spearID];
        if (spearData.collidedPlayerID === undefined) { //handle ground spear
          continue;
        }
        if (!global.playersData[spearData.collidedPlayerID]) { //Handle left player
          spearData.spear.destroy();
          delete this.otherCollidedSpears[playerID][spearID];
          continue;
        }
        spearData.spear.x = global.playersData[spearData.collidedPlayerID].body.x - spearData.stuckPos.x /1.8;
        spearData.spear.y = global.playersData[spearData.collidedPlayerID].body.y - spearData.stuckPos.y /1.2;
      }
    }
  }

  handleIncomingSpearData() {
    this.socket.on('updateSpearPositions', (playerID: number, thrownSpearsData: {[id: number]: {pos: GameObject, angle: number}}) => {
      for (let spearID in thrownSpearsData) {
        let curSpearData = thrownSpearsData[spearID];
        let thrownSpears = this.otherThrownSpears;
        if (!thrownSpears[playerID]) {
          thrownSpears[playerID] = {};
        }
        if (!thrownSpears[playerID][spearID]) {
          thrownSpears[playerID][spearID] = this.game.add.sprite(curSpearData.pos.x, curSpearData.pos.y, 'spear').setOrigin(0, .5).setDepth(1);
          thrownSpears[playerID][spearID].angle = curSpearData.angle;
        } else {
          let thrownSpear = thrownSpears[playerID][spearID];
            thrownSpear.x = curSpearData.pos.x;
            thrownSpear.y = curSpearData.pos.y;
            thrownSpear.angle = curSpearData.angle;
        }
      }
    });

    this.socket.on('updateCollidedSpear', (playerID: number, spearData: {id: number, stuckPos: GameObject, angle: number, collidedPlayerID: number}) => {
      this.handleCollidedSpearData(playerID, spearData);
    });
  }

  handleCollidedSpearData(playerID: number, spearData: {id: number, stuckPos: GameObject, angle: number, collidedPlayerID: number}) {
    if (!this.otherCollidedSpears[playerID]) {
      this.otherCollidedSpears[playerID] = {};
    }
    if (this.otherThrownSpears[playerID] && this.otherThrownSpears[playerID][spearData.id]) {
      this.otherThrownSpears[playerID][spearData.id].destroy();
      delete this.otherThrownSpears[playerID][spearData.id];
    }
    let x = 500;
    let y = 500;
    if (spearData.collidedPlayerID === undefined) {
      x = spearData.stuckPos.x;
      y = spearData.stuckPos.y;
    }
    this.otherCollidedSpears[playerID][spearData.id] = {...spearData, spear: this.game.add.sprite(x, y, 'spear')};
    this.otherCollidedSpears[playerID][spearData.id].spear.angle = spearData.angle;
  }

}