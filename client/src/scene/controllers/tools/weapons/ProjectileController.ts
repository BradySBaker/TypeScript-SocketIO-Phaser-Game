import Game from '../../../game.js';

import global from '../../../global.js';

export default class ProjectileController {
  line: Phaser.GameObjects.Graphics;
  projectileObj: {[id: number]: Phaser.GameObjects.Ellipse} = {};
  playerGroup!: Phaser.GameObjects.Group;
  game: Game;

  constructor(game: Game, playerGroup: Phaser.GameObjects.Group) {

    this.game = game;
    this.line = this.game.add.graphics();
    this.playerGroup = playerGroup;
  }




  createProjectile(player: {direction: string, pos: GameObject, id: number}) {
    global.socket.emit('newProjectile', player.pos, player.direction, player.id);
  }

  deleteProjectile(id: number) {
    this.projectileObj[id].destroy();
    delete this.projectileObj[id];
  }

  handleTrace(start: GameObject, end: GameObject, playerId: number) {
    const line = new Phaser.Geom.Line(start.x, start.y, end.x, end.y);
    this.playerGroup.getChildren().forEach((player: any) => {
      if (player.name != playerId) {
        if (Phaser.Geom.Intersects.LineToRectangle(line, player.getBounds())) {
          global.socket.emit('playerHit', player.name);
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


};
