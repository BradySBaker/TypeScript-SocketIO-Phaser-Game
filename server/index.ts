import { Socket, Server } from 'socket.io';

let playerCount: number = 0;
let projectileCount: number = 0;

type GameObject = {
  x: number,
  y: number,
};


let playerPositions: {[playerId: number]: GameObject} = {};
let projectilePositions: {[playerId: number]: {direction: string, pos: GameObject}} = {};

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
    projectilePositions[projectileCount] = {direction: direction, pos: {x: pos.x, y: pos.y}};
    projectileCount++;
  });

  setInterval(() => {
    for (let id in projectilePositions) {
      let curProjectile = projectilePositions[id];
      if (curProjectile.direction === 'right') {
        curProjectile.pos.x+=20;
      } else {
        curProjectile.pos.x-=20;
      }
      curProjectile.pos.y+=10;
    }
    socket.emit('projectileData', projectilePositions);
  }, 50);


});

