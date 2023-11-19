import { Socket, Server } from 'socket.io';

let playerCount: number = 0;

type GameObject = {
  x: number,
  y: number,
};

type GameObjectGroup = {[playerId: number]: GameObject};

let playerPositions: GameObjectGroup = {};
let projectilePositions: GameObjectGroup = {};

const io = new Server(3000, {
  cors: {
    origin: ['http://localhost:2000']
  }
});

io.on('connection', (socket: Socket) => {
  let playerId = playerCount;
  playerPositions[playerId] = {x: 300, y: 300 };
  io.to(socket.id).emit('playerData', playerPositions, playerId);
  io.emit('newPlayer', playerPositions, playerId);
  playerCount++;

  socket.on('updatePosition', (pos: GameObject) => { //recieved Game Object position and sends it to all clients
    playerPositions[playerId] = pos;
    io.emit('updatePosition', pos, playerId);
  })

  socket.on('disconnect', () => {
    console.log(`Game Object ${playerId} disconnected`);
    delete playerPositions[playerId];
    io.emit('deletePlayer', playerId);
  });

  socket.on('newProjectile', (pos: GameObject, direction: string) => {
    console.log(pos, direction);
    console.log(projectilePositions);
  });

});

