import global from "../global";
import Game from "../game";
import { Socket } from "socket.io-client";

import { externalSetPickup } from "../../UI/index.js";

export default class DropHandler {
  game: Game;
  socket: Socket;
  dropGroup!: Phaser.GameObjects.Group;
  dropData: {[id: number]: Phaser.GameObjects.Container} = {};

    constructor(game: Game, socket: Socket) {
      this.game = game;
      this.socket = socket;
      this.dropGroup = game.physics.add.group({
        classType: Phaser.GameObjects.Container,
      });

      this.handleDrops();
    }

    handleDrops() {
      this.socket.on('drop', (info: {pos: GameObject, count: number, dropName: string, id: number}) => {
        if (!info.dropName || info.count < 1) {
          return;
        }
        const container = this.game.add.container(info.pos.x, info.pos.y + 30);

        let images: Phaser.GameObjects.Image[] = [];

        for (let i = 0; i < info.count; i++) {
          images.push(this.game.add.image(i * 10, i * 10, info.dropName).setScale(3).setOrigin(0, 0.5));



          let rotationDirection = Math.random() > .5 ? 1 : -1;

          this.game.tweens.add({
            targets: images[i],
            angle: 10 * rotationDirection,
            y: 50, // Move down
            duration: 1000,
            ease: 'linear',
            yoyo: true,
            repeat: -1,
            delay: i * 200
          });

        }

        container.add(images);
        container.setData({name: info.dropName, count: info.count, id: info.id});
        this.dropGroup.add(container);
        this.dropData[info.id] = container;
      });


      this.socket.on('pickupVerified', (itemName: string, count: number) => {
        if (!global.inventory[itemName]) {
          global.inventory[itemName] = {count: 0, pos: {x: -1, y: -1}}
        }
        global.inventory[itemName].count += count;
        externalSetPickup({itemName, count});
      });

      this.socket.on('deleteDrop', (id) => {
        this.deleteDrop(id);
      });

    }

    deleteDrop(id: number) {
      if (this.dropData[id]) {
        this.dropGroup.remove(this.dropData[id]);
        this.dropData[id].destroy();
        delete this.dropData[id];
      }
    }

    handlePickup(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, drop: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
      let id = drop.getData('id')
      this.socket.emit('updatePickup', global.curPlayerData.id, {itemName: drop.getData('name'), count: drop.getData('count'), id});
      this.game.DropHandler.deleteDrop(id); //this is PlayerController not DropHandler
    };

}