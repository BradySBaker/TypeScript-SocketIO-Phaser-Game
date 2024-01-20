import React, {useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';

import DisplayPickup from './DisplayPickup.jsx';
import ToolSelector from './ToolSelector.jsx';
import Inventory from './Inventory.js';
import {DisplayUse} from './DisplayUse.js';

let externalSetPickup!: Function;
let externalSetUsePos!: Function;

const UI: React.FC<{}> = () => {
  const [inventoryToggle, setInventoryToggle] = useState(false);
  const [keyPress, setKeyPress] = useState('');
  const [newPickup, setNewPickup] = useState({count: 0, type: 0});
  const [usePos, setUsePos] = useState<{x: number | undefined, y: number | undefined}>({x: undefined, y: undefined});
  const [useKeyDownTime, setUseKeyDownTime] = useState(0);
  const [numKeyPress, setNumKeyPress] = useState('');
  externalSetUsePos = setUsePos;
  externalSetPickup = setNewPickup;

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'i' && keyPress !== 'i') {
      setInventoryToggle((prevInventoryToggle) => !prevInventoryToggle);
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
      <Inventory inventoryToggle={inventoryToggle} newPickup={newPickup}/>
      <ToolSelector numKeyPress={numKeyPress} setNumKeyPress={setNumKeyPress} newPickup={newPickup}/>
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
