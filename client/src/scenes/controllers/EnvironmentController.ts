import Game from "../game";
import global from "../global";
import {externalSetUsePos} from "../../UI/index";
import { useComplete } from "../../UI/DisplayUse";
import { FacebookInstantGamesLeaderboard } from "phaser";

type envObjData = {id: number | string, name: EnvObj, pos: GameObject};

const envObj_RENDER_DISTANCE = 2000; //should be 2000!

let prevPlayerAreaX: undefined | number;

let envObjSettings: {[name in EnvObj]: {rate: number, size: number, randomRotation: boolean, pickupable: boolean}} = {
  stickyFern: {rate: .33, size: 3, randomRotation: false, pickupable: true},
  stone: {rate: .33, size: 1.5, randomRotation: true, pickupable: true},
  rock: {rate: .33, size: 3.5, randomRotation: false, pickupable: false}
}; //rates must add up to 100

let envObjs: {[id: number | string]: Phaser.GameObjects.Sprite} = {};
let allEnvObjectData: {[areaX: number]: {[id: number | string]: {name: EnvObj, pos: GameObject}}} = {}; //Will house objects based on areaX to + 2000

let requestingPickup: {[id: number | string]: boolean} = {};

let prevUseComplete = false;
let lastSpawnX: number;
let spawnProb = .2;

export default class EnvironmentController {
  game: Game;
  envObjGroup!: Phaser.GameObjects.Group;
  overlap = false;
  overlapObj!: Phaser.GameObjects.Sprite;
  overlapFalseTime = 10;
  miningIcon!: Phaser.GameObjects.Sprite | undefined;
  hit = false;
  constructor(game: Game) {
     this.game = game;
     this.envObjGroup = game.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
     });

     this.handleIncomingEnvObjData();
  }

  spawnEnvObj(envObjData: envObjData) {
    let settings = envObjSettings[envObjData.name];
    let newEnvObj = this.game.add.sprite(envObjData.pos.x, envObjData.pos.y, envObjData.name).setScale(settings.size);
    newEnvObj.x;

    if (settings.randomRotation) {
      let randomAngle = Math.floor(Math.random() * 361) - 180;
      newEnvObj.angle = randomAngle;
      newEnvObj.y += 10;
    }
    newEnvObj.setData({id: envObjData.id, objtype: 'envObj', envObjName: envObjData.name}); //Obj type is labeled for pickup
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
        global.socket.emit('newEnvObj', type, pos);
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
    global.socket.on('newEnvObj', (envObjData: envObjData) => {
      let areaX = this.addToEnvObjData(envObjData);
      if (areaX === prevPlayerAreaX) { //Re-Render if new envObjs in player area
        prevPlayerAreaX = undefined;
      }
    });

    global.socket.on('EnvObjects', (curEnvObjects: {[envObjId: string | number]: {name: EnvObj, pos: GameObject}}) => {
      for (let id in curEnvObjects) {
        this.addToEnvObjData({id, name: curEnvObjects[id].name, pos: curEnvObjects[id].pos});
      }
    });

    global.socket.on('deletePickupableObj', (id: number, type: 'throwable' | 'envObj') => {
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
        let ThrowWEPC = this.game.ToolController.ThrowWEPC;
        if (ThrowWEPC.attatchedThrowableObjs[id]) {
          obj = ThrowWEPC.attatchedThrowableObjs[id].obj;
          delete ThrowWEPC.attatchedThrowableObjs[id];
        } else if (ThrowWEPC.groundThrowableObjs[id]) {
          obj = ThrowWEPC.groundThrowableObjs[id];
          delete ThrowWEPC.groundThrowableObjs[id];
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

  handleMineableObjects() {
    if (!this.miningIcon) {
      this.miningIcon = this.game.add.sprite(this.overlapObj.x, this.overlapObj.y, 'bone_pickaxe').setDepth(2);
    } else {
      this.miningIcon.setPosition(this.overlapObj.x, this.overlapObj.y);
    }
    if (this.hit) {
      global.socket.emit('mineObj', global.curPlayerData.id, {name: this.overlapObj.getData('envObjName'), id: this.overlapObj.getData('id')});
      this.hit = false;
    }
  }

  handlePickupableObjects() {
    const camera = this.game.cameras.main;
    externalSetUsePos({x: ((this.overlapObj.x - camera.worldView.x) * camera.zoom) - this.overlapObj.height/2, y: ((this.overlapObj.y - camera.worldView.y) * camera.zoom) - this.overlapObj.height/2});
    if (prevUseComplete === useComplete) {
      this.overlap = false;
      return;
    }

    prevUseComplete = useComplete;

    if (useComplete) { //Picked up
      this.pickupEnvObj(this.overlapObj.getData('id'), this.overlapObj.getData('objtype'));
    }
  }


  toolHit() {
    if (this.miningIcon) {
      this.hit = true;
    }
  }

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
      let name = this.overlapObj.getData('envObjName') as EnvObj;
      let pickupable = true;
      if (name) {
        pickupable = envObjSettings[name as EnvObj].pickupable;
      }
      if (pickupable) {
        this.handlePickupableObjects();
      } else if (this.game.ToolController.curCollectionTool) {
        this.handleMineableObjects();
      }
    } else {
      this.overlap = false;
      externalSetUsePos(false);
      if (this.miningIcon) {
        this.miningIcon.destroy();
        this.miningIcon = undefined;
        this.hit = false;
      }
    }
    this.overlap = false;
  };

  pickupEnvObj(id: number, type: 'throwable' | 'envObj') {
    global.socket.emit('pickupObj', global.curPlayerData.id, id, type);
    externalSetUsePos(false);
  }



}