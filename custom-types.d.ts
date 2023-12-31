declare type GameObject = {
  x: number,
  y: number
}

declare type Player = {
  pos: PlayerPos;
  direction: string;
}

declare type Rect = Phaser.GameObjects.Rectangle;

type animal = {container: Phaser.GameObjects.Container, vx: number, randomTimer: number};