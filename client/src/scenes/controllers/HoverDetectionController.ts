import Game from "../game";
import global from "../global";

export default class HoverDetectionController {
  game: Game;
  hoverCollider!: Phaser.GameObjects.Rectangle;
  size = 20;
  constructor(game: Game) {
    this.game = game;
    this.hoverCollider = game.add.rectangle(0, 0, this.size, this.size, 0xfffff);
    game.physics.world.enable(this.hoverCollider);
    // @ts-ignore
    game.physics.add.overlap(this.hoverCollider, this.game.FooliageController.plantGroup, this.game.FooliageController.handleOverlap, null, this);
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
    console.log(Math.abs((mousePos.x - global.curPlayerData.body.x)),  Math.abs((mousePos.y - global.curPlayerData.body.y)))
    if (Math.abs((mousePos.x - global.curPlayerData.body.x)) < 200 && Math.abs((mousePos.y - global.curPlayerData.body.y)) < 200) {
      this.hoverCollider.setPosition(mousePos.x, mousePos.y)
    }
  }

}