import { Socket } from "socket.io-client";
import Game from "../../game";
import global from "../../global";

export default class GoatController {
  game: Game;

  size = 65;
  goatOffset = {leg: {x: this.size/3, y: this.size/4}, head: {x: this.size/1.5}};
  speed = 5;
  goatGroup!: Phaser.GameObjects.Group;

  destroyedGoats: {[id: number|string]: boolean} = {};

  constructor(game: Game) {
      this.game = game;
  }

  create(pos: GameObject, id: number | string): Phaser.GameObjects.Container {
    const body = this.game.add.rectangle(0, 0, this.size, this.size/2, 0xff).setName('body');
    const head = this.game.add.rectangle(this.goatOffset.head.x, 0, this.size/3, this.size/1.5, 0xff0000).setName('head');
    head.angle = -30;
    const leg1 = this.game.add.rectangle(-this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg1').setOrigin(0.5, 0);
    const leg2 = this.game.add.rectangle(this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg2').setOrigin(0.5, 0);


    const container = this.game.add.container(pos.x, pos.y).setDepth(1);
    container.setData({frontLegForward: false, type: 'goat', id});
    container.add([head, body, leg1, leg2]);

    this.game.MobController.mobGroup.add(container);
    (container.body as Phaser.Physics.Arcade.Body).setOffset(-this.size/2, -this.size/4);

    return container;
  }



  handleLimbs(container: Phaser.GameObjects.Container, newPos: GameObject) {
    const leg1 = container.getByName('leg1') as Phaser.GameObjects.Sprite;
    const leg2 = container.getByName('leg2') as Phaser.GameObjects.Sprite;
    let changeInX = newPos.x - container.x;
    let goatSpeed = Math.abs(changeInX);
    if (changeInX > 0) { //Handle flip
      if (container.scaleX === -1 && container.body) {
        container.setScale(1, 1);
        (container.body as Phaser.Physics.Arcade.Body).setOffset(-this.size/2, -this.size/4);
      }
    } else if (changeInX < 0 && container.body) {
      if (container.scaleX === 1) {
        container.setScale(-1, 1);
        (container.body as Phaser.Physics.Arcade.Body).setOffset(this.size/2, -this.size/4);
      }
    }
    if (goatSpeed > 0) {
      if (container.getData('frontLegForward')) {
        leg1.angle += goatSpeed * this.game.deltaTime;
        leg2.angle -= goatSpeed * this.game.deltaTime;
        if (leg1.angle >= goatSpeed * 30) {
          container.setData('frontLegForward', false);
        }
      } else {
        leg1.angle -= goatSpeed * this.game.deltaTime;
        leg2.angle += goatSpeed * this.game.deltaTime;
        if (leg2.angle >= goatSpeed * 30) {
          container.setData('frontLegForward', true);
        }
      }
    } else {
      leg1.angle = 0;
      leg2.angle = 0;
    }
  }

}
