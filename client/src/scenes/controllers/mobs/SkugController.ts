import Game from "../../game";

export default class SkugController {
  game: Game;

  size = 1.5;
  speed = 5;
  bodyYOffset = -20

  destroyedGoats: {[id: number|string]: boolean} = {};

  constructor(game: Game) {
      this.game = game;
  }

  setOffset(container: Phaser.GameObjects.Container, direction = -1) {
    (container.body as Phaser.Physics.Arcade.Body).setOffset(20 * direction, this.bodyYOffset);
  }


  create(pos: GameObject, id: number | string): Phaser.GameObjects.Container {
    const body = this.game.add.sprite(0, 0, 'skugBody').setName('body');
    const head = this.game.add.sprite(16, -5, 'skugHead').setName('head').setOrigin(0, 0);
    head.angle = -40;
    const leg1 = this.game.add.sprite(3, 15, 'skugLeg').setName('leg1').setOrigin(0.5, 0);
    const leg2 = this.game.add.sprite(-7, 15, 'skugLeg').setName('leg2').setOrigin(0.5, 0);


    const container = this.game.add.container(pos.x, pos.y).setDepth(1);

    container.setScale(this.size);

    container.setData({frontLegForward: false, type: 'skug', id});
    container.add([head, leg1, body, leg2]);

    this.game.MobController.mobGroup.add(container);
    this.setOffset(container);
    (container.body as Phaser.Physics.Arcade.Body).setSize(2 * 20, 2 * 35);




    return container;
  }



  handleLimbs(container: Phaser.GameObjects.Container, newPos: GameObject) {
    const head = container.getByName('head') as Phaser.GameObjects.Sprite;
    const leg1 = container.getByName('leg1') as Phaser.GameObjects.Sprite;
    const leg2 = container.getByName('leg2') as Phaser.GameObjects.Sprite;
    let changeInX = newPos.x - container.x;
    let goatSpeed = Math.abs(changeInX);
    if (changeInX > 0) { //Handle flip
      if (container.scaleX < 0 && container.body) {
        container.setScale(this.size, this.size);
        this.setOffset(container);
      }
    } else if (changeInX < 0 && container.body) {
      if (container.scaleX > 0) {
        container.setScale(-this.size, this.size);
        this.setOffset(container, 1)
      }
    }
    if (goatSpeed > 0) {
      if (container.getData('frontLegForward')) {
        head.angle += goatSpeed/2 * this.game.deltaTime;
        leg1.angle += goatSpeed * this.game.deltaTime;
        leg2.angle -= goatSpeed * this.game.deltaTime;
        if (leg1.angle >= goatSpeed * 30) {
          container.setData('frontLegForward', false);
        }
      } else {
        head.angle -= goatSpeed/2 * this.game.deltaTime;
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
