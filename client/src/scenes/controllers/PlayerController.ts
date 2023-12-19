import Game from '../game.js';
import { Socket } from "socket.io-client";

import global from '../global.js';
import { platform } from 'process';

export default class PlayerController {
  move = {vy: 0, vx: 0, g: .9};
  prevJump = 0;

  ground = false;

  shootTimer = 0;
  playersToMove: {[id: number]: GameObject} = {};
  player: Player;

  socket: Socket;
  sentPos: GameObject= {x: 0, y: 0};
  game: Game;

  isMouseHeld = false;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  // @ts-ignore
  spaceKey!: Phaser.Input.Keyboard.KeyCodes;

  sliding = false;

  // @ts-ignore
  constructor(game: Game, socket: Socket) {
    this.game = game;
    this.socket = socket;
    this.player = {direction: 'right', pos: {x: 0, y: 0}};
    // @ts-ignore
    this.spaceKey = game.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  handleCollision(otherPlayer: Phaser.GameObjects.Rectangle) {
    let curPlayer = global.curPlayerData.body;

    const overlapRect = Phaser.Geom.Rectangle.Intersection(curPlayer.getBounds(), otherPlayer.getBounds());

    let separationX = overlapRect.width / 2;
    let separationY = overlapRect.height / 2;

    if (overlapRect.width < overlapRect.height) {
      this.player.pos.x += curPlayer.position.x > otherPlayer.x ? separationX : -separationX;
    } else {
      this.player.pos.y += curPlayer.position.y > otherPlayer.y ? separationY : -separationY;
    }
  }

  setupPlayer() {
    // @ts-ignore
    this.cursors = this.game.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
  });


    this.game.cameras.main.zoom = .6;

    this.retrievePlayerData();
  }

  setPosition(x: number, y: number, velocity = false) {
    if (velocity) {
      this.player.pos.x += x * this.game.deltaTime;
      this.player.pos.y += y * this.game.deltaTime;
    } else {
      this.player.pos.x = x;
      this.player.pos.y = y;
    }
    if (!global.curPlayerData.body) {
      return;
    }
    global.curPlayerData.body.position.x = this.player.pos.x
    global.curPlayerData.body.position.y = this.player.pos.y;
  }

  calculateGravity() {
    return Math.abs(this.move.vy /= Math.pow(this.move.g, this.game.deltaTime));
  }

  handleMovement() {
    //Handle equips ==
    if (this.game.ThrowWEPC.spear && global.equiped === 'spear') {
      this.game.ThrowWEPC.handleWeaponRotation(this.game.ThrowWEPC.spear, this.player, 'spear');
    } else if (global.equiped === 'grapple') {
      if (this.game.GrappleHandler.grappleHook) {
        this.game.GrappleHandler.handleGrapple();
      }
      this.game.GrappleHandler.handlePosition(global.curPlayerData.id);
      if (!this.game.GrappleHandler.grappling) {
        this.game.ThrowWEPC.handleWeaponRotation(this.game.GrappleHandler.grappleHook, this.player, 'grapple');
      }

    }
    this.game.ThrowWEPC.handleSpearThrow(this.player);
    // ==

    this.handleGround();
    if (this.game.GrappleHandler.grappling) {
      return;
    }

    if (!this.ground) { //Handle fall ==
      if (this.move.vy < -1) { //going up
        this.move.vy *= Math.pow(this.move.g, this.game.deltaTime);
      } else { //going down
        if (this.move.vy === 0) {
          this.move.vy = 1;
        }
        if (this.move.vy >= -25) {
          this.move.vy = this.calculateGravity();
        }
      }
    } // ==

    if (!this.ground) {
      this.move.vx *= .99 ** this.game.deltaTime;
    } else if (this.sliding) {
      this.move.vx *= .95 ** this.game.deltaTime;
    } else {
      this.move.vx = 0;
    }

    if (this.cursors.right.isDown ) {
      this.player.direction = 'right';
      this.move.vx = 7;
      this.sliding = false;
    } else if (this.cursors.left.isDown) {
      this.player.direction = 'left';
      this.move.vx = -7;
      this.sliding = false;
    }

    if (this.spaceKey.isDown && this.ground) {
			this.prevJump = this.game.time.now;
      this.move.vy = -20;
    }
    if (this.move.vx === 0 && this.move.vy === 0) {
      return;
    }
    this.setPosition(this.move.vx, this.move.vy, true)

    if (this.game.ThrowWEPC?.spear) {
      this.game.ThrowWEPC.spear.x += this.move.vx * this.game.deltaTime;
      this.game.ThrowWEPC.spear.y = this.player.pos.y;
    }
  }




  handleGround() {

    if (!global.curPlayerData.body) {
      return;
    }
    if (this.player.pos.y >= global.ground) {
      this.ground = true;
        this.player.pos.y = global.ground;
        this.move.vy = 0;
        if (this.game.GrappleHandler.grappling) { //Cancel grapple
          this.game.GrappleHandler.grappling = false;
        }
    } else {
      this.ground = false;
    }
  }







  interpolatePlayerPositions() {
    for (let id in this.playersToMove) {
      if (!global.playersData[id]) {
        return;
      }
      let newPos = this.playersToMove[id];
      let curPos = global.playersData[id].body;
      if (Math.abs((newPos.x - curPos.position.x)) < .1 && Math.abs((newPos.y - curPos.y)) < .1) {
        delete this.playersToMove[id];
        return;
      }
      let speed = .5;
      if (id === global.curPlayerData.id) { //Current player
        speed = .05;
      }
      global.playersData[id].body.position.x = curPos.position.x + (newPos.x - curPos.position.x) * speed;
      global.playersData[id].body.position.y = curPos.position.y + (newPos.y - curPos.position.y) * speed;
    }
  }







  retrievePlayerData() {
    setInterval(() => {
      if (this.game.ThrowWEPC.curSpearId !== 0) {
        this.socket.emit('updateSpearPositions', global.curPlayerData.id, this.game.ThrowWEPC.curSpearData);
      }

      if (global.curPlayerData && (this.player.pos.x !== this.sentPos.x || this.player.pos.y !== this.sentPos.y)) {
        let grapplingPont = this.game.GrappleHandler.grappling ? this.game.GrappleHandler.grapplePoint : undefined;
        this.socket.emit('updatePosition', {pos: this.player.pos, grapplePos: grapplingPont});
        this.sentPos.x = this.player.pos.x;
        this.sentPos.y = this.player.pos.y;
      }
    }, 10);

    this.socket.on('updatePosition', (data: {pos: GameObject, grapplePos: GameObject | undefined}, id: number) => { //Handle player update
        this.playersToMove[id] = data.pos;
        let ropes = this.game.GrappleHandler.ropes;
        if (data.grapplePos) {
          ropes[id] = {pos: data.pos, grapplePos: data.grapplePos};
        } else if (ropes[id]) {
          delete ropes[id];
        }
    });

    this.socket.on('deletePlayer', (id) => { //Player left
      this.game.matter.world.remove(global.playersData[id].body, true);
      delete global.playersData[id];
    });

    this.socket.on('newPlayer', (id: string, data: {pos: GameObject, grapplingPos: GameObject | undefined}) => { //New player joined
      if (id === global.curPlayerData.id) {
        return;
      }
      global.playersData[id] = {body: this.game.matter.add.rectangle(data.pos.x, data.pos.y, 50, 100, { collisionFilter: {category: 2}}), grapplingPos: data.grapplingPos}
      // global.playersData[id].body.name = id;
    });


    this.socket.on('playerData', (data: {[id: number]: {pos: GameObject, grapplingPos: GameObject | undefined}}, id: number | string, collidedSpearPositions: {[playerId: number]: {[spearID: number]: {stuckPos: GameObject, angle: number, collidedPlayerID: number}}}) => { //Recieved personal player data
      for (let playerId in data) {
        let category = playerId === id ? 1 : 2;
        global.playersData[playerId] = {body: this.game.matter.add.rectangle(data[playerId].pos.x, data[playerId].pos.y, 50, 100, { collisionFilter: {category}}), grapplingPos: data[playerId].grapplingPos};
        global.playersData[playerId].body.id = Number(playerId);
        global.playersData[playerId].body.collisionFilter.mask = 0;
        this.player.pos.x = data[playerId].pos.x;
        this.player.pos.y = data[playerId].pos.y;
      }
      let collidedSpears = this.game.ThrowWEPC.otherCollidedSpears; //Handle spears that have collided with something
      for (let playerID in collidedSpearPositions) {
        for (let spearID in collidedSpearPositions[playerID]) {
          let spearData = collidedSpearPositions[playerID][spearID];
          this.game.ThrowWEPC.handleCollidedSpearData(Number(playerID), {...spearData, id: Number(spearID)});
        }
      }
      global.curPlayerData = {...global.playersData[id], id};

      this.game.cameras.main.startFollow(global.curPlayerData.body.position, true, 0.5, 0.5, -100, 350);

    });

  }

};