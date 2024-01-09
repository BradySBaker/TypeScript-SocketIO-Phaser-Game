import React, { useEffect, useState } from "react";

import global from "../scenes/global";
let tools: string[] = new Array(6);
tools.fill('');

tools[0] = 'spear';
tools[1] = 'grapple';

const ToolSelector: React.FC<{keyPress: string}> = ({keyPress}) => {
  const [curIcon, setCurIcon] = useState('spear');
  useEffect(() => {
    let selected = tools[Number(keyPress) - 1];
    if (selected) {
      setCurIcon(selected);
      global.equiped = selected;
    }
  }, [keyPress]);

  return (
    <div id="toolSelector">
      {
        tools.map((curTool) => {
          return(
            <div className="selection-box" style={curIcon === curTool ? {backgroundColor: 'rgba(255, 215, 0, 0.5)'} : {}}>
              {curTool !== '' ?  <img className="selection-icon" src={`./assets/tools/${curTool}.png`}/> : null}
            </div>
          )
        })
      }
    </div>
  );
}

export default ToolSelector;

