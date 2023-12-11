import global from "../global";
import Game from "../game";

export default class GrappleHandler {
  game: Game;
  grappleHook!: Phaser.GameObjects.Sprite;
  graphics: Phaser.GameObjects.Graphics;

  constructor(game: Game) {
    this.game = game;
    this.graphics = this.game.add.graphics();
  }

  handlePosition(player: Player) {
    if (!this.grappleHook) {
      this.grappleHook = this.game.add.sprite(0, 0, 'grapple').setOrigin(0, 0.5).setDepth(1);
    }
    this.grappleHook.x = player.pos.x;
    this.grappleHook.y = player.pos.y;
  }

  handleGrapple() {
    this.graphics.clear();
    if (this.grappleHook.name === 'badAngle') {
      return;
    }
    if (this.game.input.activePointer.isDown && this.grappleHook) {
      let mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
      let mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;
      this.graphics.beginPath();
      this.graphics.moveTo(this.grappleHook.x, this.grappleHook.y);
      this.graphics.lineTo(mouseWorldX, mouseWorldY);
      this.graphics.strokePath();

    }
  }
}