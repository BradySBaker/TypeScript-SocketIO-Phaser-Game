import global from "../../global";
import Game from "../../game";

import ProjectileController from './weapons/ProjectileController.js';
import ThrowWEPC from "./weapons/ThrowWEPC.js";
import GrappleHandler from "./GrappleHandler.js";

export default class ToolController {
  game: Game;
  ProjectileController!: ProjectileController;
  ThrowWEPC!: ThrowWEPC;
  GrappleHandler!: GrappleHandler;
  curCollectionTool!: Phaser.GameObjects.Sprite | undefined;
  PlayerController;

  toolStartAngle = -20;
  toolForward = true;
  toolSpeed = 5;

  constructor(game: Game) {
    this.game = game;
    this.PlayerController = this.game.PlayerController;
    this.ThrowWEPC = new ThrowWEPC(this.game, this.PlayerController.playerGroup);
    this.GrappleHandler = new GrappleHandler(this.game);
    this.ProjectileController = new ProjectileController(this.game, this.PlayerController.playerGroup);
  }

  handleTools() {
    //Handle required update functions
    this.ThrowWEPC.handleAttatchedCollidedThrowables();
    this.GrappleHandler.drawRopes();
    this.handleCollectionTools();

    //Handle equips ==
    const grappleHook = this.GrappleHandler.grappleHook;

    if (global.Throwables[global.equiped]) {
      if (this.ThrowWEPC.activeThrowable) {
        this.ThrowWEPC.handleWeaponRotation(this.ThrowWEPC.activeThrowable, this.PlayerController.player);
      }
    } else if (global.equiped === 'grapple') {
      if (grappleHook) {
        this.GrappleHandler.handleGrapple();
      }
      this.GrappleHandler.handlePosition(global.curPlayerData.id);
      if (!this.GrappleHandler.grappling) {
        this.ThrowWEPC.handleWeaponRotation(grappleHook, this.PlayerController.player);
      } else if (this.PlayerController.ground) {
        this.GrappleHandler.grappling = false;
      }
    }
    if (grappleHook && global.equiped !== 'grapple') {
      grappleHook.setActive(false);
      grappleHook.setVisible(false);
    }
    this.ThrowWEPC.handleObjThrow(this.PlayerController.player);
    // ==


    if (this.ThrowWEPC?.activeThrowable) { //Set throwable position
      this.ThrowWEPC.activeThrowable.x += this.PlayerController.move.vx * this.game.deltaTime;
      this.ThrowWEPC.activeThrowable.y = this.PlayerController.player.pos.y;
    }
  }

  handleToolHit() {
    let endAngle = 108;
    let speed;

    if (this.toolForward) {
      speed = (this.toolSpeed * 100) / Math.max(endAngle - Math.abs(this.curCollectionTool!.angle), 50);
    } else {
      speed = -Math.max(endAngle - Math.abs(this.curCollectionTool!.angle), 50) / this.toolSpeed;
    }

    speed = this.curCollectionTool!.flipX ? -speed : speed;

    this.curCollectionTool!.angle += speed * this.game.deltaTime;

    // Ensure the angle doesn't exceed the end angle
    if (Math.abs(this.curCollectionTool!.angle) > endAngle) {
      this.toolForward = false;
      this.game.EnvironmentController.toolHit();
    } else if ((this.curCollectionTool!.angle < this.toolStartAngle && !this.curCollectionTool!.flipX) || (this.curCollectionTool!.angle > -this.toolStartAngle && this.curCollectionTool!.flipX)) {
      this.curCollectionTool!.angle = this.curCollectionTool!.flipX ? -this.toolStartAngle : this.toolStartAngle;
      this.toolForward = true;
    }
  }

  handleFlipXDirection() {
    if (this.PlayerController.player.direction === 'right' && this.curCollectionTool!.flipX) {
      this.curCollectionTool!.setFlipX(false);
    } else if (this.PlayerController.player.direction === 'left' && !this.curCollectionTool!.flipX) {
      this.curCollectionTool!.angle = -this.toolStartAngle;
      this.curCollectionTool!.setFlipX(true);
    }
  }

  handleCollectionTools() {
    let toolXOffset = this.PlayerController.player.direction === 'right' ? 15 : -15;
    let toolYOffset = 10;
    if (global.equiped === 'bone_pickaxe') {
      if (!this.curCollectionTool) {
        this.curCollectionTool = this.game.add.sprite(this.PlayerController.player.pos.x + toolXOffset, this.PlayerController.player.pos.y - toolYOffset, 'bone_pickaxe').setDepth(1).setScale(1.5);
        this.curCollectionTool.angle = this.toolStartAngle;
      } else {
        this.curCollectionTool.setPosition(this.PlayerController.player.pos.x + toolXOffset, this.PlayerController.player.pos.y - toolYOffset);
        this.handleFlipXDirection();
      }
      if (this.game.input.activePointer.isDown) {
        this.handleToolHit();
      } else {
        this.curCollectionTool.angle = this.curCollectionTool!.flipX ? -this.toolStartAngle : this.toolStartAngle;
        this.toolForward = true;
      }
    } else if (this.curCollectionTool) {
      this.curCollectionTool.destroy();
      this.curCollectionTool = undefined;
    }
  }
}