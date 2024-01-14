import Game from "../game";
import { Socket } from "socket.io-client";
import global from "../global";
import {externalSetUse} from "../../UI/index";

type PlantData = {id: number | string, type: PlantType, pos: GameObject};

const PLANT_RENDER_DISTANCE = 2000; //should be 2000!

let prevPlayerAreaX: undefined | number;

let plantRates: {[type in PlantType]: number} = {'stickyFurn': .5};
let plants: {[id: number | string]: Phaser.GameObjects.Sprite} = {};
let allPlantData: {[areaX: number]: {[id: number | string]: {type: PlantType, pos: GameObject}}} = {}; //Will house objects based on areaX to + 2000

export default class FooliageController {
  game: Game;
  socket: Socket;
  plantGroup!: Phaser.GameObjects.Group;
  overlap = false;
  overlapId = 0;
  overlapFalseTime = 10;
  constructor(game: Game, socket: Socket) {
     this.game = game;
     this.socket = socket;
     this.plantGroup = game.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
     });

     this.handleIncomingPlantData();
  }

  spawnPlant(plantData: PlantData) {
    let newPlant = this.game.add.sprite(plantData.pos.x, plantData.pos.y, plantData.type).setScale(3);
    newPlant.setData('id', plantData.id);
    newPlant.y -= (newPlant.height * 3)/2;
    plants[plantData.id] = newPlant;
    this.plantGroup.add(newPlant);
  };

  validateAndCreatePlant(pos: GameObject) {
    if (Math.random() > .3) {
      return
    }
    for (let type in plantRates) {
      const plantType = type as PlantType;
      if (Math.random() <= plantRates[plantType]) {
        this.socket.emit('newPlant', type, pos); //send position to server
      }
    }
  };

  addToPlantData(plantData: PlantData) {
    let areaX = Math.floor(plantData.pos.x / PLANT_RENDER_DISTANCE) * PLANT_RENDER_DISTANCE;
    if (!allPlantData[areaX]) {
     allPlantData[areaX] = {};
    }
    allPlantData[areaX][plantData.id] = {type: plantData.type, pos: plantData.pos};
    return areaX;
  }

  handleIncomingPlantData() {
    this.socket.on('newPlant', (plantData: PlantData) => {
      let areaX = this.addToPlantData(plantData);
      if (areaX === 0) { //Fix first player glitch
        prevPlayerAreaX = undefined;
      }
    });

    this.socket.on('fooliage', (curFooliage: {[plantId: string | number]: {type: PlantType, pos: GameObject}}) => {
      for (let id in curFooliage) {
        this.addToPlantData({id, type: curFooliage[id].type, pos: curFooliage[id].pos});
      }
    });
  };

  decideSpawnAndDeletePlants() {
    let playerPos = global.curPlayerData.body;
    if (!playerPos) {
      return;
    }
    let newPlayerAreaX = Math.floor(playerPos.x / PLANT_RENDER_DISTANCE) * PLANT_RENDER_DISTANCE;
    if (prevPlayerAreaX !== newPlayerAreaX || prevPlayerAreaX === undefined) {
      prevPlayerAreaX = newPlayerAreaX;
      for (let id in plants) {
        this.plantGroup.remove(plants[id]);
        plants[id].destroy();
        delete plants[id];
      }
      let plantDataAtArea = allPlantData[newPlayerAreaX];
      for (let id in plantDataAtArea) {
        this.spawnPlant({id, type: plantDataAtArea[id].type, pos: plantDataAtArea[id].pos});
      }
    }
  }

  handleOverlap(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, plant: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    let id = plant.getData('id')
    this.game.FooliageController.overlapId = id;
    this.game.FooliageController.overlap = true;
  };

  handleDisplayUI() {
    if (!externalSetUse) {
      return;
    }
    if (!this.overlap) {
      this.overlapFalseTime += this.game.deltaTime; //Make sure overlap is false long enough to remove ui
    } else {
      this.overlapFalseTime = 0;
    }
    if (this.overlapFalseTime < 4) {
      externalSetUse(true);
    } else {
      externalSetUse(false);
    }
    this.overlap = false;

  };

}