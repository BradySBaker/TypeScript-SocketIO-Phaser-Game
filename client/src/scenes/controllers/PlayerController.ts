import Game from '../game.js';
import global from '../global.js';

export default class PlayerController {
  move = {vy: 0, vx: 0, g: .9};
  prevJump = 0;

  ground = true;

  shootTimer = 0;
  playersToMove: {[id: number]: GameObject} = {};
  player: Player;
  playerGroup!: Phaser.GameObjects.Group;

  sentPos: GameObject= {x: 0, y: 0};
  game: Game;

  isMouseHeld = false;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  // @ts-ignore
  spaceKey!: Phaser.Input.Keyboard.KeyCodes;

  sliding = false;

  speed = 8;

  // @ts-ignore
  constructor(game: Game) {
    this.game = game;
    this.player = {direction: 'right', pos: {x: 500, y: 0}};
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

    // this.game.physics.add.collider(this.playerGroup, this.playerGroup, (object1, object2) => {
    //   let curPlayer;
    //   let otherPlayer;
    //   if (global.curPlayerData.body === object1) {
    //     curPlayer = object1 as Phaser.GameObjects.Rectangle;
    //     otherPlayer = object2 as Phaser.GameObjects.Rectangle;
    //   } else {
    //     curPlayer = object2 as Phaser.GameObjects.Rectangle;
    //     otherPlayer = object1 as Phaser.GameObjects.Rectangle;
    //   }

    //   const overlapRect = Phaser.Geom.Rectangle.Intersection(curPlayer.getBounds(), otherPlayer.getBounds());

    //   let separationX = overlapRect.width / 2;
    //   let separationY = overlapRect.height / 2;

    //   if (overlapRect.width < overlapRect.height) {
    //     this.player.pos.x += curPlayer.x > otherPlayer.x ? separationX : -separationX;
    //   } else {
    //     this.player.pos.y += curPlayer.y > otherPlayer.y ? separationY : -separationY;
    //   }
    // });
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
    global.curPlayerData.body.setPosition(this.player.pos.x, this.player.pos.y);
  }

  calculateGravity() {
    return Math.abs(this.move.vy /= Math.pow(this.move.g, this.game.deltaTime));
  }


  handleMovement() {
    this.handleGround();

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
      this.move.vx *= .9 ** this.game.deltaTime;
    } else if (this.sliding) {
      this.move.vx *= .95 ** this.game.deltaTime;
    } else {
      this.move.vx = 0;
    }

    if (this.cursors.right.isDown ) {
      this.player.direction = 'right';
      this.move.vx = this.speed;
      this.sliding = false;
    } else if (this.cursors.left.isDown) {
      this.player.direction = 'left';
      this.move.vx = -this.speed;
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

  }



  handleGround() {
    if (!global.curPlayerData.body) {
      return;
    }
    let blockY: number;
    const groundCollision = this.game.physics.overlap(global.curPlayerData.body, this.game.TerrainHandler.blockGroup, (player, block) => {
      const tileBlock = block as Phaser.GameObjects.TileSprite;
      const playerRect = player as Phaser.GameObjects.Rectangle;

      const curBlockY = tileBlock.y - tileBlock.height/2 - global.curPlayerData.body.height/2;
      if (this.move.vx > 0 && tileBlock.x > playerRect.x) { //Fix setting wrong block
        blockY = curBlockY;
      } else if (this.move.vx < 0 && tileBlock.x < playerRect.x) {
        blockY = curBlockY;
      } else if (!blockY) {
        blockY = curBlockY
      }
    });
    if (groundCollision) {
      this.ground = true;
      global.curPlayerData.body.y = blockY!+5;
      this.player.pos.y = blockY!+5;
      this.move.vy = 0;
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
      if (Math.abs((newPos.x - curPos.x)) < .1 && Math.abs((newPos.y - curPos.y)) < .1) {
        delete this.playersToMove[id];
        return;
      }
      let speed = .5;
      if (id === global.curPlayerData.id) { //Current player
        speed = .05;
      }
      global.playersData[id].body.x = curPos.x + (newPos.x - curPos.x) * speed;
      global.playersData[id].body.y = curPos.y + (newPos.y - curPos.y) * speed;
    }
  }









  retrievePlayerData() {
    global.socket.on('updatePosition', (data: {pos: GameObject, grapplePos: GameObject | undefined}, id: number) => { //Handle player update
        this.playersToMove[id] = data.pos;
        let ropes = this.game.ToolController.GrappleHandler.ropes;
        if (data.grapplePos) {
          ropes[id] = {pos: data.pos, grapplePos: data.grapplePos};
        } else if (ropes[id]) {
          delete ropes[id];
        }
    });

    global.socket.on('deletePlayer', (id) => { //Player left
      global.playersData[id].body.destroy();
      delete global.playersData[id];
      delete this.playersToMove[id];
    });

    global.socket.on('newPlayer', (id: string, data: {pos: GameObject, grapplingPos: GameObject | undefined}) => { //New player joined
      if (id === global.curPlayerData.id) {
        return;
      }
      global.playersData[id] = {body: this.game.add.rectangle(data.pos.x, data.pos.y, 50, 100, 0xfffff).setDepth(1), grapplingPos: data.grapplingPos}
      let body = global.playersData[id].body;
      body.setData('id', id);
      body.setData('type', 'player');
      this.playerGroup.add(global.playersData[id].body);
    });


    global.socket.on('playerData', (data: {[id: number]: {pos: GameObject, grapplingPos: GameObject | undefined}}, id: number, collidedThrowableData: {[ThrowableID: number]: {stuckPos: GameObject, angle: number, collidedInfo: {type: string, id: number}, name: Throwable}}) => { //Recieved personal player data
      for (let playerId in data) {
        global.playersData[playerId] = {body: this.game.add.rectangle(data[playerId].pos.x, data[playerId].pos.y, 50, 100, 0xfffff).setDepth(1), grapplingPos: data[playerId].grapplingPos};
        let body = global.playersData[playerId].body;
        body.setData('id', playerId);
        body.setData('type', 'player');

        this.playerGroup.add(global.playersData[playerId].body);
        this.player.pos.x = data[playerId].pos.x;
        this.player.pos.y = data[playerId].pos.y;
      }
      for (let throwableID in collidedThrowableData) {
        let throwableData = collidedThrowableData[throwableID];
        this.game.ToolController.ThrowWEPC.handleCollidedthrowableData({...throwableData, id: throwableID});
      }
      this.sentPos = {x: data[id].pos.x, y: data[id].pos.y};
      global.curPlayerData = {...global.playersData[id], id};

      // @ts-ignore
      this.game.physics.add.overlap(global.curPlayerData.body, this.game.DropHandler.dropGroup, this.game.DropHandler.handlePickup, null, this);
      this.game.cameras.main.startFollow(global.curPlayerData.body, true, 0.5, 0.5, -100, 350);

    });

  }

};