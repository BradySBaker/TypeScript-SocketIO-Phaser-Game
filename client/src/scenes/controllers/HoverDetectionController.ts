import Game from "../game";
import global from "../global";

export default class HoverDetectionController {
  game: Game;
  hoverCollider!: Phaser.GameObjects.Rectangle;
  size = 20;
  maxDistance = 200;
  constructor(game: Game) {
    this.game = game;
    this.hoverCollider = game.add.rectangle(0, 0, this.size, this.size, 0xfffff);
    game.physics.world.enable(this.hoverCollider);
    // @ts-ignore
    game.physics.add.overlap(this.hoverCollider, this.game.EnvironmentController.envObjGroup, this.game.EnvironmentController.handleOverlap, null, this);
  }

  getMouseWorld() {
    const mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
    const mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;
    return ({x: mouseWorldX, y: mouseWorldY})
  }

  positionColliderToMouse() {
    let mousePos = this.getMouseWorld();
    if (!global.curPlayerData.body) {
      return;
    }
    let player = global.curPlayerData.body;
    const deltaX = mousePos.x - player.x;
    const deltaY = mousePos.y - player.y;

    const distanceRatio = Math.min(1, this.maxDistance / Math.sqrt(deltaX**2 + deltaY**2));

    const newX = player.x + distanceRatio * deltaX;
    const newY = player.y + distanceRatio * deltaY;

    this.hoverCollider.setPosition(newX, newY);
  }

}