import Game from "../game";

export default (game: Game, pos: GameObject, angle: number): Phaser.GameObjects.Particles.ParticleEmitter => {
  var emitter = game.add.particles(pos.x, pos.y, 'bloodDrop', {quantity: 1, speed: {min: -200, max: 200}, scale: {start: 1, end: 0}, lifespan: 500, frequency: 30,  angle: { min: angle - 20, max: angle + 20 }});
  return emitter;
};