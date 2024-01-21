import React, { useState, useEffect } from "react";

import global from "../scenes/global";
import dropTypesAndCrafting from '../../../dropTypesAndCrafting';

const Inventory: React.FC<{inventoryToggle: boolean, newPickup: {count: number, type: number}}> = ({inventoryToggle, newPickup}) => {
  const [boxElements, setBoxElements] = useState(() =>Array.from({ length: 5 }, () => Array(5).fill(undefined)));

  const findFirstUndefinedPosition = (newBoxElements: {} | string) => {
    for (let i = 0; i < boxElements.length; i++) {
      const columnIndex = boxElements[i].indexOf(undefined);
      if (columnIndex !== -1) {
        return { x: i, y: columnIndex };
      }
    }
    return null; //This shouldnt happen
  };

  useEffect(() => {
    let newBoxElements = [...boxElements];
    for (let type in global.inventory) {
      if (global.inventory[type].count < 1) {
        newBoxElements[global.inventory[type].pos.x][global.inventory[type].pos.y] = undefined;
        delete global.inventory[type];
        return;
      }
      let curinventory = global.inventory[type];
      if (curinventory.pos.x === -1) {
        let newPos = findFirstUndefinedPosition(newBoxElements)
        if (!newPos) {
          return;
        }
        curinventory.pos.x = newPos.x;
        curinventory.pos.y = newPos.y;
      }
      newBoxElements[curinventory.pos.x][curinventory.pos.y] = {type, count: curinventory.count};
    }
    setBoxElements(newBoxElements);
  }, [newPickup]);

  return (
    <div id="inventory">
      {inventoryToggle ?
      <>
       {boxElements.map((curRow, x) => {
        return (
          <div className="inventory-box-row">
            {boxElements[x].map((curColumn, y) => {
              return(
                <div className="inventory-box">
                  {boxElements[x][y] ?
                  <>
                    <img className="item-icon" src={`./assets/items/${dropTypesAndCrafting[boxElements[x][y].type]}.png`} />
                    <p>{boxElements[x][y].count}x</p>
                  </>
                  : null}
                </div>
              );
            })}
        </div>
        )
       })}
      </>
      : null}
    </div>
  );
};

export default Inventory;