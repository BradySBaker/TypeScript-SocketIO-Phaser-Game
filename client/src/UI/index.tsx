import React, {useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';

import DisplayPickup from './DisplayPickup.jsx';
import ToolSelector from './ToolSelector.jsx';
import {DisplayUse} from './DisplayUse.js';
import SpawnItem from './SpawnItem.js';
import InventoryMenu from './InvetoryMenu/InventoryMenu.js';

let externalSetPickup!: Function;
let externalSetUsePos!: Function;

const UI: React.FC<{}> = () => {
  const [inventoryMenuToggle, setInventoryMenuToggle] = useState(false);
  const [keyPress, setKeyPress] = useState('');
  const [newPickup, setNewPickup] = useState({count: 0, itemName: ''});
  const [usePos, setUsePos] = useState<{x: number | undefined, y: number | undefined}>({x: undefined, y: undefined});
  const [useKeyDownTime, setUseKeyDownTime] = useState(0);
  const [numKeyPress, setNumKeyPress] = useState('');
  externalSetUsePos = setUsePos;
  externalSetPickup = setNewPickup;

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'i' && keyPress !== 'i') {
      setInventoryMenuToggle((prevInventoryMenuToggle) => !prevInventoryMenuToggle);
      return;
    }
    if (event.key === 'e') {
      setUseKeyDownTime(prevState => prevState + 1);
    }
    if (!isNaN(Number(event.key))) {
      setNumKeyPress(event.key);
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
      {inventoryMenuToggle ? <InventoryMenu newPickup={newPickup} setNewPickup={setNewPickup}/> : null}
      <ToolSelector numKeyPress={numKeyPress} setNumKeyPress={setNumKeyPress} newPickup={newPickup}/>
      <SpawnItem/>
      {usePos.x !== undefined && usePos.y !== undefined ? <DisplayUse useKeyDownTime={useKeyDownTime} usePos={usePos}/> : null}
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


export {startUI, externalSetPickup, externalSetUsePos};
