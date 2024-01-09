declare type GameObject = {
  x: number,
  y: number
}

declare type Player = {
  pos: PlayerPos;
  direction: string;
}

declare type Rect = Phaser.GameObjects.Rectangle;

type Mob = {container: Phaser.GameObjects.Container, vx: number, randomTimer: number};

type MobTypes = 'goat' | 'skug';

