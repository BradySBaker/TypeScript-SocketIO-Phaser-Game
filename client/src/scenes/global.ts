export default {
  ground: 900,
  playersData: {} as { [id: number | string]: {body: Phaser.GameObjects.Rectangle, grapplingPos: GameObject | undefined} },
  equiped: 'spear',
  curPlayerData: {} as {body: Phaser.GameObjects.Rectangle, grapplingPos: GameObject | undefined, id: number | string},
  curMobs: {} as {[id: string]: Mob},  //Assigned to this client
  curMobData: {} as {[id: string]: {pos: GameObject, type: MobTypes}}, //For sending to server
  otherMobs: {} as {[id: string]: Phaser.GameObjects.Container}, //Recieved mobs
  mobCount: 0 as number,
  pickups: {} as {[itemId: number | string]: {count: number, pos: GameObject}},

  //This is for finding images only [for example stone is a tool and an env element]
  EnvImages: ['stickyFern', 'stone'] as EnvObj[],
  ToolImages: ['grapple', 'spear'] as Tool[],
  DropImages: ['bone' , 'goo', 'stone'] as Drop[]

}