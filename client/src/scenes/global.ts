export default {
  ground: 900,
  playersData: {} as { [id: number | string]: {body: Phaser.GameObjects.Rectangle, grapplingPos: GameObject | undefined} },
  equiped: 'spear',
  curPlayerData: {} as {body: Phaser.GameObjects.Rectangle, grapplingPos: GameObject | undefined, id: number | string},
  curMobs: {} as {[id: string]: Mob},  //Assigned to this client
  curMobData: {} as {[id: string]: {pos: GameObject, assigned: boolean, type: 'goat'}}, //For sending to server
  unasignedMobs: {} as {[id: string]: {x: number, y: number, type: 'goat'}}, //Waiting to be assigned
  otherMobs: {} as {[id: string]: Phaser.GameObjects.Container}, //Recieved mobs
  mobCount: 0 as number
}