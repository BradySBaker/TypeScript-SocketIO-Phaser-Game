export default {
  ground: 900,
  playersData: {} as { [id: number | string]: {body: MatterJS.BodyType, grapplingPos: GameObject | undefined} },
  equiped: 'spear',
  curPlayerData: {} as {body: MatterJS.BodyType, grapplingPos: GameObject | undefined, id: number | string},
}