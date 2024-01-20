import Game from "../game";
import { Socket } from "socket.io-client";
import global from "../global";
import {externalSetUsePos} from "../../UI/index";
import { useComplete } from "../../UI/DisplayUse";

type envObjData = {id: number | string, type: EnvObj, pos: GameObject};

const envObj_RENDER_DISTANCE = 2000; //should be 2000!

let prevPlayerAreaX: undefined | number;

let envObjSettings: {[type in EnvObj]: {rate: number, size: number, randomRotation: boolean}} = {stickyFern: {rate: .5, size: 3, randomRotation: false}, stone: {rate: .5, size: 1.5, randomRotation: true}}; //rates must add up to 100
let envObjs: {[id: number | string]: Phaser.GameObjects.Sprite} = {};
let allEnvObjectData: {[areaX: number]: {[id: number | string]: {type: EnvObj, pos: GameObject}}} = {}; //Will house objects based on areaX to + 2000

let requestingPickup: {[id: number | string]: boolean} = {};

let prevUseComplete = false;
let lastSpawnX: number;
let spawnProb = .2;

export default class EnvironmentController {
  game: Game;
  socket: Socket;
  envObjGroup!: Phaser.GameObjects.Group;
  overlap = false;
  overlapId = 0;
  overlapFalseTime = 10;
  constructor(game: Game, socket: Socket) {
     this.game = game;
     this.socket = socket;
     this.envObjGroup = game.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
     });

     this.handleIncomingEnvObjData();
  }

  spawnEnvObj(envObjData: envObjData) {
    let settings = envObjSettings[envObjData.type];
    let newEnvObj = this.game.add.sprite(envObjData.pos.x, envObjData.pos.y, envObjData.type).setScale(settings.size);
    if (settings.randomRotation) {
      let randomAngle = Math.floor(Math.random() * 361) - 180;
      newEnvObj.angle = randomAngle;
      newEnvObj.y += 10;
    }
    newEnvObj.setData('id', envObjData.id);
    newEnvObj.y -= (newEnvObj.height * 3)/2;
    envObjs[envObjData.id] = newEnvObj;
    this.envObjGroup.add(newEnvObj);
  };

  validateAndCreateEnvObj(pos: GameObject) {
    if (Math.random() > spawnProb) {
      return;
    }
    let randomNumber = Math.random();
    let accumulatedProbability = 0;

    for (let type in envObjSettings) {
      const envObjType = type as EnvObj;
      accumulatedProbability += envObjSettings[envObjType].rate;

      if (randomNumber <= accumulatedProbability) {
        this.socket.emit('newEnvObj', type, pos);
        return;
      }
    }
  };


  addToEnvObjData(envObjData: envObjData) {
    let areaX = Math.floor(envObjData.pos.x / envObj_RENDER_DISTANCE) * envObj_RENDER_DISTANCE;
    if (!allEnvObjectData[areaX]) {
     allEnvObjectData[areaX] = {};
    }
    allEnvObjectData[areaX][envObjData.id] = {type: envObjData.type, pos: envObjData.pos};
    return areaX;
  }

  handleIncomingEnvObjData() {
    this.socket.on('newEnvObj', (envObjData: envObjData) => {
      let areaX = this.addToEnvObjData(envObjData);
      if (areaX === prevPlayerAreaX) { //Re-Render if new envObjs in player area
        prevPlayerAreaX = undefined;
      }
    });

    this.socket.on('EnvObjects', (curEnvObjects: {[envObjId: string | number]: {type: EnvObj, pos: GameObject}}) => {
      for (let id in curEnvObjects) {
        this.addToEnvObjData({id, type: curEnvObjects[id].type, pos: curEnvObjects[id].pos});
      }
    });

    this.socket.on('deleteEnvObj', (id: number) => {
      if (envObjs[id]) {
        this.deleteEnvObj(id);
      }
      for (let area in allEnvObjectData) {
        if (allEnvObjectData[area][id]) {
          delete allEnvObjectData[area][id];
        }
      }
      if (requestingPickup[id]) {
        delete requestingPickup[id];
      }
    });
  };

  deleteEnvObj(id: number | string) {
    this.envObjGroup.remove(envObjs[id]);
    envObjs[id].destroy();
    delete envObjs[id];
  }

  decideSpawnAndDeleteEnvObjs() {
    let playerPos = global.curPlayerData.body;
    if (!playerPos) {
      return;
    }


    let direction = playerPos.x < lastSpawnX ? -1 : 1;

    let newPlayerAreaX = Math.floor((playerPos.x + (envObj_RENDER_DISTANCE/2) * direction) / envObj_RENDER_DISTANCE) * envObj_RENDER_DISTANCE;

    if (prevPlayerAreaX !== newPlayerAreaX || prevPlayerAreaX === undefined) {
      lastSpawnX = playerPos.x;
      prevPlayerAreaX = newPlayerAreaX;
      for (let id in envObjs) {
        if (Math.abs(envObjs[id].x - playerPos.x) > envObj_RENDER_DISTANCE / 2) {
          this.deleteEnvObj(id);
        }
      }
      let envObjDataAtArea = allEnvObjectData[newPlayerAreaX];
      for (let id in envObjDataAtArea) {
        if (envObjs[id]) {
          continue;
        }

        this.spawnEnvObj({id, type: envObjDataAtArea[id].type, pos: envObjDataAtArea[id].pos});
      }
    }
  }

  handleOverlap(hoverDetector: Phaser.Types.Physics.Arcade.GameObjectWithBody, envObj: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    let id = envObj.getData('id')
    this.game.EnvironmentController.overlapId = id; //this = HoverDetectionController
    this.game.EnvironmentController.overlap = true;
  };

  handleDisplayUI() {
    if (!externalSetUsePos || !envObjs[this.overlapId]) {
      return;
    }
    if (!this.overlap) {
      this.overlapFalseTime += this.game.deltaTime; //Make sure overlap is false long enough to remove ui
    } else {
      this.overlapFalseTime = 0;
    }
    if (this.overlapFalseTime < 4) {
      let camera = this.game.cameras.main
      let envObj = envObjs[this.overlapId];
      externalSetUsePos({x: ((envObj.x - camera.worldView.x) * camera.zoom) - envObj.width/1.3, y: ((envObj.y - camera.worldView.y) * camera.zoom) - envObj.height/2});

      if (prevUseComplete === useComplete) {
        this.overlap = false;
        return;
      }
      prevUseComplete = useComplete;

      if (useComplete) { //Picked up
        this.pickupEnvObj(this.overlapId);
      }
    } else {
      this.overlap = false;
      externalSetUsePos(false);
    }
    this.overlap = false;
  };

  pickupEnvObj(id: number) {
    this.socket.emit('pickupEnvObj', global.curPlayerData.id, id);
    externalSetUsePos(false);
  }



}