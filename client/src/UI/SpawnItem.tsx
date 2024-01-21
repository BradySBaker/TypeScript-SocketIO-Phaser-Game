import React, {useEffect, useState} from "react";
import global from "../scenes/global";

const SpawnItem: React.FC <{setNewPickup: Function}> = ({setNewPickup}) => { //Fix send data to server
  const [spawnButtons, setSpawnButtons] = useState<React.ReactNode[]>([]);

  const handleSpawn = (itemName: string) => {
    if (global.inventory[itemName]) {
      global.inventory[itemName].count++;
    } else {
      global.inventory[itemName] = {count: 1, pos: {x: -1, y: -1}};
    }
    setNewPickup({itemName, count: 1});
  };

  useEffect(() => {
    let newSpawnButtons = [];
    for (let i = 0; i < global.ItemImages.length; i++) {
      newSpawnButtons[i] = <button key={i} onClick={() => handleSpawn(global.ItemImages[i])}>{global.ItemImages[i]}</button>;
    }
    setSpawnButtons(newSpawnButtons);
  }
  ,[]);
  return (
    <div id='spawn-item-container'>
          {spawnButtons.map((curButton) => {
            return(
              curButton
            )
          })}
    </div>
  )
}

export default SpawnItem;