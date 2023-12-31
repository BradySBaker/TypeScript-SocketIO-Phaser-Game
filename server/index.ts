import { Socket, Server } from 'socket.io';

type GameObject = {
  x: number,
  y: number
}

let playerCount: number = 0;

let goatStartHealth = 5;

let projectileCount: number = 0;

let playerData: {[playerId: number]: {pos: GameObject, grapplePos: GameObject | undefined}} = {};
let projectilePositions: {[playerId: number]: {direction: string, pos: GameObject, startPos: GameObject, playerId: number}} = {};
let spearPositions: {[playerId: number]: {[spearID: number]: {pos: GameObject, angle: number}}} = {};
let collidedSpearPositions: {[playerId: number]: {[spearID: number]: {stuckPos: GameObject, angle: number, collidedInfo: {type: string, id: number}}}} = {};

let recentlyAssignedGoat = '-1';

let connectedClients: string[] = [];

let goatHealths: {[id: number | string]: number} = {};

const io = new Server(3000, {
  cors: {
    origin: ['http://localhost:2000']
  }
});

// setInterval(() => {
//     // for (let id in projectilePositions) {
//     //   let curProjectile = projectilePositions[id];
//     //   if (curProjectile.direction === 'right') {
//     //     curProjectile.pos.x += 30;
//     //   } else {
//     //     curProjectile.pos.x -= 30;
//     //   }
//     //   curProjectile.pos.y += .5;
//     //   if (curProjectile.pos.x > 1000 || curProjectile.pos.x < 0 || curProjectile.pos.y > 1000 || curProjectile.pos.y < 0) {
//     //     io.emit('deleteProjectile', id);
//     //     delete projectilePositions[id];
//     //   }
//     // }
//     // io.emit('projectileData', projectilePositions);
//   }
//   , 10);

io.on('connection', (socket: Socket) => {
  console.log(socket.id + 'connected');
  connectedClients.push(socket.id);

  let playerId = playerCount;
  playerData[playerId] = {pos: {x: 500, y: 100}, grapplePos: undefined };
  io.to(socket.id).emit('playerData', playerData, playerId, collidedSpearPositions);
  io.emit('newPlayer', playerId, playerData[playerId]);
  playerCount++;

  socket.on('updatePosition', (data: {pos: GameObject, grapplePos: GameObject | undefined}) => { //recieved Game Object position and sends it to all clients
    playerData[playerId] = data;
    io.emit('updatePosition', data, playerId);
  })

  socket.on('newProjectile', (pos: GameObject, direction: string, playerId: number) => {
    projectilePositions[projectileCount] = {direction: direction, pos: {x: direction === 'left' ? pos.x - 25: pos.x + 20, y: pos.y}, startPos: pos, playerId};
    projectileCount++;
  });

  socket.on('playerHit', (id) => {
    if (playerData[id]) {
      delete (playerData[id]);
      io.emit('deletePlayer', id);
    }
  });

  socket.on('updateSpearPositions', (playerId: number, spearData: {[id: number]: {pos: GameObject, angle: number}}) => {
    spearPositions[playerId] = spearData;
    socket.broadcast.emit('updateSpearPositions', playerId, spearData);
  });

  socket.on('updateCollidedSpear', (playerId: number, spearData: {id: number, stuckPos: GameObject, angle: number, collidedInfo: {type: string, id: number}}) => {
    if (!collidedSpearPositions[playerId]) {
      collidedSpearPositions[playerId] = {};
    }
    collidedSpearPositions[playerId][spearData.id] = spearData;
    socket.broadcast.emit('updateCollidedSpear', playerId, spearData);
  });


  socket.on('updateGoats', (goatData: {[goatId: string]: {pos: GameObject, assigned: boolean}}) => {
    socket.broadcast.emit('updateGoats', goatData);;
  });

  socket.on('damageGoat', (id: number | string) => {
    if (!goatHealths[id]) {
      goatHealths[id] = goatStartHealth - 1;
    } else {
      goatHealths[id]--;
    }
    console.log(goatHealths[id]);
    if (goatHealths[id] === 0) {
      io.emit('goatDied', id);
      delete goatHealths[id];
    }
  });

  socket.on('disconnectClient', (goatData: {[goatId: string]: {pos: GameObject, assigned: boolean}}) => {
    const index = connectedClients.indexOf(socket.id);
    if (index !== -1) {
      connectedClients.splice(index, 1);
    }

    socket.disconnect(true);
    delete playerData[playerId];
    io.emit('deletePlayer', playerId);
    io.to(connectedClients[0]).emit('disconnectGoatAssignment', goatData);
  });

  socket.on('requestGoatAssignment', (goatId: string, goat: {pos: GameObject, assigned: boolean}) => {
    if (recentlyAssignedGoat !== goatId) {
      recentlyAssignedGoat = goatId;
      socket.emit('goatAssignment', goatId, goat);
    }
  });

});

