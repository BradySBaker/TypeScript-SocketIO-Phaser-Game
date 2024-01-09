import React, {useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';

import DisplayPickup from './DisplayPickup.jsx';
import ToolSelector from './ToolSelector.jsx';
import Inventory from './Inventory.js';

let externalSetPickup!: Function;

const UI: React.FC<{}> = () => {
  const [inventoryToggle, setInventoryToggle] = useState(false);
  const [keyPress, setKeyPress] = useState('');
  const [newPickup, setNewPickup] = useState({count: 0, type: 0});
  externalSetPickup = setNewPickup;

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }
    if (event.key === 'i') {
      setInventoryToggle((prevInventoryToggle) => !prevInventoryToggle);
      return;
    }
    setKeyPress(event.key);
  };


  useEffect(() => {
    // Attach event listener when the component mounts
    window.addEventListener('keydown', handleKeyPress);

    // Detach event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div id="app">
      <DisplayPickup newPickup={newPickup}/>
      <Inventory inventoryToggle={inventoryToggle} newPickup={newPickup}/>
      <ToolSelector keyPress={keyPress}/>
    </div>
  )
};

const root = createRoot(document.getElementById('root')!);


let startUI = () => {
  root.render(
    <React.StrictMode>
      <UI />
    </React.StrictMode>
  )
};


export {startUI, externalSetPickup};
