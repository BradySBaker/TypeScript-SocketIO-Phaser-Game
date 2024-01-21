import React, {useEffect, useState} from "react";
import dropTypesAndCrafting from "../../../dropTypesAndCrafting";

const SpawnItem: React.FC <{setNewPickup: Function}> = ({setNewPickup}) => {
  const [spawnButtons, setSpawnButtons] = useState<React.ReactNode[]>([]);

  const handleSpawn = (itemID: string) => {
    console.log('Spawned, ', itemID);
    setNewPickup({type: itemID, count: 1});
  };

  useEffect(() => {
    let newSpawnButtons = [];
    for (let itemID in dropTypesAndCrafting) {
      newSpawnButtons[Number(itemID)-1] = <button key={itemID} onClick={() => handleSpawn(itemID)}>{dropTypesAndCrafting[itemID]}</button>;
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