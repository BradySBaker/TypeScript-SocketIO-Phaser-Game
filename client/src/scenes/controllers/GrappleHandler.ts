import global from "../global";
import Game from "../game";

export default class GrappleHandler {
  game: Game;
  grappleHook!: Phaser.GameObjects.Sprite;
  graphics: Phaser.GameObjects.Graphics;
  grappleCheckCircle!: Phaser.GameObjects.Ellipse;
  collision = false;
  grappling = false;

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
    this.grappleHook.x = player.pos.x;
    this.grappleHook.y = player.pos.y;
  }

  handleGrapple() {
    if (this.grappling) {
      return;
    }
    this.graphics.clear();
    if (this.grappleHook.name === 'badAngle') {
      return;
    }
    let mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
    let mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;

    this.grappleCheckCircle.x = mouseWorldX;
    this.grappleCheckCircle.y = mouseWorldY;

    if (this.game.physics.overlap(this.grappleCheckCircle, this.game.PlatformHandler.platformGroup)) {
      this.grappleCheckCircle.alpha = 1;
    } else {
      this.grappleCheckCircle.alpha = 0;
    }

    if (this.game.input.activePointer.isDown && this.grappleHook) {
      this.graphics.beginPath();
      this.graphics.moveTo(this.grappleHook.x, this.grappleHook.y);
      this.graphics.lineTo(mouseWorldX, mouseWorldY);
      this.graphics.strokePath();
      this.grappling = true;
    }
  }
}