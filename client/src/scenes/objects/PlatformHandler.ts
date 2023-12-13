import Game from "../game";

export default class PlatformHandler {
  game: Game;
  platformGroup!: Phaser.GameObjects.Group;
  constructor(game: Game) {
    this.game = game;
    this.platformGroup = game.physics.add.group({classType: Phaser.GameObjects.Rectangle});
  }
  spawnPlatforms() {
    for (let i = 0; i <= 10; i++) {
      let platform = this.game.add.rectangle(100 + (i * 200), 500 - (i*100), 300, 30, 0xfffff);
      this.platformGroup.add(platform);
    }
  }
}