import Phaser, { GameObjects } from "phaser";
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');


const playerRectangles: { [id: number]: Phaser.GameObjects.Rectangle } = {};

type Player = {
  x: number;
  y: number;
}

export default class Game extends Phaser.Scene {
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
      const player1 = object1 as Phaser.GameObjects.Rectangle;
      const player2 = object2 as Phaser.GameObjects.Rectangle;

      console.log(player1.x, player2.x);
      console.log(player1.y, player2.y);
  });

    this.physics.world.setBoundsCollision(true);

    // @ts-ignore
    this.cursors = this.input.keyboard.createCursorKeys();

    socket.on('connect', () => {
      console.log('connected');
    });

    socket.on('playerData', (data: Player[], id: number) => {
      this.id = id;
      data.forEach((curPlayer: Player, idx) => {
        playerRectangles[idx] = this.add.rectangle(curPlayer.x, curPlayer.y, 50, 100, 0xfffff);
        this.playerGroup?.add(playerRectangles[idx]);
        this.playerPos.x = curPlayer.x;
        this.playerPos.y = curPlayer.y;
      });
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
      console.log('updated')
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
    if (this.physics.world.bounds.contains(this.playerPos.x + move.x, this.playerPos.y + move.y)) {
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