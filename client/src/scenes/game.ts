import Phaser, { GameObjects } from "phaser";
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

window.addEventListener('beforeunload', () => {
  socket.disconnect(); // Manually disconnect the Socket.IO connection
  console.log('Disconnecting before page unload');
});

window.addEventListener('unload', () => {
  socket.disconnect(); // Manually disconnect the Socket.IO connection
  console.log('Page unloaded');
});

const playerRectangles: { [id: number]: Phaser.GameObjects.Rectangle } = {};

type Player = {
  x: number;
  y: number;
}

export default class Game extends Phaser.Scene {
  collision = false;
  playerGroup?: Phaser.GameObjects.Group;

  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  id: number = NaN;
  playerPos: Player = {x: 0, y: 0};
  sentPos: Player = {x: 0, y: 0};


  preload() {}

  create() {
    this.playerGroup = this.add.group({
      classType: Phaser.GameObjects.Rectangle,
      createCallback: (player) => {
        this.physics.world.enable(player);
      }
    });


    this.physics.add.collider(this.playerGroup, this.playerGroup, (object1, object2) => {
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
        this.playerPos.x += curPlayer.x > otherPlayer.x ? separationX : -separationX;
      } else {
        this.playerPos.y += curPlayer.y > otherPlayer.y ? separationY : -separationY;
      }


  });

    this.physics.world.setBoundsCollision(true);
    // @ts-ignore
    this.cursors = this.input.keyboard.createCursorKeys();

    socket.on('connect', () => {
      console.log('connected');
    });

    socket.on('playerData', (data: {[id: number]: Player}, id: number) => {
      this.id = id;
      for (let playerId in data) {
        playerRectangles[playerId] = this.add.rectangle(data[playerId].x, data[playerId].y, 50, 100, 0xfffff);
        this.playerGroup?.add(playerRectangles[playerId]);
        this.playerPos.x = data[playerId].x;
        this.playerPos.y = data[playerId].y;
      }
    });

    socket.on('newPlayer', (pos, id) => {
      if (id === this.id) {
        return;
      }
      playerRectangles[id] = this.add.rectangle(pos.x, pos.y, 50, 100, 0xfffff);
      this.playerGroup?.add(playerRectangles[id]);
    });

    setInterval(() => {
      if (this.id !== undefined && (this.playerPos.x !== this.sentPos.x || this.playerPos.y !== this.sentPos.y)) {
        socket.emit('updatePosition', this.playerPos);
        this.sentPos.x = this.playerPos.x;
        this.sentPos.y = this.playerPos.y;
      }
    }, 50);

    socket.on('updatePosition', (pos: Player, id: number) => {
      playerRectangles[id].x = pos.x;
      playerRectangles[id].y = pos.y;
    });
  }

  handleMovement() {
    let move: Player = {x: 0, y: 0};
    if (this.cursors?.right.isDown ) {
      move.x = 1;
    }
    if (this.cursors?.left.isDown) {
      move.x = -1;
    }
    if (this.cursors?.up.isDown) {
      move.y = -1;
    }
    if (this.cursors?.down.isDown) {
      move.y = 1;
    }

    if (move.x === 0 && move.y === 0) {
      return;
    }

    let playerWidth = 50;
    let playerHeight = 100;
    if (
        this.physics.world.bounds.x <= (this.playerPos.x + move.x) - playerWidth / 2 &&
        this.physics.world.bounds.y <= (this.playerPos.y + move.y) - playerHeight / 2 &&
        this.physics.world.bounds.right >= (this.playerPos.x + move.x) + playerWidth / 2 &&
        this.physics.world.bounds.bottom >= (this.playerPos.y + move.y) + playerHeight / 2
      )
      {
        this.playerPos.x += move.x;
        this.playerPos.y += move.y;
      }
  }

  update() {
    this.handleMovement();
    if (this.id !== undefined && playerRectangles[this.id]) {
        playerRectangles[this.id].x = this.playerPos.x;
        playerRectangles[this.id].y = this.playerPos.y;
    }
  }
}