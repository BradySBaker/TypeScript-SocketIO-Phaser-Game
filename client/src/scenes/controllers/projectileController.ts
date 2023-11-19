import { Socket } from "socket.io-client";

export default class projectileController {
  scene: Phaser.Scene;
  projectiles: {[id: number]: Phaser.GameObjects.Ellipse} = {};
  socket: Socket;
  constructor(scene: Phaser.Scene, socket: Socket) {
    this.scene = scene;
    this.socket = socket;
  }

  createProjectile(player: {direction: string, pos: {x: number, y: number}}) {
    this.socket.emit('createProjectile', player.pos, player.direction);
  }

}