import React, { useEffect, useState } from "react";

import global from "../scenes/global";
let tools: {name: string, count: number}[] = new Array(6);
tools.fill({name: '', count: 0});

let findIndexOf = (name: string): number => {
  for (let i = 0; i < tools.length; i++) {
    if (tools[i].name === name) {
      return i;
    }
  }
  return -1;
}

const ToolSelector: React.FC<{numKeyPress: string, newPickup: {count: number, type: number}}> = ({numKeyPress, newPickup}) => {
  const [curIcon, setCurIcon] = useState('');
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    let selected = tools[Number(numKeyPress) - 1];
    if (selected) {
      setCurIcon(selected.name);
      global.equiped = selected.name;
    }
  }, [numKeyPress]);

  useEffect(() => { //--fix make modular
    if (newPickup.type == 3) {
      let stoneIndex = findIndexOf('stone');
      if (stoneIndex === -1) {
        let newIndex = findIndexOf('');
        tools[newIndex] = {name: 'stone', count: 1};
      } else {
        if (!global.pickups[3]) {
          if (global.equiped === 'stone') {
            global.equiped = '';
            setCurIcon('');
          }
          tools[stoneIndex] = {name: '', count: 0};
          return;
        }
        tools[stoneIndex] = {name: 'stone', count: global.pickups[3].count}
        setUpdate(update => !update);
      }
    }
  }, [newPickup]);

  return (
    <div id="toolSelector">
      {
        tools.map((curTool, idx) => {
          return(
            <div key={idx} className="selection-box" style={curIcon === curTool.name && curIcon !== '' ? {backgroundColor: 'rgba(255, 215, 0, 0.5)' } : {}}>
              {curTool.name !== '' ?  <><img className="selection-icon" src={`./assets/items/${curTool.name}.png`}/><div>{curTool.count}</div></> : null}
            </div>
          )
        })
      }
    </div>
  );
}

export default ToolSelector;

