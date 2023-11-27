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
  socket: Socket;
  scene: Phaser.Scene;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  player: Player;
  playerGroup?: Phaser.GameObjects.Group;
  id: number = NaN;
  ground = false;
  vy = 1.1;
  sentPos: PlayerPos = {x: 0, y: 0};

  constructor(scene: Phaser.Scene, socket: Socket) {
    this.scene = scene;
    this.socket = socket;
    this.player = {direction: 'right', pos: {x: 0, y: 0}, id: this.id};
  }


  setupPlayer() {
    // @ts-ignore
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.playerGroup = this.scene.add.group({
      classType: Phaser.GameObjects.Rectangle,
      createCallback: (player) => {
        this.scene.physics.world.enable(player);
      }
    });

    this.retrievePlayerData();

    this.scene.physics.add.collider(this.playerGroup, this.playerGroup, (object1, object2) => {
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
    let move: PlayerPos = {x: 0, y: 0};

    if (this.cursors?.right.isDown ) {
      this.player.direction = 'right';
      move.x = 1;
    }
    if (this.cursors?.left.isDown) {
      this.player.direction = 'left';
      move.x = -1;
    }
    if (!this.ground) {
      move.y += this.vy;
    }

    if (move.x === 0 && move.y === 0) {
      return;
    }

    let playerWidth = 50;
    let playerHeight = 100;
    if (
        this.scene.physics.world.bounds.x <= (this.player.pos.x + move.x) - playerWidth / 2 &&
        this.scene.physics.world.bounds.y <= (this.player.pos.y + move.y) - playerHeight / 2 &&
        this.scene.physics.world.bounds.right >= (this.player.pos.x + move.x) + playerWidth / 2 &&
        this.scene.physics.world.bounds.bottom >= (this.player.pos.y + move.y) + playerHeight / 2
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


  retrievePlayerData() {
    setInterval(() => {
      if (this.id !== undefined && (this.player.pos.x !== this.sentPos.x || this.player.pos.y !== this.sentPos.y)) {
        this.socket.emit('updatePosition', this.player.pos);
        this.sentPos.x = this.player.pos.x;
        this.sentPos.y = this.player.pos.y;
      }
    }, 50);

    this.socket.on('updatePosition', (pos: PlayerPos, id: number) => { //Handle player update
      playerRectangles[id].x = pos.x;
      playerRectangles[id].y = pos.y;
    });

    this.socket.on('deletePlayer', (id) => { //Player left
      playerRectangles[id].destroy();
      delete playerRectangles[id];
    });

    this.socket.on('newPlayer', (pos, id) => { //New player joined
      if (id === this.id) {
        return;
      }
      playerRectangles[id] = this.scene.add.rectangle(pos.x, pos.y, 50, 100, 0xfffff);
      this.playerGroup?.add(playerRectangles[id]);
    });


    this.socket.on('playerData', (data: {[id: number]: PlayerPos}, id: number) => { //Recieved personal player data
      console.log('occured');
      this.id = id;
      this.player.id = id;
      for (let playerId in data) {
        playerRectangles[playerId] = this.scene.add.rectangle(data[playerId].x, data[playerId].y, 50, 100, 0xfffff);
        playerRectangles[playerId].name = playerId;
        this.playerGroup?.add(playerRectangles[playerId]);
        this.player.pos.x = data[playerId].x;
        this.player.pos.y = data[playerId].y;
      }
    });
  }
};