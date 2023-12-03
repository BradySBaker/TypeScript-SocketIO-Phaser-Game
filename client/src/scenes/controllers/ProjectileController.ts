import Game from '../game.js';

import { Socket } from "socket.io-client";

import global from '../global.js';

let spearReadySpeed = 2;

export default class ProjectileController {
  line: Phaser.GameObjects.Graphics;
  projectileObj: {[id: number]: Phaser.GameObjects.Ellipse} = {};
  socket: Socket;
  playerGroup: Phaser.GameObjects.Group;
  game: Game;
  spear?: Phaser.GameObjects.Rectangle;
  curSpearData: {[id: number]: {pos: GameObject, angle: number}} = {}
  curThrownSpears: {[id: number]: {spear: Phaser.GameObjects.Rectangle, vel: GameObject}} = {};
  otherThrownSpears: {[playerID: number]: {[spearID: number]: Phaser.GameObjects.Rectangle}} = {};
  curSpearId = 0;


  constructor(game: Game, socket: Socket, playerGroup: Phaser.GameObjects.Group) {
    this.game = game;
    this.socket = socket;
    this.line = this.game.add.graphics();
    playerGroup = playerGroup;
  }




  createProjectile(player: {direction: string, pos: GameObject, id: number}) {
    console.log(player.id);
    this.socket.emit('newProjectile', player.pos, player.direction, player.id);
  }

  deleteProjectile(id: number) {
    this.projectileObj[id].destroy();
    delete this.projectileObj[id];
  }

  handleTrace(start: GameObject, end: GameObject, playerId: number) {
    const line = new Phaser.Geom.Line(start.x, start.y, end.x, end.y);
    playerGroup.getChildren().forEach((player: any) => {
      if (player.name != playerId) {
        if (Phaser.Geom.Intersects.LineToRectangle(line, player.getBounds())) {
          this.socket.emit('playerHit', player.name);
        }
      }
    });
  }

  handleProjectiles(projectiles: {[id: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}}) {
    this.line.clear();
    for (let id in projectiles) {
      let curProjectile = projectiles[id];
      if (!this.projectileObj[id]) {
        this.projectileObj[id] = this.game.add.ellipse(curProjectile.pos.x, curProjectile.pos.y, 10, 10, 0xFF0000);
      } else {
        this.projectileObj[id].x = curProjectile.pos.x;
        this.projectileObj[id].y = curProjectile.pos.y
      }
      this.handleTrace(curProjectile.startPos, curProjectile.pos, curProjectile.playerId);
    }
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
      this.spear = this.game.add.rectangle(player.pos.x, player.pos.y, 100, 10, 0xff0000).setOrigin(0, .5).setDepth(1);
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
      this.curSpearData[this.curSpearId] = {pos: {x: this.spear.x, y: this.spear.y}, angle: this.spear.angle};

      this.spear = undefined;
      this.curThrownSpears[this.curSpearId].vel.x = Math.floor((player.pos.x - this.curThrownSpears[this.curSpearId].spear.x)/2);

      const verticalVelocity = Math.abs(this.curThrownSpears[this.curSpearId].vel.x) * Math.sin(launchAngleInRadians);
      this.curThrownSpears[this.curSpearId].vel.y = verticalVelocity;
      this.curSpearId++;
    }
    for (let id in this.curThrownSpears) {
      let spearObj = this.curThrownSpears[id];
      if (spearObj.spear.y - spearObj.spear.height >= global.ground) {
        spearObj.spear.y = global.ground + spearObj.spear.height;
        continue;
      }
      spearObj.spear.x += spearObj.vel.x * this.game.deltaTime;
      spearObj.spear.y += spearObj.vel.y * this.game.deltaTime;
      if (Math.abs(spearObj.vel.x) > 0) {
        spearObj.vel.x -= .05;
      }
      if (spearObj.vel.x < 0 && Math.abs(spearObj.spear.angle) > 100) {
        spearObj.spear.angle -= (8 / Math.sqrt(spearObj.vel.x * -1)) * this.game.deltaTime;
      } else if (spearObj.spear.angle < 90) {
        spearObj.spear.angle += (8 / Math.sqrt(spearObj.vel.x)) * this.game.deltaTime;
      } else {
        spearObj.spear.angle += (spearObj.vel.x < 0 ? -.5 : .5) * this.game.deltaTime;
      }
      spearObj.vel.y += .5 * this.game.deltaTime;
      this.curSpearData[id].pos = {x: spearObj.spear.x, y: spearObj.spear.y};
      this.curSpearData[id].angle = spearObj.spear.angle;
    }
  }
};
