import Game from "../../game";
import global from "../../global";

export default class QuilFluffController {
  game: Game;
  size = 1;
  speed = 1;
  bodyYOffset = 0; //Mess around with this value to stop ground glitching

  constructor(game: Game) {
    this.game = game;
  }

  setOffset(container: Phaser.GameObjects.Container, direction = -1) {
    (container.body as Phaser.Physics.Arcade.Body).setOffset(20 * direction, -15 /* Adjust collider y location */); //[fix] make more modular
  }


  create(pos: GameObject, id: number | string): Phaser.GameObjects.Container {
    const body = this.game.add.sprite(0, 0, 'quilFluffBody').setName('body');
    const leg1 = this.game.add.sprite(14, 9, 'quilFluffLeg').setName('leg1').setOrigin(0.5, 0);
    const leg2 = this.game.add.sprite(-7, 9, 'quilFluffLeg').setName('leg2').setOrigin(0.5, 0);


    const container = this.game.add.container(pos.x, pos.y).setDepth(1);

    container.setScale(this.size);

    container.setData({frontLegForward: false, type: 'quilFluff', id});
    container.add([leg1, leg2, body]);

    this.game.MobController.mobGroup.add(container);
    this.setOffset(container);
    (container.body as Phaser.Physics.Arcade.Body).setSize(40, 45); //[fix] make more modular


    return container;
  }


  handleLimbs(container: Phaser.GameObjects.Container, newPos: GameObject) {
    const leg1 = container.getByName('leg1') as Phaser.GameObjects.Sprite;
    const leg2 = container.getByName('leg2') as Phaser.GameObjects.Sprite;
    let changeInX = newPos.x - container.x;
    let quilSpeed = Math.abs(changeInX) * 2;
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
    if (quilSpeed > 0) {
      let leg1AngleAdd = 0;
      let leg2AngleAdd = 0;
      if (container.getData('frontLegForward')) {
        leg1AngleAdd = quilSpeed;
        leg2AngleAdd = -quilSpeed;
      } else {
        leg1AngleAdd = -quilSpeed;
        leg2AngleAdd = quilSpeed;
      }
      leg1.angle += leg1AngleAdd * this.game.deltaTime;
      leg2.angle += leg2AngleAdd * this.game.deltaTime;
      if (leg2.angle >= quilSpeed * 8) {
        container.setData('frontLegForward', true);
      }
      if (leg1.angle >= quilSpeed * 8) {
        container.setData('frontLegForward', false);
      }
    } else {
      leg1.angle = 0;
      leg2.angle = 0;
    }
  }

  handleDamage(mob: Mob) {
    let damagingPlayer = global.playersData[mob.damagedByPlayer!];
    if (!damagingPlayer || mob.curMovementTimer >= 800) {
      mob.damagedByPlayer = undefined;
      mob.curMovementTimer = 0;
      mob.move.vx = 0;
      return;
    }
    let xDist = mob.container.x - damagingPlayer.body.x;
    mob.move.vx = xDist > 0 ? this.speed * 4 : -this.speed * 4;
    if (mob.curMovementTimer === 0) { //firt iteration
      mob.container.y -= 10;
      mob.move.vy = -5;
    }
    mob.curMovementTimer += this.game.deltaTime;
  }
}