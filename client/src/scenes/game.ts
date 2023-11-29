import Phaser, { GameObjects } from "phaser";
import ProjectileController from './controllers/ProjectileController.js';
import PlayerController from './controllers/PlayerController.js';

import * as socketClient from 'socket.io-client';
let socket: socketClient.Socket;

window.addEventListener('beforeunload', () => {
  socket.disconnect();
  console.log('Disconnecting before page unload');
});

window.addEventListener('unload', () => {
  socket.disconnect();
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
  gameWidth = window.innerWidth
  gameHeight: any
  backgrounds: { ratioX: number; sprite: GameObjects.TileSprite;}[] = [];



  preload() {
    this.load.image('sky', './assets/sky2.png');
    this.load.image('ground', './assets/ground2.png');
    this.load.image('mountains1', './assets/mountains1.png');
    this.load.image('mountains2', './assets/mountains2.png');
    this.load.on('complete', () => {
      socket = socketClient.io('http://localhost:3000');
    });
  }

  create() {
    this.gameHeight = this.sys.game.canvas.height;
		this.createBackgrounds();

    this.PlayerController = new PlayerController(this, socket);
    this.PlayerController.setupPlayer();
    this.ProjectileController = new ProjectileController(this, socket, this.PlayerController.playerGroup);


    this.physics.world.setBoundsCollision(true);
    // @ts-ignore
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);


    socket.on('deleteProjectile', (id) => {
      this.ProjectileController?.deleteProjectile(id);
    });


    socket.on('projectileData', (projectiles: {[id: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}}) => { //Handle all projectiles
      this.ProjectileController?.handleProjectiles(projectiles);
    });
  }


  update(time, delta: number) {
    this.deltaTime = delta / (1000 / 60);
    this.PlayerController?.handleMovement();
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




  createBackgrounds() {
		var skyOffset = -window.innerWidth/4
		if (this.gameHeight <= 500) {
			skyOffset = -window.innerWidth;
		}
		this.add.image(skyOffset, -800, 'sky')
		.setOrigin(0, 0)
		.setScrollFactor(0, .3)
		.setScale(1.3);

		this.backgrounds.push({
			ratioX: 0.1,
			sprite: this.add.tileSprite(-window.innerWidth/2, 0, window.innerWidth*1.6, 450, 'mountains2')
			.setOrigin(0,0)
			.setScrollFactor(0, .6)
			.setScale(1.4)
		})
		this.backgrounds.push({
			ratioX: 0.4,
			sprite: this.add.tileSprite(-window.innerWidth/2, 0, window.innerWidth*1.6, 450, 'mountains1')
			.setOrigin(0,0)
			.setScrollFactor(0, .8)
			.setScale(1.4)
		})
		this.backgrounds.push({
			ratioX: 1,
			sprite: this.add.tileSprite(-window.innerWidth/2, 0, window.innerWidth*1.6, 600, 'ground')
			.setOrigin(0,0)
			.setScrollFactor(0, 1)
			.setScale(1.4)
		})
	}

}
