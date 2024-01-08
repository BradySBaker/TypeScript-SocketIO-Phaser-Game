import React, { useEffect, useState } from "react";

import global from "../scenes/global";
let tools: string[] = new Array(6);
tools.fill('');

tools[0] = 'spear';
tools[1] = 'grapple';

const ToolSelector: React.FC<{}> = () => {
  const [curIcon, setCurIcon] = useState('spear');

  const handleKeyPress = (event: KeyboardEvent) => {
    let selected = tools[Number(event.key) - 1];
    if (selected) {
      setCurIcon(selected);
      global.equiped = selected;
    }
  };

  useEffect(() => {
    // Attach event listener when the component mounts
    window.addEventListener('keydown', handleKeyPress);

    // Detach event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);


  return (
    <div id="toolSelector">
      {
        tools.map((curTool) => {
          return(
            <div className="selectionBox" style={curIcon === curTool ? {backgroundColor: 'rgba(255, 215, 0, 0.5)'} : {}}>
              {curTool !== '' ?  <img className="selectionIcon" src={`./assets/tools/${curTool}.png`}/> : null}
            </div>
          )
        })
      }
    </div>
  );
}

export default ToolSelector;

