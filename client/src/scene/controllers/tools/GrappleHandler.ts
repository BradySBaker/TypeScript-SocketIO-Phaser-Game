import global from "../../global";
import Game from "../../game";

export default class GrappleHandler {
  game: Game;
  grappleHook!: Phaser.GameObjects.Sprite;
  graphics: Phaser.GameObjects.Graphics;
  grappleCheckCircle!: Phaser.GameObjects.Ellipse;
  grapplePoint: {x: number, y: number} = {x: 0, y: 0};
  collision = false;
  grappling = false;
  grappleTime = 0;
  ropeLength!: number;
  angle!: number;
  initialPos!: {x: number, y: number};
  startSide!: number;
  speed = 0;
  prevSide!: number;
  dampening!: number;
  ropes: {[id: number | string]: {pos: GameObject, grapplePos: GameObject}} = {};

  constructor(game: Game) {
    this.game = game;
    this.graphics = game.add.graphics();
    this.grappleCheckCircle = game.add.ellipse(0, 0, 50, 50, 0xFFFFFF, 1).setDepth(1).setAlpha(0);
    game.physics.add.existing(this.grappleCheckCircle);
    this.grappleHook = this.game.add.sprite(0, 0, 'grapple').setOrigin(0, 0.5).setDepth(2);
  }

  handlePosition(id: number | string) {
    this.grappleHook.setPosition(global.playersData[id].body.x, global.playersData[id].body.y);
    if (!this.grappleHook.visible) {
      this.grappleHook.setActive(true);
      this.grappleHook.setVisible(true);
    }
  }

  getMouseWorld() {
    const mouseWorldX = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).x;
    const mouseWorldY = this.game.cameras.main.getWorldPoint(this.game.input.x, this.game.input.y).y;
    return ({x: mouseWorldX, y: mouseWorldY})
  }

  drawRopes() {
    this.graphics.clear();
    for (let id in this.ropes) {
      this.graphics.beginPath();
      this.graphics.moveTo(this.ropes[id].pos.x, this.ropes[id].pos.y);
      this.graphics.lineTo(this.ropes[id].grapplePos.x, this.ropes[id].grapplePos.y);
      this.graphics.strokePath();
    }

  }

  handleGrapple() {
    if (this.grappling) {
      if (this.game.input.activePointer.isDown && this.grappleTime > 0.2) {
        this.grappling = false;
        return;
      }
      const playerC = this.game.PlayerController;
      playerC.sliding = true;
      const xDistance = this.grapplePoint.x - playerC.player.pos.x;
      let curSide = xDistance/Math.abs(xDistance);
      if (this.grappleTime === 0) { //Start
        const yDistance = this.grapplePoint.y - playerC.player.pos.y;
        const distanceToGrapple = Math.sqrt(xDistance ** 2 + yDistance ** 2);
        this.ropeLength = distanceToGrapple;
        this.angle = Math.atan2(yDistance, xDistance);
        this.startSide = curSide;
        playerC.move.vy = 0;
        this.speed = 0;
        this.prevSide = this.startSide;
        this.dampening = 0.95;
      }
      if (curSide === this.startSide && this.dampening > .1) {
        this.speed -= .003 * this.startSide * this.game.deltaTime;
      } else if (this.dampening > .1) {
        this.speed += .003 * this.startSide * this.game.deltaTime;
      }

      if (this.prevSide !== curSide) {
        this.dampening -= .02 * this.game.deltaTime;
        this.speed *= this.dampening ** this.game.deltaTime;
        this.prevSide = curSide;
        if (this.dampening < .1) {
          this.speed = 0;
        }
      }

      this.angle += this.speed * this.game.deltaTime;
      let offsetAngleX = Math.cos(this.angle);
      let newX = this.grapplePoint.x - offsetAngleX * this.ropeLength;
      let newY =  this.grapplePoint.y - Math.sin(this.angle) * this.ropeLength;

      playerC.move.vy = Math.sin(this.angle) * this.ropeLength/40;

      let direction = -this.speed/Math.abs(this.speed);

      let curSpeed = Math.abs(((newX - playerC.player.pos.x)/this.grappleTime));
      if (curSpeed < 30) {
        playerC.move.vx = direction * curSpeed;
      } else {
        playerC.move.vx = direction * 30;
      }


      playerC.setPosition(newX, newY);

      this.ropes[global.curPlayerData.id] = {pos: {x: newX, y: newY}, grapplePos: this.grapplePoint};

      let targetGrappleRad = Phaser.Math.Angle.Between(
        this.grappleHook.x, this.grappleHook.y,
        this.grapplePoint.x, this.grapplePoint.y
      );

      let grapplePivotAngle = Phaser.Math.RadToDeg(targetGrappleRad);

      this.grappleHook.angle = grapplePivotAngle;

      this.grappleTime += this.game.deltaTime/60;
    }

    let mousePos = this.getMouseWorld();
    this.grappleCheckCircle.setPosition(mousePos.x, mousePos.y)

    let collision;
    collision = this.game.physics.overlap(this.grappleCheckCircle, this.game.TerrainHandler.blockGroup, (object1, object2) => {
      let platform = object1 as Phaser.GameObjects.Rectangle;
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
      this.grapplePoint.x = this.grappleCheckCircle.x;
      this.grapplePoint.y = this.grappleCheckCircle.y;
    }
  }
}