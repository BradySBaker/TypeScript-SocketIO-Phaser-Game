import Phaser, { GameObjects } from "phaser";
import { io } from 'socket.io-client';
import ProjectileController from './controllers/ProjectileController.js';

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

type PlayerPos = {
  x: number,
  y: number
}

type Player = {
  pos: PlayerPos;
  direction: string;
  id: number;
}

type GameObject = {
  x: number,
  y: number
}


export default class Game extends Phaser.Scene {
  collision = false;
  playerGroup?: Phaser.GameObjects.Group;
  ProjectileController?: ProjectileController;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  id: number = NaN;
  player: Player = {direction: 'right', pos: {x: 0, y: 0}, id: this.id};
  sentPos: PlayerPos = {x: 0, y: 0};
  // @ts-ignore
  spaceKey: Phaser.Input.Keyboard.KeyCodes;
  shootTimer: number = 0;



  preload() {}

  create() {
    this.playerGroup = this.add.group({
      classType: Phaser.GameObjects.Rectangle,
      createCallback: (player) => {
        this.physics.world.enable(player);
      }
    });

    this.ProjectileController = new ProjectileController(this, socket, this.playerGroup);


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
        this.player.pos.x += curPlayer.x > otherPlayer.x ? separationX : -separationX;
      } else {
        this.player.pos.y += curPlayer.y > otherPlayer.y ? separationY : -separationY;
      }

  });

    this.physics.world.setBoundsCollision(true);
    // @ts-ignore
    this.cursors = this.input.keyboard.createCursorKeys();
    // @ts-ignore
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    socket.on('connect', () => {
      console.log('connected');
    });

    socket.on('playerData', (data: {[id: number]: PlayerPos}, id: number) => { //Recieved personal player data
      console.log(data);
      this.id = id;
      this.player.id = id;
      for (let playerId in data) {
        playerRectangles[playerId] = this.add.rectangle(data[playerId].x, data[playerId].y, 50, 100, 0xfffff);
        playerRectangles[playerId].name = playerId;
        this.playerGroup?.add(playerRectangles[playerId]);
        this.player.pos.x = data[playerId].x;
        this.player.pos.y = data[playerId].y;
      }
    });

    socket.on('newPlayer', (pos, id) => { //New player joined
      if (id === this.id) {
        return;
      }
      playerRectangles[id] = this.add.rectangle(pos.x, pos.y, 50, 100, 0xfffff);
      this.playerGroup?.add(playerRectangles[id]);
    });

    socket.on('deletePlayer', (id) => { //Player left
      playerRectangles[id].destroy();
      delete playerRectangles[id];
    });


    socket.on('deleteProjectile', (id) => {
      this.ProjectileController?.deleteProjectile(id);
    });

    setInterval(() => {
      if (this.id !== undefined && (this.player.pos.x !== this.sentPos.x || this.player.pos.y !== this.sentPos.y)) {
        socket.emit('updatePosition', this.player.pos);
        this.sentPos.x = this.player.pos.x;
        this.sentPos.y = this.player.pos.y;
      }
    }, 50);

    socket.on('updatePosition', (pos: PlayerPos, id: number) => { //Handle player update
      playerRectangles[id].x = pos.x;
      playerRectangles[id].y = pos.y;
    });

    socket.on('projectileData', (projectiles: {[id: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}}) => { //Handle all projectiles
      this.ProjectileController?.handleProjectiles(projectiles);
    });
  }

  handleMovement() {
    let move: PlayerPos = {x: 0, y: 0};

    if (this.cursors?.right.isDown ) {
      this.player.direction = 'right';
      move.x = 1;
    }
    if (this.cursors?.left.isDown) {
      this.player.direction = 'left';
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
        this.physics.world.bounds.x <= (this.player.pos.x + move.x) - playerWidth / 2 &&
        this.physics.world.bounds.y <= (this.player.pos.y + move.y) - playerHeight / 2 &&
        this.physics.world.bounds.right >= (this.player.pos.x + move.x) + playerWidth / 2 &&
        this.physics.world.bounds.bottom >= (this.player.pos.y + move.y) + playerHeight / 2
      )
      {
        this.player.pos.x += move.x;
        this.player.pos.y += move.y;
      }
  }

  handleShoot() {
    if (this.spaceKey.isDown && this.shootTimer === 0) {
      this.shootTimer = 50;
      this.ProjectileController?.createProjectile(this.player);
    }
    if (this.shootTimer !== 0) {
      this.shootTimer--;
    }
  }

  update() {
    this.handleMovement();
    this.handleShoot();
    if (this.id !== undefined && playerRectangles[this.id]) {
        playerRectangles[this.id].x = this.player.pos.x;
        playerRectangles[this.id].y = this.player.pos.y;
    }
  }
}