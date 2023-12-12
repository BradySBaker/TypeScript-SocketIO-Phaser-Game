import Game from "../game";

export default class PlatformHandler {
  game: Game;
  platformGroup!: Phaser.GameObjects.Group;
  constructor(game: Game) {
    this.game = game;
    this.platformGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }
  spawnPlatforms() {
    let platform = this.game.add.rectangle(100, 500, 3000, 30, 0xfffff);
    this.platformGroup.add(platform);
  }
}