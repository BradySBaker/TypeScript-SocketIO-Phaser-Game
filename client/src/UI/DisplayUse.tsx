import React from "react";

let useSpeed = 5;

const DisplayUse: React.FC<{useKeyDownTime: number}> = ({useKeyDownTime}) => {
  return (
  <div id="use-circle-container">
    <div id="circular-progress" style={{background: `conic-gradient(green ${useKeyDownTime * useSpeed}deg, rgba(255, 255, 255, 0.566) 0deg)`}}>
      <div id="middle-circle" />
    </div>
  </div>
  );
}

export default DisplayUse;