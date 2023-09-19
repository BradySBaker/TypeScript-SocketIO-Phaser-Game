import Phaser from "phaser";
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

export default class Game extends Phaser.Scene {
  preload() {}

  create() {
    this.add.rectangle(100, 100, 500, 50, 0xffffff, 1);
    socket.on('connect', () => {
      console.log('connected');
    });
    socket.emit('message', 'hello world');
  }

  update() {}
}