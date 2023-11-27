import Phaser, { GameObjects } from "phaser";
import { io } from 'socket.io-client';
import ProjectileController from './controllers/ProjectileController.js';
import PlayerController from './controllers/PlayerController.js';

const socket = io('http://localhost:3000');

window.addEventListener('beforeunload', () => {
  socket.disconnect(); // Manually disconnect the Socket.IO connection
  console.log('Disconnecting before page unload');
});

window.addEventListener('unload', () => {
  socket.disconnect(); // Manually disconnect the Socket.IO connection
  console.log('Page unloaded');
});


type GameObject = {
  x: number,
  y: number
}


export default class Game extends Phaser.Scene {
  ProjectileController?: ProjectileController;
  PlayerController?: PlayerController;
  // @ts-ignore
  spaceKey: Phaser.Input.Keyboard.KeyCodes;
  shootTimer: number = 0;
  deltaTime: number = 0;




  preload() {}

  create() {

    this.PlayerController = new PlayerController(this, socket);
    this.PlayerController.setupPlayer();
    this.ProjectileController = new ProjectileController(this, socket, this.PlayerController.playerGroup);


    this.physics.world.setBoundsCollision(true);
    // @ts-ignore
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    socket.on('connect', () => {
      console.log('connected');
    });


    socket.on('deleteProjectile', (id) => {
      this.ProjectileController?.deleteProjectile(id);
    });


    socket.on('projectileData', (projectiles: {[id: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}}) => { //Handle all projectiles
      this.ProjectileController?.handleProjectiles(projectiles);
    });
  }


  update(time, delta: number,bv) {
    this.deltaTime = delta / (1000 / 60);
    this.PlayerController.handleMovement();
    this.handleShoot();
  }


  handleShoot() {
    if (this.spaceKey.isDown && this.shootTimer === 0) {
      this.shootTimer = 20;
      this.ProjectileController?.createProjectile(this.PlayerController.player);
    }
    if (this.shootTimer !== 0) {
      this.shootTimer--;
    }
  }

}
