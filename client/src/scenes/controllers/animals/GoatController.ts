import { Socket } from "socket.io-client";
import Game from "../../game";

type goat = {container: Phaser.GameObjects.Container, right: boolean, vx: number, randomTimer: number, frontLegForward: true}

export default class GoatController {
  game: Game;
  socket: Socket;
  goats: goat[] = [];
  size = 65;
  goatOffset = {leg: {x: this.size/3, y: this.size/4}, head: {x: this.size/1.5}};
  goatGroup!: Phaser.GameObjects.Group;

  constructor(game: Game, socket: Socket) {
      this.game = game;
      this.socket = socket;

      this.goatGroup = this.game.physics.add.group({
          classType: Phaser.GameObjects.Rectangle,
          createCallback: ((goat: Phaser.GameObjects.GameObject) => {
            goat.body!.setOffset(-this.size/2, -this.size/4);
          })
        });
  }

  spawn(pos: GameObject) {
    const body = this.game.add.rectangle(0, 0, this.size, this.size/2, 0xff).setName('body');
    const head = this.game.add.rectangle(this.goatOffset.head.x, 0, this.size/3, this.size/1.5, 0xff0000).setName('head');
    head.angle = -30;
    const leg1 = this.game.add.rectangle(-this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg1').setOrigin(0.5, 0);
    const leg2 = this.game.add.rectangle(this.goatOffset.leg.x, this.goatOffset.leg.y, this.size/5, this.size/2, 0xff).setName('leg2').setOrigin(0.5, 0);

    const container = this.game.add.container(pos.x, pos.y);
    container.add([head, body, leg1, leg2]);

    this.goatGroup.add(container);
    console.log(container.getByName('head'));
    this.goats.push({container, right: true, vx: 0, randomTimer: 300});
  }


  handleRandom(goat: goat) {
    if (goat.randomTimer >= 300) {
      goat.randomTimer = 0;
      goat.vx = Math.floor((Math.random() * 5) - 2);
      if (goat.vx < 0 && goat.right) {
        goat.container.setScale(-1, 1);
        goat.container.body!.setOffset(this.size/2, -this.size/4);
        goat.right = false;
      } else if (goat.vx > 0 && !goat.right) {
        goat.container.setScale(1, 1);
        goat.container.body!.setOffset(-this.size/2, -this.size/4);
        goat.right = true;
      }
    } else {
      goat.randomTimer += 1 * this.game.deltaTime;
    }
  }


  handleLimbs(goat: goat) {
    const leg1 = goat.container.getByName('leg1');
    const leg2 = goat.container.getByName('leg2');
    let goatSpeed = Math.abs(goat.vx);
    if (goatSpeed > 0) {
      if (!goat.frontLegForward) {
        leg1.angle -= goatSpeed * this.game.deltaTime;
        leg2.angle += goatSpeed * this.game.deltaTime;
        if (leg2.angle >= goatSpeed * 20) {
          goat.frontLegForward = true;
        }
      } else if (goat.frontLegForward) {
        leg1.angle += goatSpeed * this.game.deltaTime;
        leg2.angle -= goatSpeed * this.game.deltaTime;
        if (leg1.angle >= goatSpeed * 20) {
          goat.frontLegForward = false;
        }
      }
    } else {
      leg1.angle = 0;
      leg2.angle = 0;
    }
  }

  handleGround(goat: goat) {
    let blockY: number;
    let groundCollision = this.game.physics.overlap(goat.container, this.game.TerrainHandler.blockGroup, (goatContainer, block) => {
      let curBlockY = block.y - block.height/2 - this.size/1.4
      if (block.x > goatContainer.x && goat.vx > 0) {
        blockY = curBlockY;
      } else if (block.x < goatContainer.x && goat.vx < 0) {
        blockY = curBlockY;
      } else if (!blockY) {
        blockY = curBlockY;
      }
    });
    if (groundCollision) {
      goat.container.y = blockY!;
      goat.container.x += goat.vx * this.game.deltaTime;
    } else {
      goat.container.y += 4 * this.game.deltaTime;
    }
  }


  handleGoats() {
    this.goats.forEach((curGoat) => {
      this.handleRandom(curGoat);
      this.handleGround(curGoat);
      this.handleLimbs(curGoat);
    });
  }
}
