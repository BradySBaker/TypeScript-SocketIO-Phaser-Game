import Game from "../game";
import global from "../global";

let alreadyDrawn = false;

export default class UIHandler {
  game: Game;
  uiElementPosX: {[type:string]: number} = {};
  graphics: Phaser.GameObjects.Graphics;
  uiSettings: {boxSize: number, spacing: number, inventoryCount: number, height: number};

  // @ts-ignore
  selectButtons: Phaser.Input.Keyboard.KeyCodes;

  constructor(game: Game) {
    this.game = game;
    this.graphics = this.game.add.graphics();
    this.uiSettings = {boxSize: 60, spacing: 40, inventoryCount: 5, height: this.game.gameHeight+120};
    // @ts-ignore
    this.selectButtons = this.game.input.keyboard.addKeys({
      'spear': Phaser.Input.Keyboard.KeyCodes.ONE,
      'grapple': Phaser.Input.Keyboard.KeyCodes.TWO,
    });


  }
  handleSelectButton() {
    if (this.selectButtons.spear.isDown) {
      if (global.equiped !== 'spear') {
        this.draw('spear');
        global.equiped = 'spear';
        if (this.game.GrappleHandler.grappleHook) {
          this.game.GrappleHandler.grappleHook.destroy();
          this.game.GrappleHandler.grappleHook = undefined;
        }
      }
    } else if (this.selectButtons.grapple.isDown) {
      if (global.equiped !== 'grapple') {
        this.draw('grapple');
        global.equiped = 'grapple';
      }
    }
  }

  draw(selected = 'spear') {
    this.graphics.clear();
    let totalWidth = (this.uiSettings.boxSize + this.uiSettings.spacing) * this.uiSettings.inventoryCount - this.uiSettings.spacing;
    let remainingSpace = this.game.gameWidth - totalWidth;
    for (let i = 1; i <= this.uiSettings.inventoryCount; i++) {
      this.graphics.fillStyle(0xE5E4E2, 0.5);
      let xPosition = remainingSpace / 2 + (i - 1) * (this.uiSettings.boxSize + this.uiSettings.spacing) + this.game.gameWidth/2;
      let imageType;
      let angle = 0;
      let size = 1
      if (i === 1) {
        imageType = 'spear';
        angle = -40;
        size = .8;
        if (selected === 'spear') {
          this.graphics.fillStyle(0xFFC000, 0.7);
        }
      } else if (i === 2) {
        imageType = 'grapple';
        if (selected === 'grapple') {
          this.graphics.fillStyle(0xFFC000, 0.7);
        }
      }
      if (!alreadyDrawn) {
        if (imageType) {
          this.uiElementPosX[imageType] = xPosition;
          let image = this.game.add.image(xPosition+30, this.game.gameHeight+150, imageType).setScrollFactor(0).setDepth(2).setScale(size);
          image.angle = angle;
        }
        this.game.add.text(xPosition, this.uiSettings.height, i.toString()).setScrollFactor(0).setDepth(2);
      }

      this.graphics.fillRoundedRect(xPosition, this.uiSettings.height, this.uiSettings.boxSize, this.uiSettings.boxSize, 10).setScrollFactor(0).setDepth(2);
    }
    alreadyDrawn = true;
  }
}