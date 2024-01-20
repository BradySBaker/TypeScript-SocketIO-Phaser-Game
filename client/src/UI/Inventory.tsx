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
    for (let type in global.pickups) {
      let curPickups = global.pickups[type];
      if (curPickups.pos.x === -1) {
        let newPos = findFirstUndefinedPosition(newBoxElements)
        if (!newPos) {
          return;
        }
        curPickups.pos.x = newPos.x;
        curPickups.pos.y = newPos.y;
      }
      newBoxElements[curPickups.pos.x][curPickups.pos.y] = {type, count: curPickups.count};
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