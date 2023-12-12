import Game from '../game.js';
import { Socket } from "socket.io-client";

import global from '../global.js';

export default class PlayerController {
  shootTimer = 0;
  playersToMove: {[id: number]: GameObject} = {};
  socket: Socket;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  player: Player;
  playerGroup!: Phaser.GameObjects.Group;
  id: number = NaN;
  ground = false;
  vy = 1.1;
  sentPos: GameObject= {x: 0, y: 0};
  game: Game;
  prevJump = 0;
  isMouseHeld = false;
  // @ts-ignore
  spaceKey!: Phaser.Input.Keyboard.KeyCodes;

  // @ts-ignore
  constructor(game: Game, socket: Socket) {
    this.game = game;
    this.socket = socket;
    this.player = {direction: 'right', pos: {x: 0, y: 0}, id: this.id};
    // @ts-ignore
    this.spaceKey = game.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
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
    this.playerGroup = this.game.physics.add.group({
      classType: Phaser.GameObjects.Rectangle,
    });

    this.retrievePlayerData();

    this.game.physics.add.collider(this.playerGroup, this.playerGroup, (object1, object2) => {
      let curPlayer;
      let otherPlayer;
      if (global.playerRectangles[this.id] === object1) {
        curPlayer = object1 as Phaser.GameObjects.Rectangle;
        otherPlayer = object2 as Phaser.GameObjects.Rectangle;
      } else {
        curPlayer = object2 as Phaser.GameObjects.Rectangle;
        otherPlayer = object1 as Phaser.GameObjects.Rectangle;
      }

      const overlapRect = Phaser.Geom.Rectangle.Intersection(curPlayer.getBounds(), otherPlayer.getBounds());

      let separationX = overlapRect.width / 2;
      let separationY = overlapRect.height / 2;

      if (overlapRect.width < overlapRect.height) {
        this.player.pos.x += curPlayer.x > otherPlayer.x ? separationX : -separationX;
      } else {
        this.player.pos.y += curPlayer.y > otherPlayer.y ? separationY : -separationY;
      }

  });
  }



  handleMovement() {
    if (this.game.ThrowWEPC.spear && global.equiped === 'spear') {
      this.game.ThrowWEPC.handleWeaponRotation(this.game.ThrowWEPC.spear, this.player, 'spear');
    } else if (global.equiped === 'grapple') {
      this.game.GrappleHandler.handlePosition(this.player);
      this.game.ThrowWEPC.handleWeaponRotation(this.game.GrappleHandler.grappleHook, this.player, 'grapple');
      this.game.GrappleHandler.handleGrapple(this.player);
    }
    this.handleGround();
    this.game.ThrowWEPC.handleSpearThrow(this.player);
    let move: GameObject = {x: 0, y: 0};

    if (!this.ground && !this.game.GrappleHandler.grappling) {
      this.vy += .5 * this.game.deltaTime
      move.y += this.vy;
    }

    if (this.cursors.right.isDown ) {
      if (this.player.direction === 'left' && this.game.ThrowWEPC?.spear) { //cancel spear
        this.game.ThrowWEPC.spear.destroy();
        this.game.ThrowWEPC.spear = undefined
      }
      this.player.direction = 'right';
      move.x = 4 * this.game.deltaTime;
    }
    if (this.cursors.left.isDown) {
      if (this.player.direction === 'right' && this.game.ThrowWEPC?.spear) { //cancel spear
        this.game.ThrowWEPC.spear.destroy();
        this.game.ThrowWEPC.spear = undefined;
      }
      this.player.direction = 'left';
      move.x = -4 * this.game.deltaTime;
    }
    if (this.spaceKey.isDown && this.ground) {
			this.prevJump = this.game.time.now;
      this.vy = -10;
      move.y += this.vy;
    }

    if (move.x === 0 && move.y === 0) {
      return;
    }
    this.player.pos.x += move.x;
    this.player.pos.y += move.y;
    if (!global.playerRectangles[this.id]) {
      return;
    }
    global.playerRectangles[this.id].x = this.player.pos.x;
    global.playerRectangles[this.id].y = this.player.pos.y;

    if (this.game.ThrowWEPC?.spear) {
      this.game.ThrowWEPC.spear.x += move.x;
      this.game.ThrowWEPC.spear.y = this.player.pos.y;
    }
  }




  handleGround() {

    if (!global.playerRectangles[this.id]) {
      return;
    }
    if (this.player.pos.y >= global.ground) {
      this.ground = true;
      global.playerRectangles[this.id].y = global.ground;
      this.player.pos.y = global.ground;
    } else {
      this.ground = false;
      console.log('occured')
    }
  }







  interpolatePlayerPositions() {
    for (let id in this.playersToMove) {
      if (!global.playerRectangles[id]) {
        return;
      }
      let newPos = this.playersToMove[id];
      let curPos = global.playerRectangles[id];
      if (Math.abs((newPos.x - curPos.x)) < .1 && Math.abs((newPos.y - curPos.y)) < .1) {
        delete this.playersToMove[id];
        return;
      }
      let speed = .5;
      if (Number(id) === this.id) { //Current player
        speed = .05;
      }
      global.playerRectangles[id].x = curPos.x + (newPos.x - curPos.x) * speed;
      global.playerRectangles[id].y = curPos.y + (newPos.y - curPos.y) * speed;
    }
  }







  retrievePlayerData() {
    setInterval(() => {
      if (this.game.ThrowWEPC.curSpearId !== 0) {
        this.socket.emit('updateSpearPositions', this.id, this.game.ThrowWEPC?.curSpearData);
      }

      if (this.id !== undefined && (this.player.pos.x !== this.sentPos.x || this.player.pos.y !== this.sentPos.y)) {
        this.socket.emit('updatePosition', this.player.pos);
        this.sentPos.x = this.player.pos.x;
        this.sentPos.y = this.player.pos.y;
      }
    }, 10);

    this.socket.on('updatePosition', (pos: GameObject, id: number) => { //Handle player update
        this.playersToMove[id] = pos;
    });

    this.socket.on('deletePlayer', (id) => { //Player left
      global.playerRectangles[id].destroy();
      delete global.playerRectangles[id];
    });

    this.socket.on('newPlayer', (pos, id) => { //New player joined
      if (id === this.id) {
        return;
      }
      global.playerRectangles[id] = this.game.add.rectangle(pos.x, pos.y, 50, 100, 0xfffff);
      global.playerRectangles[id].name = id;
      this.playerGroup?.add(global.playerRectangles[id]);
    });


    this.socket.on('playerData', (data: {[id: number]: GameObject}, id: number, collidedSpearPositions: {[playerId: number]: {[spearID: number]: {stuckPos: GameObject, angle: number, collidedPlayerID: number}}}) => { //Recieved personal player data
      this.id = id;
      this.player.id = id;
      for (let playerId in data) {
        global.playerRectangles[playerId] = this.game.add.rectangle(data[playerId].x, data[playerId].y, 50, 100, 0xfffff);
        global.playerRectangles[playerId].name = playerId
        this.playerGroup?.add(global.playerRectangles[playerId]);
        this.player.pos.x = data[playerId].x;
        this.player.pos.y = data[playerId].y;
      }
      let collidedSpears = this.game.ThrowWEPC.otherCollidedSpears; //Handle spears that have collided with something
      for (let playerID in collidedSpearPositions) {
        for (let spearID in collidedSpearPositions[playerID]) {
          let spearData = collidedSpearPositions[playerID][spearID];
          this.game.ThrowWEPC.handleCollidedSpearData(Number(playerID), {...spearData, id: Number(spearID)});
        }
      }
      this.game.cameras.main.startFollow(global.playerRectangles[this.id], true, 0.5, 0.5, -100, 350);

    });

  }

};