import { Socket, Server } from 'socket.io';

type MobTypes = 'goat' | 'skug' | 'quilFluff';
type EnvObj = 'stickyFern' | 'stone';
type Throwable = 'stone' | 'spear';

type GameObject = {
  x: number,
  y: number
}

let throwableDamage = {'stone': 1, 'spear': 5};

let unassignedMobs: {[id: number | string]: {pos: GameObject, type: MobTypes}} = {}; //Mobs needing control

let envObjCreateCount = 0;
let minMaxPlayerPosX: {min: number, max: number} = {min: 0, max: 0};

let playerCount: number = 0;

let mobInfo = {goat: {health: 5, dropMax: 0, dropName: 'bone', dropMin: 1}, skug: {health: 10, dropMax: 3, dropMin: 1, dropName: 'bone'}, quilFluff: {health: 3, dropMax: 1, dropMin: 0, dropName: 'bone'}};

let objDrops: {[name in Throwable | EnvObj]: string} = {stickyFern: 'goo', stone: 'stone', spear: 'spear'};

let projectileCount: number = 0;

let playerPosData: { [playerId: number]: { pos: GameObject, grapplePos: GameObject | undefined } } = {};
let projectilePositions: { [playerId: number]: { direction: string, pos: GameObject, startPos: GameObject, playerId: number } } = {};
let collidedThrowablePositions: { [ThrowableID: number]: { stuckPos: GameObject, name: Throwable, angle: number, collidedInfo?: { type: string, id: number } } } = {};

let playerInventoryData: {[playerId: number]: { [itemID: string | number]: number }} = {};
let recentDrops: {[dropName: string]: number} = {};

let curEnvObjects: {[EnvObjId: string | number]: {name: EnvObj, pos: GameObject}} = {};

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
  io.to(socket.id).emit('EnvObjects', curEnvObjects);
  io.to(socket.id).emit('playerData', playerPosData, playerId, collidedThrowablePositions);
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

  socket.on('updateThrowablePositions', (ThrowableData: { [id: number]: { pos: GameObject, angle: number } }) => {
    socket.broadcast.emit('updateThrowablePositions', ThrowableData);
  });

  socket.on('newCollidedThrowable', (ThrowableData: { id: number, name: Throwable, stuckPos: GameObject, angle: number, collidedInfo?: { type: string, id: number }}) => {
    collidedThrowablePositions[ThrowableData.id] = ThrowableData;
    io.emit('newCollidedThrowable', ThrowableData);
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

  socket.on('damageMob', (mobId: number | string, info: {type: MobTypes, pos: GameObject, weaponName: Throwable, playerId: number | string}) => { //verify if this mob exists [fix]
    console.log(mobId, info);
    if (!mobHealths[mobId]) {
      mobHealths[mobId] = mobInfo[info.type].health - throwableDamage[info.weaponName];
    } else {
      mobHealths[mobId] -= throwableDamage[info.weaponName];
    }
    if (mobHealths[mobId] <= 0) {
      let count = Math.floor(Math.random() * (mobInfo[info.type].dropMax - mobInfo[info.type].dropMin + 1)) + mobInfo[info.type].dropMin;
      let dropName = mobInfo[info.type].dropName;
      if (!recentDrops[dropName]) {
        recentDrops[dropName] = count;
      }
      recentDrops[dropName] += count;
      io.emit('mobDied', mobId);
      io.emit('drop', {pos: info.pos, count, dropName, id: dropId});
      dropId++;
      delete mobHealths[mobId];
    } else {
      io.emit('damagedMob', mobId, info.playerId);
    }
  });




  socket.on('updatePickup', (playerId: number, info: {itemName: string, count: number, id: number}) => { //Verify position [fix]
    if (recentDrops[info.itemName] >= info.count) {
      if (!playerInventoryData[playerId]) {
        if (info.count < 0) {
          return;
        }
        playerInventoryData[playerId] = {};
      }
      playerInventoryData[playerId][info.itemName] += info.count;
      if (info.count > 0) {
        recentDrops[info.itemName] -= info.count;
        socket.broadcast.emit('deleteDrop', info.id);
        socket.emit('pickupVerified', info.itemName, info.count);
      } else {
        socket.emit('throwItemVerify', info.itemName, info.count);
      }
    }
  });

  socket.on('pickupObj', (playerId: number, id: number, type: 'throwable' | 'envObj') => {
    if (!playerInventoryData[playerId]) {
      playerInventoryData[playerId] = {};
    }
    let objStorage = type === 'envObj' ? curEnvObjects : collidedThrowablePositions;
    if (objStorage[id]) {
      let dropName = objDrops[objStorage[id].name];

      let curAmount = playerInventoryData[playerId][dropName];
      playerInventoryData[playerId][dropName] = !curAmount ? 1 : curAmount + 1;
      delete objStorage[id];
      io.emit('deletePickupableObj', id, type);
      socket.emit('pickupVerified', dropName, 1);
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

  socket.on('newEnvObj', (name: EnvObj, pos: GameObject) => {
    if (pos.x > minMaxPlayerPosX.max || pos.x < minMaxPlayerPosX.min) {
      if (pos.x > minMaxPlayerPosX.max) {
        minMaxPlayerPosX.max = pos.x;
      } else {
        minMaxPlayerPosX.min = pos.x
      }
      curEnvObjects[envObjCreateCount] = {name, pos};
      io.emit('newEnvObj', {id: envObjCreateCount, name, pos});
      envObjCreateCount++;
    }
  });

});

