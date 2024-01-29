import React, { useState, useEffect } from "react";

import craftingRecipes from '../../../../craftingRecipes.js';
import global from "../../scenes/global.js";

const CraftingMenu: React.FC <{newPickup: {count: number, itemName: string}, setNewPickup: Function}> = ({newPickup, setNewPickup}) => {
  const [recipeBoxes, setRecipeBoxes] = useState<React.JSX.Element[]>([]);

  useEffect(() => {
    global.socket.on('craftVerified', (inventory: {[itemName: string]: number}, info: {itemName: Drop, count: number}) => {
      setNewPickup({count: info.count, itemName: info.itemName});
      global.inventory = inventory;
    });
  }, []);


  const handleRecipeClick = (craftingItem: Drop) => {
    let newInventory = {...global.inventory};
    let recipe = craftingRecipes[craftingItem];
    for (let requiredItem in recipe) { //Verify Client side
      let requiredCount = recipe[requiredItem as Drop];
      if (!newInventory[requiredItem] || newInventory[requiredItem] - requiredCount! < 0) {
        console.log('missing: ' + requiredItem);
        return;
      }
      newInventory[requiredItem] -= requiredCount!;
      if (newInventory[requiredItem] < 1) {
        delete newInventory[requiredItem];
      }
    }
    global.socket.emit('craftItem', global.curPlayerData.id, craftingItem); //Verify server side
  };

  useEffect(() => {
    let newRecipeBoxes: React.JSX.Element[] = [];
    for (let craftingItem in craftingRecipes) {
      let requirmentElements: React.JSX.Element[] = [];

      const recipe = craftingRecipes[craftingItem as Drop];
      for (let requiredItem in recipe) {
        requirmentElements.push(<p>{requiredItem}: {recipe[requiredItem as Drop]}x</p>);
      }
      newRecipeBoxes.push(<div id="recipe-box" onClick={() => handleRecipeClick(craftingItem as Drop)}>{craftingItem} ={'>'} {requirmentElements}</div>);
    }
    setRecipeBoxes(newRecipeBoxes);
  }, [newPickup]);
  return (
    <div id="crafting-menu">
      {recipeBoxes}
    </div>
  )
}

export default CraftingMenu;