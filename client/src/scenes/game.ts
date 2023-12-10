import Phaser, { GameObjects } from "phaser";
import ProjectileController from './controllers/ProjectileController.js';
import PlayerController from './controllers/PlayerController.js';
import ThrowWEPC from "./controllers/ThrowWEPC.js";
import PlatformHandler from "./objects/PlatformHandler.js";
import UIHandler from "./objects/UIHandler.js";

import global from './global.ts';


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


export default class Game extends Phaser.Scene {
  deltaTime: number = 0;
  gameWidth = window.innerWidth
  gameHeight: any
  backgrounds: { ratioX: number; sprite: GameObjects.TileSprite;}[] = [];
  PlayerController!: PlayerController;
  ProjectileController!: ProjectileController;
  ThrowWEPC!: ThrowWEPC;
  PlatformHandler!: PlatformHandler;
  UIHandler!: UIHandler;



  preload() {
    this.load.image('sky', './assets/sky2.png');
    this.load.image('ground', './assets/ground2.png');
    this.load.image('mountains1', './assets/mountains1.png');
    this.load.image('mountains2', './assets/mountains2.png');
    this.load.image('spear', './assets/spear.png');
    this.load.on('complete', () => {
      socket = socketClient.io('http://localhost:3000');
    });
  }

  create() {
    this.gameHeight = this.sys.game.canvas.height;
		this.createBackgrounds();

    this.PlayerController = new PlayerController(this, socket);
    this.PlayerController.setupPlayer();
    this.ThrowWEPC = new ThrowWEPC(this, socket, this.PlayerController.playerGroup);
    this.ProjectileController = new ProjectileController(this, socket, this.PlayerController.playerGroup);
    this.ThrowWEPC.handleIncomingSpearData();
    this.PlatformHandler = new PlatformHandler(this);
    this.UIHandler = new UIHandler(this);

    this.UIHandler.draw();
    this.PlatformHandler.spawnPlatforms();

    this.physics.world.setBoundsCollision(true);


    socket.on('deleteProjectile', (id) => {
      this.ProjectileController.deleteProjectile(id);
    });


    socket.on('projectileData', (projectiles: {[id: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}}) => { //Handle all projectiles
      this.ProjectileController.handleProjectiles(projectiles);
    });
  }


  update(time, delta: number) {
    this.deltaTime = delta / (1000 / 60);
    this.PlayerController?.handleMovement();
    this.ThrowWEPC.handleOtherCollidedSpears();
    this.handleBackgrounds();
  }




  createBackgrounds() {
		var skyOffset = -window.innerWidth/3;
		if (this.gameHeight <= 500) {
			skyOffset = -window.innerWidth;
		}
		this.add.image(skyOffset, -800, 'sky')
		.setOrigin(0, 0)
		.setScrollFactor(0, .05)
		.setScale(1.6);

    this.backgrounds.push({
      ratioX: 0.05,
      sprite: this.add.tileSprite(-this.scale.width/3, 100, this.scale.width * 1.6, 450, 'mountains2')
          .setOrigin(0, 0)
          .setScrollFactor(0, .1)
          .setScale(2)
    });

    this.backgrounds.push({
        ratioX: 0.1,
        sprite: this.add.tileSprite(-this.scale.width/3, 200, this.scale.width * 1.6, 450, 'mountains1')
            .setOrigin(0, 0)
            .setScrollFactor(0, .2)
            .setScale(2)
    });

    this.backgrounds.push({
        ratioX: 1,
        sprite: this.add.tileSprite(-this.scale.width/3, 400, this.scale.width * 1.6, 600, 'ground')
            .setOrigin(0, 0)
            .setScrollFactor(0, 1)
            .setScale(1.4)
    });

	}

	handleBackgrounds() {
    if (!global.playerRectangles[this.PlayerController.id]) {
      return;
    }
		for (let i =0 ; i< this.backgrounds.length; i++) {
			const bg = this.backgrounds[i];
			bg.sprite.tilePositionX = global.playerRectangles[this.PlayerController.id].x * bg.ratioX/1.4;
		}
	}

}
