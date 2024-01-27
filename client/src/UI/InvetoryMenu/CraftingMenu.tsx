import React, { useState, useEffect } from "react";

import craftingRecipes from '../../../../craftingRecipes.js';

const CraftingMenu: React.FC <{newPickup: {count: number, itemName: string}}> = ({newPickup}) => {
  const [recipeBoxes, setRecipeBoxes] = useState<React.JSX.Element[]>([]);
  useEffect(() => {
    let newRecipeBoxes: React.JSX.Element[] = [];
    for (let resultItem in craftingRecipes) {
      let requirmentElements: React.JSX.Element[] = [];
      // @ts-ignore
      const recipe = craftingRecipes[resultItem];
      for (let requiredItem in recipe) {
        requirmentElements.push(<p>{requiredItem}: {recipe[requiredItem]}x</p>);
      }
      newRecipeBoxes.push(<div>{resultItem} = {requirmentElements}</div>);
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