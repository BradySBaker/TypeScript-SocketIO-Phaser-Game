import { Socket } from "socket.io-client";

import Game from '../game.js';

import global from '../global.js';

let spearReadySpeed = 2;

export default class ThrowWEPC {
  playerGroup!: Phaser.GameObjects.Group;
  game: Game;
  spear?: Phaser.Physics.Matter.Sprite;
  curSpearData: {[id: number]: {pos: GameObject, angle: number, collidedPlayerID?: number}} = {}
  curThrownSpears: {[id: number]: {spear: Phaser.Physics.Matter.Sprite, vel: GameObject, collidedPlayerID?: number, stuckPos?: GameObject}} = {};
  otherThrownSpears: {[playerID: number]: {[spearID: number]: Phaser.Physics.Matter.Sprite}} = {};
  otherCollidedSpears: {[playerID: number]: {[spearID: number]: {collidedPlayerID: number, stuckPos: GameObject, spear: Phaser.GameObjects.Sprite}}} = {};
  curSpearId = 0;
  // spearGroup!: Phaser.GameObjects.Group;
  socket: Socket;


  constructor(game: Game, socket: Socket, playerGroup: Phaser.GameObjects.Group) {
    this.socket = socket;
    this.game = game;
    this.playerGroup = playerGroup;
    // this.spearGroup = game.physics.add.group({
    //   classType: Phaser.GameObjects.Sprite,
    //   createCallback: ((spear) => {
    //     spear.body.setSize(10, 10);
    //   })
    // });
    // game.physics.add.overlap(this.spearGroup, this.playerGroup, this.handleSpearCollide, null, this);
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
          this.game.matter.world.remove(this.spear, true);
          this.spear = undefined;
        } else {
          weapon.setFlipY(false);
        }
        player.direction = 'right';
      }
    } else {
      if (!weapon.flipY) {
        if (this.spear) {
          this.game.matter.world.remove(this.spear, true);
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
    if (!this.spear && this.game.input.activePointer.isDown && global.equiped === 'spear') { //create spear
      this.spear = this.game.matter.add.sprite(player.pos.x, player.pos.y, 'spear').setOrigin(0, .5).setDepth(1).setData('id', this.curSpearId);
      this.spear.setCollisionCategory(3);
      if (player.direction === 'left') {
        this.spear.setFlipY(true);
      }
    }

    if (this.game.input.activePointer.isDown && this.spear && global.equiped === 'spear') { //Ready spear
      if (Math.abs(this.spear.x - player.pos.x) < 50) {
        this.spear.x += (player.direction === 'left' ? spearReadySpeed : -spearReadySpeed) * this.game.deltaTime;
      } else {
        this.spear.y += (this.spear.y < player.pos.y ? spearReadySpeed : -spearReadySpeed) * this.game.deltaTime;
      }
    } else if (this.spear && this.spear.x !== player.pos.x) { //Throw spear
      const launchAngleInRadians = Phaser.Math.DegToRad(this.spear.angle);

      this.curThrownSpears[this.curSpearId] = {spear: this.spear, vel: {x: 0, y: 0}};
      // this.spearGroup.add(this.curThrownSpears[this.curSpearId].spear);

      this.curSpearData[this.curSpearId] = {pos: {x: this.spear.x, y: this.spear.y}, angle: this.spear.angle};

      this.spear = undefined;
      this.curThrownSpears[this.curSpearId].vel.x = Math.floor((player.pos.x - this.curThrownSpears[this.curSpearId].spear.x)/2);

      const verticalVelocity = Math.abs(this.curThrownSpears[this.curSpearId].vel.x) * Math.sin(launchAngleInRadians);
      this.curThrownSpears[this.curSpearId].vel.y = verticalVelocity;
      this.curSpearId++;
    }



    for (let id in this.curThrownSpears) {
      let spearObj = this.curThrownSpears[id];
      if (spearObj.spear.body.position.y - 50 >= global.ground) { //If spear touches ground
        if (this.curSpearData[id]) {
          delete this.curSpearData[id];
          this.game.matter.world.remove(spearObj, true);
          this.socket.emit('updateCollidedSpear', global.curPlayerData.id, {id: id, stuckPos: {x: spearObj.spear.x, y: spearObj.spear.y}, angle: spearObj.spear.angle, collidedPlayerID: undefined});
        }
        continue;
      }
      if (spearObj.collidedPlayerID && spearObj.stuckPos) { //If spear collided with player
        if (!global.playersData[spearObj.collidedPlayerID]) {
          spearObj.spear.destroy();
          delete this.curThrownSpears[id];
          continue;
        }
        spearObj.spear.x = global.playersData[spearObj.collidedPlayerID].body.position.x - spearObj.stuckPos.x;
        spearObj.spear.y = global.playersData[spearObj.collidedPlayerID].body.position.y - spearObj.stuckPos.y;
        if (this.curSpearData[id]) {
          delete this.curSpearData[id];
          this.game.matter.world.remove(spearObj.spear, true);
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
      if (spearObj.vel.x < 0 && Math.abs(spearObj.spear.angle) > 100) {
        newAngle = -(8 / Math.sqrt(spearObj.vel.x * -1)) * this.game.deltaTime;
      } else if (spearObj.spear.angle < 90) {
        newAngle = (8 / Math.sqrt(spearObj.vel.x)) * this.game.deltaTime;
      } else {
        newAngle = (spearObj.vel.x < 0 ? -.5 : .5) * this.game.deltaTime;
      }
      spearObj.spear.angle += newAngle;

      let newAngleRad = Phaser.Math.DegToRad(spearObj.spear.angle);

      const spearWidth = spearObj.spear.width;       // Set the offset for the spear body
      const offsetX = spearWidth * Math.cos(newAngleRad);
      const offsetY = spearWidth * Math.sin(newAngleRad);
      spearObj.spear.setRectangle(offsetX, offsetY); //
      if (!this.curSpearData[id]) {
        this.curSpearData[id] = {};
      }
      spearObj.vel.y += .5 * this.game.deltaTime;
      this.curSpearData[id].pos = {x: spearObj.spear.x, y: spearObj.spear.y};
      this.curSpearData[id].angle = spearObj.spear.angle;
    }
  }

  handleSpearCollide(spear: Phaser.Physics.Matter.Sprite, player: MatterJS.BodyType) {
    this.curThrownSpears[spear.getData('id')].stuckPos = {x: player.position.x - spear.x, y: player.position.y - spear.y}
    this.curThrownSpears[spear.getData('id')].collidedPlayerID = player.id;
  }

  handleOtherCollidedSpears() {
    for (let playerID in this.otherCollidedSpears) {
      for (let spearID in this.otherCollidedSpears[playerID]) {
        let spearData = this.otherCollidedSpears[playerID][spearID];
        let spearOffset = 1.8;
        if (spearData.collidedPlayerID === undefined) { //handle ground spear
          continue;
        }
        if (!global.playersData[spearData.collidedPlayerID].body) { //Handle left player
          spearData.spear.destroy();
          delete this.otherCollidedSpears[playerID][spearID];
          continue;
        }
        spearData.spear.x = global.playersData[spearData.collidedPlayerID].body.x - spearData.stuckPos.x/spearOffset;
        spearData.spear.y = global.playersData[spearData.collidedPlayerID].body.y - spearData.stuckPos.y;
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
          thrownSpears[playerID][spearID] = this.game.matter.add.sprite(curSpearData.pos.x, curSpearData.pos.y, 'spear').setOrigin(0, .5).setDepth(1);
          thrownSpears[playerID][spearID].setCollisionCategory(3);
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