import React, { useState, useEffect } from "react";

import craftingRecipes from '../../../../craftingRecipes.js';
import global from "../../scenes/global.js";

const CraftingMenu: React.FC <{newPickup: {count: number, itemName: string}, setNewPickup: Function}> = ({newPickup, setNewPickup}) => {
  const [recipeBoxes, setRecipeBoxes] = useState<React.JSX.Element[]>([]);

  const handleRecipeClick = (craftingItem: Drop) => { //Fix authenticate with server
    let newInventory = global.inventory;
    let recipe = craftingRecipes[craftingItem];
    for (let requiredItem in recipe) {
      let requiredCount = recipe[requiredItem as Drop];
      if (!newInventory[requiredItem] || newInventory[requiredItem].count - requiredCount!) {
        console.log('missing: ' + requiredItem);
        return;
      }
      newInventory[requiredItem].count -= requiredCount!;
      if (newInventory[requiredItem].count < 1) {
        delete newInventory[requiredItem];
      }
    }
    if (!newInventory[craftingItem]) {
      newInventory[craftingItem] = {count: 1, pos: {x: -1, y: -1}};
    } else {
      newInventory[craftingItem].count++;
    }
    setNewPickup({count: 1, itemName: craftingItem});
    global.inventory = newInventory;
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