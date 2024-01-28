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
  constructor(game: Game) {
    this.game = game;

    this.ThrowWEPC = new ThrowWEPC(this.game, this.game.PlayerController.playerGroup);
    this.GrappleHandler = new GrappleHandler(this.game);
    this.ProjectileController = new ProjectileController(this.game, this.game.PlayerController.playerGroup);
  }

  handleTools() {
    //Handle required update functions
    this.ThrowWEPC.handleAttatchedCollidedThrowables();
    this.GrappleHandler.drawRopes();

    //Handle equips ==
    const grappleHook = this.GrappleHandler.grappleHook;

    if (this.GrappleHandler.grappling && this.game.PlayerController.ground) { //Cancel grapple
      this.GrappleHandler.grappling = false;
    }

    if (global.Throwables[global.equiped]) {
      if (this.ThrowWEPC.activeThrowable) {
        this.ThrowWEPC.handleWeaponRotation(this.ThrowWEPC.activeThrowable, this.game.PlayerController.player);
      }
    } else if (global.equiped === 'grapple') {
      if (grappleHook) {
        this.GrappleHandler.handleGrapple();
      }
      this.GrappleHandler.handlePosition(global.curPlayerData.id);
      if (!this.GrappleHandler.grappling) {
        this.ThrowWEPC.handleWeaponRotation(grappleHook, this.game.PlayerController.player);
      }
    }
    if (grappleHook && global.equiped !== 'grapple') {
      grappleHook.setActive(false);
      grappleHook.setVisible(false);
    }
    this.ThrowWEPC.handleObjThrow(this.game.PlayerController.player);
    // ==


    if (this.ThrowWEPC?.activeThrowable) { //Set throwable position
      this.ThrowWEPC.activeThrowable.x += this.game.PlayerController.move.vx * this.game.deltaTime;
      this.ThrowWEPC.activeThrowable.y = this.game.PlayerController.player.pos.y;
    }
  }
}