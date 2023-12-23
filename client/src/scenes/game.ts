import Phaser, { GameObjects } from "phaser";
import ProjectileController from './controllers/ProjectileController.js';
import PlayerController from './controllers/PlayerController.js';
import ThrowWEPC from "./controllers/ThrowWEPC.js";
import GrappleHandler from "./controllers/GrappleHandler.js";
import TerrainHandler from "./objects/TerrainHandler.js";

import GoatController from "./controllers/animals/GoatController.js";

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
  GrappleHandler!: GrappleHandler;
  TerrainHandler!: TerrainHandler;
  UIHandler!: UIHandler;

  GoatController!: GoatController;



  preload() {
    this.load.image('sky', './assets/sky2.png');
    this.load.image('ground', './assets/ground2.png');
    this.load.image('mountains1', './assets/mountains1.png');
    this.load.image('mountains2', './assets/mountains2.png');
    this.load.image('spear', './assets/spear.png');
    this.load.image('grapple', './assets/grapple.png');
    this.load.image('grass', './assets/grass.png');
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
    this.GrappleHandler = new GrappleHandler(this);
    this.ProjectileController = new ProjectileController(this, socket, this.PlayerController.playerGroup);
    this.ThrowWEPC.handleIncomingSpearData();
    this.TerrainHandler = new TerrainHandler(this);
    this.UIHandler = new UIHandler(this);

    this.GoatController = new GoatController(this, socket);

    this.GoatController.spawn({x: 800, y: 200});

    this.UIHandler.draw();


    socket.on('deleteProjectile', (id) => {
      this.ProjectileController.deleteProjectile(id);
    });


    socket.on('projectileData', (projectiles: {[id: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}}) => { //Handle all projectiles
      this.ProjectileController.handleProjectiles(projectiles);
    });
  }


  update(time, delta: number) {
    this.deltaTime = delta / (1000 / 60);
    this.PlayerController.handleMovement();
    this.PlayerController.interpolatePlayerPositions();
    this.ThrowWEPC.handleOtherCollidedSpears();
    this.GrappleHandler.drawRopes();
    this.handleBackgrounds();
    this.UIHandler.handleSelectButton();
    this.TerrainHandler.spawnChunk();
    this.GoatController.handleGoats();
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
          .setScrollFactor(0, .05)
          .setScale(2)
    });

    this.backgrounds.push({
        ratioX: 0.1,
        sprite: this.add.tileSprite(-this.scale.width/3, 200, this.scale.width * 1.6, 450, 'mountains1')
            .setOrigin(0, 0)
            .setScrollFactor(0, .1)
            .setScale(2)
    });

	}

	handleBackgrounds() {
    if (!global.curPlayerData.body) {
      return;
    }
		for (let i =0 ; i< this.backgrounds.length; i++) {
			const bg = this.backgrounds[i];
			bg.sprite.tilePositionX = global.curPlayerData.body.x * bg.ratioX/1.4;
		}
	}

}
