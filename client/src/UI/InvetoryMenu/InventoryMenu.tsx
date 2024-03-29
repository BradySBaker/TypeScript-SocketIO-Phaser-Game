import React, { useState } from "react";
import Inventory from './Inventory.js';
import CraftingMenu from "./CraftingMenu.js";

const InventoryMenu: React.FC <{newPickup: {count: number, itemName: string}, setNewPickup: Function}> = ({newPickup, setNewPickup}) => {
  const [inventoryToggle, setInventoryToggle] = useState(true);

  return(
    <div id='inventory-menu'>
      <div id='inventory-topBar'>
        <button style={inventoryToggle ? {color: "gold"} : {}} onClick={() => setInventoryToggle(true)}>Inventory</button>
        <button style={!inventoryToggle ? {color: "gold"} : {}} onClick={() => setInventoryToggle(false)}>Crafting</button>
      </div>
      {inventoryToggle ? <Inventory newPickup={newPickup}/> : null}
      {!inventoryToggle ? <CraftingMenu newPickup={newPickup} setNewPickup={setNewPickup}/> : null}
      <div id='inventory-backdrop' />
    </div>
  )
}
export default InventoryMenu;