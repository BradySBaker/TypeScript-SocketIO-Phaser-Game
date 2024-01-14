import React, {useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';

import DisplayPickup from './DisplayPickup.jsx';
import ToolSelector from './ToolSelector.jsx';
import Inventory from './Inventory.js';
import DisplayUse from './DisplayUse.js';

let externalSetPickup!: Function;
let externalSetUse!: Function;

const UI: React.FC<{}> = () => {
  const [inventoryToggle, setInventoryToggle] = useState(false);
  const [keyPress, setKeyPress] = useState('');
  const [newPickup, setNewPickup] = useState({count: 0, type: 0});
  const [displayUse, setDisplayUse] = useState(false);
  const [useKeyDownTime, setUseKeyDownTime] = useState(0);
  externalSetUse = setDisplayUse;
  externalSetPickup = setNewPickup;

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'i' && keyPress !== 'i') {
      setInventoryToggle((prevInventoryToggle) => !prevInventoryToggle);
      return;
    }
    if (event.key === 'e') {
      setUseKeyDownTime(prevState => prevState + 1);
    }
    setKeyPress(event.key);
  };

  const handleKeyUp = () => {
    setKeyPress('');
    setUseKeyDownTime(0);
  }


  useEffect(() => {
    // Attach event listener when the component mounts
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyUp);

    // Detach event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.addEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div id="app">
      <DisplayPickup newPickup={newPickup}/>
      <Inventory inventoryToggle={inventoryToggle} newPickup={newPickup}/>
      <ToolSelector keyPress={keyPress}/>
      {displayUse ? <DisplayUse useKeyDownTime={useKeyDownTime}/> : null}
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


export {startUI, externalSetPickup, externalSetUse};
