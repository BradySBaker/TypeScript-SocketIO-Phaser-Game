import Game from "../game";

export default class PlatformHandler {
  game: Game;
  constructor(game: Game) {
    this.game = game;
  }
  spawnPlatforms() {
    this.game.add.rectangle(100, 500, 3000, 30, 0xfffff);
  }
}