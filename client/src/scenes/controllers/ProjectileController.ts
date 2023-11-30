import Game from '../game.js';

import { Socket } from "socket.io-client";

type GameObject = {
    x: number,
    y: number
}

type Player = {
  pos: PlayerPos;
  direction: string;
  id: number;
}

export default class ProjectileController {
  line: Phaser.GameObjects.Graphics;
  projectileObj: {[id: number]: Phaser.GameObjects.Ellipse} = {};
  socket: Socket;
  playerGroup: Phaser.GameObjects.Group;
  game: Game;
  spear?: Phaser.GameObjects.Rectangle;
  thrownSpearsData: {[id: number]: {pos: GameObject, angle: number}} = {}
  thrownSpears: {[id: number]: {spear: Phaser.GameObjects.Rectangle, vel: GameObject}} = {};
  // @ts-ignore
  spaceKey: Phaser.Input.Keyboard.KeyCodes;
  curSpearId = 0;


  constructor(game: Game, socket: Socket, playerGroup: Phaser.GameObjects.Group) {
    // @ts-ignore
    this.spaceKey = game.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
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
  if (!this.spear && this.spaceKey.isDown) {
    this.spear = this.game.add.rectangle(player.pos.x, player.pos.y, 100, 10, 0xff0000).setOrigin(0, .5).setDepth(1);
  }


  if (this.spaceKey.isDown && this.spear) { //Ready spear
    if (Math.abs(this.spear.x - player.pos.x) < 50) {
      this.spear.x += player.direction === 'left' ? 2 : -2;
    } else {
      this.spear.y += this.spear.y < player.pos.y ? 2 : -2;
    }
  } else if (this.spear && this.spear.x !== player.pos.x) { //Throw spear
    const launchAngleInRadians = Phaser.Math.DegToRad(this.spear.angle);

    this.thrownSpears[this.curSpearId] = {spear: this.spear, vel: {x: 0, y: 0}};
    this.thrownSpearsData[this.curSpearId] = {pos: {x: this.spear.x, y: this.spear.y}, angle: this.spear.angle};

    this.spear = undefined;
    this.thrownSpears[this.curSpearId].vel.x = Math.floor((player.pos.x - this.thrownSpears[this.curSpearId].spear.x)/2);

    const verticalVelocity = Math.abs(this.thrownSpears[this.curSpearId].vel.x) * Math.sin(launchAngleInRadians);
    this.thrownSpears[this.curSpearId].vel.y = verticalVelocity;
    this.curSpearId++;
  }

  for (let id in this.thrownSpears) {
    let spearObj = this.thrownSpears[id];
    spearObj.spear.x += spearObj.vel.x;
    spearObj.spear.y += spearObj.vel.y;
    if (Math.abs(spearObj.vel.x) > 0) {
      spearObj.vel.x -= .05;
    }
    if (spearObj.vel.x < 0 && Math.abs(spearObj.spear.angle) > 100) {
      spearObj.spear.angle -= 8 / Math.sqrt(spearObj.vel.x * -1);
    } else if (spearObj.spear.angle < 90) {
      spearObj.spear.angle += 8 / Math.sqrt(spearObj.vel.x);
    } else {
      spearObj.spear.angle += spearObj.vel.x < 0 ? -.5 : .5;
    }
    spearObj.vel.y += .5;
    this.thrownSpearsData[id].pos = {x: spearObj.spear.x, y: spearObj.spear.y};
    this.thrownSpearsData[id].angle = spearObj.spear.angle;
  }

}

};
