import React, { useState, useEffect } from "react";

import global from "../../scenes/global";
let inventoryPos: {[id: string]: GameObject} = {};
const Inventory: React.FC <{newPickup: {count: number, itemName: string}}> = ({newPickup}) => {
  const [boxElements, setBoxElements] = useState(() =>Array.from({ length: 5 }, () => Array(5).fill(undefined)));
  const findFirstUndefinedPosition = (newBoxElements: any[][]) => {
    for (let i = 0; i < newBoxElements.length; i++) {
      const columnIndex = newBoxElements[i].indexOf(undefined);
      if (columnIndex !== -1) {
        return { x: i, y: columnIndex };
      }
    }
    return null; //This shouldnt happen
  };

  useEffect(() => {
    let newBoxElements = [...boxElements];
    for (let itemName in global.inventory) {
      if (!inventoryPos[itemName]) {
        let newPos = findFirstUndefinedPosition(newBoxElements);
        if (!newPos) {
          return;
        }
        inventoryPos[itemName] = newPos;
      }
      if (global.inventory[itemName] < 1) {
        newBoxElements[inventoryPos[itemName].x][inventoryPos[itemName].y] = undefined;
        delete inventoryPos[itemName];
        delete global.inventory[itemName];
      }
      let count = global.inventory[itemName];
      newBoxElements[inventoryPos[itemName].x][inventoryPos[itemName].y] = {itemName, count};
    }
    setBoxElements(newBoxElements);
  }, [newPickup]);

  return (
    <div id="inventory">
      {boxElements.map((curRow, x) => {
      return (
        <div className="inventory-box-row">
          {boxElements[x].map((curColumn, y) => {
            return(
              <div className="inventory-box">
                {boxElements[x][y] ?
                <>
                  <img className="item-icon" src={`./assets/items/${boxElements[x][y].itemName}.png`} />
                  <p>{boxElements[x][y].count}x</p>
                </>
                : null}
              </div>
            );
          })}
      </div>
      )
      })}
    </div>
  );
};

export default Inventory;