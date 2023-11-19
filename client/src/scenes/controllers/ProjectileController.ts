   import { Socket } from "socket.io-client";

export default class ProjectileController {
  scene: Phaser.Scene;
  projectileObj: {[id: number]: Phaser.GameObjects.Ellipse} = {};
  socket: Socket;
  projectileGroup?: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene, socket: Socket, playerGroup: Phaser.GameObjects.Group) {
    this.scene = scene;
    this.socket = socket;

    this.projectileGroup = this.scene.add.group({
      classType: Phaser.GameObjects.Rectangle,
      createCallback: (projectile) => {
        this.scene.physics.world.enable(projectile);
      }
    });

    this.scene.physics.add.collider(playerGroup, this.projectileGroup, (player) => {
      // @ts-ignore
      socket.emit('playerHit', player.name);
    });

  }


  createProjectile(player: {direction: string, pos: {x: number, y: number}}) {
    this.socket.emit('newProjectile', player.pos, player.direction);
  }

  handleProjectiles(projectiles: {[id: number]: {direction: string, pos: {x:number, y: number}}}) {
    for (let id in projectiles) {
      let curProjectile = projectiles[id];
      if (!this.projectileObj[id]) {
        this.projectileObj[id] = this.scene.add.ellipse(curProjectile.pos.x, curProjectile.pos.y, 10, 10, 0xFF0000);
        this.projectileGroup?.add(this.projectileObj[id]);
      } else {
        this.projectileObj[id].x = curProjectile.pos.x;
        this.projectileObj[id].y = curProjectile.pos.y
      }


    }
  }


}