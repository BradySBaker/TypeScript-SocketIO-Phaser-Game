import Game from '../game.js';

import global from '../global.js';

let spearReadySpeed = 2;

export default class ThrowWEPC {
  playerGroup!: Phaser.GameObjects.Group;
  game: Game;
  spear?: Phaser.GameObjects.Sprite;
  curSpearData: {[id: number]: {pos: GameObject, angle: number}} = {}
  curThrownSpears: {[id: number]: {spear: Phaser.GameObjects.Sprite, vel: GameObject, collidedPlayerID: number, stuckPos: GameObject}} = {};
  otherThrownSpears: {[playerID: number]: {[spearID: number]: Phaser.GameObjects.Sprite}} = {};
  curSpearId = 0;
  spearGroup!: Phaser.GameObjects.Group;


  constructor(game: Game, playerGroup: Phaser.GameObjects.Group) {
    this.game = game;
    this.playerGroup = playerGroup;
    this.spearGroup = game.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
      createCallback: ((spear) => {
        spear.body.setSize(10, 10);
      })
    });
    game.physics.add.overlap(this.spearGroup, this.playerGroup, this.handleSpearCollide, null, this);
  }

  handleSpearRotation(player: Player) {
    if (!this.spear) {
      return;
    }
    let mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
    let mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;
    let targetSpearRad = Phaser.Math.Angle.Between(
      this.spear.x, this.spear.y,
      mouseWorldX, mouseWorldY
    );

    let spearMouseAngle = Phaser.Math.RadToDeg(targetSpearRad);
    if (player.direction === 'left') {
      if (spearMouseAngle > -120 && spearMouseAngle < 120) {
        if (spearMouseAngle > 0) {
          spearMouseAngle = 120;
        } else {
          spearMouseAngle = -120;
        }
      }
    } else {
      if (spearMouseAngle < -64 || spearMouseAngle > 64) {
        if (spearMouseAngle > 0) {
          spearMouseAngle = 64;
        } else {
          spearMouseAngle = -64;
        }
      }
    }
    this.spear.angle = spearMouseAngle;
  }

  handleSpearThrow(player: Player) {
    if (!this.spear && this.game.input.activePointer.isDown) {
      this.spear = this.game.add.sprite(player.pos.x, player.pos.y, 'spear').setOrigin(0, .5).setDepth(1);
      this.spear.name = this.curSpearId.toString();
    }


    if (this.game.input.activePointer.isDown && this.spear) { //Ready spear
      if (Math.abs(this.spear.x - player.pos.x) < 50) {
        this.spear.x += (player.direction === 'left' ? spearReadySpeed : -spearReadySpeed) * this.game.deltaTime;
      } else {
        this.spear.y += (this.spear.y < player.pos.y ? spearReadySpeed : -spearReadySpeed) * this.game.deltaTime;
      }
    } else if (this.spear && this.spear.x !== player.pos.x) { //Throw spear
      const launchAngleInRadians = Phaser.Math.DegToRad(this.spear.angle);

      this.curThrownSpears[this.curSpearId] = {spear: this.spear, vel: {x: 0, y: 0}};
      this.spearGroup.add(this.curThrownSpears[this.curSpearId].spear);

      this.curSpearData[this.curSpearId] = {pos: {x: this.spear.x, y: this.spear.y}, angle: this.spear.angle};

      this.spear = undefined;
      this.curThrownSpears[this.curSpearId].vel.x = Math.floor((player.pos.x - this.curThrownSpears[this.curSpearId].spear.x)/2);

      const verticalVelocity = Math.abs(this.curThrownSpears[this.curSpearId].vel.x) * Math.sin(launchAngleInRadians);
      this.curThrownSpears[this.curSpearId].vel.y = verticalVelocity;
      this.curSpearId++;
    }



    for (let id in this.curThrownSpears) {
      let spearObj = this.curThrownSpears[id];
      if (spearObj.spear.body.y - 50 >= global.ground) { //If spear touches ground
        continue;
      }
      if (spearObj.collidedPlayerID) {
        spearObj.spear.x = global.playerRectangles[spearObj.collidedPlayerID].x - spearObj.stuckPos.x;
        spearObj.spear.y = global.playerRectangles[spearObj.collidedPlayerID].y - spearObj.stuckPos.y;
        this.curSpearData[id].pos = {x: spearObj.spear.x, y: spearObj.spear.y};
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
      spearObj.spear.body.setOffset(offsetX, offsetY); //

      spearObj.vel.y += .5 * this.game.deltaTime;
      this.curSpearData[id].pos = {x: spearObj.spear.x, y: spearObj.spear.y};
      this.curSpearData[id].angle = spearObj.spear.angle;
    }
  }

  handleSpearCollide(spear: Phaser.GameObjects.Sprite, player: Phaser.GameObjects.Rectangle) {
    this.curThrownSpears[spear.name].stuckPos = {x: player.x - spear.x, y: player.y - spear.y}
    this.curThrownSpears[spear.name].collidedPlayerID = player.name;
  }
}