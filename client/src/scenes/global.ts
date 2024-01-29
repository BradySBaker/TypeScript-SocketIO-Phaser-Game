import { Socket } from "socket.io-client"

export default {
  socket: {} as Socket, //Initialized in game.ts
  ground: 900,
  playersData: {} as { [id: number | string]: {body: Phaser.GameObjects.Rectangle, grapplingPos: GameObject | undefined} },
  equiped: '',
  curPlayerData: {} as {body: Phaser.GameObjects.Rectangle, grapplingPos: GameObject | undefined, id: number | string},
  curMobs: {} as {[id: string]: Mob},  //Assigned to this client
  curMobData: {} as {[id: string]: {pos: GameObject, type: MobTypes}}, //For sending to server
  otherMobs: {} as {[id: string]: Phaser.GameObjects.Container}, //Recieved mobs
  mobCount: 0 as number,
  inventory: {} as {[itemName: string]: number},
  Throwables: {'stone': true, 'spear': true} as {[type: string]: boolean},
  Tools: {'stone': true, 'spear': true, 'bone_pickaxe': true} as {[type: string]: boolean},
  //This is for finding images only [for example stone is a tool and an env element] [this should be depending on where the image is located]
  EnvImages: ['stickyFern'] as EnvObj[],
  ItemImages: ['bone' , 'goo', 'stone', 'grapple', 'spear', 'bone_pickaxe'] as Drop[]

}