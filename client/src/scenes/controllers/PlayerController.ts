import Game from '../game.js';
import { Socket } from "socket.io-client";

type PlayerPos = {
  x: number,
  y: number
}

type Player = {
  pos: PlayerPos;
  direction: string;
  id: number;
}

const playerRectangles: { [id: number]: Phaser.GameObjects.Rectangle } = {};


export default class CharacterController {
  playersToMove: {[id: number]: PlayerPos} = {};
  socket: Socket;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  player: Player;
  playerGroup?: Phaser.GameObjects.Group;
  id: number = NaN;
  ground = false;
  vy = 1.1;
  sentPos: PlayerPos = {x: 0, y: 0};
  game: Game;
  prevJump = 0;

  // @ts-ignore
  constructor(game: Game, socket: Socket) {
    this.game = game;
    this.socket = socket;
    this.player = {direction: 'right', pos: {x: 0, y: 0}, id: this.id};
  }


  setupPlayer() {
    // @ts-ignore
    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.playerGroup = this.game.add.group({
      classType: Phaser.GameObjects.Rectangle,
      createCallback: (player) => {
        this.game.physics.world.enable(player);
      }
    });

    this.retrievePlayerData();

    this.game.physics.add.collider(this.playerGroup, this.playerGroup, (object1, object2) => {
      let curPlayer;
      let otherPlayer;
      if (playerRectangles[this.id] === object1) {
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
    this.interpolatePlayerPositions();
    this.handleGround();
    let move: PlayerPos = {x: 0, y: 0};

    // const timeNow = this.game.time.now;
    // const timeSinceJump = timeNow - this.prevJump;

    if (this.cursors?.right.isDown ) {
      this.player.direction = 'right';
      move.x = 4 * this.game.deltaTime;
    }
    if (this.cursors?.left.isDown) {
      this.player.direction = 'left';
      move.x = -4 * this.game.deltaTime;
    }
    if (this.cursors?.up.isDown && this.ground) {
			this.prevJump = this.game.time.now;
      this.vy = -10;
      move.y += this.vy;
      this.ground = false;
    }
    if (!this.ground) {
      this.vy += .5 * this.game.deltaTime
      move.y += this.vy;
    }

    if (move.x === 0 && move.y === 0) {
      return;
    }

    let playerWidth = 50;
    let playerHeight = 100;
    if (
        this.game.physics.world.bounds.x <= (this.player.pos.x + move.x) - playerWidth / 2 &&
        this.game.physics.world.bounds.y <= (this.player.pos.y + move.y) - playerHeight / 2 &&
        this.game.physics.world.bounds.right >= (this.player.pos.x + move.x) + playerWidth / 2 &&
        this.game.physics.world.bounds.bottom >= (this.player.pos.y + move.y) + playerHeight / 2
      )
      {
        this.player.pos.x += move.x;
        this.player.pos.y += move.y;
      }
      if (this.id !== undefined && playerRectangles[this.id]) {
        playerRectangles[this.id].x = this.player.pos.x;
        playerRectangles[this.id].y = this.player.pos.y;
      }
  }




  handleGround() {
    if (this.player.pos.y > 500) {
      this.ground = true;
    }
  }








  interpolatePlayerPositions() {
    for (let id in this.playersToMove) {
      let newPos = this.playersToMove[id];
      let curPos = playerRectangles[id];
      playerRectangles[id].x = curPos.x + (newPos.x - curPos.x) * .5;
      playerRectangles[id].y = curPos.y + (newPos.y - curPos.y) * .5;
    }
  }







  retrievePlayerData() {
    setInterval(() => {
      if (this.id !== undefined && (this.player.pos.x !== this.sentPos.x || this.player.pos.y !== this.sentPos.y)) {
        this.socket.emit('updatePosition', this.player.pos);
        this.sentPos.x = this.player.pos.x;
        this.sentPos.y = this.player.pos.y;
      }
    }, 50);

    this.socket.on('updatePosition', (pos: PlayerPos, id: number) => { //Handle player update
      if (id === this.id) {
        playerRectangles[id].x = pos.x;
        playerRectangles[id].y = pos.y;
      }
      this.playersToMove[id] = pos;
    });

    this.socket.on('deletePlayer', (id) => { //Player left
      playerRectangles[id].destroy();
      delete playerRectangles[id];
    });

    this.socket.on('newPlayer', (pos, id) => { //New player joined
      if (id === this.id) {
        return;
      }
      playerRectangles[id] = this.game.add.rectangle(pos.x, pos.y, 50, 100, 0xfffff);
      this.playerGroup?.add(playerRectangles[id]);
    });


    this.socket.on('playerData', (data: {[id: number]: PlayerPos}, id: number) => { //Recieved personal player data
      this.id = id;
      this.player.id = id;
      for (let playerId in data) {
        playerRectangles[playerId] = this.game.add.rectangle(data[playerId].x, data[playerId].y, 50, 100, 0xfffff);
        playerRectangles[playerId].name = playerId;
        this.playerGroup?.add(playerRectangles[playerId]);
        this.player.pos.x = data[playerId].x;
        this.player.pos.y = data[playerId].y;
      }
    });
  }

};