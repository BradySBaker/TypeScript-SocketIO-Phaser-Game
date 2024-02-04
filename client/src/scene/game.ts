import * as socketClient from 'socket.io-client';

import Phaser, { GameObjects } from "phaser";
import PlayerController from './controllers/PlayerController.js';
import TerrainHandler from "./objects/TerrainHandler.js";

import HoverDetectionController from "./controllers/HoverDetectionController.js";

import DropHandler from "./controllers/DropHandler.js";
import MobController from "./controllers/mobs/MobController.js";
import EnvironmentController from "./controllers/EnvironmentController.js";

import ToolController from './controllers/tools/ToolController.js';

import global from './global.js';

import {startUI} from '../UI/index.js';

export default class Game extends Phaser.Scene {
  deltaTime: number = 0;
  gameWidth = window.innerWidth
  gameHeight: any
  backgrounds: { ratioX: number; sprite: GameObjects.TileSprite;}[] = [];
  PlayerController!: PlayerController;
  TerrainHandler!: TerrainHandler;
  DropHandler!: DropHandler;
  ToolController!: ToolController;

  spawnCounter: number = 0;

  MobController!: MobController;
  EnvironmentController!: EnvironmentController;

  HoverDetectionController!: HoverDetectionController;



  preload() {
    this.load.image('sky', './assets/sky2.png');
    this.load.image('ground', './assets/ground2.png');
    this.load.image('mountains1', './assets/mountains1.png');
    this.load.image('mountains2', './assets/mountains2.png');
    this.load.image('grass', './assets/grass.png');
    this.load.image('bloodDrop', './assets/particles/bloodDrop.png');
    this.load.image('spark', './assets/particles/spark.png');

    this.load.image('skugBody', './assets/mobs/skug/body.png');
    this.load.image('skugHead', './assets/mobs/skug/head.png');
    this.load.image('skugLeg', './assets/mobs/skug/leg.png');
    this.load.image('quilFluffBody', './assets/mobs/quilFluff/body.png');
    this.load.image('quilFluffLeg', './assets/mobs/quilFluff/leg.png');


    global.EnvImages.forEach((curName) => {
      this.load.image(curName, `./assets/env/${curName}.png`);
    })
    global.ItemImages.forEach((curName) => {
      this.load.image(curName, `./assets/items/${curName}.png`);
    });

    this.load.on('complete', () => {
      global.socket = socketClient.io('http://localhost:3000');
    });
  }

  create() {
    startUI();
    this.gameHeight = this.sys.game.canvas.height;
		this.createBackgrounds();

    this.DropHandler = new DropHandler(this);
    this.PlayerController = new PlayerController(this);
    this.PlayerController.setupPlayer();
    this.MobController = new MobController(this);
    this.ToolController = new ToolController(this); //Must be after mob controller
    this.EnvironmentController = new EnvironmentController(this);

    this.TerrainHandler = new TerrainHandler(this);

    this.HoverDetectionController = new HoverDetectionController(this);


    this.handleSendData();

    window.addEventListener('unload', () => {
      global.socket.emit('disconnectClient', global.curMobData); //Handle disconnect and send data
    });

  }


  update(time: number, delta: number) {
    this.deltaTime = delta / (1000 / 60);
    this.PlayerController.handleMovement();
    this.PlayerController.interpolatePlayerPositions();
    this.ToolController.handleTools();

    this.handleBackgrounds();
    this.TerrainHandler.spawnChunks();
    this.MobController.handleMobs();
    this.EnvironmentController.decideSpawnAndDeleteEnvObjs();
    this.EnvironmentController.handleDisplayUI();
    if (this.PlayerController.spaceKey.isDown) {
      if (global.mobCount < 3) {
        this.MobController.spawn(global.curPlayerData.body, 'skug');
      }
    }
    this.HoverDetectionController.positionColliderToMouse();
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
		for (let i = 0 ; i < this.backgrounds.length; i++) {
			const bg = this.backgrounds[i];
			bg.sprite.tilePositionX = global.curPlayerData.body.x * bg.ratioX/1.4;
		}
	}

  handleSendData() {
    setInterval(() => {
      if (this.ToolController.ThrowWEPC.curThrowableID !== 0) {
        global.socket.emit('updateThrowablePositions', this.ToolController.ThrowWEPC.curThrownObjData);
      }
      const PC = this.PlayerController;
      if (global.curPlayerData && (Math.abs(PC.player.pos.x - PC.sentPos.x) > 5 || Math.abs(PC.player.pos.y - PC.sentPos.y) > 5)) {
        let grapplingPont = this.ToolController.GrappleHandler.grappling ? this.ToolController.GrappleHandler.grapplePoint : undefined;
        global.socket.emit('updatePosition', {pos: PC.player.pos, grapplePos: grapplingPont});
        PC.sentPos.x = PC.player.pos.x;
        PC.sentPos.y = PC.player.pos.y;
      }
      if (Object.keys(global.curMobData).length > 0) {
        global.socket.emit('updateMobs', global.curMobData, false);
      }
    }, 10);
  }


}
