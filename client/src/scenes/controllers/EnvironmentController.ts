import Game from "../game";
import { Socket } from "socket.io-client";
import global from "../global";
import {externalSetUsePos} from "../../UI/index";
import { useComplete } from "../../UI/DisplayUse";

type envObjData = {id: number | string, name: EnvObj, pos: GameObject};

const envObj_RENDER_DISTANCE = 2000; //should be 2000!

let prevPlayerAreaX: undefined | number;

let envObjSettings: {[name in EnvObj]: {rate: number, size: number, randomRotation: boolean}} = {stickyFern: {rate: .5, size: 3, randomRotation: false}, stone: {rate: .5, size: 1.5, randomRotation: true}}; //rates must add up to 100
let envObjs: {[id: number | string]: Phaser.GameObjects.Sprite} = {};
let allEnvObjectData: {[areaX: number]: {[id: number | string]: {name: EnvObj, pos: GameObject}}} = {}; //Will house objects based on areaX to + 2000

let requestingPickup: {[id: number | string]: boolean} = {};

let prevUseComplete = false;
let lastSpawnX: number;
let spawnProb = .2;

export default class EnvironmentController {
  game: Game;
  socket: Socket;
  envObjGroup!: Phaser.GameObjects.Group;
  overlap = false;
  overlapObj!: Phaser.GameObjects.Sprite;
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
    let settings = envObjSettings[envObjData.name];
    let newEnvObj = this.game.add.sprite(envObjData.pos.x, envObjData.pos.y, envObjData.name).setScale(settings.size);
    if (settings.randomRotation) {
      let randomAngle = Math.floor(Math.random() * 361) - 180;
      newEnvObj.angle = randomAngle;
      newEnvObj.y += 10;
    }
    newEnvObj.setData({id: envObjData.id, objtype: 'envObj'}); //Obj type is labeled for pickup
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
      const envObjtype = type as EnvObj;
      accumulatedProbability += envObjSettings[envObjtype].rate;

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
    allEnvObjectData[areaX][envObjData.id] = {name: envObjData.name, pos: envObjData.pos};
    return areaX;
  }

  handleIncomingEnvObjData() {
    this.socket.on('newEnvObj', (envObjData: envObjData) => {
      let areaX = this.addToEnvObjData(envObjData);
      if (areaX === prevPlayerAreaX) { //Re-Render if new envObjs in player area
        prevPlayerAreaX = undefined;
      }
    });

    this.socket.on('EnvObjects', (curEnvObjects: {[envObjId: string | number]: {name: EnvObj, pos: GameObject}}) => {
      for (let id in curEnvObjects) {
        this.addToEnvObjData({id, name: curEnvObjects[id].name, pos: curEnvObjects[id].pos});
      }
    });

    this.socket.on('deletePickupableObj', (id: number, type: 'throwable' | 'envObj') => {
      if (type === 'envObj') {
        if (envObjs[id]) {
          this.deleteEnvObj(id);
        }
        for (let area in allEnvObjectData) {
          if (allEnvObjectData[area][id]) {
            delete allEnvObjectData[area][id];
          }
        }
      } else {
        let obj: Phaser.GameObjects.Sprite | undefined;
        if (this.game.ThrowWEPC.attatchedThrowableObjs[id]) {
          obj = this.game.ThrowWEPC.attatchedThrowableObjs[id].obj;
          delete this.game.ThrowWEPC.attatchedThrowableObjs[id];
        } else if (this.game.ThrowWEPC.groundThrowableObjs[id]) {
          obj = this.game.ThrowWEPC.groundThrowableObjs[id];
          delete this.game.ThrowWEPC.groundThrowableObjs[id];
        }
        if (obj !== undefined) {
          this.envObjGroup.remove(obj);
          obj.destroy();
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

        this.spawnEnvObj({id, name: envObjDataAtArea[id].name, pos: envObjDataAtArea[id].pos});
      }
    }
  }

  handleOverlap(hoverDetector: Phaser.Types.Physics.Arcade.GameObjectWithBody, obj: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    this.game.EnvironmentController.overlapObj = obj; //this = HoverDetectionController
    this.game.EnvironmentController.overlap = true;
  };

  handleDisplayUI() {
    if (!externalSetUsePos) {
      return;
    }
    if (!this.overlap) {
      this.overlapFalseTime += this.game.deltaTime; //Make sure overlap is false long enough to remove ui
    } else {
      this.overlapFalseTime = 0;
    }
    if (this.overlapFalseTime < 4) {
      let camera = this.game.cameras.main
      externalSetUsePos({x: ((this.overlapObj.x - camera.worldView.x) * camera.zoom) - this.overlapObj.height/2, y: ((this.overlapObj.y - camera.worldView.y) * camera.zoom) - this.overlapObj.height/2});

      if (prevUseComplete === useComplete) {
        this.overlap = false;
        return;
      }
      prevUseComplete = useComplete;

      if (useComplete) { //Picked up
        this.pickupEnvObj(this.overlapObj.getData('id'), this.overlapObj.getData('objtype'));
      }
    } else {
      this.overlap = false;
      externalSetUsePos(false);
    }
    this.overlap = false;
  };

  pickupEnvObj(id: number, type: 'throwable' | 'envObj') {
    this.socket.emit('pickupObj', global.curPlayerData.id, id, type);
    externalSetUsePos(false);
  }



}