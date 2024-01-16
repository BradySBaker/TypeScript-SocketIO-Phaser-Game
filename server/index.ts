import { Socket, Server } from 'socket.io';
// import dropTypesAndCrafting from '../dropTypesAndCrafting.js';

type MobTypes = 'goat' | 'skug';
type PlantType = 'stickyFern';

type GameObject = {
  x: number,
  y: number
}
let unassignedMobs: {[id: number | string]: {pos: GameObject, type: MobTypes}} = {}; //Mobs needing control

let plantCreateCount = 0;
let minMaxPlayerPosX: {min: number, max: number} = {min: 0, max: 0};

let playerCount: number = 0;

let mobInfo = {goat: {health: 5, dropMax: 0, dropType: 0, dropMin: 1}, skug: {health: 2, dropMax: 3, dropMin: 1, dropType: 1}};
let plantDrops = {stickyFern: 2}

let projectileCount: number = 0;

let playerPosData: { [playerId: number]: { pos: GameObject, grapplePos: GameObject | undefined } } = {};
let projectilePositions: { [playerId: number]: { direction: string, pos: GameObject, startPos: GameObject, playerId: number } } = {};
let spearPositions: { [playerId: number]: { [spearID: number]: { pos: GameObject, angle: number } } } = {};
let collidedSpearPositions: { [playerId: number]: { [spearID: number]: { stuckPos: GameObject, angle: number, collidedInfo: { type: string, id: number } } } } = {};

let playerInventoryData: {[playerId: number]: { [itemID: string | number]: number }} = {};
let recentDrops: {[itemId: string]: number} = {};

let curFooliage: {[plantId: string | number]: {type: PlantType, pos: GameObject}} = {};

let connectedClients: string[] = [];

let mobHealths: { [id: number | string]: number } = {};

let dropId = 0;

const io = new Server(3000, {
  cors: {
    origin: ['http://localhost:2000']
  }
});

setInterval(() => {
    if (Object.keys(unassignedMobs).length > 0) {
      io.emit('unassignedMobs', unassignedMobs);
    }
  }
  , 100);

io.on('connection', (socket: Socket) => {
  console.log(socket.id + 'connected');
  connectedClients.push(socket.id);

  let playerId = playerCount;
  playerPosData[playerId] = { pos: { x: 500, y: 100 }, grapplePos: undefined };
  io.to(socket.id).emit('fooliage', curFooliage);
  io.to(socket.id).emit('playerData', playerPosData, playerId, collidedSpearPositions);
  io.emit('newPlayer', playerId, playerPosData[playerId]);
  playerCount++;

  socket.on('updatePosition', (data: { pos: GameObject, grapplePos: GameObject | undefined }) => { //recieved Game Object position and sends it to all clients
    playerPosData[playerId] = data;
    io.emit('updatePosition', data, playerId);
  })

  socket.on('newProjectile', (pos: GameObject, direction: string, playerId: number) => {
    projectilePositions[projectileCount] = { direction: direction, pos: { x: direction === 'left' ? pos.x - 25 : pos.x + 20, y: pos.y }, startPos: pos, playerId };
    projectileCount++;
  });

  socket.on('playerHit', (id) => {
    if (playerPosData[id]) {
      delete (playerPosData[id]);
      io.emit('deletePlayer', id);
    }
  });

  socket.on('updateSpearPositions', (playerId: number, spearData: { [id: number]: { pos: GameObject, angle: number } }) => {
    spearPositions[playerId] = spearData;
    socket.broadcast.emit('updateSpearPositions', playerId, spearData);
  });

  socket.on('updateCollidedSpear', (playerId: number, spearData: { id: number, stuckPos: GameObject, angle: number, collidedInfo: { type: string, id: number } }) => {
    if (!collidedSpearPositions[playerId]) {
      collidedSpearPositions[playerId] = {};
    }
    collidedSpearPositions[playerId][spearData.id] = spearData;
    socket.broadcast.emit('updateCollidedSpear', playerId, spearData);
  });




  socket.on('unassignMob', (id: number, mobData: { pos: GameObject, type: MobTypes }) => {
    unassignedMobs[id] = mobData;
  });

  socket.on('requestMobAssignment', (id: string) => {
    if (unassignedMobs[id]) {
      socket.emit('mobAssignment', id, unassignedMobs[id]);
      delete unassignedMobs[id]
    }
  });



  socket.on('updateMobs', (mobData: { [id: string]: { pos: GameObject, type: MobTypes } }) => {
    socket.broadcast.emit('updateMobs', mobData);;
  });

  socket.on('damageMob', (id: number | string, info: {type: MobTypes, pos: GameObject}) => { //verify if this mob exists [fix]
    if (!mobHealths[id]) {
      mobHealths[id] = mobInfo[info.type].health - 1;
    } else {
      mobHealths[id]--;
    }
    if (mobHealths[id] === 0) {
      let count = Math.floor(Math.random() * mobInfo[info.type].dropMax) + mobInfo[info.type].dropMin;
      let dropType = mobInfo[info.type].dropType;
      if (!recentDrops[dropType]) {
        recentDrops[dropType] = count;
      }
      recentDrops[dropType] += count;
      io.emit('mobDied', id);
      io.emit('drop', {pos: info.pos, count, dropType, id: dropId});
      dropId++;
      delete mobHealths[id];
    }
  });




  socket.on('pickup', (playerId: number, info: {dropType: number, count: number, id: number}) => { //Verify position [fix]
    if (recentDrops[info.dropType] >= info.count) {
      if (!playerInventoryData[playerId]) {
        playerInventoryData[playerId] = {};
      }
      playerInventoryData[playerId][info.dropType] = info.count;
      recentDrops[info.dropType] -= info.count;
      socket.broadcast.emit('deleteDrop', info.id);
      socket.emit('pickupVerified', info.dropType, info.count);
    }
  });

  socket.on('pickupPlant', (playerId: number, id: number) => {
    if (!playerInventoryData[playerId]) {
      playerInventoryData[playerId] = {};
    }
    if (curFooliage[id]) {
      let dropType = plantDrops[curFooliage[id].type];

      let curAmount = playerInventoryData[playerId][dropType];
      playerInventoryData[playerId][dropType] = !curAmount ? 1 : curAmount + 1;
      delete curFooliage[id];
      io.emit('deletePlant', id);
      socket.emit('pickupVerified', dropType, 1);
    }
  });


  socket.on('disconnectClient', (mobData: { [goatId: string]: { pos: GameObject, type: MobTypes } }) => {
    const index = connectedClients.indexOf(socket.id);
    if (index !== -1) {
      connectedClients.splice(index, 1);
    }

    socket.disconnect(true);
    delete playerPosData[playerId];
    io.emit('deletePlayer', playerId);
    for (let id in mobData) {
      unassignedMobs[id] = mobData[id];
    }
  });

  socket.on('newPlant', (type: PlantType, pos: GameObject) => {
    if (pos.x > minMaxPlayerPosX.max || pos.x < minMaxPlayerPosX.min) {
      if (pos.x > minMaxPlayerPosX.max) {
        minMaxPlayerPosX.max = pos.x;
      } else {
        minMaxPlayerPosX.min = pos.x
      }
      curFooliage[plantCreateCount] = {type, pos};
      io.emit('newPlant', {id: plantCreateCount, type, pos});
      plantCreateCount++;
    }
  });

});

