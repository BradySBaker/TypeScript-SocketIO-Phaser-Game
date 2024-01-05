import Phaser, { GameObjects } from "phaser";
import ProjectileController from './controllers/ProjectileController.js';
import PlayerController from './controllers/PlayerController.js';
import ThrowWEPC from "./controllers/ThrowWEPC.js";
import GrappleHandler from "./controllers/GrappleHandler.js";
import TerrainHandler from "./objects/TerrainHandler.js";

import MobController from "./controllers/mobs/MobController.js";

import UIHandler from "./objects/UIHandler.js";

import global from './global.ts';

import {startUI} from '../UI/index.js';

import * as socketClient from 'socket.io-client';
let socket: socketClient.Socket;


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
  spawnCounter: number = 0;

  MobController!: MobController;



  preload() {
    this.load.image('sky', './assets/sky2.png');
    this.load.image('ground', './assets/ground2.png');
    this.load.image('mountains1', './assets/mountains1.png');
    this.load.image('mountains2', './assets/mountains2.png');
    this.load.image('spear', './assets/spear.png');
    this.load.image('grapple', './assets/grapple.png');
    this.load.image('grass', './assets/grass.png');
    this.load.image('bloodDrop', './assets/bloodDrop.png');

    this.load.image('skugBody', './assets/skug/skugBody.png');
    this.load.image('skugHead', './assets/skug/skugHead.png');
    this.load.image('skugLeg', './assets/skug/skugLeg.png');

    this.load.on('complete', () => {
      socket = socketClient.io('http://localhost:3000');
    });
  }

  create() {
    startUI();
    this.gameHeight = this.sys.game.canvas.height;
		this.createBackgrounds();

    this.PlayerController = new PlayerController(this, socket);
    this.PlayerController.setupPlayer();
    this.MobController = new MobController(this, socket);

    this.ThrowWEPC = new ThrowWEPC(this, socket, this.PlayerController.playerGroup);
    this.GrappleHandler = new GrappleHandler(this);
    this.ProjectileController = new ProjectileController(this, socket, this.PlayerController.playerGroup);
    this.ThrowWEPC.handleIncomingSpearData();
    this.TerrainHandler = new TerrainHandler(this);
    this.UIHandler = new UIHandler(this);


    this.handleSendData();

    this.UIHandler.draw();

    window.addEventListener('unload', () => {
      socket.emit('disconnectClient', global.curMobData); //Handle disconnect and send data
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
    // this.animalSpawnHandler();
    this.MobController.handleMobs();
    if (this.PlayerController.spaceKey.isDown) {
      if (global.mobCount < 3) {
        this.MobController.spawn(global.curPlayerData.body, 'skug');
      }
    }
  }

  // animalSpawnHandler() {
  //   if (this.spawnCounter >= 100) {
  //     const player = this.PlayerController.player;

  //     //handle goat
  //     if (this.PlayerController.move.vx > 0 || this.PlayerController.move.vx < 0) {
  //       let distance = Math.sqrt((player.pos.x - this.GoatController.lastSpawnPoint.x) ** 2 + (player.pos.y - this.GoatController.lastSpawnPoint.y) ** 2);
  //       let percent = Math.min(distance/5000, .8);
  //       let random = Math.random();
  //       if (random < percent) {
  //         this.GoatController.spawn({x: player.pos.x + 500, y: player.pos.y});
  //       }
  //     }
  //     this.spawnCounter = 0;
  //   }
  //   this.spawnCounter += this.deltaTime;
  // }


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
		for (let i = 0 ; i < this.backgrounds.length; i++) {
			const bg = this.backgrounds[i];
			bg.sprite.tilePositionX = global.curPlayerData.body.x * bg.ratioX/1.4;
		}
	}

  handleSendData() {
    setInterval(() => {
      if (this.ThrowWEPC.curSpearId !== 0) {
        socket.emit('updateSpearPositions', global.curPlayerData.id, this.ThrowWEPC.curSpearData);
      }
      const PC = this.PlayerController;
      if (global.curPlayerData && (Math.abs(PC.player.pos.x - PC.sentPos.x) > 5 || Math.abs(PC.player.pos.y - PC.sentPos.y) > 5)) {
        let grapplingPont = this.GrappleHandler.grappling ? this.GrappleHandler.grapplePoint : undefined;
        socket.emit('updatePosition', {pos: PC.player.pos, grapplePos: grapplingPont});
        PC.sentPos.x = PC.player.pos.x;
        PC.sentPos.y = PC.player.pos.y;
      }
      if (Object.keys(global.curMobData).length > 0) {
        socket.emit('updateMobs', global.curMobData, false);
      }
    }, 10);
  }

}
