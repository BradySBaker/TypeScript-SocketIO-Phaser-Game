import React, {useEffect, useState} from "react";
import global from "../controllers/global";

const SpawnItem = () => { //Fix send data to server
  const [spawnButtons, setSpawnButtons] = useState<React.ReactNode[]>([]);

  const handleSpawn = (itemName: string) => {
    global.socket.emit('updatePickup', global.curPlayerData.id, {itemName, count: 1}, true);
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