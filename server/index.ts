import { Socket, Server } from 'socket.io';

type GameObject = {
  x: number,
  y: number
}

let playerCount: number = 0;
let projectileCount: number = 0;

let playerPositions: {[playerId: number]: GameObject} = {};
let projectilePositions: {[playerId: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}} = {};
let spearPositions: {[playerId: number]: {[spearID: number]: {pos: GameObject, angle: number}}} = {};
let collidedSpearPositions: {[playerId: number]: {[spearID: number]: {stuckPos: GameObject, angle: number, collidedPlayerID: number}}} = {};

const io = new Server(3000, {
  cors: {
    origin: ['http://localhost:2000']
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
  console.log(socket.id + 'connected');
  let playerId = playerCount;
  playerPositions[playerId] = {x: 500, y: 500 };
  io.to(socket.id).emit('playerData', playerPositions, playerId, collidedSpearPositions);
  io.emit('newPlayer', playerPositions[playerId], playerId);
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

  socket.on('updateSpearPositions', (playerId: number, spearData: {[id: number]: {pos: GameObject, angle: number}}) => {
    spearPositions[playerId] = spearData;
    socket.broadcast.emit('updateSpearPositions', playerId, spearData);
  });

  socket.on('updateCollidedSpear', (playerId: number, spearData: {id: number, stuckPos: GameObject, angle: number, collidedPlayerID: number}) => {
    if (!collidedSpearPositions[playerId]) {
      collidedSpearPositions[playerId] = {};
    }
    collidedSpearPositions[playerId][spearData.id] = spearData;
    socket.broadcast.emit('updateCollidedSpear', playerId, spearData);
  });


});

