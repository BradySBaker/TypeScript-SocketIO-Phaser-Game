import { Socket, Server } from 'socket.io';

let playerCount: number = 0;
let projectileCount: number = 0;

type GameObject = {
  x: number,
  y: number,
};


let playerPositions: {[playerId: number]: GameObject} = {};
let projectilePositions: {[playerId: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}} = {};

const io = new Server(3000, {
  cors: {
    origin: ['*']
  }
});

setInterval(() => {
    for (let id in projectilePositions) {
      let curProjectile = projectilePositions[id];
      if (curProjectile.direction === 'right') {
        curProjectile.pos.x += 30;
      } else {
        curProjectile.pos.x -= 30;
      }
      curProjectile.pos.y += .5;
      if (curProjectile.pos.x > 1000 || curProjectile.pos.x < 0 || curProjectile.pos.y > 1000 || curProjectile.pos.y < 0) {
        io.emit('deleteProjectile', id);
        delete projectilePositions[id];
      }
    }
    io.emit('projectileData', projectilePositions);
  }
  , 10);

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
    socket.disconnect(true);
    delete playerPositions[playerId];
    io.emit('deletePlayer', playerId);
  });

  socket.on('newProjectile', (pos: GameObject, direction: string, playerId: number) => {
    projectilePositions[projectileCount] = {direction: direction, pos: {x: direction === 'left' ? pos.x - 25: pos.x + 20, y: pos.y}, startPos: pos, playerId};
    projectileCount++;
  });

  socket.on('playerHit', (id) => {
    if (playerPositions[id]) {
      delete (playerPositions[id]);
      io.emit('deletePlayer', id);
    }
  });




});

