import Game from "../game";
import { Socket } from "socket.io-client";
import global from "../global";
import {externalSetUsePos} from "../../UI/index";
import { useComplete } from "../../UI/DisplayUse";

type PlantData = {id: number | string, type: PlantType, pos: GameObject};

const PLANT_RENDER_DISTANCE = 2000; //should be 2000!

let prevPlayerAreaX: undefined | number;

let plantRates: {[type in PlantType]: number} = {'stickyFern': .5};
let plants: {[id: number | string]: Phaser.GameObjects.Sprite} = {};
let allPlantData: {[areaX: number]: {[id: number | string]: {type: PlantType, pos: GameObject}}} = {}; //Will house objects based on areaX to + 2000

let requestingPickup: {[id: number | string]: boolean} = {};

let prevUseComplete = false;
let lastSpawnX: number;

export default class FoliageController {
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

    this.socket.on('deletePlant', (id: number) => {
      if (plants[id]) {
        this.deletePlant(id);
      }
      for (let area in allPlantData) {
        if (allPlantData[area][id]) {
          delete allPlantData[area][id];
        }
      }
      if (requestingPickup[id]) {
        delete requestingPickup[id];
      }
    });
  };

  deletePlant(id: number | string) {
    this.plantGroup.remove(plants[id]);
    plants[id].destroy();
    delete plants[id];
  }

  decideSpawnAndDeletePlants() {
    let playerPos = global.curPlayerData.body;
    if (!playerPos) {
      return;
    }


    let direction = playerPos.x < lastSpawnX ? -1 : 1;

    let newPlayerAreaX = Math.floor((playerPos.x + (PLANT_RENDER_DISTANCE/2) * direction) / PLANT_RENDER_DISTANCE) * PLANT_RENDER_DISTANCE;

    if (prevPlayerAreaX !== newPlayerAreaX || prevPlayerAreaX === undefined) {
      lastSpawnX = playerPos.x;
      prevPlayerAreaX = newPlayerAreaX;
      for (let id in plants) {
        if (Math.abs(plants[id].x - playerPos.x) > PLANT_RENDER_DISTANCE / 2) {
          this.deletePlant(id);
        }
      }
      let plantDataAtArea = allPlantData[newPlayerAreaX];
      for (let id in plantDataAtArea) {
        if (plants[id]) {
          continue;
        }

        this.spawnPlant({id, type: plantDataAtArea[id].type, pos: plantDataAtArea[id].pos});
      }
    }
  }

  handleOverlap(hoverDetector: Phaser.Types.Physics.Arcade.GameObjectWithBody, plant: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    let id = plant.getData('id')
    this.game.FoliageController.overlapId = id; //this = HoverDetectionController
    this.game.FoliageController.overlap = true;
  };

  handleDisplayUI() {
    if (!externalSetUsePos || !plants[this.overlapId]) {
      return;
    }
    if (!this.overlap) {
      this.overlapFalseTime += this.game.deltaTime; //Make sure overlap is false long enough to remove ui
    } else {
      this.overlapFalseTime = 0;
    }
    if (this.overlapFalseTime < 4) {
      let camera = this.game.cameras.main
      let plant = plants[this.overlapId];
      externalSetUsePos({x: ((plant.x - camera.worldView.x) * camera.zoom) - plant.width/1.3, y: ((plant.y - camera.worldView.y) * camera.zoom) - plant.height/2});

      if (prevUseComplete === useComplete) {
        return;
      }
      prevUseComplete = useComplete;

      if (useComplete) { //Picked up
        this.pickupPlant(this.overlapId);
      }
    } else {
      externalSetUsePos(false);
    }
    this.overlap = false;

  };

  pickupPlant(id: number) {
    this.socket.emit('pickupPlant', global.curPlayerData.id, id);
    externalSetUsePos(false);
  }



}