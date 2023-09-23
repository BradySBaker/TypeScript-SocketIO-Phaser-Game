import Phaser from "phaser";
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

type Player = {
  x: number,
  y: number
};

const playerRectangles: { [id: number]: Phaser.GameObjects.Rectangle } = {};

export default class Game extends Phaser.Scene {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  id: number = NaN;
  playerPos  = { x: 0, y: 0 };
  handledPlayerData: boolean = true;
  sentPos = { x: 0, y: 0};

  preload() {}

  create() {     
    // @ts-ignore
    this.cursors = this.input.keyboard.createCursorKeys();

    socket.on('connect', () => {
      console.log('connected');
    });
    socket.on('playerData', (data: Player[], id: number) => {
      this.id = id;
      data.forEach((curPlayer: Player, idx) => {
        playerRectangles[idx] = this.add.rectangle(curPlayer.x, curPlayer.y, 50, 100, 0xfffff);
      });
    });
    socket.on('newPlayer', (pos, id) => {
      playerRectangles[id] = this.add.rectangle(pos.x, pos.y, 50, 100, 0xfffff);
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
    if (this.cursors?.right.isDown ) {
      this.playerPos.x++;
    }
    if (this.cursors?.left.isDown) {
      this.playerPos.x--;
    }
    if (this.cursors?.up.isDown) {
      this.playerPos.y--;
    }
    if (this.cursors?.down.isDown) {
      this.playerPos.y++;
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