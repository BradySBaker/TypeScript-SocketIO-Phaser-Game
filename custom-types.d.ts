declare type GameObject = {
  x: number,
  y: number
}

declare type Player = {
  pos: PlayerPos;
  direction: string;
}

declare type Rect = Phaser.GameObjects.Rectangle;

type Mob = {container: Phaser.GameObjects.Container, move: {vx, vy}, curMovementTimer: number, onGround: boolean, damagedByPlayer?: number | string};

type MobTypes = 'goat' | 'skug' | 'quilFluff';
type EnvObj = 'stickyFern' | 'stone' | 'rock' | 'tree';

type Throwable = 'stone' | 'spear';
type Tool = 'spear' | 'grapple' | 'stone' | 'bone_pickaxe' | 'bone_hatchet';
type Drop = 'bone' | 'stone' | 'goo' | 'spear' | 'bone_pickaxe' | 'bone_hatchet';
type ToolCategory = 'mining' | 'chopping';