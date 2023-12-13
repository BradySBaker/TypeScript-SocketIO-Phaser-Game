import global from "../global";
import Game from "../game";

export default class GrappleHandler {
  game: Game;
  grappleHook!: Phaser.GameObjects.Sprite;
  graphics: Phaser.GameObjects.Graphics;
  grappleCheckCircle!: Phaser.GameObjects.Ellipse;
  collision = false;
  grappling = false;
  grappleTime = 0;
  ropeLength!: number;
  angle!: number;
  initialPos!: {x: number, y: number};
  startSide!: number;
  speed = 0;
  prevDirection!: number;

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
    this.grappleHook.setPosition(global.playerRectangles[player.id].x, global.playerRectangles[player.id].y);
  }

  getMouseWorld() {
    const mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
    const mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;
    return ({x: mouseWorldX, y: mouseWorldY})
  }

  handleGrapple() {

    this.graphics.clear();

    if (this.grappling) {
      if (this.game.input.activePointer.isDown && this.grappleTime > 10) {
        let mousePos = this.getMouseWorld();
        this.grappleCheckCircle.setPosition(mousePos.x, mousePos.y);
        this.grappling = false;
        return;
      }

      const playerC = this.game.PlayerController;
      const xDistance = this.grappleCheckCircle.x - playerC.player.pos.x;
      if (this.grappleTime === 0) { //Start
        const yDistance = this.grappleCheckCircle.y - playerC.player.pos.y;
        const distanceToGrapple = Math.sqrt(xDistance ** 2 + yDistance ** 2);
        this.ropeLength = distanceToGrapple;
        this.angle = Math.atan2(yDistance, xDistance);
        this.startSide = xDistance/Math.abs(xDistance);
        playerC.move.vy = 0;
        this.speed = 0;
      }

      if (xDistance/Math.abs(xDistance) === this.startSide) {
        this.speed -= .002 * this.startSide * this.game.deltaTime;
      } else {
        let dampening = 0.99;
        this.speed += .002 * this.startSide * this.game.deltaTime;
        this.speed *= dampening;
      }

      this.angle += this.speed * this.game.deltaTime;
      let offsetAngleX = Math.cos(this.angle);
      let newX = this.grappleCheckCircle.x - offsetAngleX * this.ropeLength;
      let newY =  this.grappleCheckCircle.y - Math.sin(this.angle) * this.ropeLength;

      playerC.move.vy = Math.sin(this.angle) * this.ropeLength/50;

      let direction = this.speed/Math.abs(this.speed);
      if (offsetAngleX !== 0) {
        let vx = -direction * (Math.abs(xDistance)/50)/Math.abs(offsetAngleX);
        console.log((Math.abs(xDistance)/100)/Math.abs(offsetAngleX));
        if (Math.abs(vx) < 30) {
          playerC.move.vx = vx;
        }
      }
      playerC.setPosition(newX, newY);

      this.graphics.beginPath();
      this.graphics.moveTo(playerC.player.pos.x, playerC.player.pos.y);
      this.graphics.lineTo(this.grappleCheckCircle.x, this.grappleCheckCircle.y);
      this.graphics.strokePath();

      let targetGrappleRad = Phaser.Math.Angle.Between(
        this.grappleHook.x, this.grappleHook.y,
        this.grappleCheckCircle.x, this.grappleCheckCircle.y
      );

      let grapplePivotAngle = Phaser.Math.RadToDeg(targetGrappleRad);

      this.grappleHook.angle = grapplePivotAngle;

      this.grappleTime += this.game.deltaTime;
      return;
    }

    if (this.grappleHook.name === 'badAngle') {
      return;
    }

    let mousePos = this.getMouseWorld();
    this.grappleCheckCircle.setPosition(mousePos.x, mousePos.y)

    let collision;
    collision = this.game.physics.overlap(this.grappleCheckCircle, this.game.PlatformHandler.platformGroup, (circle, platform: Phaser.GameObjects.Rectangle) => {
      if (Math.abs(mousePos.y - platform.y) <= 50) {
        this.grappleCheckCircle.alpha = 1;
        this.grappleCheckCircle.y = platform.y + this.grappleCheckCircle.width/2;
      }
    });
    if (!collision) {
      this.grappleCheckCircle.alpha = 0;
    }

    if (this.game.input.activePointer.isDown && this.grappleHook && this.grappleCheckCircle.alpha === 1) {
      this.grappling = true;
      this.grappleTime = 0;
    }
  }
}