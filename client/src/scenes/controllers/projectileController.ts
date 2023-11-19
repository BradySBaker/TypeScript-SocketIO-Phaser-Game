import { Socket } from "socket.io-client";

export default class projectileController {
  scene: Phaser.Scene;
  projectileObj: {[id: number]: Phaser.GameObjects.Ellipse} = {};
  socket: Socket;
  constructor(scene: Phaser.Scene, socket: Socket) {
    this.scene = scene;
    this.socket = socket;
  }

  createProjectile(player: {direction: string, pos: {x: number, y: number}}) {
    this.socket.emit('newProjectile', player.pos, player.direction);
  }

  handleProjectiles(projectiles: {[id: number]: {direction: string, pos: {x:number, y: number}}}) {
    for (let id in projectiles) {
      let curProjectile = projectiles[id];
      if (!this.projectileObj[id]) {
        this.projectileObj[id] = this.scene.add.ellipse(curProjectile.pos.x, curProjectile.pos.y, 10, 10, 0xFF0000);
      } else {
        this.projectileObj[id].x = curProjectile.pos.x;
        this.projectileObj[id].y = curProjectile.pos.y
      }
    }
  }

}