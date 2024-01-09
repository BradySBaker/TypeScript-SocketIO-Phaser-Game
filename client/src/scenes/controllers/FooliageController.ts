import Game from "../game";
import { Socket } from "socket.io-client";
import global from "../global";

let plantRates: {[type in PlantType]: number} = {'stickyFurn': .5};
let plants: {[id: number | string]: Phaser.GameObjects.Sprite} = {};
let createCount = 0;

export default class FooliageController {
  game: Game;
  socket: Socket;
  constructor(game: Game, socket: Socket) {
     this.game = game;
     this.socket = socket;
     this.handleIncomingPlantData();
  }

  createPlant(id: number | string, type: PlantType, pos: GameObject) {
    let newPlant = this.game.add.sprite(pos.x, pos.y, type).setScale(3);
    newPlant.y -= (newPlant.height * 3)/2;
    plants[id] = newPlant;
  };

  validateAndSpawnPlant(pos: GameObject) {
    if (Math.random() > .1) {
      return
    }
    for (let type in plantRates) {
      const plantType = type as PlantType;
      if (Math.random() <= plantRates[plantType]) {
        let id = global.curPlayerData.id + '' + createCount;
        this.createPlant(id, plantType, pos);
        this.socket.emit('newPlant', id, type, pos); //send position to server
        createCount++;
      }
    }
  };

  handleIncomingPlantData() {
    this.socket.on('newPlant', (id: number | string, type: PlantType, pos: GameObject) => {
      this.createPlant(id, type, pos);
    });

    this.socket.on('fooliage', (curFooliage: {[plantId: string | number]: {type: PlantType, pos: GameObject}}) => {
      for (let id in curFooliage) {
        this.createPlant(id, curFooliage[id].type, curFooliage[id].pos);
      }
    });
  };

}