import { hasUncaughtExceptionCaptureCallback } from "process";
import Game from "../game";
import { Grid } from "matter";

export default class UIHandler {
  game: Game;
  uiElementPosX: {[type:string]: number} = {};
  graphics: Phaser.GameObjects.Graphics;
  uiSettings: {boxSize: number, spacing: number, inventoryCount: number, height: number};

  constructor(game: Game) {
    this.game = game;
    this.graphics = this.game.add.graphics();
    this.uiSettings = {boxSize: 60, spacing: 40, inventoryCount: 5, height: this.game.gameHeight+120};
  }

  draw() {
    let graphics = this.game.add.graphics();

    let totalWidth = (this.uiSettings.boxSize + this.uiSettings.spacing) * this.uiSettings.inventoryCount - this.uiSettings.spacing;
    let remainingSpace = this.game.gameWidth - totalWidth;
    for (let i = 1; i <= this.uiSettings.inventoryCount; i++) {
      graphics.fillStyle(0xE5E4E2, 0.6);
      let xPosition = remainingSpace / 2 + (i - 1) * (this.uiSettings.boxSize + this.uiSettings.spacing) + this.game.gameWidth/2;
      let imageType;
      if (i === 1) {
        imageType = 'spear';
        graphics.fillStyle(0xFFC000, 0.5);
      } else if (i === 2) {

      }
      if (imageType) {
        this.uiElementPosX[imageType] = xPosition;
        let image = this.game.add.image(xPosition+30, this.game.gameHeight+150, 'spear').setScrollFactor(0).setDepth(2).setScale(.8);
        image.angle = -40;
      }
      graphics.fillRoundedRect(xPosition, this.game.gameHeight+120, this.uiSettings.boxSize, this.uiSettings.boxSize, 10).setScrollFactor(0).setDepth(2);
    }
  }

  changeSelection(newSelected: string, oldSelected: string) {
    this.graphics.fillStyle(0xE5E4E2, 0.5);
    this.graphics.fillRect(this.uiElementPosX[oldSelected], this.uiSettings.height, this.uiSettings.boxSize, this.uiSettings.boxSize);

    this.graphics.fillStyle(0xFFC000, 0.5);
    this.graphics.fillRect(this.uiElementPosX[newSelected], this.uiSettings.height, this.uiSettings.boxSize, this.uiSettings.boxSize);
  }
}