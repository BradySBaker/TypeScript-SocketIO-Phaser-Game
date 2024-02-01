import { Socket, Server } from 'socket.io';
import craftingRecipes from '../craftingRecipes';

type Drop = 'bone' | 'stone' | 'goo' | 'spear' | 'bone_pickaxe' | 'bone_hatchet';

type MobTypes = 'goat' | 'skug' | 'quilFluff';
type EnvObj = 'stickyFern' | 'stone' | 'rock';
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

let objDrops: {[name in Throwable | EnvObj]: Drop} = {stickyFern: 'goo', stone: 'stone', spear: 'spear', rock: 'stone'};

let projectileCount: number = 0;

let playerPosData: { [playerID: number]: { pos: GameObject, grapplePos: GameObject | undefined } } = {};
let projectilePositions: { [playerID: number]: { direction: string, pos: GameObject, startPos: GameObject, playerID: number } } = {};
let collidedThrowablePositions: { [ThrowableID: number]: { stuckPos: GameObject, name: Throwable, angle: number, collidedInfo?: { type: string, id: number } } } = {};

let playerInventoryData: {[playerID: number ]: { [itemID: string | number]: number }} = {};
let recentDrops: {[dropName: string]: number} = {};

let curEnvObjects: {[EnvObjId: string | number]: {name: EnvObj, pos: GameObject, health?: number}} = {};
let mineableObjectDetails: {[name in EnvObj]?: {startHealth: number, breakHealthIncrement: number /* how much health to shrink */, lootCount: number}} = {'rock': {startHealth: 9, breakHealthIncrement: 3, lootCount: 1 /* Multiplied by pickaxe strength */}};

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

  let playerID = playerCount;
  playerPosData[playerID] = { pos: { x: 500, y: 100 }, grapplePos: undefined };
  io.to(socket.id).emit('EnvObjects', curEnvObjects);
  io.to(socket.id).emit('playerData', playerPosData, playerID, collidedThrowablePositions);
  io.emit('newPlayer', playerID, playerPosData[playerID]);
  playerCount++;

  socket.on('updatePosition', (data: { pos: GameObject, grapplePos: GameObject | undefined }) => { //recieved Game Object position and sends it to all clients
    playerPosData[playerID] = data;
    io.emit('updatePosition', data, playerID);
  })

  socket.on('newProjectile', (pos: GameObject, direction: string, playerID: number) => {
    projectilePositions[projectileCount] = { direction: direction, pos: { x: direction === 'left' ? pos.x - 25 : pos.x + 20, y: pos.y }, startPos: pos, playerID };
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

  socket.on('damageMob', (mobId: number | string, info: {type: MobTypes, pos: GameObject, weaponName: Throwable, playerID: number | string}) => { //verify if this mob exists [fix]
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
      io.emit('damagedMob', mobId, info.playerID);
    }
  });

  socket.on('craftItem', (playerID: number, itemName: Drop) => {
    console.log('crafting', playerID, itemName);
    let newInventory = {...playerInventoryData[playerID]};
    let recipe = craftingRecipes[itemName];
    console.log(newInventory);
    for (let requiredItem in recipe) {
      let requiredCount = recipe[requiredItem as Drop];
      if (!newInventory[requiredItem] || newInventory[requiredItem] - requiredCount! < 0) {
        console.log('missing: ' + requiredItem);
        return;
      }
      newInventory[requiredItem] -= requiredCount!;
      if (newInventory[requiredItem] < 1) {
        delete newInventory[requiredItem];
      }
    }
    if (!newInventory[itemName]) {
      newInventory[itemName] = 0;
    }
    newInventory[itemName]++;
    playerInventoryData[playerID] = newInventory;
    socket.emit('craftVerified', newInventory, {itemName, count: 1});
  });


  socket.on('updatePickup', (playerID: number, info: {itemName: string, count: number, id: number | undefined}, admin: true | undefined) => { //Verify position [fix]
    if (admin) { //Temporary
      if (!playerInventoryData[playerID]) {
        playerInventoryData[playerID] = {};
      }
      if (!playerInventoryData[playerID][info.itemName]) {
        playerInventoryData[playerID][info.itemName] = 0;
      }
      //===========

      playerInventoryData[playerID][info.itemName] += info.count;
      socket.emit('pickupVerified', info.itemName, info.count);
      return;
    }
    if (recentDrops[info.itemName] >= info.count) {
      if (!playerInventoryData[playerID]) {
        if (info.count < 0) {
          return;
        }
        playerInventoryData[playerID] = {};
      }
      playerInventoryData[playerID][info.itemName] += info.count;
      if (info.id === undefined) {
        return;
      }
      if (info.count > 0) {
        recentDrops[info.itemName] -= info.count;
        socket.broadcast.emit('deleteDrop', info.id);
        socket.emit('pickupVerified', info.itemName, info.count);
      } else {
        socket.emit('throwItemVerify', info.itemName, info.count);
      }
    }
  });

  socket.on('pickupObj', (playerID: number, id: number, type: 'throwable' | 'envObj') => {
    let objStorage = type === 'envObj' ? curEnvObjects : collidedThrowablePositions;
    pickupObjLoot(playerID, {itemName: objDrops[objStorage[id].name], count: 1, id: id, type});
  });


  socket.on('disconnectClient', (mobData: { [goatId: string]: { pos: GameObject, type: MobTypes } }) => {
    const index = connectedClients.indexOf(socket.id);
    if (index !== -1) {
      connectedClients.splice(index, 1);
    }

    socket.disconnect(true);
    delete playerPosData[playerID];
    io.emit('deletePlayer', playerID);
    for (let id in mobData) {
      unassignedMobs[id] = mobData[id];
    }
  });


  const pickupObjLoot = (playerID: number, objDetails: {itemName: Drop, count: number, id: number, type: 'envObj' | 'throwable'}, mineable = false) => {
    if (!playerInventoryData[playerID]) {
      playerInventoryData[playerID] = {};
    }
    let objStorage = objDetails.type === 'envObj' ? curEnvObjects : collidedThrowablePositions;
    if (!objStorage[objDetails.id]) {
      return;
    }
    let curAmount = playerInventoryData[playerID][objDetails.itemName];
    playerInventoryData[playerID][objDetails.itemName] = !curAmount ? 1 : curAmount + 1;
    socket.emit('pickupVerified', objDetails. itemName, objDetails.count);
    if (!mineable) {
      delete objStorage[objDetails.id];
      io.emit('deletePickupableObj', objDetails.id, objDetails.type);
    }
  }

  socket.on('newEnvObj', (name: EnvObj, pos: GameObject) => {
    if (pos.x > minMaxPlayerPosX.max || pos.x < minMaxPlayerPosX.min) {
      if (pos.x > minMaxPlayerPosX.max) {
        minMaxPlayerPosX.max = pos.x;
      } else {
        minMaxPlayerPosX.min = pos.x
      }
      let miningDetails = mineableObjectDetails[name];
      let envObjInfo: {name: EnvObj, pos: GameObject, health?: number} = {name, pos};
      if (miningDetails) {
        envObjInfo = {name, pos, health: miningDetails.startHealth};
      }
      curEnvObjects[envObjCreateCount] = envObjInfo;
      io.emit('newEnvObj', {id: envObjCreateCount, name, pos});
      envObjCreateCount++;
    }
  });

  socket.on('mineObj', (playerID: number, objDetails: {name: EnvObj, id: number}) => {
    let envObj = curEnvObjects[objDetails.id];
    if (!envObj || !envObj.health) {
      return;
    }
    envObj.health--;
    if (envObj.health % mineableObjectDetails[objDetails.name]!?.breakHealthIncrement === 0) {
      pickupObjLoot(playerID, {itemName: objDrops[objDetails.name], count: mineableObjectDetails[objDetails.name]!.lootCount, id: objDetails.id, type: 'envObj'}, true);
      if (envObj.health > 0) {
        io.emit('incrementObjBreak', objDetails.id);
      }
    }
    if (envObj.health <= 0) {
      delete curEnvObjects[objDetails.id];
      io.emit('deletePickupableObj', objDetails.id, 'envObj');
    }
  });

});

