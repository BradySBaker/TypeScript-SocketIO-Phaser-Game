import React from "react";

let useSpeed = 5;
let useComplete = false;

const DisplayUse: React.FC<{useKeyDownTime: number, usePos: {x: number, y: number}}> = ({useKeyDownTime, usePos}) => {
  if (useKeyDownTime * useSpeed >= 360) {
    useComplete = true;
  } else {
    useComplete = false;
  }
  return (
  <div id="use-circle-container" style={{left: usePos.x + 'px', top: usePos.y + 'px'}}>
    <div id="circular-progress" style={{background: `conic-gradient(green ${useKeyDownTime * useSpeed}deg, rgba(255, 255, 255, 0.566) 0deg)`}}>
      <div id="middle-circle" />
    </div>
  </div>
  );
}

export {DisplayUse, useComplete};