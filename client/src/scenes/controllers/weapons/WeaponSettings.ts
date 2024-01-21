export default {
  spear: {fallSpeedModifer: 1.5, stick: true, startVelModifer: 1, size: 1},
  stone: {fallSpeedModifer: 3, stick: false, startVelModifer: .5, size: 1.5}
} as {[name in Throwable]: {fallSpeedModifer: number, stick: boolean, bounce: number | undefined, startVelModifer: number, size: number}};