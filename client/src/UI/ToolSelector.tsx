import React, { useEffect, useState } from "react";

import global from "../scenes/global";
// import dropTypesAndCrafting from "../../../dropTypesAndCrafting";

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

const ToolSelector: React.FC<{numKeyPress: string, setNumKeyPress: Function , newPickup: {count: number, itemName: string}}> = ({numKeyPress, setNumKeyPress, newPickup}) => {
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
    if (newPickup.itemName === 'spear' || newPickup.itemName === 'stone') {
      let itemName = newPickup.itemName;
      let itemIndex = findIndexOf(itemName);
      if (itemIndex === -1) {
        let newIndex = findIndexOf('');
        tools[newIndex] = {name: itemName, count: 1};
        setUpdate(update => !update);
      } else {
        if (!global.inventory[newPickup.itemName]) {
          if (global.equiped === itemName) {
            global.equiped = '';
            setCurIcon('');
          }
          tools[itemIndex] = {name: '', count: 0};
          setNumKeyPress('');
          return;
        }
        tools[itemIndex] = {name: itemName, count: global.inventory[newPickup.itemName].count};
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

