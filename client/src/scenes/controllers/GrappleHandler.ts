import global from "../global";
import Game from "../game";

export default class GrappleHandler {
  game: Game;
  grappleHook!: Phaser.GameObjects.Sprite;
  graphics: Phaser.GameObjects.Graphics;
  grappleCheckCircle!: Phaser.GameObjects.Ellipse;
  collision = false;
  grappling = false;
  grappleTime = 0;
  vy = 0;
  startDirection: number = 0;

  constructor(game: Game) {
    this.game = game;
    this.graphics = game.add.graphics();
    this.grappleCheckCircle = game.add.ellipse(0, 0, 50, 50, 0xFFFFFF, 1).setDepth(1).setAlpha(0);
    game.physics.add.existing(this.grappleCheckCircle);
  }

  handlePosition(player: Player) {
    if (!this.grappleHook) {
      this.grappleHook = this.game.add.sprite(0, 0, 'grapple').setOrigin(0, 0.5).setDepth(1);
    }
    this.grappleHook.setPosition(global.playerRectangles[player.id].x, global.playerRectangles[player.id].y);
  }

  handleGrapple(player: Player) {
    this.graphics.clear();

    let mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
    let mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;

    if (this.grappling) {
      if (this.game.input.activePointer.isDown && this.grappleTime > 10) {
        this.grappleCheckCircle.setPosition(mouseWorldX, mouseWorldY);
        this.grappling = false;
        return;
      }

      const xDistance = this.grappleCheckCircle.x - this.grappleHook.x;
      const xDirection = Math.abs(xDistance)/xDistance;

      const vx = xDistance * .1;

      if (!this.startDirection) {
        this.startDirection = xDirection;
      } else if (xDirection !== this.startDirection) {
        this.vy = -2;
      } else {
        this.vy = 2;
      }
      console.log(this.vy);

      this.graphics.beginPath();
      this.graphics.moveTo(this.grappleHook.x, this.grappleHook.y);
      this.graphics.lineTo(this.grappleCheckCircle.x, this.grappleCheckCircle.y);
      this.graphics.strokePath();
      player.pos.x += vx;
      player.pos.y += this.vy;

      this.grappleTime++;
      return;
    }

    if (this.startDirection) {
      this.startDirection = 0;
    }

    if (this.grappleHook.name === 'badAngle') {
      return;
    }

    this.grappleCheckCircle.setPosition(mouseWorldX, mouseWorldY)
    let collision;
    collision = this.game.physics.overlap(this.grappleCheckCircle, this.game.PlatformHandler.platformGroup, (circle, platform: Phaser.GameObjects.Rectangle) => {
      if (Math.abs(mouseWorldY - platform.y) <= 50) {
        this.grappleCheckCircle.alpha = 1;
        this.grappleCheckCircle.y = platform.y + this.grappleCheckCircle.width/2;
      }
    });
    if (!collision) {
      this.grappleCheckCircle.alpha = 0;
    }

    if (this.game.input.activePointer.isDown && this.grappleHook && this.grappleCheckCircle.alpha === 1) {
      this.graphics.beginPath();
      this.graphics.moveTo(this.grappleHook.x, this.grappleHook.y);
      this.graphics.lineTo(mouseWorldX, mouseWorldY);
      this.graphics.strokePath();
      this.grappling = true;
      this.grappleTime = 0;
    }
  }
}